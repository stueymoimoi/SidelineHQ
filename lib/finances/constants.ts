// ============================================
// SidelineHQ Financial System v3.0
// Constants & Formulas
// ============================================

import { CityType } from './types';

// ============================================
// WAGE FORMULA
// ============================================

/** Base wage multiplier: OVR × this = base weekly wage in cents */
export const WAGE_PER_OVR = 150000; // $1,500 in cents

/** Hidden gem modifiers */
export const HIDDEN_GEM_MODIFIERS = {
  HIGH_AFFINITY: 0.08,    // +8% per HIGH affinity
  MEDIUM_AFFINITY: 0.02,  // +2% per MEDIUM affinity
  RANDOM_NOISE_MAX: 0.05, // ±5% random variation
} as const;

// ============================================
// DIVISION GRANTS (Weekly, in cents)
// ============================================

export const DIVISION_GRANTS: Record<number, number> = {
  1: 50000000,   // $500,000
  2: 45000000,   // $450,000
  3: 40000000,   // $400,000
  4: 36000000,   // $360,000
  5: 32000000,   // $320,000
  6: 28000000,   // $280,000
  7: 24000000,   // $240,000
  8: 20000000,   // $200,000
  9: 16000000,   // $160,000
  10: 12000000,  // $120,000
};

// ============================================
// BONUSES (in cents)
// ============================================

export const BONUSES = {
  WIN: 5000000,              // $50,000
  DRAW: 2500000,             // $25,000
  PROMOTION: 50000000,       // $500,000
  FINALS_APPEARANCE: 25000000, // $250,000 per game
  MINOR_PREMIERSHIP: 50000000, // $500,000
  GRAND_FINAL_WIN: 200000000,  // $2,000,000
  GRAND_FINAL_LOSS: 100000000, // $1,000,000
} as const;

// ============================================
// EXPENSES (in cents)
// ============================================

export const EXPENSES = {
  FACILITY_UPKEEP: 2500000, // $25,000 per week
} as const;

// ============================================
// STARTING BALANCE BY DIVISION (in cents)
// ============================================

export const STARTING_BALANCE: Record<number, number> = {
  1: 1200000000,   // $12,000,000
  2: 1100000000,   // $11,000,000
  3: 1000000000,   // $10,000,000
  4: 900000000,    // $9,000,000
  5: 800000000,    // $8,000,000
  6: 700000000,    // $7,000,000
  7: 600000000,    // $6,000,000
  8: 500000000,    // $5,000,000
  9: 400000000,    // $4,000,000
  10: 300000000,   // $3,000,000
};

// ============================================
// STADIUM
// ============================================

export const STADIUM = {
  MIN_CAPACITY: 5000,
  MAX_CAPACITY: 30000,
  DEFAULT_TICKET_PRICE: 20, // $20
  MIN_TICKET_PRICE: 5,
  MAX_TICKET_PRICE: 100,
} as const;

export const STADIUM_CAPACITY_BY_CITY: Record<CityType, number> = {
  capital: 15000,
  major: 12000,
  large: 10000,
  medium: 7000,
  small: 5000,
};

export const STADIUM_UPGRADES = [
  { name: 'Small', seats: 5000, cost: 50000000, weeks: 4 },   // $500k
  { name: 'Medium', seats: 10000, cost: 120000000, weeks: 6 }, // $1.2M
  { name: 'Large', seats: 15000, cost: 250000000, weeks: 8 },  // $2.5M
] as const;

// ============================================
// ATTENDANCE FORMULA
// ============================================

export const ATTENDANCE = {
  BASE_FILL_RATE: 0.60, // 60%

  DIVISION_BONUS: {
    1: 0.15, 2: 0.15,
    3: 0.10, 4: 0.10,
    5: 0.05, 6: 0.05,
    7: 0.00, 8: 0.00,
    9: -0.05, 10: -0.05,
  } as Record<number, number>,

  FORM_BONUS: {
    5: 0.15,  // 5 wins
    4: 0.10,  // 4 wins
    3: 0.05,  // 3 wins
    2: 0.00,  // 2 wins
    1: -0.05, // 1 win
    0: -0.10, // 0 wins
  } as Record<number, number>,

  OPPONENT_BONUS: {
    TOP_4: 0.10,
    BOTTOM_4: -0.05,
    NORMAL: 0.00,
  },

  // Price modifier now calculated dynamically in processing.ts
  // Base price is $20 (modifier = 1.0)
  // Below $20: +2% per $1 cheaper (max 1.3 at $5)
  // Above $20: -1.5% per $1 more expensive (min 0.30)
  PRICE_BASE: 20,
  PRICE_MODIFIER_BELOW: 0.02,  // +2% per dollar below base
  PRICE_MODIFIER_ABOVE: 0.015, // -1.5% per dollar above base
  PRICE_MODIFIER_MIN: 0.30,
  PRICE_MODIFIER_MAX: 1.30,

  MERCHANDISE_RATE: 0.15,      // 15% of ticket revenue
  MERCHANDISE_WIN_BONUS: 0.05, // +5% if team won
} as const;

