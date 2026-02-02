/**
 * SidelineHQ Game Engine Constants
 * All configurable values in one place for easy tuning
 * 
 * UPDATED: January 31, 2026
 * - Stat tiers changed from 1-8 to 0-7
 * - OVR range changed from 0-49 to 0-49
 * - Labels: NONE → BAD → POOR → OK → GOOD → GREAT → EXC → ELITE
 * - Fatigue rebalance: FATIGUE_PER_MATCH = 12, scaled recovery
 * - Origin fatigue: 10-13 range
 */

import type { PositionConfig, ProgressStage } from './types';

// ===========================================
// MATCH ENGINE CONSTANTS
// ===========================================

/** Current season number */
export const SEASON = 0;

/** Home team advantage (added to strength) */
export const HOME_ADVANTAGE = 3;

/** Base number of tries per team per match */
export const BASE_TRIES = 4;

/** Bonus for teams with a human coach */
export const COACHING_BONUS = 12;

/** Fatigue added per match played (80 mins) - REBALANCED for slow decline */
export const FATIGUE_PER_MATCH = 2;

/** Fatigue added per training session */
export const FATIGUE_PER_TRAINING = 0;

/** Fatigue recovered when resting (not playing) */
export const REST_RECOVERY = 25;

/** Baseline fatigue recovery for ALL players between matches (realistic weekly recovery) */
export const BASELINE_RECOVERY = 10;

// ===========================================
// POSITION CONFIGURATION
// ===========================================

/** 
 * Position-specific base stats for stat generation
 * Jersey numbers 1-13 are starters, 14-17 are bench
 */
export const POSITION_CONFIGS: Record<number, PositionConfig> = {
  // Backs - need 150+ metres for excellent
  1:  { metresBase: 160, tacklesBase: 8,  touchesBase: 18 },  // Fullback
  2:  { metresBase: 140, tacklesBase: 10, touchesBase: 12 },  // Winger
  3:  { metresBase: 150, tacklesBase: 18, touchesBase: 14 },  // Centre
  4:  { metresBase: 150, tacklesBase: 18, touchesBase: 14 },  // Centre
  5:  { metresBase: 140, tacklesBase: 10, touchesBase: 12 },  // Winger
  6:  { metresBase: 120, tacklesBase: 22, touchesBase: 22 },  // Five-eighth
  7:  { metresBase: 70,  tacklesBase: 28, touchesBase: 35 },  // Halfback
  // Forwards - need 180+ metres for excellent
  8:  { metresBase: 190, tacklesBase: 32, touchesBase: 14 },  // Prop
  9:  { metresBase: 80,  tacklesBase: 48, touchesBase: 40 },  // Hooker
  10: { metresBase: 190, tacklesBase: 32, touchesBase: 14 },  // Prop
  11: { metresBase: 170, tacklesBase: 36, touchesBase: 14 },  // Second Row
  12: { metresBase: 170, tacklesBase: 36, touchesBase: 14 },  // Second Row
  13: { metresBase: 180, tacklesBase: 42, touchesBase: 16 },  // Lock
  // Bench (reduced minutes = lower base)
  14: { metresBase: 80,  tacklesBase: 18, touchesBase: 8 },
  15: { metresBase: 70,  tacklesBase: 16, touchesBase: 8 },
  16: { metresBase: 60,  tacklesBase: 14, touchesBase: 6 },
  17: { metresBase: 50,  tacklesBase: 12, touchesBase: 5 },
} as const;

/** Default config for unknown jersey numbers */
export const DEFAULT_POSITION_CONFIG: PositionConfig = { 
  metresBase: 80, 
  tacklesBase: 18, 
  touchesBase: 8 
};

/** Minutes played per jersey position */
export const MINUTES_BY_JERSEY: Record<number, number> = {
  1: 80, 2: 80, 3: 80, 4: 80, 5: 80, 6: 80, 7: 80,
  8: 80, 9: 80, 10: 80, 11: 80, 12: 80, 13: 80,
  14: 25, 15: 20, 16: 10, 17: 0
} as const;

