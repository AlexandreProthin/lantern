use super::{classify, Completion, ErrorKind, ProviderError, Usage};
use serde_json::Value;
use std::time::Duration;
#[derive(Default)]
pub struct StreamParser { pub text: String, pub model: String, pub invalid_lines: usize, pub events: usize, pub result: Option<Value> }
impl StreamParser {
    pub fn consume(&mut self, line: &str, on_text: &mut dyn FnMut(&str)) -> bool {
        let Ok(v) = serde_json::from_str::<Value>(line) else { self.invalid_lines += 1; return false; };
        if !v["type"].is_string() { self.invalid_lines += 1; return false; }
        self.events += 1;
        match v["type"].as_str() {
            Some("system") if v["subtype"] == "init" => { self.model = v["model"].as_str().unwrap_or("").into(); }
            Some("stream_event") if v["event"]["delta"]["type"] == "text_delta" => {
                if let Some(text) = v["event"]["delta"]["text"].as_str() { self.text.push_str(text); on_text(text); }
            }
            Some("result") => self.result = Some(v), _ => {}
        }
        true
    }
    fn usage(&self) -> Usage {
        let u = self.result.as_ref().map(|r| &r["usage"]);
        let get = |key: &str| u.and_then(|u| u[key].as_u64()).unwrap_or(0);
        Usage { input: get("input_tokens"), output: get("output_tokens"), cache_read: get("cache_read_input_tokens"), cache_write: get("cache_creation_input_tokens"),
            thinking: u.and_then(|u| u["output_tokens_details"]["thinking_tokens"].as_u64()).unwrap_or(0) }
    }
    pub fn error(&self, kind: ErrorKind, details: String, elapsed: Duration) -> ProviderError {
        ProviderError { kind, details, model: self.model.clone(), usage: self.usage(), duration_ms: self.result.as_ref().and_then(|r| r["duration_ms"].as_u64()).unwrap_or(elapsed.as_millis() as u64) }
    }
    pub fn finish(mut self, exit_ok: bool, stderr: String, effort: Option<String>, elapsed: Duration, on_text: &mut dyn FnMut(&str)) -> Result<Completion, ProviderError> {
        let Some(result) = &self.result else {
            let kind = if self.events == 0 && !stderr.is_empty() && matches!(classify(&stderr), ErrorKind::Network) { ErrorKind::Network }
                else if !exit_ok { ErrorKind::ProcessCrashed } else { ErrorKind::Protocol };
            return Err(self.error(kind, format!("No result event; {} invalid lines. {stderr}", self.invalid_lines), elapsed));
        };
        if result["is_error"] == true {
            let text = result["result"].as_str().map(str::to_string).unwrap_or_else(|| result["errors"].to_string());
            return Err(self.error(classify(&text), format!("{text}\n{stderr}").trim().into(), elapsed));
        }
        if self.model.is_empty() { return Err(self.error(ErrorKind::Protocol, "Missing resolved model in system/init".into(), elapsed)); }
        if self.text.is_empty() { if let Some(text) = result["result"].as_str() { self.text = text.into(); on_text(text); } }
        Ok(Completion { text: self.text.clone(), model: self.model.clone(), usage: self.usage(), duration_ms: result["duration_ms"].as_u64().unwrap_or(elapsed.as_millis() as u64), cost_usd: result["total_cost_usd"].as_f64(), outcome: "ok".into(), resolved_effort: effort })
    }
}