// ============================================
// TV REVENUE BY LADDER POSITION (in cents)
// ============================================

export const TV_REVENUE: Record<string, number> = {
  TOP_4: 10000000,     // $100,000
  TOP_8: 7500000,      // $75,000
  TOP_12: 5000000,     // $50,000
  BOTTOM_4: 2500000,   // $25,000
};

// ============================================
// CONTRACTS
// ============================================

export const CONTRACTS = {
  // Length ranges (in weeks)
  YOUTH_MIN: 4,
  YOUTH_MAX: 8,
  SHORT_MIN: 8,
  SHORT_MAX: 16,
  MEDIUM_MIN: 16,
  MEDIUM_MAX: 24,
  LONG_MIN: 24,
  LONG_MAX: 32,
  MEGA_MIN: 32,
  MEGA_MAX: 40,

  // Initial contract distribution by age
  INITIAL_YOUNG_MIN: 4,  // 18-22
  INITIAL_YOUNG_MAX: 12,
  INITIAL_PRIME_MIN: 8,  // 23-28
  INITIAL_PRIME_MAX: 20,
  INITIAL_VETERAN_MIN: 4, // 29+
  INITIAL_VETERAN_MAX: 12,

  // Notifications
  WARN_AT_WEEKS: [6, 4, 2],

  // AI auto-renewal
  AI_RENEW_AT_WEEKS: 4,
  AI_MIN_MORALE_TO_RENEW: 3, // Content or better
} as const;

// ============================================
// MORALE
// ============================================

export const MORALE = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 3,

  LABELS: {
    5: 'Ecstatic',
    4: 'Happy',
    3: 'Content',
    2: 'Unhappy',
    1: 'Angry',
  } as Record<number, string>,

  PERFORMANCE_MODIFIER: {
    5: 0.05,   // +5%
    4: 0.02,   // +2%
    3: 0.00,   // +0%
    2: -0.03,  // -3%
    1: -0.08,  // -8%
  } as Record<number, number>,

  // Weekly changes
  CHANGES: {
    TEAM_WIN: 3,
    TEAM_DRAW: 1,
    TEAM_LOSS: -2,
    WIN_STREAK_BONUS: 5,    // 3+ wins
    LOSE_STREAK_PENALTY: -5, // 3+ losses
    STARTED_MATCH: 2,
    ON_BENCH: 0,
    NOT_IN_SQUAD: -3,
    MOTM: 10,
    CONTRACT_OFFERED: 5,
    TRANSFER_LISTED_WEEKLY: -2,
    UNDERPAID_WEEKLY: -2,    // >20% under market
    OVERPAID_WEEKLY: 1,      // >20% over market
  },

  // Thresholds
  REFUSE_TO_PLAY_CHANCE: 0.20, // 20% if angry 4+ weeks
  ANGRY_WEEKS_BEFORE_REFUSE: 4,
} as const;

// ============================================
// TRANSFERS
// ============================================

export const TRANSFERS = {
  OFFER_EXPIRY_HOURS: 48,

  // Player decision weights
  DECISION: {
    DIVISION_PER_LEVEL: 15,   // +15% per div up, -15% per div down
    WAGE_BIG_RAISE: 20,       // +20% if wage increase >20%
    WAGE_BIG_CUT: -20,        // -20% if wage decrease >20%
    TOP_4_TEAM: 15,
    BOTTOM_4_TEAM: -10,
    FEWER_PLAYERS_AT_POSITION: 15,
    UNHAPPY_MORALE: 20,       // More likely to leave
    YOUNG_AMBITION: 5,        // Extra weight for young players
    OLD_SECURITY: 10,         // Veterans more likely to accept
  },

  DECISION_MIN: 5,  // Minimum 5% chance
  DECISION_MAX: 95, // Maximum 95% chance
} as const;

// ============================================
// BANKRUPTCY
// ============================================

export const BANKRUPTCY = {
  WARNING_THRESHOLD: -100000000,   // -$1M
  CRITICAL_THRESHOLD: -300000000,  // -$3M
  WEEKS_BEFORE_FIRED: 8,
  COOLDOWN_WEEKS: 2, // Weeks before can pick new team
} as const;

// ============================================
// FEATURE FLAG
// ============================================

export const ENABLE_FINANCES: boolean = process.env.NEXT_PUBLIC_ENABLE_FINANCES === 'true';