// ===========================================
// POSITION FIELD MAPPINGS
// ===========================================

/** Order of position fields in tactics table */
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
] as const;

/** Jersey numbers that are backs (for line break calculations) */
export const BACK_JERSEYS = [1, 2, 3, 4, 5, 6] as const;

/** Jersey numbers that are forwards (for tackle break calculations) */
export const FORWARD_JERSEYS = [8, 9, 10, 11, 12, 13] as const;

/** Jersey numbers that are playmakers (for MOTM bonus) */
export const PLAYMAKER_JERSEYS = [6, 7, 9] as const;

/** Jersey numbers that are outside backs (for try scoring) */
export const OUTSIDE_BACK_JERSEYS = [1, 2, 3, 4, 5] as const;

// ===========================================
// TRY SCORING WEIGHTS
// ===========================================

/** 
 * Weights for try scoring by jersey position
 * Higher = more likely to score
 */
export const TRY_SCORER_WEIGHTS = [
  15,  // #1 Fullback
  20,  // #2 Winger
  12,  // #3 Centre
  12,  // #4 Centre
  20,  // #5 Winger
  10,  // #6 Five-eighth
  8,   // #7 Halfback
  5,   // #8 Prop
  8,   // #9 Hooker
  4,   // #10 Prop
  10,  // #11 Second Row
  10,  // #12 Second Row
  8,   // #13 Lock
  3,   // #14 Bench
  3,   // #15 Bench
  2,   // #16 Bench
  2    // #17 Bench
] as const;

/** 
 * Weights for try assists by jersey position
 * Playmakers get higher weights
 */
export const TRY_ASSISTER_WEIGHTS = [
  8,   // #1 Fullback
  5,   // #2 Winger
  10,  // #3 Centre
  10,  // #4 Centre
  5,   // #5 Winger
  20,  // #6 Five-eighth
  25,  // #7 Halfback
  2,   // #8 Prop
  15,  // #9 Hooker
  2,   // #10 Prop
  5,   // #11 Second Row
  5,   // #12 Second Row
  5,   // #13 Lock
  2,   // #14 Bench
  2,   // #15 Bench
  1,   // #16 Bench
  1    // #17 Bench
] as const;

// ===========================================
// STAT GENERATION THRESHOLDS
// ===========================================

/** Missed tackle chance by tackling stat */
export const MISS_CHANCE_THRESHOLDS = [
  { min: 90, chance: 0.01 },
  { min: 80, chance: 0.02 },
  { min: 70, chance: 0.03 },
  { min: 60, chance: 0.04 },
  { min: 50, chance: 0.05 },
  { min: 40, chance: 0.07 },
  { min: 0,  chance: 0.10 }
] as const;

/** Error chance by passing stat */
export const ERROR_CHANCE_THRESHOLDS = [
  { min: 90, chance: 0.005 },
  { min: 80, chance: 0.01 },
  { min: 70, chance: 0.015 },
  { min: 60, chance: 0.02 },
  { min: 50, chance: 0.025 },
  { min: 40, chance: 0.035 },
  { min: 0,  chance: 0.05 }
] as const;

// ===========================================
// TRAINING CONSTANTS
// ===========================================

/** Ordered list of training progress stages */
export const PROGRESS_STAGES: ProgressStage[] = [
  'NONE',
  'POOR',
  'FAIR',
  'GOOD',
  'VERY GOOD',
  'EXCELLENT'
];

/** Chance of stat improvement by progress stage (rebalanced v2.0) */
export const STAT_IMPROVEMENT_CHANCES: Record<ProgressStage, number> = {
  'NONE': 2,
  'POOR': 5,
  'FAIR': 10,
  'GOOD': 20,
  'VERY GOOD': 35,
  'EXCELLENT': 50
};

