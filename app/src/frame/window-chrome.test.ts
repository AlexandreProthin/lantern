import { describe, expect, it } from 'vitest';
import { windowTitle } from './window-chrome';
import { strings } from '../ui/strings';

describe('window chrome', () => {
  it('names the room in the window title', () => {
    expect(windowTitle({ name: 'Choose' })).toBe('Lantern · Choose');
  });
  it('lists one Ctrl+Shift shortcut per room, in room order', () => {
    expect(strings.roomShortcuts(['Learn', 'Choose', 'Sample']).split('\n').slice(0, 3))
      .toEqual(['Ctrl+Shift+1 — Learn', 'Ctrl+Shift+2 — Choose', 'Ctrl+Shift+3 — Sample']);
  });
});
