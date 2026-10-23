import { MediaQuery } from 'svelte/reactivity';
/** NW-40: the phone layout's one breakpoint. Desktop widths (1024 px and up) never see it (NW-43). */
export const PHONE_MAX = 719;
export const phone = new MediaQuery(`max-width: ${PHONE_MAX}px`, false);