/** Stats that can be trained */
export const TRAINABLE_STATS = [
  'Speed',
  'Strength',
  'Power',
  'Passing',
  'Stamina',
  'Tackling',
  'Kicking'
] as const;

/** Base chance to advance training progress */
export const TRAINING_ADVANCE_BASE_CHANCE = 60;

// ===========================================
// FREE AGENCY CONSTANTS
// ===========================================

/** OVR threshold for "ambitious star" classification (adjusted for 0-49 scale) */
export const AMBITIOUS_STAR_OVR_THRESHOLD = 36;

/** Age threshold for "young prospect" classification */
export const YOUNG_PROSPECT_AGE_THRESHOLD = 21;

/** Age threshold for "veteran" classification */
export const VETERAN_AGE_THRESHOLD = 30;

/** Maximum squad size */
export const MAX_SQUAD_SIZE = 30;

/** Minimum squad size */
export const MIN_SQUAD_SIZE = 17;

// ===========================================
// RATING CONSTANTS
// ===========================================

/** Base rating for all players */
export const BASE_RATING = 7.0;

/** Minimum guaranteed rating for MOTM */
export const MOTM_MIN_RATING = 9;

/** Maximum possible rating */
export const MAX_RATING = 10;

/** Minimum possible rating */
export const MIN_RATING = 1;

// ===========================================
// RATING BONUSES/PENALTIES
// ===========================================

export const RATING_MODIFIERS = {
  tryBonus: 0.7,
  tryAssistBonus: 0.5,
  goalBonus: 0.25,
  lineBreakBonus: 0.3,
  tackleBreakBonus: 0.2,
  missedTacklePenalty: 0.05,
  errorPenalty: 0.08,
  cleanSheetTackles: 0.3,
  cleanSheetErrors: 0.2,
  captainBonus: 0.2
} as const;

// ===========================================
// STAT TIER NAMES (v3.0 - 0-7 Scale)
// ===========================================

/** 
 * Stat tier names for display (0-7 scale)
 * OVR = sum of 7 stats = 0-49 range
 */
export const STAT_TIER_NAMES: Record<number, string> = {
  0: 'NONE',
  1: 'BAD',
  2: 'POOR',
  3: 'OK',
  4: 'GOOD',
  5: 'GREAT',
  6: 'EXC',
  7: 'ELITE'
};

/** Get tier name from stat value */
export function getStatTierName(value: number): string {
  return STAT_TIER_NAMES[Math.max(0, Math.min(7, value))] || 'Unknown';
}

/** Minimum stat value */
export const MIN_STAT = 0;

/** Maximum stat value */
export const MAX_STAT = 7;

/** Minimum OVR (7 stats × 0) */
export const MIN_OVR = 0;

/** Maximum OVR (7 stats × 7) */
export const MAX_OVR = 49;

// ===========================================
// FITNESS DISPLAY (Training System v2.0)
// ===========================================

/** Fitness tier thresholds and labels */
export const FITNESS_TIERS = [
  { min: 90, label: 'Peak', color: 'text-green-400' },
  { min: 70, label: 'Fresh', color: 'text-green-300' },
  { min: 50, label: 'OK', color: 'text-yellow-400' },
  { min: 30, label: 'Tired', color: 'text-orange-400' },
  { min: 0, label: 'Exhausted', color: 'text-red-400' }
] as const;

// ===========================================
// SEASON CONSTANTS
// ===========================================

/** Number of rounds per season */
export const ROUNDS_PER_SEASON = 20;

/** Number of matches per week */
export const MATCHES_PER_WEEK = 1;

/** List of all positions */
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
] as const;

// ===========================================
// ORIGIN CONSTANTS
// ===========================================

/** Rounds when Origin games occur (Season 0) */
export const ORIGIN_ROUNDS = [9, 12, 15] as const;

/** Origin team display names */
export const ORIGIN_TEAM_NAMES = {
  NSW: 'NSW Blues',
  QLD: 'QLD Maroons'
} as const;

