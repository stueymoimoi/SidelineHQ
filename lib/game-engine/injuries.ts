// /lib/game-engine/injuries.ts
// =============================================
// INJURY SYSTEM - CALCULATION LOGIC
// =============================================

import {
  BASE_INJURY_CHANCE,
  DURABILITY_INJURY_MODIFIERS,
  FATIGUE_INJURY_MODIFIERS,
  TRAIT_INJURY_MODIFIERS,
  INJURY_SEVERITY_WEIGHTS,
  REST_RECOVERY_PERCENT,
} from './constants';

// =============================================
// TYPES
// =============================================

export interface InjuryCheckResult {
  isInjured: boolean;
  severity?: 'minor' | 'moderate' | 'major';
  injuryChance?: number; // For debugging/logging
}

export interface InjuryType {
  id: string;
  name: string;
  body_part: string;
  severity: 'minor' | 'moderate' | 'major';
  min_recovery_rounds: number;
  max_recovery_rounds: number;
}

export interface PlayerInjuryInput {
  playerId: string;
  durability: string;
  fatigue: number;
  hiddenTrait?: string | null;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get fatigue tier based on fatigue value
 * fatigue: 0 = fresh, 100 = exhausted
 */
function getFatigueTier(fatigue: number): string {
  if (fatigue <= 30) return 'fresh';
  if (fatigue <= 50) return 'mild';
  if (fatigue <= 70) return 'moderate';
  if (fatigue <= 85) return 'high';
  return 'exhausted';
}

/**
 * Weighted random selection for injury severity
 */
function selectInjurySeverity(): 'minor' | 'moderate' | 'major' {
  const total = INJURY_SEVERITY_WEIGHTS.minor + INJURY_SEVERITY_WEIGHTS.moderate + INJURY_SEVERITY_WEIGHTS.major;
  const roll = Math.random() * total;
  
  if (roll < INJURY_SEVERITY_WEIGHTS.minor) return 'minor';
  if (roll < INJURY_SEVERITY_WEIGHTS.minor + INJURY_SEVERITY_WEIGHTS.moderate) return 'moderate';
  return 'major';
}

/**
 * Select a random injury type matching the severity
 */
export function selectRandomInjury(injuryTypes: InjuryType[], severity: 'minor' | 'moderate' | 'major'): InjuryType {
  const matching = injuryTypes.filter(i => i.severity === severity);
  return matching[Math.floor(Math.random() * matching.length)];
}

/**
 * Calculate recovery rounds for an injury
 */
export function calculateRecoveryRounds(injuryType: InjuryType): number {
  const { min_recovery_rounds, max_recovery_rounds } = injuryType;
  return Math.floor(Math.random() * (max_recovery_rounds - min_recovery_rounds + 1)) + min_recovery_rounds;
}

// =============================================
// MAIN FUNCTIONS
// =============================================

/**
 * Check if a player gets injured during a match
 * Returns injury result with severity if injured
 */
export function checkForInjury(player: PlayerInjuryInput): InjuryCheckResult {
  // Start with base chance
  let injuryChance = BASE_INJURY_CHANCE;
  
  // Apply durability modifier
  const durabilityMod = DURABILITY_INJURY_MODIFIERS[player.durability] || 1.0;
  injuryChance *= durabilityMod;
  
  // Apply fatigue modifier
  const fatigueTier = getFatigueTier(player.fatigue);
  const fatigueMod = FATIGUE_INJURY_MODIFIERS[fatigueTier] || 1.0;
  injuryChance *= fatigueMod;
  
  // Apply hidden trait modifier
  if (player.hiddenTrait && TRAIT_INJURY_MODIFIERS[player.hiddenTrait]) {
    injuryChance *= TRAIT_INJURY_MODIFIERS[player.hiddenTrait];
  }
  
  // Cap at 30% max injury chance (never too punishing)
  injuryChance = Math.min(injuryChance, 0.30);
  
  // Roll for injury
  const roll = Math.random();
  const isInjured = roll < injuryChance;
  
  if (!isInjured) {
    return { isInjured: false, injuryChance };
  }
  
  // Determine severity
  const severity = selectInjurySeverity();
  
  return {
    isInjured: true,
    severity,
    injuryChance,
  };
}

/**
 * Apply REST recovery to a player's fatigue
 * Returns new fatigue value
 */
export function applyRestRecovery(currentFatigue: number): number {
  // Reduce fatigue by 30%
  const newFatigue = Math.round(currentFatigue * (1 - REST_RECOVERY_PERCENT));
  return Math.max(0, newFatigue); // Never go below 0
}

/**
 * Check if a player can train based on active injury
 */
export function canPlayerTrain(injurySeverity: string | null): 'none' | 'light' | 'full' {
  if (!injurySeverity) return 'full';
  
  if (injurySeverity === 'minor') return 'light';
  return 'none'; // moderate or major
}