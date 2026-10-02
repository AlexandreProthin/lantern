use super::*;
fn subject(count: usize) -> Value {
    let mut nodes = serde_json::Map::new();
    for i in 0..count {
        nodes.insert(format!("n{i}"), json!({"id":format!("n{i}"), "parents":if i == 0 {vec![]} else {vec!["n0"]},
            "title":format!("Node {i}"), "hook":"Hook", "kind":if i==0 {"subject"} else {"axis"}, "state":if i==0 {"lit"} else {"open"},
            "understoodBy":null, "content":if i==0 {"Explanation"} else {""}, "author":{"kind":"unknown"}, "dialogue":[],
            "createdAt":"2026-10-02T12:00:00Z", "createdBy":"tutor"}));
    }
    json!({"format":"lantern/1", "id":"tides-k3f9", "title":"Tides", "createdAt":"2026-10-02T12:00:00Z",
        "rooms":{"learn":{"rootId":"n0", "focusId":"n0", "tone":"curious", "model":"opus", "effort":"medium", "nodes":nodes, "log":[]}}})
}
#[test]
fn paths_reject_traversal_and_windows_devices() {
    for id in ["../outside", "a/b", "a\\b", "C:drive", "con", "nul", "com1", "bad..id", "x.conflict-1", "", "-x", "x--y"] {
        assert!(subject_path(Path::new("library"), id).is_err(), "accepted {id}");
    }
    assert!(subject_path(Path::new("library"), "tides-k3f9").is_ok());
}
#[test]
fn state_unknown_fields_legacy_backup_and_future_shapes_are_preserved() {
    let config=tempfile::tempdir().unwrap();let path=config.path().join("state.json");
    let legacy=br#"{"recents":[],"lastOpenedAt":{},"futureRoom":{"kept":true}}"#;fs::write(&path,legacy).unwrap();
    assert_eq!(read_state(config.path()).unwrap().extra["futureRoom"]["kept"],true);
    assert_eq!(fs::read(config.path().join("state.json.bak")).unwrap(),legacy);
    record_open(config.path(),"tides-k3f9","2026-10-02T12:00:00Z").unwrap();assert_eq!(read_state(config.path()).unwrap().extra["futureRoom"]["kept"],true);
    let future=br#"{"format":"lantern-state/2","recents":{"newShape":true},"futureRoom":1}"#;fs::write(&path,future).unwrap();
    assert_eq!(read_state(config.path()).unwrap().format,"lantern-state/2");assert!(record_open(config.path(),"tides-k3f9","now").is_err());assert_eq!(fs::read(&path).unwrap(),future);
    fs::write(&path,b"{bad").unwrap();assert!(read_state(config.path()).unwrap().recents.is_empty());assert!(fs::read_dir(config.path()).unwrap().any(|e|e.unwrap().file_name().to_string_lossy().starts_with("state.json.corrupt-")));
}
#[test]
fn library_copy_preserves_originals_and_renames_collisions() {
    let old=tempfile::tempdir().unwrap(); let new=tempfile::tempdir().unwrap(); let install=tempfile::tempdir().unwrap(); let config=tempfile::tempdir().unwrap();
    let s=subject(3); save_subject(old.path(),&s,None,true).unwrap(); save_subject(new.path(),&s,None,true).unwrap();
    let original=fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap();
    let result=crate::library::switch_library(old.path(),new.path(),install.path(),"copy",&config.path().join("settings.json"),&json!({"format":"lantern-settings/1","library":{"path":"old"},"future":{"kept":true}})).unwrap();
    assert_eq!(result["transferred"],1); assert_eq!(result["collisions"].as_array().unwrap().len(),1);
    assert_eq!(fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap(),original);
    assert_eq!(fs::read_dir(new.path().join("subjects")).unwrap().count(),2);
    let moved_id=result["collisions"][0]["newId"].as_str().unwrap(); assert_eq!(load_subject(new.path(),moved_id).unwrap().subject["id"],moved_id);
    let settings:Value=serde_json::from_slice(&fs::read(config.path().join("settings.json")).unwrap()).unwrap();assert_eq!(settings["future"]["kept"],true);
}
#[test]
fn interrupted_library_move_recovers_originals_and_old_library_pointer() {
    let old=tempfile::tempdir().unwrap();let destination=tempfile::tempdir().unwrap();let config=tempfile::tempdir().unwrap();
    let old_root=fs::canonicalize(old.path()).unwrap();let dest_root=fs::canonicalize(destination.path()).unwrap();
    let s=subject(3);save_subject(old.path(),&s,None,true).unwrap();
    let original=fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap();
    let backup=old_root.join(".lantern-transfer-abc123");atomic_write(&subject_path(&backup,"tides-k3f9").unwrap(),&original).unwrap();
    fs::remove_file(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap();
    let settings=config.path().join("settings.json");write_json(&settings,&json!({"format":"lantern-settings/1","library":{"path":dest_root},"futureRoom":{"kept":true}})).unwrap();
    write_json(&config.path().join("library-transfer.json"),&json!({"format":"lantern-transfer/1","old":old_root,"destination":dest_root,"nonce":"abc123","committed":false,
        "files":[{"id":"tides-k3f9","hash":format!("{:x}",Sha256::digest(&original))}]})).unwrap();
    assert!(crate::library::recover_transfer(&settings).unwrap());assert_eq!(fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap(),original);
    let recovered:Value=serde_json::from_slice(&fs::read(&settings).unwrap()).unwrap();assert_eq!(recovered["library"]["path"],json!(old_root));assert_eq!(recovered["futureRoom"]["kept"],true);
    assert!(!backup.exists());assert!(!config.path().join("library-transfer.json").exists());assert!(!crate::library::recover_transfer(&settings).unwrap());
}
#[test]
fn library_move_restores_all_originals_if_settings_commit_fails() {
    let old=tempfile::tempdir().unwrap(); let new=tempfile::tempdir().unwrap(); let install=tempfile::tempdir().unwrap(); let config=tempfile::tempdir().unwrap();
    let s=subject(3); save_subject(old.path(),&s,None,true).unwrap();
    let original=fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap();
    let document=json!({"format":"lantern-settings/1","library":{"path":"old"}});
    assert!(crate::library::switch_library(old.path(),new.path(),install.path(),"move",config.path(),&document).is_err());
    assert_eq!(fs::read(subject_path(old.path(),"tides-k3f9").unwrap()).unwrap(),original);
    assert!(!subject_path(new.path(),"tides-k3f9").unwrap().exists());
    crate::library::switch_library(old.path(),new.path(),install.path(),"move",&config.path().join("settings.json"),&document).unwrap();
    assert!(!subject_path(old.path(),"tides-k3f9").unwrap().exists());assert_eq!(load_subject(new.path(),"tides-k3f9").unwrap().subject,s);
}
#[test]
fn library_rejects_bad_source_before_removing_anything_and_install_destination() {
    let old=tempfile::tempdir().unwrap(); let new=tempfile::tempdir().unwrap(); let install=tempfile::tempdir().unwrap();let config=tempfile::tempdir().unwrap();
    save_subject(old.path(),&subject(3),None,true).unwrap(); fs::write(old.path().join("subjects/broken.json"),b"{bad").unwrap();
    assert!(crate::library::switch_library(old.path(),new.path(),install.path(),"move",&config.path().join("settings.json"),&json!({"library":{"path":"old"}})).is_err());
    assert!(subject_path(old.path(),"tides-k3f9").unwrap().exists()); assert_eq!(fs::read_dir(old.path().join("subjects")).unwrap().count(),2);
    assert!(crate::library::validate_folder(&install.path().join("library"),install.path()).is_err());
}
#[test]
fn round_trip_rename_and_recents_do_not_rewrite_subject() {
    let dir = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap(); let mut s = subject(4);
    assert!(matches!(save_subject(dir.path(), &s, None, true).unwrap(), SaveResult::Saved { .. }));
    let before = load_subject(dir.path(), "tides-k3f9").unwrap();
    record_open(config.path(), "tides-k3f9", "2026-10-02T12:00:00Z").unwrap();
    assert_eq!(load_subject(dir.path(), "tides-k3f9").unwrap().stamp, before.stamp);
    assert_eq!(read_state(config.path()).unwrap().recents, ["tides-k3f9"]);
    s["title"] = json!("Renamed"); save_subject(dir.path(), &s, Some(&before.stamp), true).unwrap();
    assert_eq!(load_subject(dir.path(), "tides-k3f9").unwrap().subject, s);
    assert_eq!(fs::read_dir(dir.path().join("subjects")).unwrap().count(), 1);
}
#[test]
fn external_change_reloads_clean_or_preserves_dirty_as_conflict() {
    let dir = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap(); let s = subject(2);
    save_subject(dir.path(), &s, None, true).unwrap(); let old = load_subject(dir.path(), "tides-k3f9").unwrap();
    let mut external = s.clone(); external["title"] = json!("External"); write_json(&subject_path(dir.path(), "tides-k3f9").unwrap(), &external).unwrap();
    assert!(matches!(save_subject(dir.path(), &s, Some(&old.stamp), false).unwrap(), SaveResult::Reloaded { .. }));
    let SaveResult::Conflict { loaded, conflict_path } = save_subject(dir.path(), &s, Some(&old.stamp), true).unwrap() else { panic!("expected conflict") };
    assert_eq!(loaded.subject, external);
    assert_eq!(serde_json::from_slice::<Value>(&fs::read(conflict_path).unwrap()).unwrap(), s);
    assert_eq!(list_subjects(dir.path(), config.path()).unwrap().len(), 1);
    assert_eq!(load_subject(dir.path(), "tides-k3f9").unwrap().subject, external);
}
#[test]
fn higher_major_is_read_only_and_invalid_graph_is_rejected() {
    let dir = tempfile::tempdir().unwrap(); let mut s = subject(2); s["format"] = json!("lantern/2");
    write_json(&subject_path(dir.path(), "tides-k3f9").unwrap(), &s).unwrap();
    assert!(load_subject(dir.path(), "tides-k3f9").unwrap().read_only);
    assert!(save_subject(dir.path(), &subject(2), None, true).is_err());
    let mut cyclic = subject(3); cyclic["rooms"]["learn"]["nodes"]["n1"]["parents"] = json!(["n2"]); cyclic["rooms"]["learn"]["nodes"]["n2"]["parents"] = json!(["n1"]);
    assert!(validate_subject(&cyclic, "tides-k3f9").is_err());
}
#[test]
fn summary_cache_invalidates_and_can_be_rebuilt() {
    let dir = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap(); let s = subject(4);
    save_subject(dir.path(), &s, None, true).unwrap();
    let first = list_subjects(dir.path(), config.path()).unwrap(); assert_eq!(first[0]["total"], 4);
    let mut s = s; s["rooms"]["learn"]["nodes"]["n1"]["state"] = json!("dismissed");
    write_json(&subject_path(dir.path(), "tides-k3f9").unwrap(), &s).unwrap();
    let second = list_subjects(dir.path(), config.path()).unwrap(); assert_eq!(second[0]["total"], 3);
    fs::write(config.path().join("summaries.json"), b"corrupt").unwrap();
    assert_eq!(list_subjects(dir.path(), config.path()).unwrap(), second);
}
#[test]
fn poc_import_backup_idempotence_and_reopen() {
    let dir = tempfile::tempdir().unwrap(); let s = subject(3); let v = &s["rooms"]["learn"];
    let mut nodes = v["nodes"].as_object().unwrap().clone();
    for n in nodes.values_mut() { let p = n["parents"][0].clone(); let o = n.as_object_mut().unwrap(); o.remove("parents"); o.remove("author"); o.remove("understoodBy"); o.remove("createdBy"); o.insert("parentId".into(), p); }
    let poc = json!({"format":"lantern-poc/1", "id":s["id"], "title":s["title"], "createdAt":s["createdAt"], "room":"learn", "rootId":"n0", "focusId":"n1", "nodes":nodes});
    let path = subject_path(dir.path(), "tides-k3f9").unwrap(); write_json(&path, &poc).unwrap(); let original = fs::read(&path).unwrap();
    assert_eq!(import_poc(dir.path()).unwrap(), ["tides-k3f9"]);
    let loaded = load_subject(dir.path(), "tides-k3f9").unwrap();
    assert_eq!(loaded.subject["rooms"]["learn"]["nodes"]["n1"]["parents"], json!(["n0"]));
    assert_eq!(loaded.subject["rooms"]["learn"]["nodes"]["n0"]["author"]["kind"], "unknown");
    assert_eq!(fs::read(dir.path().join("subjects/.poc-backup/tides-k3f9.json")).unwrap(), original);
    assert!(import_poc(dir.path()).unwrap().is_empty());
    assert_eq!(load_subject(dir.path(), "tides-k3f9").unwrap().subject, loaded.subject);
}
#[test]
#[ignore = "ST-50 performance gate: run on an idle machine, separately from process-spawn tests and prompt evals"]
fn five_hundred_nodes_meet_st50() {
    // Median of five independent creates measures typical SSD behaviour without
    // pretending a single antivirus/scheduler outlier is a deterministic timing.
    let s = subject(500); let mut saves = vec![]; let mut loads = vec![];
    for _ in 0..5 {
        let dir = tempfile::tempdir().unwrap();
        let start = std::time::Instant::now(); save_subject(dir.path(), &s, None, true).unwrap(); saves.push(start.elapsed());
        let start = std::time::Instant::now(); let loaded = load_subject(dir.path(), "tides-k3f9").unwrap(); loads.push(start.elapsed());
        assert_eq!(loaded.subject, s);
    }
    saves.sort(); loads.sort();
    eprintln!("ST-50: 500-node save samples={saves:?}, load samples={loads:?}");
    assert!(saves[2].as_millis() < 100); assert!(loads[2].as_millis() < 200);
}
