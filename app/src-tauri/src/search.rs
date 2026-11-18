//! WG-80..86: search across the library's subjects (titles, node titles, hooks, readable text), cheaply: each
//! file is read once and only the fields searched are deserialized (no dialogue, no log). The rules are the
//! frontend's (`src/frame/library-search.ts`, used by the browser build); both are tested on the same cases
//! (`src/frame/library-search.cases.json`).
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashMap, fs, path::Path};

pub const SEARCH_LIMIT: usize = 40;
pub const PER_SUBJECT: usize = 5;
const BEFORE: usize = 40;
const AFTER: usize = 90;

#[derive(Deserialize)]
pub struct Subject { pub id: String, #[serde(default)] pub title: String, #[serde(default)] pub rooms: HashMap<String, Visit> }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Visit { pub root_id: String, #[serde(default)] pub nodes: HashMap<String, Node> }
#[derive(Deserialize)]
pub struct Node {
    #[serde(default)] pub title: String, #[serde(default)] pub hook: String, #[serde(default)] pub content: String,
    #[serde(default)] pub state: String, #[serde(default)] pub parents: Vec<String>,
}

/// Lower case without the accents of Latin letters, one char for one char (so offsets in chars hold).
fn fold_char(c: char) -> char {
    let base = match c {
        'À'..='Å' | 'à'..='å' | 'Ā'..='ą' => 'a', 'Ç' | 'ç' | 'Ć'..='č' => 'c', 'Ď'..='đ' => 'd',
        'È'..='Ë' | 'è'..='ë' | 'Ē'..='ě' => 'e', 'Ĝ'..='ģ' => 'g', 'Ĥ'..='ħ' => 'h', 'Ì'..='Ï' | 'ì'..='ï' | 'Ĩ'..='ı' => 'i',
        'Ĵ' | 'ĵ' => 'j', 'Ķ' | 'ķ' => 'k', 'Ĺ'..='ł' => 'l', 'Ñ' | 'ñ' | 'Ń'..='ň' => 'n', 'Ò'..='Ö' | 'ò'..='ö' | 'Ō'..='ő' => 'o',
        'Ŕ'..='ř' => 'r', 'Ś'..='š' => 's', 'Ţ'..='ť' => 't', 'Ù'..='Ü' | 'ù'..='ü' | 'Ũ'..='ų' => 'u', 'Ŵ' | 'ŵ' => 'w',
        'Ý' | 'ý' | 'ÿ' | 'Ŷ'..='Ÿ' => 'y', 'Ź'..='ž' => 'z', _ => c,
    };
    let mut lower = base.to_lowercase();
    match (lower.next(), lower.next()) { (Some(l), None) => l, _ => base }
}
pub fn fold(text: &str) -> Vec<char> { text.chars().map(fold_char).collect() }
fn find(hay: &[char], needle: &[char]) -> Option<usize> {
    if needle.is_empty() || needle.len() > hay.len() { return None; }
    (0..=hay.len() - needle.len()).find(|&i| hay[i..i + needle.len()] == *needle)
}

/// GV-120 in Learn: readable when every node above is lit or understood; other rooms show everything.
fn readable(room: &str, nodes: &HashMap<String, Node>, id: &str) -> bool {
    if room != "learn" { return true; }
    let mut seen = std::collections::HashSet::new();
    let mut parent = nodes.get(id).and_then(|n| n.parents.first());
    while let Some(p) = parent {
        if !seen.insert(p.clone()) { break; }
        match nodes.get(p).map(|n| n.state.as_str()) { Some("lit") | Some("understood") => {}, _ => return false }
        parent = nodes.get(p).and_then(|n| n.parents.first());
    }
    true
}

/// A line of context around char offset `at`, whitespace collapsed, with ellipses where it was cut.
pub fn snippet(text: &str, at: usize, len: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    let (mut flat, mut at_flat, mut space) = (Vec::with_capacity(chars.len()), 0, false);
    for (i, c) in chars.iter().enumerate() {
        if i == at { at_flat = flat.len(); }
        if c.is_whitespace() { if !space { flat.push(' '); } space = true; } else { flat.push(*c); space = false; }
    }
    let start = at_flat.saturating_sub(BEFORE); let end = (at_flat + len + AFTER).min(flat.len());
    let body: String = flat[start..end].iter().collect();
    format!("{}{}{}", if start > 0 { "…" } else { "" }, body.trim(), if end < flat.len() { "…" } else { "" })
}

/// The hits of one subject, best first, at most PER_SUBJECT per room.
pub fn search_subject(subject: &Subject, terms: &[Vec<char>]) -> Vec<Value> {
    let mut out = Vec::new();
    let mut rooms: Vec<_> = subject.rooms.iter().collect(); rooms.sort_by(|a, b| a.0.cmp(b.0));
    for (room, visit) in rooms {
        let mut found: Vec<(usize, bool, String, Value)> = Vec::new();
        for (id, node) in &visit.nodes {
            if !readable(room, &visit.nodes, id) { continue; }
            let mut fields = vec![("title", &node.title), ("hook", &node.hook)];
            if node.state != "open" { fields.push(("content", &node.content)); }
            let folded: Vec<Vec<char>> = fields.iter().map(|(_, t)| fold(t)).collect();
            if !terms.iter().all(|t| folded.iter().any(|f| find(f, t).is_some())) { continue; }
            let Some(index) = folded.iter().position(|f| find(f, &terms[0]).is_some()) else { continue };
            let (field, text) = fields[index];
            let line = if field == "title" { node.hook.clone() } else { snippet(text, find(&folded[index], &terms[0]).unwrap_or(0), terms[0].len()) };
            found.push((index, id == &visit.root_id, node.title.clone(), json!({ "subjectId": subject.id, "subjectTitle": subject.title, "room": room,
                "nodeId": id, "nodeTitle": node.title, "field": field, "snippet": line })));
        }
        if found.is_empty() && terms.iter().all(|t| find(&fold(&subject.title), t).is_some()) {
            if let Some(root) = visit.nodes.get(&visit.root_id) {
                found.push((0, true, root.title.clone(), json!({ "subjectId": subject.id, "subjectTitle": subject.title, "room": room,
                    "nodeId": visit.root_id, "nodeTitle": root.title, "field": "subject", "snippet": root.hook })));
            }
        }
        found.sort_by(|a, b| a.0.cmp(&b.0).then(b.1.cmp(&a.1)).then(a.2.cmp(&b.2)));
        out.extend(found.into_iter().take(PER_SUBJECT).map(|f| f.3));
    }
    out
}

pub fn terms(query: &str) -> Vec<Vec<char>> {
    query.split_whitespace().map(fold).filter(|t| !t.is_empty()).collect()
}

/// Every subject file of the library, searched in title order; capped at `limit` hits.
pub fn search_library(library: &Path, query: &str, limit: usize) -> Result<Vec<Value>, String> {
    let terms = terms(query);
    if terms.is_empty() { return Ok(Vec::new()); }
    let folder = library.join("subjects"); crate::paths::reject_link(&folder)?;
    if !folder.is_dir() { return Ok(Vec::new()); }
    let mut subjects = Vec::new();
    for entry in fs::read_dir(&folder).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().is_none_or(|e| e != "json") { continue; }
        let Some(id) = path.file_stem().and_then(|s| s.to_str()) else { continue };
        if id.contains(".conflict-") || !crate::paths::is_subject_id(id) { continue; }
        // An unreadable or newer file is left out of the results, as the Gallery shows it without a graph.
        let Ok(file) = fs::File::open(&path) else { continue };
        let Ok(subject) = serde_json::from_reader::<_, Subject>(std::io::BufReader::new(file)) else { continue };
        subjects.push(subject);
    }
    Ok(search_subjects(&subjects, &terms, limit))
}
pub fn search_subjects(subjects: &[Subject], terms: &[Vec<char>], limit: usize) -> Vec<Value> {
    if terms.is_empty() { return Vec::new(); }
    let mut order: Vec<&Subject> = subjects.iter().collect();
    order.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    let mut hits = Vec::new();
    for subject in order {
        for hit in search_subject(subject, terms) { hits.push(hit); if hits.len() >= limit { return hits; } }
    }
    hits
}

