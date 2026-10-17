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

## NVIDIA (cloud plan, slice 0)

Run by the user, in their own PowerShell terminal, from the repository root (the worktree). The key goes
into an environment variable of that terminal only. The prompt below hides it as it is typed, and it is
never written to a file, a fixture or the chat.

1. Set the key (masked input, works in Windows PowerShell 5.1):
   ```powershell
   $env:NVIDIA_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'NVIDIA API key' -AsSecureString)).Password
   ```
2. Find the Gemma 4 model id:
   ```powershell
   python app/src-tauri/fixtures/endpoint/record.py --preset nvidia --key-env NVIDIA_API_KEY --list gemma
   ```
3. Record, with the id from step 2:
   ```powershell
   python app/src-tauri/fixtures/endpoint/record.py --preset nvidia --key-env NVIDIA_API_KEY --model <id>
   ```
4. Clear the key from the terminal:
   ```powershell
   Remove-Item Env:NVIDIA_API_KEY
   ```

The key is sent only as the `Authorization` header, only over https, and only to `--base`
(`https://integrate.api.nvidia.com/v1` by default). A response that contains it is **not saved**, and
the run prints *NOT SAVED*. The two bad-key cases send a made-up key instead; `cases.json` marks them
`fakeKey` and notes whether the server echoed that key. Only rate-limit, request-id and content-type
headers are kept.

### What NVIDIA showed (2026-10-17, partial)

- `google/gemma-4-31b-it` never answered a chat call within 300 s, headers included: NVIDIA's queue for it
  was very long (the user). The user chose **`nvidia/nemotron-3.5-super-vl-120b-a12b`** instead.
- On that model, every chat case came back at once as **HTTP 500** `{"message":"Failed to generate
  completions","type":"Internal Server Error","code":500}`, with `Nvcf-Status: errored`. It is kept as
  `nvidia-server-error`. The `--only probe` cases look for the part of the request it refuses: no system
  message, not streamed, or content as text parts.

| Case | What it shows |
|---|---|
| `nvidia-models` | 81 models. **The list is public**: it also answers with a made-up key (`nvidia-models-bad-key`, 200), so listing models cannot tell a good key from a bad one. |
| `nvidia-bad-key` | **403**, not 401: `application/problem+json`, `{"status":403,"title":"Forbidden","detail":"Authorization failed"}`. The made-up key is not echoed. |
| `nvidia-compat-model-missing` | **404, plain text `404 page not found`**: nothing names a model, so the classification has to know that a 404 on NVIDIA's chat route means an unknown model, not an absent server. |
| `nvidia-server-error` | The 500 above. |

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