/** Origin team colors for UI */
export const ORIGIN_TEAM_COLORS = {
  NSW: { primary: '#87CEEB', secondary: '#1E3A5F', text: '#1a1a2e' },
  QLD: { primary: '#800020', secondary: '#FFD700', text: '#ffffff' }
} as const;

/** Origin match fatigue minimum */
export const ORIGIN_FATIGUE_MIN = 10;

/** Origin match fatigue maximum */
export const ORIGIN_FATIGUE_MAX = 13;

/** Helper to get random Origin fatigue (10-13) */
export function getOriginFatigue(): number {
  return Math.floor(Math.random() * (ORIGIN_FATIGUE_MAX - ORIGIN_FATIGUE_MIN + 1)) + ORIGIN_FATIGUE_MIN;
}

// =============================================
// INJURY SYSTEM CONSTANTS
// =============================================

// Base injury chance per match (4% - realistic for NRL)
// Real NRL: ~3-5 injuries per round across 16 teams = ~2-3% per player
export const BASE_INJURY_CHANCE = 0.04;

// Durability modifiers (multiply base chance)
// Durability is now the PRIMARY injury factor
export const DURABILITY_INJURY_MODIFIERS: Record<string, number> = {
  fragile: 1.8,    // 7.2% chance - injury-prone players are risky
  normal: 1.0,     // 4% chance - standard
  durable: 0.6,    // 2.4% chance - reliable
  ironman: 0.3,    // 1.2% chance - almost never injured
};

// Fatigue tier modifiers (multiply base chance)
// REDUCED impact - fatigue is secondary to durability
// Remember: fatigue 0 = fresh, 100 = exhausted
export const FATIGUE_INJURY_MODIFIERS: Record<string, number> = {
  fresh: 1.0,      // fatigue 0-30: no modifier
  mild: 1.05,      // fatigue 31-50: minimal impact
  moderate: 1.1,   // fatigue 51-70: slight increase
  high: 1.2,       // fatigue 71-85: noticeable
  exhausted: 1.3,  // fatigue 86-100: significant but not extreme
};

// Hidden trait modifiers
export const TRAIT_INJURY_MODIFIERS: Record<string, number> = {
  'Glass Cannon': 1.25,  // +25% injury risk
  'Iron Man': 0.6,       // -40% injury risk
};

// Injury severity distribution (when injury occurs)
// MORE minor injuries, FEWER major (realistic)
// Real NRL: Most injuries are minor soft tissue, major injuries are rare events
export const INJURY_SEVERITY_WEIGHTS = {
  minor: 70,      // 70% chance - corked thigh, stingers, minor strains
  moderate: 24,   // 24% chance - hamstring tears, ankle sprains
  major: 6,       // 6% chance - ACL, broken bones (rare, newsworthy)
};

// Training rules when injured
export const INJURY_TRAINING_RULES: Record<string, 'none' | 'light' | 'full'> = {
  minor: 'light',     // 50% training effectiveness
  moderate: 'none',   // No training
  major: 'none',      // No training
};

// REST recovery (30% fatigue reduction for non-playing players)
export const REST_RECOVERY_PERCENT = 0.30;

// =============================================
// INTERCHANGE SYSTEM CONSTANTS
// =============================================

// Standard minutes played by position (with prop rotation)
export const MINUTES_WITH_ROTATION: Record<number, number> = {
  1: 80,   // Fullback - full game
  2: 80,   // Winger L - full game
  3: 80,   // Centre L - full game
  4: 80,   // Centre R - full game
  5: 80,   // Winger R - full game
  6: 80,   // Five-Eighth - full game
  7: 80,   // Halfback - full game
  8: 55,   // Prop L - rotates (30 on, off, 25 back)
  9: 80,   // Hooker - full game
  10: 55,  // Prop R - rotates
  11: 80,  // Second Row L - full game
  12: 80,  // Second Row R - full game
  13: 80,  // Lock - full game
  14: 30,  // Bench 1 (prop rotation)
  15: 30,  // Bench 2 (prop rotation)
  16: 20,  // Bench 3 (tactical - used ~60% of games)
  17: 20,  // Bench 4 (tactical - used ~60% of games)
};

