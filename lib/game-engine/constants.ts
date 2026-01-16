/**
 * SidelineHQ Game Engine Constants
 * All configurable values in one place for easy tuning
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

/** Fatigue added per match played */
export const FATIGUE_PER_MATCH = 15;

/** Fatigue added per training session */
export const FATIGUE_PER_TRAINING = 5;

/** Fatigue recovered when resting */
export const REST_RECOVERY = 25;

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

/** OVR threshold for "ambitious star" classification */
export const AMBITIOUS_STAR_OVR_THRESHOLD = 43;

/** Age threshold for "young prospect" classification */
export const YOUNG_PROSPECT_AGE_THRESHOLD = 21;

/** Age threshold for "veteran" classification */
export const VETERAN_AGE_THRESHOLD = 30;

/** Maximum squad size */
export const MAX_SQUAD_SIZE = 25;

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
// STAT TIER NAMES (Training System v2.0)
// ===========================================

/** Stat tier names for display (1-8 scale) */
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

/** Get tier name from stat value */
export function getStatTierName(value: number): string {
  return STAT_TIER_NAMES[Math.max(1, Math.min(8, value))] || 'Unknown';
}

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