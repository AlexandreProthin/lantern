<script lang="ts">
  // Learn's Welcome: the shared Welcome (ui/Welcome) with Learn's default tone, suggestions and recent cards.
  import type { SpaceProps } from '../../frame/room';
  import type { SubjectSummary } from '../../frame/catalogue';
  import type { WelcomeRoomView } from '../../ui/welcome-types';
  import Welcome from '../../ui/Welcome.svelte';
  import { SubjectSuggestions } from './suggestions';
  import { learnSettings } from './settings';
  import Thumbnail from './Thumbnail.svelte';
  let { visible, settings, library, revision, navigate }: SpaceProps = $props();
  const room: WelcomeRoomView = {
    defaultTone: settings => learnSettings(settings).defaultTone,
    // The web demo has nothing prepared to suggest.
    suggestions: import.meta.env.VITE_DEMO ? undefined : (provider, changed) => new SubjectSuggestions(provider, changed)
  };
</script>
{#snippet visual(summary: SubjectSummary)}<Thumbnail {summary} {library}/>{/snippet}
{#snippet figure(summary: SubjectSummary)}{summary.understood??0} / {summary.total??0}{/snippet}
<Welcome {visible} {settings} {library} {revision} {navigate} {room} {visual} {figure} />
