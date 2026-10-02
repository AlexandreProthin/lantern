<script lang="ts">
  import { strings } from '../ui/strings';
  import { providerMode } from './provider-mode';
  const fake = providerMode('__TAURI_INTERNALS__' in window, import.meta.env.VITE_PROVIDER) === 'fake';
</script>
<main><h1>{strings.appName}</h1><p>{strings.scaffold}</p><p>{strings.foundation}</p><small>{fake ? strings.fake : strings.desktop}</small></main>
<style>
  :global(body) { margin: 0; background: #171b20; color: #f1eee7; font-family: system-ui, sans-serif; }
  main { max-width: 44rem; margin: 18vh auto; padding: 2rem; }
  h1 { color: #e8bb72; font-size: 3rem; } p { line-height: 1.7; } small { color: #b4b6ba; }
</style>
