# Custom endpoints acceptance (cloud version, plan slice 6)

The user goes through this list in an installed build, with their real NVIDIA key, the real Claude Code CLI and a
real local server. Automated checks (Rust tests with planted fake keys, unit tests, Playwright with the fake key admin)
do not sign these off. The contract is `../agent_wiki/specs/custom-endpoints.md` (CE-3, CE-27, CE-40, CE-53, CE-70
to CE-76, CE-80, CE-81); the order of work is `../agent_wiki/plans/custom-endpoints-cloud.md`.

**Build:** a preview installer from the cloud branch (`npm run installer:preview`, see `README.md`). The version
number for local and cloud together is chosen after this list passes (CE-5).

**Before you start:** have your NVIDIA key ready to paste (from your password manager, not from a file). Ollama is
running with `gemma4:e2b`; Claude Code is installed and signed in. The agent never sees the key: you type it only into
Lantern's key field and, for the key search, into your own terminal.

## Adding NVIDIA (CE-81, CE-3)

- [x] Settings → Provider → *Add endpoint* with *NVIDIA*: before anything is added, a box says that subject text goes
  to `integrate.api.nvidia.com`, with *Add* and *Cancel*. *Cancel* adds nothing.
- [x] *Add*: the URL reads `https://integrate.api.nvidia.com/v1`, and an *API key* field shows dots as you type.

## The key (CE-70 to CE-76)

- [x] Paste the key and *Save key*: the field empties at once, and the row shows *Key set · …* with the key's last 4
  characters, and *Kept in Windows Credential Manager for integrate.api.nvidia.com*.
- [x] Windows Credential Manager (Control Panel → Credential Manager → Windows Credentials) lists
  `Lantern/endpoint/nvidia`, whose comment is the host. It shows no password, by Windows' design.
- [x] Close and reopen Lantern: the row still shows *Key set · …*; no control shows the key.
- [x] *Replace key* and *Remove key* each ask first; *Cancel* keeps the key.s

## Models and Test (CE-21, CE-24, CE-27)

- [x] *Fetch models*: over a hundred models, none pinned, with a filter field. Filter on `nemotron`, pin
  `nvidia/nemotron-3.5-super-vl-120b-a12b`, and set its context size (for example 131072).
- [x] Thinking offers only *Model default*, and a line says NVIDIA does not let Lantern turn thinking off.
- [x] *Test*: *Ready · NVIDIA · nvidia/nemotron-… · n s · answered as private/nvidia/…*. The same note shows on the
  endpoint's row after a real call.

## Learn, Choose and Amber on NVIDIA

- [x] A Learn subject on the NVIDIA model: the intro streams with no thinking text, the root lights with its axes,
  and the meta line reads *NVIDIA · nvidia/nemotron-… · answered as … · not evaluated · n in / n out · n s*.
- [x] A light-up, a reply and *Test me* all work, or keep their text when options are missing. Note the speed.
- [x] Choose on the NVIDIA model with *Use the web*: research still runs on Claude Code; the other tasks run on
  NVIDIA (CE-55).
- [x] Ask Amber with *Amber's model* on the NVIDIA model: it answers. Put *Amber's model* back.

## Tokens (CE-53)

- [x] A subject with only Claude and NVIDIA calls shows its figures as one total, as in v0.4.0: NVIDIA counts with
  Claude.
- [x] A subject with NVIDIA and Ollama calls shows *Claude … · local …*, where *local* is Ollama's part only.

## Errors (CE-40, CE-72)

- [x] *Replace key* with a made-up key (any letters, such as `nvapi-wrong-0000`) and *Test*: *NVIDIA rejected the API
  key…*, with a *Replace key* button beside it. Replace it with your real key: *Test* works again.
- [x] Change the URL to `https://example.com/v1`: a box says subject text would go to `example.com` **and** that the
  key belongs to `integrate.api.nvidia.com` and will be removed. *Cancel* puts the URL back with the key still set.
- [x] *(If the free tier limits you.)* A rate limit says *NVIDIA is limiting requests*, with the wait when NVIDIA
  gives one.

## The key search (slice 5, CE-70, CE-73)

- [x] Close Lantern. In your own PowerShell terminal, from the repository root:
  ```powershell
  $env:NVIDIA_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'NVIDIA API key' -AsSecureString)).Password
  python app/scripts/key_search.py --key-env NVIDIA_API_KEY
  Remove-Item Env:NVIDIA_API_KEY
  ```
  Every line says *not found*, and so does the last one, *Result: not found*. Paste only those lines to the agent.
  
  Result:
  
  ```
  PS C:\Users\alexp\Desktop\lantern\.claude\worktrees\custom-endpoints-keys-71080d> python app/scripts/key_search.py --key-env NVIDIA_API_KEY
  config: C:\Users\alexp\AppData\Roaming\Lantern: 4 files, not found
  library: C:\Users\alexp\Documents\Lantern: 23 files, not found
  webview: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern: 485 files, not found, 39 unreadable
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\lockfile
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Cache\Cache_Data\data_0
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Cache\Cache_Data\data_1
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Cache\Cache_Data\data_2
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Cache\Cache_Data\data_3
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Cache\Cache_Data\index
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnGraphiteCache\data_0
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnGraphiteCache\data_1
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnGraphiteCache\data_2
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnGraphiteCache\data_3
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnGraphiteCache\index
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnWebGPUCache\data_0
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnWebGPUCache\data_1
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnWebGPUCache\data_2
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnWebGPUCache\data_3
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\DawnWebGPUCache\index
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\Extension State\LOCK
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\GPUCache\data_0
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\GPUCache\data_1
    unreadable: C:\Users\alexp\AppData\Local\io.github.alexandreprothin.lantern\EBWebView\Default\GPUCache\data_2
  Result: not found (some files could not be read: close Lantern and run again)
  PS C:\Users\alexp\Desktop\lantern\.claude\worktrees\custom-endpoints-keys-71080d> Remove-Item Env:NVIDIA_API_KEY
  PS C:\Users\alexp\Desktop\lantern\.claude\worktrees\custom-endpoints-keys-71080d>
  ```
  
  

## Removal (CE-75)

- [x] Remove the NVIDIA endpoint (*Remove*, then *Remove this endpoint*): `Lantern/endpoint/nvidia` disappears from
  Windows Credential Manager. Add NVIDIA again: the key field is empty.

## Local endpoints and Claude Code, as accepted (CE-2)

- [x] Ollama: *Test*, then a light-up on `gemma4:e2b`, as in `ACCEPTANCE-ENDPOINTS.md`. Its row has no key field,
  and adding it asks nothing.
- [x] Claude Code: Settings → *Test*, a Learn intro on Opus, a Choose research call and Ask Amber on Haiku, as in
  v0.4.0.
- [x] Nothing else differs from the accepted local version that you notice. Note anything that does.