#[cfg(test)]
mod tests {
    use super::*;
    #[derive(Deserialize)] struct Cases { subjects: Vec<Subject>, cases: Vec<Case> }
    #[derive(Deserialize)] struct Case { query: String, hits: Vec<[String; 3]> }

    #[test]
    fn wg80_same_results_as_the_browser_search() {
        let cases: Cases = serde_json::from_str(include_str!("../../src/frame/library-search.cases.json")).unwrap();
        for case in cases.cases {
            let hits = search_subjects(&cases.subjects, &terms(&case.query), SEARCH_LIMIT);
            let got: Vec<[String; 3]> = hits.iter().map(|h| [h["subjectId"].as_str().unwrap().into(), h["nodeId"].as_str().unwrap().into(), h["field"].as_str().unwrap().into()]).collect();
            assert_eq!(got, case.hits, "query {:?}", case.query);
        }
    }
    #[test]
    fn wg83_capped_and_snippets_on_one_line() {
        let nodes: HashMap<String, Node> = (0..30).map(|i| (format!("n{i}"), Node { title: format!("Topic {i}"), hook: String::new(), content: String::new(), state: "lit".into(), parents: vec!["n0".into()] })).collect();
        let subject = Subject { id: "big".into(), title: "Big".into(), rooms: HashMap::from([("choose".to_string(), Visit { root_id: "n0".into(), nodes })]) };
        assert_eq!(search_subjects(std::slice::from_ref(&subject), &terms("topic"), SEARCH_LIMIT).len(), PER_SUBJECT);
        assert_eq!(fold("Étude Des MARÉES").into_iter().collect::<String>(), "etude des marees");
        let text = format!("{}needle and\n\nmore", "a ".repeat(80));
        let line = snippet(&text, 160, 6);
        assert!(line.starts_with('…') && line.ends_with("needle and more"), "{line}");
    }
    #[test]
    fn wg84_reads_the_library_folder_and_skips_what_it_cannot_read() {
        let dir = tempfile::tempdir().unwrap(); let subjects = dir.path().join("subjects"); fs::create_dir_all(&subjects).unwrap();
        let cases: Value = serde_json::from_str(include_str!("../../src/frame/library-search.cases.json")).unwrap();
        for s in cases["subjects"].as_array().unwrap() { fs::write(subjects.join(format!("{}.json", s["id"].as_str().unwrap())), s.to_string()).unwrap(); }
        fs::write(subjects.join("broken.json"), "{ not json").unwrap();
        fs::write(subjects.join("ocean-tides.conflict-1.json"), "{}").unwrap();
        let hits = search_library(dir.path(), "moon", SEARCH_LIMIT).unwrap();
        assert_eq!(hits.len(), 2); assert_eq!(hits[0]["nodeId"], "n1"); assert_eq!(hits[0]["room"], "learn");
        assert!(search_library(dir.path(), "", SEARCH_LIMIT).unwrap().is_empty());
    }
}
