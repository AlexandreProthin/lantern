// UP-20..UP-32: one controller shared by the launch notice and Settings → General.
import { Channel, invoke } from '@tauri-apps/api/core';
import { strings } from '../ui/strings';
export type UpdatePhase = 'idle' | 'checking' | 'up-to-date' | 'available' | 'unconfigured' | 'failed' | 'downloading' | 'installing';
type Checked = { status: 'up-to-date' | 'unconfigured' } | { status: 'available'; version: string; current: string; notes: string | null };
export class UpdateController {
  phase = $state<UpdatePhase>('idle');
  version = $state('');
  /** CO-31: the found release's notes, kept at install for Amber's first greeting after it. */
  notes = $state<string | null>(null);
  percent = $state<number | null>(null);
  message = $state('');
  /** True when the check came from the launch rule, so only that one raises the notice (UP-10, UP-11). */
  fromLaunch = $state(false);
  /** Resolves true when the server answered (UP-1, UP-21); false when it could not be asked. */
  /** `folder`: the local update folder that replaces GitHub (UP-61), or empty. */
  async check(launch: boolean, folder = ''): Promise<boolean> {
    if (this.phase === 'checking' || this.phase === 'downloading' || this.phase === 'installing') return false;
    this.phase = 'checking'; this.message = '';
    try {
      const result = await invoke<Checked>('check_update', { folder: folder || null });
      if (result.status === 'available') { this.version = result.version; this.notes = result.notes; this.fromLaunch = launch; this.phase = 'available'; }
      else this.phase = result.status === 'unconfigured' ? 'unconfigured' : 'up-to-date';
      return result.status !== 'unconfigured';
    } catch (e) {
      const reason = String(e) as keyof typeof strings.updateFolderErrors;
      this.phase = 'failed'; this.message = strings.updateFolderErrors[reason] ?? strings.updateUnreachable; return false;
    }
  }
  /** UP-11, UP-63: *Later* releases the found update and stops the local server. */
  async release(): Promise<void> {
    this.fromLaunch = false;
    if (this.phase === 'available') this.phase = 'idle';
    try { await invoke('release_update'); } catch { /* nothing held */ }
  }
  async install(flush: () => Promise<void>): Promise<void> {
    if (this.phase !== 'available') return;
    this.phase = 'downloading'; this.percent = null; this.message = '';
    try {
      await flush();
      let total = 0, downloaded = 0;
      const progress = new Channel<{ event: string; downloaded?: number; total?: number | null }>();
      progress.onmessage = m => {
        if (m.event === 'installing') { this.phase = 'installing'; return; }
        downloaded = m.downloaded ?? downloaded; total = m.total ?? total;
        this.percent = total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : null;
      };
      await invoke('install_update', { progress });
    } catch (e) { this.phase = 'failed'; this.message = strings.updateInstallFailed(String(e)); }
  }
}
