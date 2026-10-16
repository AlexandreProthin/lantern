use super::*;
/// A lantern/1 subject as v0.1.x wrote it.
fn subject_v1(count: usize) -> Value {
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
fn subject(count: usize) -> Value { convert_v1(&subject_v1(count)).unwrap() }
#[test]
fn core_validation_checks_roles_data_and_effort_but_no_room_values() {
    let mut s = subject(2); assert!(validate_subject(&s, "tides-k3f9").is_ok());
    s["rooms"]["learn"]["nodes"]["n1"]["kind"] = json!("product"); s["rooms"]["learn"]["nodes"]["n1"]["state"] = json!("shortlisted");
    assert!(validate_subject(&s, "tides-k3f9").is_ok(), "kinds and states belong to the room (DM-66)");
    for (path, bad) in [("createdBy", json!("tutor")), ("data", json!("x")), ("kind", json!(""))] {
        let mut t = subject(2); t["rooms"]["learn"]["nodes"]["n1"][path] = bad; assert!(validate_subject(&t, "tides-k3f9").is_err(), "{path}");
    }
    let mut t = subject(2); t["rooms"]["learn"]["effort"] = json!("huge"); assert!(validate_subject(&t, "tides-k3f9").is_err());
    let mut t = subject(2); t["rooms"]["learn"]["nodes"]["n0"]["dialogue"] = json!([{"role":"learner","text":"hi"}]); assert!(validate_subject(&t, "tides-k3f9").is_err());
    let mut t = subject(2); t["rooms"]["future"] = t["rooms"]["learn"].clone(); assert!(validate_subject(&t, "tides-k3f9").is_ok(), "an unknown room is core only");
}
#[test]
fn conversion_moves_learn_fields_into_data_and_keeps_unknown_fields() {
    let mut v1 = subject_v1(3);
    let visit = &mut v1["rooms"]["learn"]; visit["direction"] = json!("Start from the Moon"); visit["futureVisit"] = json!(1);
    visit["nodes"]["n1"]["state"] = json!("understood"); visit["nodes"]["n1"]["understoodBy"] = json!("self");
    visit["nodes"]["n0"]["createdBy"] = json!("learner"); visit["nodes"]["n0"]["futureNode"] = json!(true);
    visit["nodes"]["n0"]["dialogue"] = json!([{"role":"learner","text":"Why?","at":"x","author":{"kind":"user","by":"alex"}},{"role":"tutor","text":"Because","at":"y","author":{"kind":"unknown"}}]);
    visit["log"] = json!([{"id":"g1","nodeId":"n0","task":"intro","tone":"engineer","model":"m","usage":{"input":1,"output":2}}]);
    let v2 = convert_v1(&v1).unwrap(); let visit = &v2["rooms"]["learn"];
    assert_eq!(v2["format"], "lantern/2"); validate_subject(&v2, "tides-k3f9").unwrap();
    assert_eq!(visit["data"], json!({"tone":"curious","direction":"Start from the Moon"}));
    assert!(visit.get("tone").is_none() && visit.get("direction").is_none()); assert_eq!(visit["futureVisit"], 1);
    assert_eq!(visit["nodes"]["n1"]["data"], json!({"understoodBy":"self"})); assert!(visit["nodes"]["n1"].get("understoodBy").is_none());
    assert!(visit["nodes"]["n2"].get("data").is_none() && visit["nodes"]["n2"].get("understoodBy").is_none());
    assert_eq!(visit["nodes"]["n0"]["createdBy"], "user"); assert_eq!(visit["nodes"]["n2"]["createdBy"], "model"); assert_eq!(visit["nodes"]["n0"]["futureNode"], true);
    assert_eq!(visit["nodes"]["n0"]["dialogue"][0]["role"], "user"); assert_eq!(visit["nodes"]["n0"]["dialogue"][1]["role"], "model");
    assert_eq!(visit["log"][0]["data"], json!({"tone":"engineer"})); assert!(visit["log"][0].get("tone").is_none());
}
#[test]
fn first_read_converts_with_backup_once_and_bad_files_stay_untouched() {
    let dir = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap();
    let path = subject_path(dir.path(), "tides-k3f9").unwrap(); write_json(&path, &subject_v1(3)).unwrap(); let original = fs::read(&path).unwrap();
    let listed = list_subjects(dir.path(), config.path()).unwrap(); assert!(listed[0]["unreadable"].is_null());
    let backup = dir.path().join("subjects/.lantern1-backup/tides-k3f9.json"); assert_eq!(fs::read(&backup).unwrap(), original);
    let loaded = load_subject(dir.path(), "tides-k3f9").unwrap(); assert_eq!(loaded.subject, subject(3)); assert!(!loaded.read_only);
    let converted = fs::read(&path).unwrap(); load_subject(dir.path(), "tides-k3f9").unwrap();
    assert_eq!(fs::read(&path).unwrap(), converted, "a lantern/2 file is never converted again"); assert_eq!(fs::read(&backup).unwrap(), original);
    let mut broken = subject_v1(2); broken["id"] = json!("broken-a1b2"); broken["rooms"]["learn"]["nodes"]["n1"]["createdBy"] = json!("someone");
    let broken_path = subject_path(dir.path(), "broken-a1b2").unwrap(); write_json(&broken_path, &broken).unwrap(); let broken_bytes = fs::read(&broken_path).unwrap();
    let listed = list_subjects(dir.path(), config.path()).unwrap();
    assert_eq!(listed.iter().filter(|s| s["unreadable"] == true).count(), 1, "ST-34: shown as unreadable, the rest still listed");
    assert_eq!(fs::read(&broken_path).unwrap(), broken_bytes); assert!(!dir.path().join("subjects/.lantern1-backup/broken-a1b2.json").exists());
}
#[test]
fn summaries_are_per_room_and_old_cache_entries_are_discarded() {
    let dir = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap();
    let mut s = subject(3); s["rooms"]["learn"]["nodes"]["n1"]["state"] = json!("understood"); s["rooms"]["learn"]["nodes"]["n1"]["data"] = json!({"understoodBy":"demonstrated"});
    s["rooms"]["learn"]["data"]["direction"] = json!("x".repeat(600));
    save_subject(dir.path(), &s, None, true).unwrap();
    let key = crate::paths::canonical(&subject_path(dir.path(), "tides-k3f9").unwrap()).unwrap().to_string_lossy().to_string();
    write_json(&config.path().join("summaries.json"), &json!({ key.clone(): {"modifiedNs": 0, "size": 0, "summary": {"stale": true}} })).unwrap();
    let listed = list_subjects(dir.path(), config.path()).unwrap(); let learn = &listed[0]["rooms"]["learn"];
    assert!(listed[0]["stale"].is_null());
    assert_eq!(learn["states"], json!({"lit":1,"understood":1,"open":1})); assert_eq!(learn["nodeData"], json!({"understoodBy":{"demonstrated":1}}));
    assert_eq!(learn["data"], json!({"tone":"curious"}), "a long direction stays out of the summary");
    let kinds = learn["kindStates"].as_object().unwrap(); assert_eq!(kinds.values().flat_map(|s| s.as_object().unwrap().values()).map(|n| n.as_u64().unwrap()).sum::<u64>(), 3);
    let mut s = s; s["rooms"]["learn"]["data"]["history"] = json!([{"status":"decided"}]); s["rooms"]["learn"]["data"]["big"] = json!(["x".repeat(5000)]);
    let room = &summary(&s)["rooms"]["learn"]; assert_eq!(room["data"]["history"], json!([{"status":"decided"}])); assert!(room["data"]["big"].is_null(), "over 4 KB stays out");
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
fn companion_state_keeps_other_keys_and_refuses_bad_or_newer_state() {
    let config=tempfile::tempdir().unwrap();
    record_open(config.path(),"tides-k3f9","2026-10-17T12:00:00Z").unwrap();
    save_companion_state(config.path(),&json!({"spots":{"learn/study":"hang-7"},"seenTips":["frame.ask"]})).unwrap();
    let state=read_state(config.path()).unwrap();
    assert_eq!(state.extra["companion"]["spots"]["learn/study"],"hang-7");assert_eq!(state.recents,vec!["tides-k3f9".to_string()]);
    assert!(save_companion_state(config.path(),&json!({"spots":{"bad key!":"x"},"seenTips":[]})).is_err());
    assert!(save_companion_state(config.path(),&json!({"spots":{},"seenTips":[1]})).is_err());
    fs::write(config.path().join("state.json"),br#"{"format":"lantern-state/2"}"#).unwrap();
    assert!(save_companion_state(config.path(),&json!({"spots":{},"seenTips":[]})).is_err());
}
#[test]
fn amber_log_appends_lines_and_sums_tokens_skipping_bad_lines() {
    let config=tempfile::tempdir().unwrap();
    assert_eq!(amber_log_totals(config.path()).unwrap(),json!({"input":0,"output":0,"calls":0}));
    let record=|i:u64,o:u64| json!({"requestId":"r","usage":{"input":i,"output":o,"thinking":0,"cacheRead":5,"cacheWrite":0}});
    append_amber_log(config.path(),&record(100,20)).unwrap();append_amber_log(config.path(),&record(50,5)).unwrap();
    let mut file=fs::OpenOptions::new().append(true).open(config.path().join("amber-log.jsonl")).unwrap();
    std::io::Write::write_all(&mut file,b"{broken\n").unwrap();
    assert_eq!(amber_log_totals(config.path()).unwrap(),json!({"input":150,"output":25,"calls":2}));
    assert!(append_amber_log(config.path(),&json!({"usage":{}})).is_err());
    assert!(!config.path().join("state.json").exists());
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
    let old_root=crate::paths::canonical(old.path()).unwrap();let dest_root=crate::paths::canonical(destination.path()).unwrap();
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
    let dir = tempfile::tempdir().unwrap(); let mut s = subject(2); s["format"] = json!("lantern/3");
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
    let first = list_subjects(dir.path(), config.path()).unwrap(); assert_eq!(first[0]["rooms"]["learn"]["states"]["open"], 3);
    let mut s = s; s["rooms"]["learn"]["nodes"]["n1"]["state"] = json!("dismissed");
    write_json(&subject_path(dir.path(), "tides-k3f9").unwrap(), &s).unwrap();
    let second = list_subjects(dir.path(), config.path()).unwrap(); assert_eq!(second[0]["rooms"]["learn"]["states"]["dismissed"], 1);
    fs::write(config.path().join("summaries.json"), b"corrupt").unwrap();
    assert_eq!(list_subjects(dir.path(), config.path()).unwrap(), second);
}
#[test]
fn thumbnail_is_bounded_and_excludes_dialogue_and_dismissed_nodes() {
    let dir=tempfile::tempdir().unwrap();let mut s=subject(75);
    s["rooms"]["learn"]["nodes"]["n1"]["state"]=json!("dismissed");
    save_subject(dir.path(),&s,None,true).unwrap();
    let graph=thumbnail(dir.path(),"tides-k3f9","learn").unwrap(); assert!(thumbnail(dir.path(),"tides-k3f9","choose").is_err());
    assert_eq!(graph["nodes"].as_object().unwrap().len(),60);
    assert_eq!(graph["omitted"],14);assert!(graph["nodes"].get("n1").is_none());
    assert!(graph["nodes"].get("n0").is_some());
    for node in graph["nodes"].as_object().unwrap().values(){assert!(node.get("dialogue").is_none());assert!(node.get("content").is_none());}
}
#[test]
#[ignore = "WG-43 cached library timing: run on an idle machine"]
fn fifty_cached_summaries_meet_wg43() {
    let dir=tempfile::tempdir().unwrap();let config=tempfile::tempdir().unwrap();
    for i in 0..50 {let mut s=subject(60);s["id"]=json!(format!("subject-{i}"));save_subject(dir.path(),&s,None,true).unwrap();}
    assert_eq!(list_subjects(dir.path(),config.path()).unwrap().len(),50);
    let start=std::time::Instant::now();let summaries=list_subjects(dir.path(),config.path()).unwrap();let elapsed=start.elapsed();
    assert_eq!(summaries.len(),50);assert!(summaries.iter().all(|s|s["modifiedNs"].is_string()&&s["size"].is_number()));
    println!("WG-43 native 50-subject cached list: {:.2} ms",elapsed.as_secs_f64()*1000.0);
    assert!(elapsed.as_millis()<500,"{elapsed:?}");
}
#[test]
fn poc_import_backup_idempotence_and_reopen() {
    let dir = tempfile::tempdir().unwrap(); let s = subject_v1(3); let v = &s["rooms"]["learn"];
    let mut nodes = v["nodes"].as_object().unwrap().clone();
    for n in nodes.values_mut() { let p = n["parents"][0].clone(); let o = n.as_object_mut().unwrap(); o.remove("parents"); o.remove("author"); o.remove("understoodBy"); o.remove("createdBy"); o.insert("parentId".into(), p); }
    let poc = json!({"format":"lantern-poc/1", "id":s["id"], "title":s["title"], "createdAt":s["createdAt"], "room":"learn", "rootId":"n0", "focusId":"n1", "nodes":nodes});
    let path = subject_path(dir.path(), "tides-k3f9").unwrap(); write_json(&path, &poc).unwrap(); let original = fs::read(&path).unwrap();
    assert_eq!(import_poc(dir.path()).unwrap(), ["tides-k3f9"]);
    let loaded = load_subject(dir.path(), "tides-k3f9").unwrap();
    assert_eq!(loaded.subject["rooms"]["learn"]["nodes"]["n1"]["parents"], json!(["n0"]));
    assert_eq!(loaded.subject["rooms"]["learn"]["nodes"]["n0"]["author"]["kind"], "unknown"); assert_eq!(loaded.subject["format"], "lantern/2");
    assert_eq!(loaded.subject["rooms"]["learn"]["nodes"]["n0"]["createdBy"], "user"); assert_eq!(loaded.subject["rooms"]["learn"]["data"]["tone"], "curious");
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
#[test]
#[ignore = "ST-40..42 real PoC evidence: set LANTERN_POC_DIR to a folder of lantern-poc/1 *.json files (copied to a temp library; originals untouched)"]
fn real_poc_subjects_import_validate_and_round_trip() {
    let source = std::env::var("LANTERN_POC_DIR").expect("LANTERN_POC_DIR");
    let library = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap();
    let folder = library.path().join("subjects"); fs::create_dir_all(&folder).unwrap();
    let mut originals = HashMap::new();
    for entry in fs::read_dir(&source).unwrap() {
        let path = entry.unwrap().path(); if path.extension().is_none_or(|e| e != "json") { continue; }
        let bytes = fs::read(&path).unwrap(); fs::write(folder.join(path.file_name().unwrap()), &bytes).unwrap();
        let poc: Value = serde_json::from_slice(&bytes).unwrap();
        originals.insert(path.file_stem().unwrap().to_string_lossy().to_string(), poc);
    }
    assert!(!originals.is_empty(), "no PoC files found in {source}");
    let mut imported = import_poc(library.path()).unwrap(); imported.sort();
    let mut expected: Vec<String> = originals.keys().cloned().collect(); expected.sort();
    assert_eq!(imported, expected, "every PoC subject must import");
    for (id, poc) in &originals {
        let loaded = load_subject(library.path(), id).unwrap(); // runs validate_subject (invariants)
        assert!(!loaded.read_only);
        let visit = &loaded.subject["rooms"]["learn"];
        let (poc_nodes, nodes) = (poc["nodes"].as_object().unwrap(), visit["nodes"].as_object().unwrap());
        assert_eq!(poc_nodes.len(), nodes.len());
        for (key, p) in poc_nodes {
            for field in ["title", "hook", "kind", "state", "content", "createdAt"] { assert_eq!(p[field], nodes[key][field], "{id}/{key}/{field}"); }
            assert_eq!(p["dialogue"].as_array().map(Vec::len), nodes[key]["dialogue"].as_array().map(Vec::len), "{id}/{key} dialogue turns");
        }
        assert_eq!(visit["rootId"], poc["rootId"]); assert_eq!(visit["focusId"], poc["focusId"]);
        assert_eq!(fs::read(folder.join(".poc-backup").join(format!("{id}.json"))).unwrap(), fs::read(Path::new(&source).join(format!("{id}.json"))).unwrap(), "backup is byte-identical to the source");
        // Save -> reload round trip must be identical.
        let SaveResult::Saved { stamp } = save_subject(library.path(), &loaded.subject, Some(&loaded.stamp), true).unwrap() else { panic!("not saved") };
        let again = load_subject(library.path(), id).unwrap();
        assert_eq!(again.subject, loaded.subject, "{id} save->reload must be equal"); assert_eq!(again.stamp, stamp);
        println!("PoC {id}: {} nodes, {} dialogue turns, round trip equal", nodes.len(), nodes.values().map(|n| n["dialogue"].as_array().map_or(0, Vec::len)).sum::<usize>());
    }
    assert!(import_poc(library.path()).unwrap().is_empty(), "second import is idempotent");
    let list = list_subjects(library.path(), config.path()).unwrap();
    assert_eq!(list.len(), originals.len()); assert!(list.iter().all(|s| s["unreadable"].is_null() && !s["rooms"]["learn"]["states"].as_object().unwrap().is_empty()));
    for s in &list { let t = thumbnail(library.path(), s["id"].as_str().unwrap(), "learn").unwrap(); assert!(t["nodes"].as_object().unwrap().len() > 0); }
}
#[cfg(windows)]
#[test]
#[ignore = "Really sends one disposable temp file to the Windows Recycle Bin (WG-47)"]
fn delete_subject_sends_file_to_real_recycle_bin() {
    let library = tempfile::tempdir().unwrap(); let config = tempfile::tempdir().unwrap();
    let mut s = subject(3); s["id"] = json!("recycle-probe-9f3a"); save_subject(library.path(), &s, None, true).unwrap();
    let path = subject_path(library.path(), "recycle-probe-9f3a").unwrap(); assert!(path.is_file());
    record_open(config.path(), "recycle-probe-9f3a", "2026-10-02T12:00:00Z").unwrap();
    delete_subject(library.path(), config.path(), "recycle-probe-9f3a").unwrap();
    assert!(!path.exists(), "file must have left its original path");
    let state = read_state(config.path()).unwrap(); assert!(state.recents.is_empty() && state.last_opened_at.is_empty());
    println!("Recycle Bin: {} left its original path", path.display());
}
#[test]
fn foreign_files_are_skipped_by_listing_poc_import_and_library_transfer() {
    let old=tempfile::tempdir().unwrap(); let new=tempfile::tempdir().unwrap(); let install=tempfile::tempdir().unwrap(); let config=tempfile::tempdir().unwrap();
    save_subject(old.path(),&subject(3),None,true).unwrap();
    let foreign=old.path().join("subjects/2026-10-02T16-16-07-496Z-haiku.json"); fs::write(&foreign,b"{\"not\":\"a subject\"}").unwrap();
    fs::write(old.path().join("subjects/CON.json"),b"{}").unwrap();
    let listed=list_subjects(old.path(),config.path()).unwrap(); assert_eq!(listed.len(),1); assert_eq!(listed[0]["id"],"tides-k3f9");
    assert!(import_poc(old.path()).unwrap().is_empty());
    crate::library::switch_library(old.path(),new.path(),install.path(),"move",&config.path().join("settings.json"),&json!({"format":"lantern-settings/1","library":{"path":"old"}})).unwrap();
    assert!(foreign.exists() && old.path().join("subjects/CON.json").exists());
    assert!(!new.path().join("subjects/2026-10-02T16-16-07-496Z-haiku.json").exists());
    assert_eq!(list_subjects(new.path(),config.path()).unwrap().len(),1);
}
#[test]
fn disk_paths_never_carry_the_verbatim_prefix() {
    let dir=tempfile::tempdir().unwrap(); let install=tempfile::tempdir().unwrap();
    let canonical=crate::library::validate_folder(dir.path(),install.path()).unwrap();
    assert!(!canonical.to_string_lossy().starts_with(r"\\?\"));
    save_subject(dir.path(),&subject(2),None,true).unwrap(); let config=tempfile::tempdir().unwrap();
    assert!(!list_subjects(dir.path(),config.path()).unwrap()[0]["path"].as_str().unwrap().starts_with(r"\\?\"));
    assert_eq!(crate::paths::plain_path(r"\\?\C:\Users\alexp\Documents\Lantern"),if cfg!(windows){r"C:\Users\alexp\Documents\Lantern"}else{r"\\?\C:\Users\alexp\Documents\Lantern"});
    assert_eq!(crate::paths::plain_path(r"C:\Users\alexp"),r"C:\Users\alexp");
}
#[test]
#[ignore = "ST-32..36 real library evidence: set LANTERN_LIBRARY_COPY to a COPY of a library folder; it is converted in place"]
fn real_library_copy_converts_lists_and_keeps_backups() {
    let library = PathBuf::from(std::env::var("LANTERN_LIBRARY_COPY").expect("LANTERN_LIBRARY_COPY"));
    let config = tempfile::tempdir().unwrap(); let folder = library.join("subjects");
    let originals: HashMap<String, Vec<u8>> = fs::read_dir(&folder).unwrap().filter_map(|e| { let p = e.unwrap().path();
        (p.extension().is_some_and(|x| x == "json")).then(|| (p.file_stem().unwrap().to_string_lossy().to_string(), fs::read(&p).unwrap())) }).collect();
    let listed = list_subjects(&library, config.path()).unwrap();
    assert_eq!(listed.len(), originals.len()); assert!(listed.iter().all(|s| s["unreadable"].is_null()), "{listed:?}");
    for (id, bytes) in &originals {
        let loaded = load_subject(&library, id).unwrap(); assert_eq!(loaded.subject["format"], "lantern/2"); assert!(!loaded.read_only);
        if serde_json::from_slice::<Value>(bytes).unwrap()["format"] == "lantern/1" { assert_eq!(&fs::read(folder.join(".lantern1-backup").join(format!("{id}.json"))).unwrap(), bytes, "{id} backup"); }
        let SaveResult::Saved { .. } = save_subject(&library, &loaded.subject, Some(&loaded.stamp), true).unwrap() else { panic!("{id} not saved") };
        assert_eq!(load_subject(&library, id).unwrap().subject, loaded.subject, "{id} round trip");
        println!("{id}: converted, listed, round trip equal");
    }
}
