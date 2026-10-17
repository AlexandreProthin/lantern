"""Records endpoint fixtures from a running local server (custom-endpoints plan, slice 0).

Development only, never shipped. Writes each response body byte for byte to `<case>.body` and its
status, content type and request to `cases.json`, so the Rust tests replay exactly what the server sent.

    python app/src-tauri/fixtures/endpoint/record.py --model gemma4:e2b
"""
import argparse, json, time, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
SYSTEM = ("You are a patient tutor. Explain in two short paragraphs, then end with exactly one block:\n"
          "<options>[{\"title\": \"...\", \"hook\": \"...\", \"kind\": \"deeper\"}]</options>\n"
          "with three options. Kinds: deeper, application, adjacent, exercise.")
PROMPT = "SUBJECT: Tides\nTASK: explain why there are two high tides a day."


def call(method, url, body=None, timeout=600):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"} if data else {})
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(), time.monotonic() - start
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read(), time.monotonic() - start


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:11434")
    ap.add_argument("--model", required=True)
    ap.add_argument("--only", help="record only the cases whose name contains this text")
    a = ap.parse_args()
    b, m = a.base, a.model
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": PROMPT}]
    long_prompt = PROMPT + "\n" + ("MAP: " + "node about tides and the moon. " * 400)
    cases = {
        # Ollama's native chat (CE-32): NDJSON, one object per line.
        "ollama-native-ok": ("POST", "/api/chat", {"model": m, "messages": messages, "stream": True, "think": False, "options": {"num_ctx": 8192}}),
        "ollama-native-thinking": ("POST", "/api/chat", {"model": m, "messages": messages, "stream": True, "think": True, "options": {"num_ctx": 8192}}),
        "ollama-native-think-default": ("POST", "/api/chat", {"model": m, "messages": messages, "stream": True, "options": {"num_ctx": 8192}}),
        "ollama-native-truncated": ("POST", "/api/chat", {"model": m, "messages": [messages[0], {"role": "user", "content": long_prompt}], "stream": True, "think": False, "options": {"num_ctx": 2048}}),
        "ollama-native-model-missing": ("POST", "/api/chat", {"model": "no-such-model:1b", "messages": messages, "stream": True}),
        "ollama-native-bad-request": ("POST", "/api/chat", {"model": m, "messages": "not a list", "stream": True}),
        # The OpenAI-compatible API, shared by every preset: SSE.
        "ollama-compat-ok": ("POST", "/v1/chat/completions", {"model": m, "messages": messages, "stream": True, "stream_options": {"include_usage": True}, "reasoning_effort": "none"}),
        "ollama-compat-think-default": ("POST", "/v1/chat/completions", {"model": m, "messages": messages, "stream": True, "stream_options": {"include_usage": True}}),
        "ollama-compat-no-usage": ("POST", "/v1/chat/completions", {"model": m, "messages": messages, "stream": True, "reasoning_effort": "none"}),
        "ollama-compat-model-missing": ("POST", "/v1/chat/completions", {"model": "no-such-model:1b", "messages": messages, "stream": True}),
        # Model lists and context sizes (CE-21, CE-30).
        "ollama-compat-models": ("GET", "/v1/models", None),
        "ollama-native-tags": ("GET", "/api/tags", None),
        "ollama-native-show": ("POST", "/api/show", {"model": m}),
        "ollama-native-show-missing": ("POST", "/api/show", {"model": "no-such-model:1b"}),
        "ollama-version": ("GET", "/api/version", None),
    }
    index_path = HERE / "cases.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    _, _, version, _ = call("GET", b + "/api/version")
    for name, (method, path, body) in cases.items():
        if a.only and a.only not in name:
            continue
        status, ctype, raw, secs = call(method, b + path, body)
        (HERE / f"{name}.body").write_bytes(raw)
        index[name] = {"status": status, "contentType": ctype, "method": method, "path": path, "request": body,
                       "server": "ollama " + json.loads(version).get("version", "?"), "seconds": round(secs, 1),
                       "recorded": time.strftime("%Y-%m-%d")}
        print(f"{name}: {status} {len(raw)} bytes {secs:.1f}s")
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
