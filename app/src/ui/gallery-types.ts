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
}