// Chance that bench 3/4 get used (tactical subs)
export const TACTICAL_SUB_CHANCE = 0.6;

// Fatigue multiplier based on minutes (minutes / 80)
export const calculateFatigueByMinutes = (minutes: number, baseFatigue: number): number => {
  return Math.round(baseFatigue * (minutes / 80));
};

// Smart minutes based on player position
export const getMinutesForPlayer = (jerseyNumber: number, position: string): number => {
  // Starting 13 - based on position
  if (jerseyNumber <= 13) {
    // Props rotate
    if (position === 'Prop') return 55;
    // Everyone else plays 80
    return 80;
  }
  
  // Bench (14-17) - based on player's actual position
  if (jerseyNumber >= 14 && jerseyNumber <= 17) {
    switch (position) {
      case 'Prop':
        return 30;  // Prop rotation
      case 'Hooker':
        return 25;  // Hooker cover
      case 'Second Row':
      case 'Lock':
        return 25;  // Forward rotation
      case 'Halfback':
      case 'Five-Eighth':
        return 20;  // Utility cover
      default:
        // Backs (Fullback, Winger, Centre)
        return 15;  // Tactical only, rarely used
    }
  }
  
  return 0;
};

// =============================================
// TRAINING POINTS SYSTEM (v3.0 - Updated for 0-7 scale)
// =============================================

/** 
 * Points needed to gain +1 stat, based on current stat level
 * Higher stats = more points needed (natural diminishing returns)
 */
export const TRAINING_POINT_THRESHOLDS: Record<number, number> = {
  0: 8,   // 0→1: ~2-3 rounds
  1: 8,   // 1→2: ~2-3 rounds
  2: 12,  // 2→3: ~4 rounds
  3: 12,  // 3→4: ~4 rounds
  4: 20,  // 4→5: ~6 rounds
  5: 20,  // 5→6: ~6 rounds
  6: 35,  // 6→7: ~11 rounds (elite ceiling)
  7: 999, // 7 is max - can't go higher
};

/**
 * Session quality determines points earned per training round
 * Rolled randomly each round
 */
export const TRAINING_SESSION_QUALITY = {
  POOR: { chance: 15, points: 2, label: 'Poor Session' },
  FAIR: { chance: 40, points: 3, label: 'Fair Session' },
  GOOD: { chance: 30, points: 4, label: 'Good Session' },
  EXCELLENT: { chance: 15, points: 5, label: 'Excellent Session' },
} as const;

/**
 * Age modifiers for training points earned
 */
export const TRAINING_AGE_MODIFIERS: Record<string, number> = {
  young: 1,      // 18-21: +1 bonus point per session
  prime: 0,      // 22-27: no modifier
  veteran: -1,   // 28-31: -1 point per session (min 1)
  old: -1,       // 32+: -1 point per session (min 1)
};

/**
 * Affinity bonus points per session
 */
export const TRAINING_AFFINITY_BONUS: Record<string, number> = {
  high: 1,    // +1 point per session
  medium: 0,  // no bonus (but faster in old system)
};

/**
 * Progress labels shown to user (vague feedback)
 * Based on percentage of threshold reached
 */
export const TRAINING_PROGRESS_LABELS = [
  { maxPercent: 25, label: 'Just Started', color: 'text-gray-400', barColor: 'bg-gray-500' },
  { maxPercent: 50, label: 'Building Foundation', color: 'text-yellow-400', barColor: 'bg-yellow-500' },
  { maxPercent: 75, label: 'Making Progress', color: 'text-orange-400', barColor: 'bg-orange-500' },
  { maxPercent: 99, label: 'Nearly There!', color: 'text-green-400', barColor: 'bg-green-500' },
  { maxPercent: 100, label: 'Ready!', color: 'text-green-300', barColor: 'bg-green-400' },
] as const;

