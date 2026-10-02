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
    fs::write(config.path().join("summary-cache.json"), b"corrupt").unwrap();
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
