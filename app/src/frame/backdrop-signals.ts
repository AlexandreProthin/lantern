// RS-34: what spaces tell the backdrop. The frame owns the backdrop; rooms only report.
type Listener = { panBy(dx: number, dy: number, ratio: number): void; light(x: number, y: number): void };
let listener: Listener | null = null;
export function listenBackdrop(next: Listener | null) { listener = next; }
/** Graph pan/zoom, as a pixel delta and a zoom ratio. */
export function backdropPan(dx: number, dy: number, ratio: number) { listener?.panBy(dx, dy, ratio); }
/** A node became lit at this viewport position. */
export function backdropLight(x: number, y: number) { listener?.light(x, y); }
