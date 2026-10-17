/**
 * NP-54, CO-45: the selection popover asks Amber through this window event, so the shared panel needs nothing
 * from the frame; the frame answers with the card anchored to the selection.
 */
export const ASK_AMBER_EVENT = 'lantern:ask-amber';
export interface AskAmberDetail {
  text: string;
  /** The selection's box in viewport pixels, to anchor the card. */
  rect: { left: number; top: number; bottom: number };
  /** NP-51 for the same words: *Ask the tutor* on the card. */
  askTutor: () => void;
}
export function askAmber(detail: AskAmberDetail): void { window.dispatchEvent(new CustomEvent<AskAmberDetail>(ASK_AMBER_EVENT, { detail })); }
