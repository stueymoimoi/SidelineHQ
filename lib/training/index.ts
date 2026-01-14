/**
 * SidelineHQ Training System
 * Player development and stat improvement logic
 */

import type { Player, ProgressStage, Notification } from '../game-engine/types';
import {
  PROGRESS_STAGES,
  STAT_IMPROVEMENT_CHANCES,
  TRAINABLE_STATS,
  TRAINING_ADVANCE_BASE_CHANCE,
  FATIGUE_PER_TRAINING,
  REST_RECOVERY
} from '../game-engine/constants';
import { rollChance } from '../game-engine/scoring';

// ===========================================
// TYPES
// ===========================================

export interface TrainingResult {
  playerId: string;
  updates: Record<string, any>;
  improved: boolean;
  notification?: Notification;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the next progress stage
 */
function getNextProgressStage(current: ProgressStage): ProgressStage | null {
  const idx = PROGRESS_STAGES.indexOf(current);
  if (idx < 0 || idx >= PROGRESS_STAGES.length - 1) return null;
  return PROGRESS_STAGES[idx + 1];
}

/**
 * Calculate stat gain amount
 * 50% chance +1, 35% chance +2, 15% chance +3
 */
function calculateStatGain(): number {
  const roll = Math.random();
  if (roll < 0.5) return 1;
  if (roll < 0.85) return 2;
  return 3;
}

/**
 * Calculate overall rating from stats
 */
function calculateOverall(player: Player, updates: Record<string, any>): number {
  return Math.round((
    (updates.speed ?? player.speed) +
    (updates.strength ?? player.strength) +
    (updates.power ?? player.power) +
    (updates.passing ?? player.passing) +
    (updates.stamina ?? player.stamina) +
    (updates.tackling ?? player.tackling) +
    (updates.kicking ?? player.kicking)
  ) / 7);
}

// ===========================================
// MAIN TRAINING FUNCTION
// ===========================================

/**
 * Process training for a single player
 * 
 * @param player - The player to train
 * @returns Training result with updates and optional notification
 * 
 * @example
 * const result = processPlayerTraining(player);
 * if (result.improved) {
 *   console.log('Player improved!', result.notification);
 * }
 */
export function processPlayerTraining(player: Player): TrainingResult {
  const updates: Record<string, any> = {};
  let improved = false;
  let notification: Notification | undefined;

  const training = player.current_training;
  const progress = player.training_progress || 'NONE';
  const potential = player.potential || 70;
  const potentialBonus = (potential - 60) / 2;

  // Rest mode - just recover fatigue
  if (training === 'Rest') {
    updates.fatigue = Math.max(0, (player.fatigue || 0) - REST_RECOVERY);
    return { playerId: player.id, updates, improved: false };
  }

  // No training assigned
  if (!training) {
    return { playerId: player.id, updates, improved: false };
  }

  // Training adds fatigue
  updates.fatigue = Math.min(100, (player.fatigue || 0) + FATIGUE_PER_TRAINING);

  // Chance to advance progress stage
  if (progress !== 'EXCELLENT' && rollChance(TRAINING_ADVANCE_BASE_CHANCE + potentialBonus)) {
    const nextStage = getNextProgressStage(progress as ProgressStage);
    if (nextStage) {
      updates.training_progress = nextStage;
    }
  }

  // Calculate improvement chance
  const effectiveProgress = (updates.training_progress || progress) as ProgressStage;
  const improvementChance = (STAT_IMPROVEMENT_CHANCES[effectiveProgress] || 0) + potentialBonus;

  // Check if stat improves
  if (improvementChance > 0 && rollChance(improvementChance)) {
    const statKey = training.toLowerCase();
    
    // Verify this is a trainable stat
    if (TRAINABLE_STATS.map(s => s.toLowerCase()).includes(statKey)) {
      const currentStat = (player as any)[statKey];
      
      if (currentStat < 99) {
        const gain = calculateStatGain();
        const newStat = Math.min(99, currentStat + gain);
        updates[statKey] = newStat;

        // Recalculate overall
        const newOverall = calculateOverall(player, updates);
        updates.overall = newOverall;
        improved = true;

        // Track OVR change
        if (newOverall !== player.overall) {
          updates.ovr_change = newOverall - player.overall;
          updates.ovr_changed_at = new Date().toISOString();

          // Create notification for improvement
          if (newOverall > player.overall) {
            notification = {
              team_id: player.team_id!,
              type: 'player_improvement',
              title: '⭐ Player Improved!',
              message: `${player.first_name} ${player.last_name} increased ${training}! Overall now ${newOverall}`,
              player_id: player.id
            };
          }
        }
      }
    }
  }

  return { playerId: player.id, updates, improved, notification };
}

/**
 * Process training for all players
 * 
 * @param players - Array of all players to process
 * @returns Object with all updates and notifications
 */
export function processAllTraining(players: Player[]): {
  playerUpdates: { id: string; [key: string]: any }[];
  notifications: Notification[];
  improvementCount: number;
} {
  const playerUpdates: { id: string; [key: string]: any }[] = [];
  const notifications: Notification[] = [];
  let improvementCount = 0;

  const trainingPlayers = players.filter(p => p.current_training);

  for (const player of trainingPlayers) {
    const result = processPlayerTraining(player);

    if (Object.keys(result.updates).length > 0) {
      playerUpdates.push({ id: result.playerId, ...result.updates });
    }

    if (result.improved) {
      improvementCount++;
    }

    if (result.notification) {
      notifications.push(result.notification);
    }
  }

  return { playerUpdates, notifications, improvementCount };
}