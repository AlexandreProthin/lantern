/** SE-48: the static model list shared by every model picker. The value is what the CLI receives. */
export const MODELS: readonly { id: string; label: string }[] = [
  { id: 'opus', label: 'Opus (latest)' },
  { id: 'sonnet', label: 'Sonnet (latest)' },
  { id: 'haiku', label: 'Haiku (latest)' },
  { id: 'claude-fable-5-1', label: 'Fable 5.1' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5' },
  { id: 'claude-opus-5', label: 'Opus 5' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5' }
];
export const isListedModel = (id: string) => MODELS.some(m => m.id === id);
/** Same rule as provider.defaultModel (settings catalogue). */
export const isValidModel = (id: string) => /^[A-Za-z0-9._:-]{1,100}$/.test(id);

/** Display name of a stored or resolved id; the stored value is never rewritten. */
export function modelName(id: string): string {
  const match = /^(?:claude-)?(opus|sonnet|haiku|fable|mythos)(?:-(\d{1,2})(?:-(\d{1,2}))?)?(?:-\d{8})?$/i.exec(id);
  if (!match) return id;
  const family = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return match[2] ? `${family} ${match[2]}${match[3] ? '.' + match[3] : ''}` : family;
}
