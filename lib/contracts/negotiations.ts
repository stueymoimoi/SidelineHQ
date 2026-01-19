// /lib/contracts/negotiations.ts

import {
  CONTRACT_LENGTHS,
  NEGOTIATION,
  OFFER_THRESHOLDS,
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
 * 
 * Logic:
 * - Base = current_wage × 1.10 (natural 10% increase for loyalty/experience)
 * - +5% per OVR point gained since last contract
 * - +5% if age ≤24 (potential premium)
 * - -5% per year over 29 (age penalty)
 * - Morale: +5% if high, -15% if low
 * - Round to nearest $50 (5000 cents)
 */
export function calculatePlayerDemands(
  player: PlayerForNegotiation,
  ovrAtSigning?: number
): PlayerDemands {
  // Base wage = current wage × 1.10 (natural 10% increase for loyalty/experience)
  let wage = player.current_wage * 1.10;
  
  // OVR improvement bonus: +5% per OVR point gained
  if (ovrAtSigning !== undefined && player.overall > ovrAtSigning) {
    const ovrGained = player.overall - ovrAtSigning;
    wage = wage * (1 + (ovrGained * 0.05));
  }
  
  // Young player premium: +5% if age ≤24 (still developing)
  if (player.age <= 24) {
    wage = wage * 1.05;
  }
  
  // Age penalty: -5% per year over 29
  if (player.age > 29) {
    const yearsOver = player.age - 29;
    wage = wage * (1 - (yearsOver * 0.05));
  }
  
  // Morale modifier
  if (player.morale >= 80) {
    wage = wage * 1.05; // Happy players ask for a bit more
  } else if (player.morale < 50) {
    wage = wage * 0.85; // Unhappy players more desperate
  }
  
  // Round to nearest $50 (5000 cents)
  const demandedWage = Math.round(wage / 5000) * 5000;
  
  // Calculate demanded length based on age
  let demandedLength: number;
  if (player.age <= LENGTH_BY_AGE.YOUNG_MAX_AGE) {
    demandedLength = CONTRACT_LENGTHS.TWO_SEASONS;
  } else if (player.age <= LENGTH_BY_AGE.VETERAN_MAX_AGE) {
    demandedLength = player.overall >= 35 
      ? CONTRACT_LENGTHS.TWO_SEASONS 
      : CONTRACT_LENGTHS.ONE_SEASON;
  } else {
    demandedLength = CONTRACT_LENGTHS.ONE_SEASON;
  }
  
  // Minimum wage floor ($5k/week = 500000 cents)
  return {
    wage: Math.max(demandedWage, 500000),
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
  
  // Counter offer - meet halfway between offer and demand (round to nearest $50)
  const counterWage = Math.round(((offeredWage + demands.wage) / 2) / 5000) * 5000;
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