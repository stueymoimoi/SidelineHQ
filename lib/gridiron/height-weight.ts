// /lib/gridiron/height-weight.ts

import {
  GRIDIRON_POSITION_PROFILES,
  HEIGHT_WEIGHT_MODIFIERS,
  MAX_HEIGHT_WEIGHT_MODIFIER,
} from '@/lib/game-engine/constants';

/**
 * Generate height/weight for a Gridiron player using normal distribution
 * Clusters around position ideal with occasional outliers
 */
export function generateHeightWeight(position: string): { height_cm: number; weight_kg: number } {
  const profile = GRIDIRON_POSITION_PROFILES[position];
  
  if (!profile) {
    // Fallback for unknown positions
    return { height_cm: 183, weight_kg: 100 };
  }

  const height = generateNormalValue(
    profile.height.ideal,
    profile.height.stdDev,
    profile.height.min,
    profile.height.max
  );

  const weight = generateNormalValue(
    profile.weight.ideal,
    profile.weight.stdDev,
    profile.weight.min,
    profile.weight.max
  );

  return { height_cm: height, weight_kg: weight };
}

/**
 * Generate a value using normal distribution, clamped to min/max
 * Uses Box-Muller transform for true bell curve
 */
function generateNormalValue(mean: number, stdDev: number, min: number, max: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Scale to our mean and stdDev
  let value = mean + z * stdDev;
  
  // Clamp to valid range
  value = Math.max(min, Math.min(max, value));
  
  return Math.round(value);
}

/**
 * Calculate height/weight modifiers for a player's stats
 * Returns a map of stat -> modifier percentage
 * 
 * Example: { catching: 0.12, agility: -0.08 }
 * Meaning: +12% catching, -8% agility
 */
export function calculateHeightWeightModifiers(
  position: string,
  height_cm: number | null,
  weight_kg: number | null
): Record<string, number> {
  const modifiers: Record<string, number> = {};

  // No modifiers if height/weight not set (NRL players)
  if (height_cm === null || weight_kg === null) {
    return modifiers;
  }

  const profile = GRIDIRON_POSITION_PROFILES[position];
  const modifierConfig = HEIGHT_WEIGHT_MODIFIERS[position];

  if (!profile || !modifierConfig) {
    return modifiers;
  }

  // Calculate height deviation from ideal (-1 to +1 range)
  const heightRange = profile.height.max - profile.height.min;
  const heightDeviation = (height_cm - profile.height.ideal) / (heightRange / 2);
  const clampedHeightDev = Math.max(-1, Math.min(1, heightDeviation));

  // Calculate weight deviation from ideal (-1 to +1 range)
  const weightRange = profile.weight.max - profile.weight.min;
  const weightDeviation = (weight_kg - profile.weight.ideal) / (weightRange / 2);
  const clampedWeightDev = Math.max(-1, Math.min(1, weightDeviation));

  // Apply height modifiers
  for (const { stat, direction } of modifierConfig.heightAffects) {
    const modifier = clampedHeightDev * direction * MAX_HEIGHT_WEIGHT_MODIFIER;
    modifiers[stat] = (modifiers[stat] || 0) + modifier;
  }

  // Apply weight modifiers
  for (const { stat, direction } of modifierConfig.weightAffects) {
    const modifier = clampedWeightDev * direction * MAX_HEIGHT_WEIGHT_MODIFIER;
    modifiers[stat] = (modifiers[stat] || 0) + modifier;
  }

  return modifiers;
}

/**
 * Apply height/weight modifiers to a player's effective stat
 * Use this in match engine calculations
 * 
 * Example: applyHeightWeightModifier(player, 'catching', 5)
 * Returns: 5.6 (if player has +12% catching modifier)
 */
export function applyHeightWeightModifier(
  position: string,
  height_cm: number | null,
  weight_kg: number | null,
  statName: string,
  baseValue: number
): number {
  const modifiers = calculateHeightWeightModifiers(position, height_cm, weight_kg);
  const modifier = modifiers[statName] || 0;
  
  return baseValue * (1 + modifier);
}

/**
 * Format height for display (cm -> ft'in")
 */
export function formatHeight(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

/**
 * Format weight for display (kg -> lbs)
 */
export function formatWeight(kg: number): string {
  const lbs = Math.round(kg * 2.205);
  return `${lbs} lbs`;
}

/**
 * Get human-readable description of player's build
 */
export function getBuildDescription(
  position: string,
  height_cm: number,
  weight_kg: number
): string {
  const profile = GRIDIRON_POSITION_PROFILES[position];
  if (!profile) return 'Average';

  const heightDev = (height_cm - profile.height.ideal) / profile.height.stdDev;
  const weightDev = (weight_kg - profile.weight.ideal) / profile.weight.stdDev;

  // Height descriptor
  let heightDesc = '';
  if (heightDev > 1.5) heightDesc = 'Very Tall';
  else if (heightDev > 0.5) heightDesc = 'Tall';
  else if (heightDev < -1.5) heightDesc = 'Short';
  else if (heightDev < -0.5) heightDesc = 'Compact';

  // Weight descriptor
  let weightDesc = '';
  if (weightDev > 1.5) weightDesc = 'Heavy';
  else if (weightDev > 0.5) weightDesc = 'Muscular';
  else if (weightDev < -1.5) weightDesc = 'Light';
  else if (weightDev < -0.5) weightDesc = 'Lean';

  // Combine
  if (heightDesc && weightDesc) return `${heightDesc}, ${weightDesc}`;
  if (heightDesc) return heightDesc;
  if (weightDesc) return weightDesc;
  return 'Average Build';
}