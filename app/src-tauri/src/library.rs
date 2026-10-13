//! SE-30..36: verified library switching, with rollback before reporting failure.
use std::{fs, path::{Path, PathBuf}};
use serde_json::{Value, json};
use crate::{paths::{reject_link, subject_path}, storage::{atomic_write, write_json}};
use std::io::Write;
use sha2::{Digest,Sha256};
fn journal_path(settings:&Path)->Result<PathBuf,String>{Ok(settings.parent().ok_or("Settings have no parent")?.join("library-transfer.json"))}
fn backup_root(old:&Path,nonce:&str)->Result<PathBuf,String>{
    if nonce.is_empty()||nonce.len()>40||!nonce.bytes().all(|c|c.is_ascii_hexdigit()){return Err("Invalid transfer journal nonce".into());}
    if !old.is_absolute(){return Err("Invalid transfer journal library".into());}
    reject_link(old)?;let backup=old.join(format!(".lantern-transfer-{nonce}"));reject_link(&backup)?;Ok(backup)
}
fn cleanup_journal(settings:&Path,journal:&Value)->Result<(),String>{
    let old=PathBuf::from(journal["old"].as_str().ok_or("Invalid transfer journal")?);
    let backup=backup_root(&old,journal["nonce"].as_str().ok_or("Invalid transfer journal")?)?;
    for file in journal["files"].as_array().ok_or("Invalid transfer journal")?{
        let path=subject_path(&backup,file["id"].as_str().ok_or("Invalid transfer journal file")?)?;
        if path.exists(){fs::remove_file(path).map_err(|e|e.to_string())?;}
    }
    if backup.join("subjects").exists(){fs::remove_dir(backup.join("subjects")).map_err(|e|e.to_string())?;}
    if backup.exists(){fs::remove_dir(backup).map_err(|e|e.to_string())?;}
    fs::remove_file(journal_path(settings)?).map_err(|e|e.to_string())
}
/// Called before reading Settings on startup. An uncommitted move becomes a safe
/// rollback; committed moves only clean their own verified backup files.
pub fn recover_transfer(settings:&Path)->Result<bool,String>{
    let path=journal_path(settings)?;if !path.exists(){return Ok(false);}reject_link(&path)?;
    let journal:Value=serde_json::from_slice(&fs::read(&path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    if journal["format"]!="lantern-transfer/1"{return Err("Unsupported library transfer journal".into());}
    if journal["committed"]!=true{
        let old=PathBuf::from(journal["old"].as_str().ok_or("Invalid transfer journal")?);
        let backup=backup_root(&old,journal["nonce"].as_str().ok_or("Invalid transfer journal")?)?;
        // Verify every backup before restoring any file.
        let mut restore=vec![];
        for file in journal["files"].as_array().ok_or("Invalid transfer journal")?{
            let id=file["id"].as_str().ok_or("Invalid transfer journal file")?;
            let bytes=fs::read(subject_path(&backup,id)?).map_err(|e|format!("Backup {id}: {e}"))?;
            if file["hash"]!=format!("{:x}",Sha256::digest(&bytes)){return Err(format!("Backup {id} did not verify"));}
            restore.push((subject_path(&old,id)?,bytes));
        }
        for (path,bytes) in restore{if !path.exists(){atomic_write(&path,&bytes)?;}}
        if let Ok(bytes)=fs::read(settings){if let Ok(mut current)=serde_json::from_slice::<Value>(&bytes){
            if current["format"]=="lantern-settings/1"&&current["library"]["path"].as_str().map(crate::paths::plain_path)==journal["destination"].as_str().map(crate::paths::plain_path){
                current["library"]["path"]=journal["old"].clone();write_json(settings,&current)?;
            }
        }}
    }
    cleanup_journal(settings,&journal)?;Ok(true)
}
pub fn validate_folder(path: &Path, install: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() { return Err("Library path must be absolute".into()); }
    reject_link(path)?;
    fs::create_dir_all(path).map_err(|e|e.to_string())?;
    let canonical = crate::paths::canonical(path).map_err(|e|e.to_string())?;
    if let Ok(app) = crate::paths::canonical(install) { if canonical.starts_with(app) { return Err("Library cannot be inside the app installation folder".into()); } }
    reject_link(&canonical.join("subjects"))?;
    fs::read_dir(&canonical).map_err(|e|format!("Library cannot be read: {e}"))?;
    if canonical.join("subjects").exists(){fs::read_dir(canonical.join("subjects")).map_err(|e|format!("Subjects cannot be read: {e}"))?;}
    tempfile::NamedTempFile::new_in(&canonical).map_err(|e|format!("Library is not writable: {e}"))?;
    Ok(canonical)
}
pub fn switch_library(old: &Path, destination: &Path, install: &Path, mode: &str, settings_path: &Path, document: &Value) -> Result<Value, String> {
    if !["move","copy","leave"].contains(&mode) { return Err("Unknown library transfer mode".into()); }
    let destination = validate_folder(destination, install)?;
    if let Ok(from) = crate::paths::canonical(old) { if from == destination { return Err("Choose a different library folder".into()); } }
    let mut originals: Vec<(PathBuf, Vec<u8>)> = vec![];
    let mut staged: Vec<(PathBuf, Vec<u8>)> = vec![];
    let mut collisions = vec![];
    if mode != "leave" && old.join("subjects").exists() {
        reject_link(&old.join("subjects"))?;
        let nonce = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
        for (index, entry) in fs::read_dir(old.join("subjects")).map_err(|e|e.to_string())?.enumerate() {
            let path = entry.map_err(|e|e.to_string())?.path();
            if path.extension().and_then(|s|s.to_str()) != Some("json") || path.file_name().unwrap_or_default().to_string_lossy().contains(".conflict-") { continue; }
            let Some(id) = path.file_stem().and_then(|s|s.to_str()).filter(|id|crate::paths::is_subject_id(id)) else { continue; };
            reject_link(&path)?;
            crate::storage::load_subject(old,id).map_err(|e|format!("{}: {e}",path.display()))?;
            let bytes = fs::read(&path).map_err(|e|format!("{}: {e}",path.display()))?;
            let mut subject: Value = serde_json::from_slice(&bytes).map_err(|e|format!("{}: {e}",path.display()))?;
            if subject["id"] != id { return Err(format!("{}: subject id does not match filename",path.display())); }
            let mut target = subject_path(&destination,id)?;
            let mut target_bytes = bytes.clone();
            if target.exists() {
                if subject["format"] != crate::storage::FORMAT { return Err(format!("{}: newer-format collision cannot be renamed",path.display())); }
                let mut suffix = index;
                loop { let new_id = format!("{id}-{nonce:x}-{suffix:x}"); target=subject_path(&destination,&new_id)?;
                    if !target.exists() { subject["id"]=json!(new_id); collisions.push(json!({"oldId":id,"newId":new_id})); break; } suffix+=1; }
                target_bytes=serde_json::to_vec_pretty(&subject).map_err(|e|e.to_string())?;
            }
            originals.push((path,bytes)); staged.push((target,target_bytes));
        }
    }
    // Preflight every source before writing, then verify every destination byte-for-byte.
    let mut written = vec![];
    let mut journal:Option<Value>=None;
    let mut settings_written=false;
    let result = (|| -> Result<(), String> {
        for (path, bytes) in &staged {
            if path.exists() { return Err(format!("{} appeared during transfer",path.display())); }
            let parent=path.parent().ok_or("Destination has no parent")?;
            fs::create_dir_all(parent).map_err(|e|e.to_string())?; reject_link(parent)?;
            let mut temp=tempfile::NamedTempFile::new_in(parent).map_err(|e|e.to_string())?;
            temp.write_all(bytes).map_err(|e|e.to_string())?; temp.as_file().sync_all().map_err(|e|e.to_string())?;
            temp.persist_noclobber(path).map_err(|e|e.to_string())?; written.push(path.clone());
            if fs::read(path).map_err(|e|e.to_string())? != *bytes { return Err(format!("{} did not verify",path.display())); }
        }
        if mode == "move" {
            // An external edit during copying aborts before any original is removed.
            for (path,bytes) in &originals { if fs::read(path).map_err(|e|e.to_string())? != *bytes { return Err(format!("{} changed during transfer",path.display())); } }
            if !originals.is_empty(){
                if journal_path(settings_path)?.exists(){return Err("A previous library transfer needs recovery".into());}
                let canonical_old=crate::paths::canonical(old).map_err(|e|e.to_string())?;
                let nonce=format!("{:x}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());
                let backup=backup_root(&canonical_old,&nonce)?;let mut files=vec![];
                for (path,bytes) in &originals{let id=path.file_stem().and_then(|s|s.to_str()).ok_or("Invalid subject filename")?;
                    atomic_write(&subject_path(&backup,id)?,bytes)?;files.push(json!({"id":id,"hash":format!("{:x}",Sha256::digest(bytes))}));}
                let value=json!({"format":"lantern-transfer/1","nonce":nonce,"old":canonical_old,"destination":destination,"files":files,"committed":false});
                write_json(&journal_path(settings_path)?,&value)?;journal=Some(value);
            }
            for (path,_) in &originals { fs::remove_file(path).map_err(|e|format!("{}: {e}",path.display()))?; }
        }
        let mut settings=document.clone(); settings["library"]["path"]=json!(destination.to_string_lossy());
        write_json(settings_path,&settings)?;settings_written=true;
        if let Some(value)=journal.as_mut(){value["committed"]=json!(true);write_json(&journal_path(settings_path)?,value)?;}
        Ok(())
    })();
    if let Err(error) = result {
        let mut recovery = vec![];
        if settings_written{if let Err(e)=write_json(settings_path,document){recovery.push(format!("Settings rollback: {e}"));}}
        if mode == "move" { for (path,bytes) in &originals { if !path.exists() { if let Err(e)=atomic_write(path,bytes) { recovery.push(format!("{}: {e}",path.display())); } } } }
        let originals_safe=recovery.is_empty();
        if originals_safe {for path in written {let expected=staged.iter().find(|(p,_)|p==&path).map(|(_,b)|b);
            if fs::read(&path).ok().as_ref()==expected{if let Err(e)=fs::remove_file(&path){recovery.push(format!("{}: {e}",path.display()));}}
            else{recovery.push(format!("{} changed; destination copy kept",path.display()));}
        }}
        if originals_safe&&recovery.is_empty(){if let Some(value)=&journal{if let Err(e)=cleanup_journal(settings_path,value){recovery.push(format!("Journal recovery: {e}"));}}}
        return Err(if recovery.is_empty() {error} else {format!("{error}; recovery: {}",recovery.join("; "))});
    }
    // The committed marker is durable. Cleanup failure leaves recoverable metadata,
    // not a failed transfer whose originals have already been removed.
    if let Some(value)=&journal{let _=cleanup_journal(settings_path,value);}
    Ok(json!({"path":destination,"collisions":collisions,"transferred":staged.len()}))
}
