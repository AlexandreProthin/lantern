import type { RoomVisit } from './model';

/** WG-30..36: shared by all spaces; never persist totals in the subject. */
export function stats(v: RoomVisit) {
  const nodes = Object.values(v.nodes).filter(n => n.state !== 'dismissed');
  const understood = nodes.filter(n => n.state === 'understood');
  const models: Record<string, number> = Object.create(null);
  let input = 0, output = 0, durationMs = 0;
  const latest = new Map<string, number>();
  v.log.forEach((g, i) => {
    input += g.usage.input; output += g.usage.output; durationMs += g.durationMs;
    models[g.model] = (models[g.model] ?? 0) + g.usage.output;
    latest.set(g.model, i);
  });
  const ranked = Object.entries(models).sort(([a, av], [b, bv]) => bv - av || latest.get(b)! - latest.get(a)!);
  // Largest remainder ensures whole-number shares add to 100 (WG-68).
  const shares = ranked.map(([model, tokens]) => ({ model, output: tokens, share: output ? Math.floor(tokens / output * 100) : 0, remainder: output ? tokens / output * 100 % 1 : 0 }));
  if (output) {
    let missing = 100 - shares.reduce((sum, m) => sum + m.share, 0);
    for (const m of [...shares].sort((a, b) => b.remainder - a.remainder)) if (missing-- > 0) m.share++;
  }
  return { total: nodes.length, lit: nodes.filter(n => ['lit', 'understood'].includes(n.state)).length,
    understood: understood.length, demonstrated: understood.filter(n => n.understoodBy === 'demonstrated').length,
    self: understood.filter(n => n.understoodBy === 'self').length, dark: nodes.filter(n => n.state === 'open').length,
    progress: nodes.length ? understood.length / nodes.length : 0, input, output, tokens: input + output,
    durationMs, generations: v.log.length, mainModel: ranked[0]?.[0] ?? null,
    models: shares.map(({ remainder: _, ...m }) => ({ ...m, share: output ? m.share : null })) };
}