/**
 * Get progress label based on current points and threshold
 */
export function getTrainingProgressLabel(currentPoints: number, threshold: number): {
  label: string;
  color: string;
  barColor: string;
  percent: number;
} {
  const percent = Math.min(100, Math.round((currentPoints / threshold) * 100));
  
  for (const tier of TRAINING_PROGRESS_LABELS) {
    if (percent <= tier.maxPercent) {
      return { 
        label: tier.label, 
        color: tier.color, 
        barColor: tier.barColor,
        percent 
      };
    }
  }
  
  // Fallback
  return { 
    label: 'Just Started', 
    color: 'text-gray-400', 
    barColor: 'bg-gray-500',
    percent: 0 
  };
}

/**
 * Get age bracket for training modifiers
 */
export function getAgeBracket(age: number): 'young' | 'prime' | 'veteran' | 'old' {
  if (age <= 21) return 'young';
  if (age <= 27) return 'prime';
  if (age <= 31) return 'veteran';
  return 'old';
}
// =============================================================================
// HEIGHT/WEIGHT SYSTEM — GRIDIRON ONLY
// =============================================================================

// Position physical profiles: [min, ideal, max]
// Height in cm, Weight in kg
export const GRIDIRON_POSITION_PROFILES: Record<string, {
  height: { min: number; ideal: number; max: number; stdDev: number };
  weight: { min: number; ideal: number; max: number; stdDev: number };
}> = {
  // Offense
  QB: {
    height: { min: 175, ideal: 191, max: 201, stdDev: 5 },
    weight: { min: 90, ideal: 102, max: 115, stdDev: 6 },
  },
  RB: {
    height: { min: 168, ideal: 178, max: 188, stdDev: 4 },
    weight: { min: 85, ideal: 98, max: 115, stdDev: 7 },
  },
  WR: {
    height: { min: 173, ideal: 183, max: 198, stdDev: 5 },
    weight: { min: 80, ideal: 91, max: 105, stdDev: 6 },
  },
  TE: {
    height: { min: 188, ideal: 196, max: 203, stdDev: 3 },
    weight: { min: 105, ideal: 116, max: 130, stdDev: 6 },
  },
  OT: {
    height: { min: 193, ideal: 198, max: 208, stdDev: 3 },
    weight: { min: 130, ideal: 143, max: 160, stdDev: 7 },
  },
  OG: {
    height: { min: 188, ideal: 193, max: 201, stdDev: 3 },
    weight: { min: 130, ideal: 143, max: 155, stdDev: 6 },
  },
  C: {
    height: { min: 183, ideal: 191, max: 198, stdDev: 3 },
    weight: { min: 125, ideal: 138, max: 150, stdDev: 6 },
  },
  // Defense
  DT: {
    height: { min: 185, ideal: 191, max: 201, stdDev: 3 },
    weight: { min: 130, ideal: 141, max: 155, stdDev: 6 },
  },
  DE: {
    height: { min: 188, ideal: 196, max: 206, stdDev: 4 },
    weight: { min: 115, ideal: 122, max: 140, stdDev: 6 },
  },
  LB: {
    height: { min: 183, ideal: 188, max: 196, stdDev: 3 },
    weight: { min: 105, ideal: 111, max: 125, stdDev: 5 },
  },
  CB: {
    height: { min: 173, ideal: 180, max: 191, stdDev: 4 },
    weight: { min: 80, ideal: 88, max: 100, stdDev: 5 },
  },
  S: {
    height: { min: 178, ideal: 183, max: 193, stdDev: 3 },
    weight: { min: 88, ideal: 94, max: 108, stdDev: 5 },
  },
  // Special Teams
  K: {
    height: { min: 175, ideal: 185, max: 193, stdDev: 4 },
    weight: { min: 85, ideal: 94, max: 105, stdDev: 5 },
  },
  P: {
    height: { min: 178, ideal: 188, max: 196, stdDev: 4 },
    weight: { min: 90, ideal: 98, max: 110, stdDev: 5 },
  },
};

