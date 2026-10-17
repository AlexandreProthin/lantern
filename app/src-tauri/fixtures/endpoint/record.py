"""Records endpoint fixtures from a real server (custom-endpoints plans, slice 0 of each).

Development only, never shipped. Writes each response body byte for byte to `<case>.body` and its
status, content type, safe response headers and request to `cases.json`, so the Rust tests replay
exactly what the server sent.

    python app/src-tauri/fixtures/endpoint/record.py --model gemma4:e2b
    python app/src-tauri/fixtures/endpoint/record.py --preset nvidia --key-env NVIDIA_API_KEY --list gemma
    python app/src-tauri/fixtures/endpoint/record.py --preset nvidia --key-env NVIDIA_API_KEY --model <id>

The key (cloud presets) is read from the environment variable named by --key-env, set by the user in
their own terminal. It is sent only as the Authorization header to --base, and it never reaches a
fixture: a body or header containing it is not saved, and the run says so (CE-70 to CE-74).
"""
import argparse, json, os, sys, time, urllib.error, urllib.request
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).parent
SYSTEM = ("You are a patient tutor. Explain in two short paragraphs, then end with exactly one block:\n"
          "<options>[{\"title\": \"...\", \"hook\": \"...\", \"kind\": \"deeper\"}]</options>\n"
          "with three options. Kinds: deeper, application, adjacent, exercise.")
PROMPT = "SUBJECT: Tides\nTASK: explain why there are two high tides a day."
# A key no server can accept, for the rejected-key case; harmless to store.
FAKE_KEY = "nvapi-lantern-fixture-not-a-real-key-0000000000000000"
# Response headers worth keeping (rate limits, request ids); cookies and anything with a key are dropped.
KEEP_HEADERS = ("content-type", "retry-after", "x-ratelimit", "ratelimit", "x-request-id", "nvcf-")


def call(method, url, body=None, key=None, timeout=600):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"} if data else {}
    if key: headers["Authorization"] = f"Bearer {key}"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read(), time.monotonic() - start
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read(), time.monotonic() - start


def safe_headers(headers):
    return {k: v for k, v in headers.items() if k.lower().startswith(KEEP_HEADERS) and "set-cookie" not in k.lower()}


def ollama_cases(m):
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": PROMPT}]
    long_prompt = PROMPT + "\n" + ("MAP: " + "node about tides and the moon. " * 400)
    return {
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


def nvidia_cases(m):
    """Paths are relative to --base (https://integrate.api.nvidia.com/v1). A case whose key is FAKE_KEY sends the made-up key."""
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": PROMPT}]
    # About 200k tokens of map: more than any Gemma 4 context window.
    huge = PROMPT + "\n" + ("MAP: " + "node about tides and the moon. " * 26000)
    stream = {"model": m, "messages": messages, "stream": True}
    return {
        "nvidia-models": ("GET", "/models", None),
        "nvidia-compat-ok": ("POST", "/chat/completions", {**stream, "stream_options": {"include_usage": True}}),
        "nvidia-compat-no-usage": ("POST", "/chat/completions", stream),
        # CE-52: does NVIDIA accept, ignore or refuse what the thinking setting sends to compatible servers?
        "nvidia-compat-reasoning-none": ("POST", "/chat/completions", {**stream, "stream_options": {"include_usage": True}, "reasoning_effort": "none"}),
        "nvidia-compat-model-missing": ("POST", "/chat/completions", {**stream, "model": "no-such-org/no-such-model"}),
        "nvidia-compat-too-long": ("POST", "/chat/completions", {**stream, "messages": [messages[0], {"role": "user", "content": huge}]}),
        "nvidia-bad-key": ("POST", "/chat/completions", stream, FAKE_KEY),
        "nvidia-models-bad-key": ("GET", "/models", None, FAKE_KEY),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", choices=["ollama", "nvidia"], default="ollama")
    ap.add_argument("--base", help="server root (Ollama) or API base (NVIDIA); defaults per preset")
    ap.add_argument("--model", help="the model to record with (required unless --list)")
    ap.add_argument("--key-env", help="name of the environment variable that holds the API key (cloud presets)")
    ap.add_argument("--list", metavar="FILTER", help="print the server's model ids containing FILTER, record nothing")
    ap.add_argument("--only", help="record only the cases whose name contains this text")
    a = ap.parse_args()
    base = (a.base or {"ollama": "http://localhost:11434", "nvidia": "https://integrate.api.nvidia.com/v1"}[a.preset]).rstrip("/")
    key = None
    if a.key_env:
        key = os.environ.get(a.key_env, "").strip()
        if not key: sys.exit(f"The environment variable {a.key_env} is empty in this terminal. Set it first (see the README).")
        if urlparse(base).scheme != "https": sys.exit("A key is only ever sent over https:// (CE-72).")
    elif a.preset == "nvidia":
        sys.exit("NVIDIA needs --key-env NAME, the variable that holds your key.")

    if a.list is not None:
        status, _, raw, _ = call("GET", base + ("/v1/models" if a.preset == "ollama" else "/models"), key=key)
        if status != 200: sys.exit(f"Listing models failed: HTTP {status}")
        ids = sorted(m["id"] for m in json.loads(raw).get("data", []) if a.list.lower() in m["id"].lower())
        print("\n".join(ids) or f"No model id contains {a.list!r}.")
        return
    if not a.model: sys.exit("--model is required (find it with --list).")

    cases = ollama_cases(a.model) if a.preset == "ollama" else nvidia_cases(a.model)
    index_path = HERE / "cases.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    server = "ollama " + json.loads(call("GET", base + "/api/version")[2]).get("version", "?") if a.preset == "ollama" else urlparse(base).hostname
    secret = key.encode() if key else None
    for name, case in cases.items():
        if a.only and a.only not in name:
            continue
        method, path, body = case[:3]
        use = case[3] if len(case) > 3 else key
        status, headers, raw, secs = call(method, base + path, body, key=use)
        kept = safe_headers(headers)
        # The leak check: the real key must never be written, in a body or a header.
        if secret and (secret in raw or any(secret.decode() in str(v) for v in headers.values())):
            print(f"{name}: NOT SAVED, the response contains your key ({status}, {len(raw)} bytes)")
            continue
        (HERE / f"{name}.body").write_bytes(raw)
        entry = {"status": status, "contentType": headers.get("Content-Type", headers.get("content-type", "")), "method": method, "path": path,
                 "request": body if not (body and "content" in json.dumps(body) and len(json.dumps(body)) > 20000) else {"note": "large prompt, not stored", "chars": len(json.dumps(body))},
                 "server": server, "seconds": round(secs, 1), "recorded": time.strftime("%Y-%m-%d")}
        if a.preset != "ollama": entry["headers"] = kept
        if use == FAKE_KEY: entry["fakeKey"] = True; entry["echoesFakeKey"] = FAKE_KEY.encode() in raw
        index[name] = entry
        print(f"{name}: {status} {len(raw)} bytes {secs:.1f}s")
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
