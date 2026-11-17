// GV-90..103: central tuning surface. Route constants retain the accepted recipe.
export const graphMotion = {
  SPAWN_COUNT: 3, SPAWN_STAGGER_MS: 120, SPAWN_GROW_MS: 500,
  PENDING_BREATHE_OPACITY: [0.5, 0.8], PENDING_BREATHE_PERIOD_MS: 2400,
  SPAWN_REVEAL_MS: 200, SPAWN_SHRINK_MS: 300, BUSY_PULSE_PERIOD_MS: 1800,
  SPAWN_PARTICLES: 12, SPAWN_PARTICLE_LIFE_MS: 800, SPAWN_PARTICLE_SPEED: 38,
  route: { speed: 1250, pause: 15, glow: 180, lifeMin: 610, lifeMax: 690, emitEvery: 22, cap: 34, drift: 26 },
  BURST: 16, charge: -900, collide: 62, linkDistance: 130, hideTitlesBelow: 0.5
  , FOCUS_PAN_MS:300, RECENTER_MS:400, FRAME_BUDGET_MS:20, SLOW_SETTLING_MS:1000, VIEW_REST_MS:200
  // A subject's first layout runs to rest unseen, in at most this many steps. A map that grows warms to GROW_ALPHA
  // (GROW_ALPHA_MANY past GROW_MANY nodes at once, e.g. a branch unfolding) instead of 0.9, so the rest of it stays put.
  , SETTLE_TICKS:300, GROW_ALPHA:.3, GROW_MANY:6, GROW_ALPHA_MANY:.6
} as const;
