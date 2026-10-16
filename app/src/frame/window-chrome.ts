import { getCurrentWindow } from '@tauri-apps/api/window';
import { Image } from '@tauri-apps/api/image';
import type { RoomDefinition } from './room';

/** The window title as Alt-Tab and the taskbar show it, now that the window has no title bar. */
export const windowTitle = (room: Pick<RoomDefinition, 'name'>) => `Lantern · ${room.name}`;

/**
 * Paints the header mark (a 100×100 SVG of paths and one rect) into RGBA at `size` px, with the
 * flame (the only path carrying its own fill) in `flame`. Drawn with Path2D rather than loaded
 * as an image, because the app CSP blocks the blob: and data: URLs an <img> would need.
 */
export function markPixels(svg: string, flame: string, size: number): Uint8Array {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!; ctx.scale(size / 100, size / 100);
  const base = doc.querySelector('g')?.getAttribute('fill') ?? '#eeeeee';
  for (const el of doc.querySelectorAll('g > *')) {
    ctx.fillStyle = el.hasAttribute('fill') ? flame : base;
    if (el.tagName === 'path') ctx.fill(new Path2D(el.getAttribute('d')!), el.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero');
    else if (el.tagName === 'rect') {
      const [x, y, w, h, r] = ['x', 'y', 'width', 'height', 'rx'].map(a => Number(el.getAttribute(a) ?? 0));
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    }
  }
  return new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer);
}

/** Title and taskbar icon follow the room, as the header mark does. */
export async function applyRoomChrome(room: RoomDefinition, mark: string) {
  const window = getCurrentWindow(), size = 64;
  await window.setTitle(windowTitle(room));
  await window.setIcon(await Image.new(markPixels(mark, room.accent['--accent'], size), size, size));
}
