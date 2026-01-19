// /lib/contracts/constants.ts

// Contract length options (in weeks)
export const CONTRACT_LENGTHS = {
  ONE_SEASON: 10,
  TWO_SEASONS: 20,
} as const;

// Negotiation settings
export const NEGOTIATION = {
  MAX_ROUNDS: 2,
  COOLDOWN_WEEKS: 1,
  EXPIRING_THRESHOLD_WEEKS: 6,  // Show in "expiring" list if ≤6 weeks left
} as const;

// Offer evaluation thresholds (percentage of demand)
export const OFFER_THRESHOLDS = {
  AUTO_ACCEPT: 100,    // ≥100% of demand = accept
  COUNTER_MIN: 80,     // 80-99% = counter offer
  REJECT_BELOW: 80,    // <80% = reject
} as const;

// Wage demand modifiers (multiplied against current wage)
export const WAGE_MODIFIERS = {
  HIGH_MORALE: 1.10,      // morale ≥ 80
  NORMAL_MORALE: 1.00,    // morale 50-79
  LOW_MORALE: 0.85,       // morale < 50
  AGE_PENALTY_PER_YEAR: 0.05,  // -5% per year over 28
  AGE_PENALTY_START: 28,
} as const;

// Length demand based on age
export const LENGTH_BY_AGE = {
  YOUNG_MAX_AGE: 26,      // age ≤26 = wants 2 seasons
  VETERAN_MAX_AGE: 30,    // age 27-30 = wants 1-2 seasons
  // age 31+ = wants 1 season only
} as const;

// AI auto-renewal thresholds
export const AI_RENEWAL = {
  ALWAYS_RENEW_MAX_AGE: 29,
  ALWAYS_RENEW_MIN_OVR: 25,
  CONDITIONAL_MAX_AGE: 32,
  CONDITIONAL_MIN_OVR: 30,
  MAYBE_RENEW_MIN_OVR: 20,
  MAYBE_RENEW_CHANCE: 0.5,  // 50%
} as const;