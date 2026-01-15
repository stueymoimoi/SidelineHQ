/**
 * SidelineHQ Tactical System
 * Rock-paper-scissors style tactical matchups
 */

import type { AttackFocus, DefenseFocus, TacticalBonusResult } from './types';

// ===========================================
// TACTICAL BONUS CALCULATION
// ===========================================

/**
 * Calculate tactical bonus based on attack vs defense matchup
 * 
 * Attack styles: power, structured, tempo, edge
 * Defense styles: rush, slide, jam, territory
 * 
 * Matchup logic:
 * - Power beats Rush (physical dominance absorbs pressure)
 * - Rush beats Tempo (aggressive line speed disrupts quick play)
 * - Tempo beats Slide (speed exploits passive drift)
 * - Slide beats Edge (numbers out wide deny overlaps)
 * - Edge beats Jam (width exploits compressed middle)
 * - Jam beats Power (stacked defense stops forward momentum)
 * - Territory is neutral - wins field position battles
 * - Structured is balanced - small consistent bonus
 */
export function calculateTacticalBonus(
  attackFocus: AttackFocus | string,
  defenseFocus: DefenseFocus | string
): TacticalBonusResult {
  
  // Handle empty/no tactic selected
  if (!attackFocus || attackFocus === '') {
    return { bonus: 0, description: '' };
  }
  
  // Power Attack matchups
  if (attackFocus === 'power') {
    if (defenseFocus === 'jam') {
      return { bonus: -3, description: '💪 Power attack met a brick wall' };
    }
    if (defenseFocus === 'rush') {
      return { bonus: 8, description: '💪 Power absorbed the rush and punched through' };
    }
    if (defenseFocus === 'slide') {
      return { bonus: 5, description: '💪 Power made hard yards through the middle' };
    }
    return { bonus: 2, description: '💪 Forwards grinding out metres' };
  }

  // Structured Attack matchups
  if (attackFocus === 'structured') {
    if (defenseFocus === 'rush') {
      return { bonus: -2, description: '📋 Set plays disrupted by line speed' };
    }
    if (defenseFocus === 'slide') {
      return { bonus: 4, description: '📋 Structured shapes found gaps' };
    }
    return { bonus: 2, description: '📋 Structured attack probed for openings' };
  }

  // Tempo Attack matchups
  if (attackFocus === 'tempo') {
    if (defenseFocus === 'rush') {
      return { bonus: -4, description: '⚡ Quick play shut down by aggressive defence' };
    }
    if (defenseFocus === 'slide') {
      return { bonus: 10, description: '⚡ Tempo exploited the passive slide!' };
    }
    if (defenseFocus === 'territory') {
      return { bonus: 6, description: '⚡ Fast ruck caught defence retreating' };
    }
    return { bonus: 3, description: '⚡ Quick ball creating opportunities' };
  }

  // Edge Attack matchups
  if (attackFocus === 'edge') {
    if (defenseFocus === 'slide') {
      return { bonus: -2, description: '🎯 Edge attack met numbers out wide' };
    }
    if (defenseFocus === 'jam') {
      return { bonus: 10, description: '🎯 Width exploited the compressed defence!' };
    }
    if (defenseFocus === 'rush') {
      return { bonus: 5, description: '🎯 Early ball beat the rushing line' };
    }
    return { bonus: 3, description: '🎯 Edge attack stretching the defence' };
  }

  // Default fallback
  return { bonus: 1, description: '' };
}

/**
 * Get description of an attack style
 */
export function getAttackDescription(attackFocus: AttackFocus | string): string {
  const descriptions: Record<string, string> = {
    'power': 'Middle dominance, post-contact metres',
    'structured': 'Set plays, sweeps, decoys',
    'tempo': 'Fast ruck, quick shifts',
    'edge': 'Width focus, overlaps, kicks to corners'
  };
  return descriptions[attackFocus] || '';
}

/**
 * Get description of a defense style
 */
export function getDefenseDescription(defenseFocus: DefenseFocus | string): string {
  const descriptions: Record<string, string> = {
    'rush': 'Aggressive line speed, pressure early',
    'slide': 'Stay connected, drift to touchline',
    'jam': 'Compress edges, shut the gate',
    'territory': 'Defend long field, kick chase'
  };
  return descriptions[defenseFocus] || '';
}