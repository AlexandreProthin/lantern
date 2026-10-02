// GV-90..103: central tuning surface. Route constants retain the accepted recipe.
export const graphMotion = {
  SPAWN_COUNT: 3, SPAWN_STAGGER_MS: 120, SPAWN_GROW_MS: 500,
  PENDING_BREATHE_OPACITY: [0.5, 0.8], PENDING_BREATHE_PERIOD_MS: 2400,
  SPAWN_REVEAL_MS: 200, SPAWN_SHRINK_MS: 300, BUSY_PULSE_PERIOD_MS: 1800,
  route: { speed: 1250, pause: 15, glow: 180, lifeMin: 610, lifeMax: 690, emitEvery: 22, cap: 34, drift: 26 },
  BURST: 16, charge: -900, collide: 62, linkDistance: 130, hideTitlesBelow: 0.5
} as const;