// Modifier mappings: which Gridiron stats are affected by height/weight
// Positive value = tall/heavy is GOOD for this stat
// Negative value = tall/heavy is BAD for this stat
// Max modifier is ±15% at extreme deviations
export const HEIGHT_WEIGHT_MODIFIERS: Record<string, {
  heightAffects: { stat: string; direction: number }[];
  weightAffects: { stat: string; direction: number }[];
}> = {
  QB: {
    heightAffects: [
      { stat: 'arm', direction: 1 },      // Tall = better arm (see over OL)
      { stat: 'agility', direction: -1 }, // Tall = worse mobility
    ],
    weightAffects: [
      { stat: 'power', direction: 1 },    // Heavy = harder to sack
      { stat: 'agility', direction: -1 }, // Heavy = slower scrambles
    ],
  },
  RB: {
    heightAffects: [
      { stat: 'power', direction: 1 },    // Tall = more power
      { stat: 'agility', direction: -1 }, // Tall = easier to spot/tackle
    ],
    weightAffects: [
      { stat: 'power', direction: 1 },    // Heavy = break tackles
      { stat: 'agility', direction: -1 }, // Heavy = less elusive
    ],
  },
  WR: {
    heightAffects: [
      { stat: 'catching', direction: 1 }, // Tall = contested catches, jump balls
      { stat: 'agility', direction: -1 }, // Tall = slower route breaks
    ],
    weightAffects: [
      { stat: 'power', direction: 1 },    // Heavy = break press coverage
      { stat: 'speed', direction: -1 },   // Heavy = slower deep routes
    ],
  },
  TE: {
    heightAffects: [
      { stat: 'catching', direction: 1 }, // Tall = red zone threat
      { stat: 'agility', direction: -1 }, // Tall = slower releases
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = better blocking
      { stat: 'speed', direction: -1 },   // Heavy = slower seam routes
    ],
  },
  OT: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = better reach/pass pro
      { stat: 'agility', direction: -1 }, // Tall = slower vs speed rush
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = better anchor
      { stat: 'agility', direction: -1 }, // Heavy = slower pulls
    ],
  },
  OG: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = leverage
      { stat: 'agility', direction: -1 }, // Tall = slower pulls
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = run blocking power
      { stat: 'agility', direction: -1 }, // Heavy = slower in space
    ],
  },
  C: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = anchor strength
      { stat: 'agility', direction: -1 }, // Tall = worse leverage (higher pads)
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = anchor
      { stat: 'agility', direction: -1 }, // Heavy = slower
    ],
  },
  DT: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = occupy blockers
      { stat: 'agility', direction: -1 }, // Tall = slower penetration
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = run stuffing
      { stat: 'speed', direction: -1 },   // Heavy = slower pass rush
    ],
  },
  DE: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = power rush, run D
      { stat: 'agility', direction: -1 }, // Tall = less bend
    ],
    weightAffects: [
      { stat: 'power', direction: 1 },    // Heavy = bull rush
      { stat: 'speed', direction: -1 },   // Heavy = slower speed rush
    ],
  },
  LB: {
    heightAffects: [
      { stat: 'strength', direction: 1 }, // Tall = take on blocks
      { stat: 'agility', direction: -1 }, // Tall = worse coverage
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = run stuffing
      { stat: 'speed', direction: -1 },   // Heavy = slower in space
    ],
  },
  CB: {
    heightAffects: [
      { stat: 'catching', direction: 1 }, // Tall = jump ball defense
      { stat: 'speed', direction: -1 },   // Tall = slower recovery
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = press coverage
      { stat: 'agility', direction: -1 }, // Heavy = struggle vs quick WRs
    ],
  },
  S: {
    heightAffects: [
      { stat: 'catching', direction: 1 }, // Tall = high point INTs
      { stat: 'speed', direction: -1 },   // Tall = worse range
    ],
    weightAffects: [
      { stat: 'strength', direction: 1 }, // Heavy = tackling, vs TEs
      { stat: 'speed', direction: -1 },   // Heavy = worse deep coverage
    ],
  },
  K: {
    heightAffects: [
      { stat: 'arm', direction: 1 },      // Tall = leg strength (distance)
    ],
    weightAffects: [
      { stat: 'arm', direction: 1 },      // Heavy = more power
    ],
  },
  P: {
    heightAffects: [
      { stat: 'arm', direction: 1 },      // Tall = leg strength
    ],
    weightAffects: [
      { stat: 'arm', direction: 1 },      // Heavy = more power
    ],
  },
};

