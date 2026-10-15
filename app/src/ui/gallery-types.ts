import type { Snippet } from 'svelte';
import type { SubjectSummary, cardDetails } from '../frame/catalogue';
/** The card's figures as the catalogue computes them (WG-30..36). */
export type CardDetail = ReturnType<typeof cardDetails>;
/** The room's side of the Gallery (PS-5): the grid keeps the title, rename, actions and errors. */
export interface GallerySnippets {
  /** Top of the card (Learn: the graph thumbnail; Choose: a status band). */
  visual: Snippet<[SubjectSummary]>;
  /** Under the title: progress bar, figures, dates, model. */
  figures: Snippet<[SubjectSummary, CardDetail]>;
  /** The selected card's detail rows, below its actions. */
  details: Snippet<[SubjectSummary, CardDetail]>;
  /** A room's own toolbar in place of the shared one (Choose: status tabs, name filter, sorts); it drives `catalogue.setFilter` and `arrange`. */
  toolbar?: Snippet<[GalleryToolbarContext]>;
  /** Shown in place of the grid when the toolbar's filters match nothing. */
  noMatch?: Snippet<[string]>;
  /** Shown when the library holds no subject of the room. */
  empty?: Snippet;
  /** With it, the selected card lifts over a still grid (Choose): this is the selected card's top block (its pick) in place of `figures`, which keeps the resting card's height. */
  lifted?: Snippet<[SubjectSummary, CardDetail]>;
}
export interface GalleryToolbarContext { cards: SubjectSummary[]; count: number }
/** The room's side of the Gallery that is not markup. */
export interface GalleryRoomView {
  /** Orders and filters the cards the name filter left (default: the catalogue's order); also the keyboard's order. */
  arrange?: (cards: SubjectSummary[]) => SubjectSummary[];
  /** The delete dialog's sentence after the title (default: Learn's nodes and tokens). */
  deleteNote?: (summary: SubjectSummary, showTokens: boolean) => string;
  /** The selected card's button labels (default: the shared strings). */
  labels?: Partial<{ open: string; delete: string; reveal: string }>;
  /** A class on the space's root, for the room's own styles. */
  className?: string;
}
