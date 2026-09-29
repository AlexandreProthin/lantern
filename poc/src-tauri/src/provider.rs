//! Inference providers. The app only talks to `InferenceProvider`; the Claude Code CLI
//! is the first implementation. Others (API, local LLM) plug in behind the same trait.

use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

pub struct InferenceRequest {
    pub system: String,
    pub prompt: String,
}

pub trait InferenceProvider: Send + Sync {
    /// Runs one completion, calling `on_text` with each streamed text chunk.
    /// Returns the full text once the model is done.
    fn stream(
        &self,
        req: &InferenceRequest,
        on_text: &mut dyn FnMut(&str),
    ) -> Result<String, String>;
}

/// `claude -p` with streamed JSON, no tools, no customizations, no saved session.
pub struct ClaudeCliProvider {
    pub model: Option<String>,
}

impl InferenceProvider for ClaudeCliProvider {
    fn stream(
        &self,
        req: &InferenceRequest,
        on_text: &mut dyn FnMut(&str),
    ) -> Result<String, String> {
        let mut cmd = Command::new("claude");
        cmd.args([
            "-p",
            "--output-format",
            "stream-json",
            "--verbose",
            "--include-partial-messages",
            "--safe-mode",
            "--strict-mcp-config",
            "--no-session-persistence",
            "--tools",
            "",
            "--system-prompt",
            &req.system,
        ]);
        if let Some(model) = &self.model {
            cmd.args(["--model", model]);
        }
        // Neutral cwd so no project CLAUDE.md leaks into the context.
        cmd.current_dir(std::env::temp_dir())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("could not start `claude` (is Claude Code installed and on PATH?): {e}"))?;

        // The prompt goes through stdin: no command-line length limit, no quoting issues.
        {
            let mut stdin = child.stdin.take().ok_or("no stdin")?;
            stdin
                .write_all(req.prompt.as_bytes())
                .map_err(|e| format!("could not write the prompt: {e}"))?;
        }

        let stdout = child.stdout.take().ok_or("no stdout")?;
        let mut full = String::new();
        let mut final_text: Option<String> = None;
        let mut error: Option<String> = None;

        for line in BufReader::new(stdout).lines() {
            let line = line.map_err(|e| e.to_string())?;
            let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };
            match v.get("type").and_then(|t| t.as_str()) {
                Some("stream_event") => {
                    let delta = &v["event"]["delta"];
                    if delta["type"] == "text_delta" {
                        if let Some(text) = delta["text"].as_str() {
                            full.push_str(text);
                            on_text(text);
                        }
                    }
                }
                _ => {
                    // The closing summary line carries `result` and `is_error`.
                    if v.get("is_error").and_then(|e| e.as_bool()) == Some(true) {
                        error = Some(
                            v.get("result")
                                .and_then(|r| r.as_str())
                                .unwrap_or("the model returned an error")
                                .to_string(),
                        );
                    } else if let Some(r) = v.get("result").and_then(|r| r.as_str()) {
                        final_text = Some(r.to_string());
                    }
                }
            }
        }

        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        if let Some(e) = error {
            return Err(e);
        }
        if !output.status.success() && full.is_empty() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("claude exited with {}: {}", output.status, stderr.trim()));
        }
        if full.is_empty() {
            if let Some(text) = final_text {
                on_text(&text);
                return Ok(text);
            }
        }
        Ok(full)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Real call through the CLI: `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn claude_cli_streams() {
        let p = ClaudeCliProvider { model: None };
        let req = InferenceRequest {
            system: "Be terse.".into(),
            prompt: "Count from 1 to 5, comma separated.".into(),
        };
        let mut chunks = 0;
        let full = p.stream(&req, &mut |_| chunks += 1).expect("inference failed");
        println!("{chunks} chunks: {full}");
        assert!(full.contains('5'));
        assert!(chunks >= 1);
    }
}
