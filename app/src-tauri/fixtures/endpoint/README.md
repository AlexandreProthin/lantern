# Endpoint fixtures

Recorded byte for byte from real servers for the endpoint provider's tests
([custom-endpoints](../../../../agent_wiki/specs/custom-endpoints.md) CE-42, CE-90). Development only;
nothing here ships.

- `record.py` replays each case against a running server and rewrites `<case>.body`. `cases.json`
  keeps each case's status, content type, request, server version, time and date.
- Recorded 2026-10-17 from **Ollama 0.40.6** serving `gemma4:e2b` (Gemma 4 E2B, Q4_K_M, 4.6B, maximum
  context 131072), CPU only (`size_vram: 0`).
- **llama.cpp `llama-server` and LM Studio were not running**: their fixtures will be written from
  their documentation and marked as such when slice 1 needs them.

```powershell
python app/src-tauri/fixtures/endpoint/record.py --model gemma4:e2b
python app/src-tauri/fixtures/endpoint/record.py --model gemma4:e2b --only compat
```

## What the recordings show

| Case | Format | What it shows |
|---|---|---|
| `ollama-native-ok` | NDJSON, `application/x-ndjson` | `think: false`: `message.content` only. The last line has `done`, `done_reason`, `prompt_eval_count`, `prompt_eval_cached_count`, `eval_count` and durations (`load_duration` 15 s: the model was loaded). |
| `ollama-native-thinking` | NDJSON | `think: true`: thinking arrives in `message.thinking`, separate from `content`; `eval_count` includes it. |
| `ollama-native-think-default` | NDJSON | No `think` field: the model **thinks by default** (`/api/show` reports `thinking.default: true`). |
| `ollama-native-truncated` | NDJSON | `num_ctx: 2048` with a prompt of about 3k tokens: **no error**, `done_reason: stop`, `prompt_eval_count` 1027. The start of the prompt (the system prompt) was dropped, and the reply has no options block. |
| `ollama-native-model-missing` | 404 JSON | `{"error":"model '…' not found"}` |
| `ollama-native-bad-request` | 400 JSON | `{"error":"json: cannot unmarshal …"}` |
| `ollama-compat-ok` | SSE, `text/event-stream` | `reasoning_effort: "none"` turns thinking off; the last event before `[DONE]` has empty `choices`, `usage` and Ollama's `timings`. |
| `ollama-compat-think-default` | SSE | Thinking in `delta.reasoning` (not `reasoning_content`). |
| `ollama-compat-no-usage` | SSE | Without `stream_options.include_usage`: no usage at all (CE-50's estimate). |
| `ollama-compat-model-missing` | 404 JSON | The OpenAI shape: `{"error":{"message":…,"type":"not_found_error"}}` |
| `ollama-compat-models`, `ollama-native-tags` | JSON | The model lists. |
| `ollama-native-show`, `-missing` | JSON | `model_info["gemma4.context_length"]`, `capabilities`, `thinking.values` and `thinking.default`. |

Speed on this machine: about 8–9 output tokens per second, about 15 s to load the model, 2 s to read a
90-token prompt. A Learn light-up of about 800 tokens would take around 90 s without thinking.

**The protocol:** in 3 of the 6 completed replies, the model wrote a complete `<options>[…]` array and
**never closed the tag** (`ollama-native-ok`, `ollama-compat-no-usage`, `ollama-compat-think-default`).
Under TP-31 those replies would give no options (TP-34).
