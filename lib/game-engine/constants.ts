/**
 * SidelineHQ Game Engine Constants
 * 
 * Central location for all game configuration values
 */

// ===========================================
// SEASON CONFIGURATION
// ===========================================

export const SEASON = 0; // Current season number
export const ROUNDS_PER_SEASON = 18;
export const MATCHES_PER_WEEK = 3; // Tue, Thu, Sun

// ===========================================
// MATCH ENGINE
// ===========================================

export const HOME_ADVANTAGE = 2; // OVR bonus for home team
export const COACHING_BONUS = 1; // OVR bonus for coached teams
export const FATIGUE_PER_MATCH = 15; // Fatigue gained per match played

// ===========================================
// TRAINING SYSTEM
// ===========================================

export const FATIGUE_PER_TRAINING = 5; // Fatigue gained per training session
export const REST_RECOVERY = 25; // Fatigue reduced when resting
export const TRAINING_ADVANCE_BASE_CHANCE = 60; // Base % chance to advance progress

/** Training progress stages in order */
export const PROGRESS_STAGES = ['NONE', 'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT'] as const;
export type ProgressStage = typeof PROGRESS_STAGES[number];

/** Stat improvement chances by progress stage (v2.0 - rebalanced) */
export const STAT_IMPROVEMENT_CHANCES: Record<ProgressStage, number> = {
  'NONE': 2,
  'POOR': 5,
  'FAIR': 10,
  'GOOD': 20,
  'VERY GOOD': 35,
  'EXCELLENT': 50
};

/** Stats that can be trained */
export const TRAINABLE_STATS = ['Speed', 'Strength', 'Power', 'Passing', 'Stamina', 'Tackling', 'Kicking'];

// ===========================================
// PLAYER STATS
// ===========================================

/** Stat tier display names (1-8 scale) */
export const STAT_TIER_NAMES: Record<number, string> = {
  1: 'None',
  2: 'Poor',
  3: 'Fair',
  4: 'OK',
  5: 'Good',
  6: 'Very Good',
  7: 'Excellent',
  8: 'Elite'
};

/** Get stat tier name from value */
export function getStatTierName(value: number): string {
  return STAT_TIER_NAMES[Math.max(1, Math.min(8, Math.round(value)))] || 'Unknown';
}

// ===========================================
// POSITION CONFIGURATION
// ===========================================

/** Position fields for tactics in order (jersey 1-17) */
export const POSITION_FIELDS = [
  'pos_fullback',
  'pos_winger_r',
  'pos_centre_r',
  'pos_centre_l',
  'pos_winger_l',
  'pos_five_eighth',
  'pos_halfback',
  'pos_prop_l',
  'pos_hooker',
  'pos_prop_r',
  'pos_second_row_l',
  'pos_second_row_r',
  'pos_lock',
  'bench_1',
  'bench_2',
  'bench_3',
  'bench_4'
];

/** Minutes played by jersey number */
export const MINUTES_BY_JERSEY: Record<number, number> = {
  1: 80,   // Fullback
  2: 80,   // Winger R
  3: 80,   // Centre R
  4: 80,   // Centre L
  5: 80,   // Winger L
  6: 80,   // Five-Eighth
  7: 80,   // Halfback
  8: 50,   // Prop L
  9: 60,   // Hooker
  10: 50,  // Prop R
  11: 80,  // Second Row L
  12: 80,  // Second Row R
  13: 80,  // Lock
  14: 30,  // Bench 1
  15: 30,  // Bench 2
  16: 30,  // Bench 3
  17: 20   // Bench 4
};

// ===========================================
// MOTM (Man of the Match)
// ===========================================

export const MOTM_MIN_RATING = 7.5; // Minimum rating for MOTM

// ===========================================
// POSITIONS LIST
// ===========================================

export const POSITIONS = [
  'Fullback',
  'Winger',
  'Centre',
  'Five-Eighth',
  'Halfback',
  'Prop',
  'Hooker',
  'Second Row',
  'Lock'
];

// ===========================================
// FITNESS SYSTEM (New - not yet implemented)
// ===========================================

/** Fitness tiers for performance modifiers */
export const FITNESS_TIERS = {
  PEAK: { min: 100, max: 100, modifier: 1.05, label: '🌟 Peak' },
  MATCH_FIT: { min: 90, max: 99, modifier: 1.0, label: '💪 Match Fit' },
  GOOD: { min: 80, max: 89, modifier: 0.98, label: '👍 Good' },
  TIRED: { min: 70, max: 79, modifier: 0.95, label: '😓 Tired' },
  FATIGUED: { min: 60, max: 69, modifier: 0.90, label: '😰 Fatigued' },
  STRUGGLING: { min: 50, max: 59, modifier: 0.85, label: '🥵 Struggling' },
  EXHAUSTED: { min: 0, max: 49, modifier: 0.80, label: '🚑 Exhausted' }
};

/** Get fitness tier from percentage */
export function getFitnessTier(fitness: number) {
  if (fitness >= 100) return FITNESS_TIERS.PEAK;
  if (fitness >= 90) return FITNESS_TIERS.MATCH_FIT;
  if (fitness >= 80) return FITNESS_TIERS.GOOD;
  if (fitness >= 70) return FITNESS_TIERS.TIRED;
  if (fitness >= 60) return FITNESS_TIERS.FATIGUED;
  if (fitness >= 50) return FITNESS_TIERS.STRUGGLING;
  return FITNESS_TIERS.EXHAUSTED;
}
