import { describe, expect, it } from 'vitest';
import { MODELS, isListedModel, isValidModel, modelName } from './models';

describe('SE-48 model list', () => {
  it('starts with the three aliases and holds only valid, unique ids', () => {
    expect(MODELS.slice(0, 3).map(m => m.id)).toEqual(['opus', 'sonnet', 'haiku']);
    expect(MODELS.every(m => isValidModel(m.id))).toBe(true);
    expect(new Set(MODELS.map(m => m.id)).size).toBe(MODELS.length);
    expect(isListedModel('claude-opus-4-8')).toBe(true);
    expect(isListedModel('claude-opus-4-7')).toBe(false);
  });
  it('names resolved, dated and alias ids for display', () => {
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5');
    expect(modelName('claude-opus-5')).toBe('Opus 5');
    expect(modelName('claude-fable-5-1')).toBe('Fable 5.1');
    expect(modelName('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5');
    expect(modelName('haiku')).toBe('Haiku');
    expect(modelName('my-proxy:model')).toBe('my-proxy:model');
  });
  it('labels every listed model as its display name', () => {
    for (const m of MODELS.slice(3)) expect(m.label).toBe(modelName(m.id));
  });
});