// Maximum modifier percentage (at extreme height/weight)
export const MAX_HEIGHT_WEIGHT_MODIFIER = 0.15; // ±15%
// =============================================================================
// COACH XP SYSTEM
// =============================================================================

/** XP awarded for various actions */
export const COACH_XP_REWARDS = {
  // Match results
  WIN: 10,
  DRAW: 5,
  LOSS: 2,
  WIN_BLOWOUT_BONUS: 5,      // Win by 20+ points
  WIN_STREAK_BONUS: 5,       // Per match while streak ≥3
  
  // Player development
  PLAYER_STAT_GAIN: 3,       // Training pays off
  
  // Season achievements
  DIVISION_TITLE: 50,
  GRAND_FINAL_WIN: 100,
  
  // Representative honors
  ORIGIN_SELECTION: 10,      // Per player selected
} as const;

/** Level thresholds and titles */
export const COACH_LEVELS: Array<{
  level: number;
  title: string;
  xpRequired: number;
}> = [
  { level: 1,  title: 'Rookie',         xpRequired: 0 },
  { level: 2,  title: 'Assistant',      xpRequired: 50 },
  { level: 3,  title: 'Junior Coach',   xpRequired: 150 },
  { level: 4,  title: 'Coach',          xpRequired: 300 },
  { level: 5,  title: 'Senior Coach',   xpRequired: 500 },
  { level: 6,  title: 'Head Coach',     xpRequired: 800 },
  { level: 7,  title: 'Elite Coach',    xpRequired: 1200 },
  { level: 8,  title: 'Master Coach',   xpRequired: 1800 },
  { level: 9,  title: 'Legendary',      xpRequired: 2500 },
  { level: 10, title: 'Hall of Famer',  xpRequired: 3500 },
];

/** Calculate level from XP */
export function getCoachLevel(xp: number): { level: number; title: string; xpForNext: number | null; progress: number } {
  let currentLevel = COACH_LEVELS[0];
  let nextLevel: typeof currentLevel | null = null;
  
  for (let i = COACH_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= COACH_LEVELS[i].xpRequired) {
      currentLevel = COACH_LEVELS[i];
      nextLevel = COACH_LEVELS[i + 1] || null;
      break;
    }
  }
  
  // Calculate progress to next level
  let progress = 100;
  let xpForNext: number | null = null;
  
  if (nextLevel) {
    const xpIntoLevel = xp - currentLevel.xpRequired;
    const xpNeeded = nextLevel.xpRequired - currentLevel.xpRequired;
    progress = Math.round((xpIntoLevel / xpNeeded) * 100);
    xpForNext = nextLevel.xpRequired;
  }
  
  return {
    level: currentLevel.level,
    title: currentLevel.title,
    xpForNext,
    progress,
  };
}

/** Get title for a specific level */
export function getCoachTitle(level: number): string {
  return COACH_LEVELS.find(l => l.level === level)?.title || 'Rookie';
}