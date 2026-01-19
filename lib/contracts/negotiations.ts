// /lib/contracts/negotiations.ts

import {
  CONTRACT_LENGTHS,
  NEGOTIATION,
  OFFER_THRESHOLDS,
  WAGE_MODIFIERS,
  LENGTH_BY_AGE,
} from './constants';

export interface PlayerForNegotiation {
  id: string;
  age: number;
  overall: number;
  morale: number;
  current_wage: number;  // cents per week
}

export interface PlayerDemands {
  wage: number;    // cents per week
  length: number;  // weeks
}

export interface OfferResult {
  status: 'accepted' | 'countered' | 'rejected';
  counter_wage?: number;
  counter_length?: number;
  message: string;
}

/**
 * Calculate what a player demands for a new contract
 */
export function calculatePlayerDemands(player: PlayerForNegotiation): PlayerDemands {
  // Base wage = current wage
  let wageMultiplier: number = WAGE_MODIFIERS.NORMAL_MORALE;
  
  // Morale modifier
  if (player.morale >= 80) {
    wageMultiplier = WAGE_MODIFIERS.HIGH_MORALE as number;
  } else if (player.morale < 50) {
    wageMultiplier = WAGE_MODIFIERS.LOW_MORALE as number;
  }
  
  // Age penalty (reduce demands for older players)
  if (player.age > WAGE_MODIFIERS.AGE_PENALTY_START) {
    const yearsOver = player.age - WAGE_MODIFIERS.AGE_PENALTY_START;
    const agePenalty = yearsOver * WAGE_MODIFIERS.AGE_PENALTY_PER_YEAR;
    wageMultiplier = wageMultiplier * (1 - agePenalty);
  }
  
  // Calculate demanded wage (round to nearest $10k)
  const demandedWage = Math.round((player.current_wage * wageMultiplier) / 1000000) * 1000000;
  
  // Calculate demanded length based on age
  let demandedLength: number;
  if (player.age <= LENGTH_BY_AGE.YOUNG_MAX_AGE) {
    // Young players want longer contracts
    demandedLength = CONTRACT_LENGTHS.TWO_SEASONS;
  } else if (player.age <= LENGTH_BY_AGE.VETERAN_MAX_AGE) {
    // Veterans are flexible - base on OVR
    demandedLength = player.overall >= 35 
      ? CONTRACT_LENGTHS.TWO_SEASONS 
      : CONTRACT_LENGTHS.ONE_SEASON;
  } else {
    // Old players just want security
    demandedLength = CONTRACT_LENGTHS.ONE_SEASON;
  }
  
  return {
    wage: Math.max(demandedWage, 500000), // Minimum $5k/week in cents
    length: demandedLength,
  };
}

/**
 * Evaluate a coach's offer against player demands
 */
export function evaluateOffer(
  offeredWage: number,
  offeredLength: number,
  demands: PlayerDemands,
  roundsUsed: number
): OfferResult {
  // Calculate offer as percentage of demand
  const wagePercent = (offeredWage / demands.wage) * 100;
  const lengthPercent = (offeredLength / demands.length) * 100;
  
  // Overall satisfaction = average of wage and length satisfaction
  const satisfaction = (wagePercent + lengthPercent) / 2;
  
  // Accept if meeting demands
  if (satisfaction >= OFFER_THRESHOLDS.AUTO_ACCEPT) {
    return {
      status: 'accepted',
      message: 'The player is happy with your offer and has signed the contract!',
    };
  }
  
  // Reject if too low OR max rounds reached
  if (satisfaction < OFFER_THRESHOLDS.COUNTER_MIN || roundsUsed >= NEGOTIATION.MAX_ROUNDS) {
    return {
      status: 'rejected',
      message: roundsUsed >= NEGOTIATION.MAX_ROUNDS
        ? 'Negotiations have broken down. The player has rejected your final offer.'
        : 'Your offer is too low. The player has walked away from negotiations.',
    };
  }
  
  // Counter offer - meet halfway between offer and demand
  const counterWage = Math.round(((offeredWage + demands.wage) / 2) / 100000) * 100000;
  const counterLength = Math.round((offeredLength + demands.length) / 2);
  
  return {
    status: 'countered',
    counter_wage: counterWage,
    counter_length: counterLength,
    message: 'The player has made a counter offer.',
  };
}

/**
 * Check if a negotiation is still in cooldown
 */
export function isInCooldown(rejectedAt: Date | null, currentWeek: number, rejectionWeek: number): boolean {
  if (!rejectedAt) return false;
  return (currentWeek - rejectionWeek) < NEGOTIATION.COOLDOWN_WEEKS;
}