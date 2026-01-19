// ============================================
// SidelineHQ Financial System v3.0
// Main Exports
// ============================================

// Types
export * from './types';

// Constants (export specific items, not the feature flag)
export {
  WAGE_PER_OVR,
  HIDDEN_GEM_MODIFIERS,
  DIVISION_GRANTS,
  BONUSES,
  EXPENSES,
  STARTING_BALANCE,
  STADIUM,
  STADIUM_CAPACITY_BY_CITY,
  STADIUM_UPGRADES,
  ATTENDANCE,
  TV_REVENUE,
  CONTRACTS,
  MORALE,
  TRANSFERS,
  BANKRUPTCY,
  ENABLE_FINANCES,
} from './constants';

// Wage calculations
export {
  calculatePlayerWage,
  calculatePlayerWageEstimate,
  calculateTeamWages,
  compareWageToMarket,
  formatMoney,
  centsToDollars,
  dollarsToCents,
} from './wages';

// Processing
export {
  processTeamWeeklyFinances,
  processAllTeamFinances,
  processContractCountdown,
  processAIContractRenewals,
} from './processing';