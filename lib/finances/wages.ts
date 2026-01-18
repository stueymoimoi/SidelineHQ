// ============================================
// SidelineHQ Financial System v3.0
// Wage Calculations
// ============================================

import { WageCalculation } from './types';
import { WAGE_PER_OVR, HIDDEN_GEM_MODIFIERS } from './constants';

// ============================================
// TYPES
// ============================================

interface PlayerForWage {
  overall: number;
  training_affinity?: {
    [stat: string]: 'LOW' | 'MEDIUM' | 'HIGH';
  } | null;
}

interface PlayerContract {
  weekly_wage: number;
}

// ============================================
// CALCULATE SINGLE PLAYER WAGE
// ============================================

/**
 * Calculate a player's market wage based on OVR and hidden gem potential
 * Returns wage in CENTS
 */
export function calculatePlayerWage(player: PlayerForWage): WageCalculation {
  // Base wage: OVR × $1,500
  const base_wage = player.overall * WAGE_PER_OVR;

  // Hidden gem modifier based on training affinities
  let hidden_gem_modifier = 1.0;

  if (player.training_affinity) {
    const affinities = Object.values(player.training_affinity);
    const highCount = affinities.filter(a => a === 'HIGH').length;
    const mediumCount = affinities.filter(a => a === 'MEDIUM').length;

    hidden_gem_modifier += highCount * HIDDEN_GEM_MODIFIERS.HIGH_AFFINITY;
    hidden_gem_modifier += mediumCount * HIDDEN_GEM_MODIFIERS.MEDIUM_AFFINITY;
  }

  // Random noise ±5%
  const random_noise = 1 + (Math.random() * 2 - 1) * HIDDEN_GEM_MODIFIERS.RANDOM_NOISE_MAX;

  // Final wage (rounded to nearest $1,000 = 100000 cents)
  const raw_wage = base_wage * hidden_gem_modifier * random_noise;
  const final_wage = Math.round(raw_wage / 100000) * 100000;

  return {
    base_wage,
    hidden_gem_modifier,
    random_noise,
    final_wage,
  };
}

/**
 * Calculate wage without random noise (for display/estimation)
 * Returns wage in CENTS
 */
export function calculatePlayerWageEstimate(player: PlayerForWage): number {
  const base_wage = player.overall * WAGE_PER_OVR;

  let hidden_gem_modifier = 1.0;

  if (player.training_affinity) {
    const affinities = Object.values(player.training_affinity);
    const highCount = affinities.filter(a => a === 'HIGH').length;
    const mediumCount = affinities.filter(a => a === 'MEDIUM').length;

    hidden_gem_modifier += highCount * HIDDEN_GEM_MODIFIERS.HIGH_AFFINITY;
    hidden_gem_modifier += mediumCount * HIDDEN_GEM_MODIFIERS.MEDIUM_AFFINITY;
  }

  const raw_wage = base_wage * hidden_gem_modifier;
  return Math.round(raw_wage / 100000) * 100000;
}

// ============================================
// CALCULATE TEAM TOTAL WAGES
// ============================================

/**
 * Calculate total weekly wages for a team from contracts
 * Returns wage in CENTS
 */
export function calculateTeamWages(contracts: PlayerContract[]): number {
  return contracts.reduce((total, contract) => total + contract.weekly_wage, 0);
}

// ============================================
// WAGE COMPARISON (for morale)
// ============================================

/**
 * Check if player is significantly underpaid or overpaid
 * Returns: 'underpaid' | 'overpaid' | 'fair'
 */
export function compareWageToMarket(
  currentWage: number,
  player: PlayerForWage
): 'underpaid' | 'overpaid' | 'fair' {
  const marketWage = calculatePlayerWageEstimate(player);
  const difference = (currentWage - marketWage) / marketWage;

  if (difference < -0.20) return 'underpaid'; // >20% below market
  if (difference > 0.20) return 'overpaid';   // >20% above market
  return 'fair';
}

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Convert cents to display string (e.g., "$1,500,000" or "$1.5M")
 */
export function formatMoney(cents: number, short = false): string {
  const dollars = cents / 100;

  if (short && Math.abs(dollars) >= 1000000) {
    return `$${(dollars / 1000000).toFixed(1)}M`;
  }

  if (short && Math.abs(dollars) >= 1000) {
    return `$${(dollars / 1000).toFixed(0)}K`;
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

/**
 * Convert cents to dollars (for calculations)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents (for storage)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}