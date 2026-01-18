// ============================================
// SidelineHQ Financial System v3.0
// Type Definitions
// ============================================

// ============================================
// ENUMS
// ============================================

export type TransactionType =
  | 'DIVISION_GRANT'
  | 'WIN_BONUS'
  | 'DRAW_BONUS'
  | 'TICKET_REVENUE'
  | 'MERCHANDISE'
  | 'TV_REVENUE'
  | 'PLAYER_WAGES'
  | 'FACILITY_UPKEEP'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_TAX'
  | 'STADIUM_UPGRADE'
  | 'PRIZE_MONEY'
  | 'PROMOTION_BONUS'
  | 'MANUAL_ADJUSTMENT';

export type TransferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'completed'
  | 'expired'
  | 'player_rejected';

export type PlayerDecision =
  | 'pending'
  | 'accepted'
  | 'rejected';

export type CityType =
  | 'capital'
  | 'major'
  | 'large'
  | 'medium'
  | 'small';

export type MoraleTier = 1 | 2 | 3 | 4 | 5;

// ============================================
// DATABASE TYPES
// ============================================

export interface TeamFinances {
  id: string;
  team_id: string;
  season: number;
  balance: number; // in cents
  total_wages: number;
  stadium_capacity: number;
  stadium_city_type: CityType;
  stadium_upgrade_target: number | null;
  stadium_upgrade_weeks_left: number | null;
  ticket_price: number;
  weeks_in_debt: number;
  last_processed_round: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerContract {
  id: string;
  player_id: string;
  team_id: string;
  weekly_wage: number; // in cents
  weeks_remaining: number;
  total_weeks: number;
  is_transfer_listed: boolean;
  listed_at: string | null;
  signed_at: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransaction {
  id: string;
  team_id: string;
  season: number;
  round: number;
  type: TransactionType;
  amount: number; // in cents, positive = income, negative = expense
  balance_after: number;
  description: string | null;
  idempotency_key: string;
  created_at: string;
}

export interface TransferOffer {
  id: string;
  player_id: string;
  seller_team_id: string;
  buyer_team_id: string;
  transfer_fee: number; // in cents
  wage_offer: number; // in cents
  contract_weeks_offer: number;
  status: TransferStatus;
  counter_fee: number | null;
  player_decision: PlayerDecision | null;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface FreeAgent {
  id: string;
  player_id: string;
  previous_team_id: string | null;
  expected_wage: number; // in cents
  min_contract_weeks: number;
  available_since: string;
}

// ============================================
// HELPER TYPES
// ============================================

export interface WageCalculation {
  base_wage: number;
  hidden_gem_modifier: number;
  random_noise: number;
  final_wage: number;
}

export interface AttendanceCalculation {
  stadium_capacity: number;
  base_fill_rate: number;
  division_bonus: number;
  form_bonus: number;
  opponent_bonus: number;
  price_modifier: number;
  final_attendance: number;
  ticket_revenue: number;
  merchandise_revenue: number;
  tv_revenue: number;
  total_revenue: number;
}

export interface ContractOffer {
  wage: number;
  weeks: number;
}

export interface PlayerContractDecision {
  accepts: boolean;
  reason?: string;
  satisfaction_score: number;
}

export interface WeeklyFinanceResult {
  team_id: string;
  transactions: FinancialTransaction[];
  new_balance: number;
  total_income: number;
  total_expenses: number;
}

// ============================================
// UI TYPES
// ============================================

export interface FinanceSummary {
  balance: number;
  balance_change: number;
  weekly_wages: number;
  weekly_income: number;
  weekly_net: number;
  player_count: number;
  contracts_expiring_soon: number;
  stadium_capacity: number;
  ticket_price: number;
  is_in_debt: boolean;
  weeks_in_debt: number;
}

export interface TransactionDisplay {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  created_at: string;
  is_income: boolean;
}

export interface ContractDisplay {
  player_id: string;
  player_name: string;
  position: string;
  overall: number;
  weekly_wage: number;
  weeks_remaining: number;
  is_transfer_listed: boolean;
  morale: MoraleTier;
}