// /lib/game-engine/injury-processing.ts
// =============================================
// INJURY SYSTEM - CRON INTEGRATION
// =============================================

import { SupabaseClient } from '@supabase/supabase-js';
import { checkForInjury, selectRandomInjury, calculateRecoveryRounds } from './injuries';
import type { Player } from './types';
import type { Notification } from './types';

export interface InjuryType {
  id: string;
  name: string;
  body_part: string;
  severity: 'minor' | 'moderate' | 'major';
  min_recovery_rounds: number;
  max_recovery_rounds: number;
}

export interface InjuryResult {
  playerId: string;
  playerName: string;
  teamId: string;
  injuryTypeId: string;
  injuryName: string;
  severity: 'minor' | 'moderate' | 'major';
  roundsOut: number;
  roundReturn: number;
  minuteInjured: number; // When in the match the injury occurred (for reduced minutes)
}

/**
 * Process injuries for all players who played in a match
 */
export async function processMatchInjuries(
  supabase: SupabaseClient,
  playingPlayerIds: string[],
  playersMap: Record<string, Player>,
  season: number,
  currentRound: number,
  injuryContext: 'match' | 'origin' = 'match'
): Promise<{
  injuries: InjuryResult[];
  notifications: Notification[];
}> {
  const injuries: InjuryResult[] = [];
  const notifications: Notification[] = [];

  // Fetch injury types once
  const { data: injuryTypes } = await supabase
    .from('injury_types')
    .select('*');

  if (!injuryTypes || injuryTypes.length === 0) {
    console.warn('No injury types found in database');
    return { injuries, notifications };
  }

  // Check each playing player for injury
  for (const playerId of playingPlayerIds) {
    const player = playersMap[playerId];
    if (!player || !player.team_id) continue;

    // Check for injury
    const result = checkForInjury({
      playerId: player.id,
      durability: player.durability || 'normal',
      fatigue: player.fatigue || 0,
      hiddenTrait: player.hidden_trait || null,
    });

    if (result.isInjured && result.severity) {
      // Select random injury of this severity
      const injuryType = selectRandomInjury(injuryTypes, result.severity);
      if (!injuryType) continue;

      // Calculate recovery time
      const roundsOut = calculateRecoveryRounds(injuryType);
      const roundReturn = currentRound + roundsOut;

      // Random minute when injury occurred (20-75 mins)
      const minuteInjured = 20 + Math.floor(Math.random() * 56);

      injuries.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        teamId: player.team_id,
        injuryTypeId: injuryType.id,
        injuryName: injuryType.name,
        severity: result.severity,
        roundsOut,
        roundReturn,
        minuteInjured,
      });

      // Create notification
      const severityEmoji = result.severity === 'major' ? '🚨' : result.severity === 'moderate' ? '🏥' : '🤕';
      const severityText = result.severity.charAt(0).toUpperCase() + result.severity.slice(1);

      notifications.push({
        team_id: player.team_id,
        type: 'player_injured' as any,
        title: `${severityEmoji} Player Injured`,
        message: `${player.first_name} ${player.last_name} has suffered a ${injuryType.name} (${severityText}). Out for ${roundsOut} round${roundsOut > 1 ? 's' : ''}, returns Round ${roundReturn}.`,
        player_id: player.id,
      });
    }
  }

  return { injuries, notifications };
}

/**
 * Save injuries to database
 */
export async function saveInjuries(
  supabase: SupabaseClient,
  injuries: InjuryResult[],
  season: number,
  currentRound: number,
  injuryContext: 'match' | 'origin' = 'match'
): Promise<void> {
  if (injuries.length === 0) return;

  const injuryRecords = injuries.map(injury => ({
    player_id: injury.playerId,
    injury_type_id: injury.injuryTypeId,
    team_id: injury.teamId,
    season,
    round_injured: currentRound,
    rounds_out: injury.roundsOut,
    round_return: injury.roundReturn,
    injury_context: injuryContext,
    is_active: true,
  }));

  const { error } = await supabase.from('player_injuries').insert(injuryRecords);

  if (error) {
    console.error('Error saving injuries:', error);
  }
}

/**
 * Process injury recoveries - mark healed injuries as inactive
 */
export async function processInjuryRecoveries(
  supabase: SupabaseClient,
  currentRound: number,
  season: number
): Promise<{
  recoveredCount: number;
  notifications: Notification[];
}> {
  const notifications: Notification[] = [];

  // Find injuries that should recover this round
  const { data: recoveringInjuries } = await supabase
    .from('player_injuries')
    .select('*, players(first_name, last_name, team_id), injury_types(name)')
    .eq('is_active', true)
    .eq('season', season)
    .lte('round_return', currentRound);

  if (!recoveringInjuries || recoveringInjuries.length === 0) {
    return { recoveredCount: 0, notifications };
  }

  // Mark as recovered
  const recoveryIds = recoveringInjuries.map(i => i.id);
  await supabase
    .from('player_injuries')
    .update({ is_active: false, recovered_at: new Date().toISOString() })
    .in('id', recoveryIds);

  // Create recovery notifications
  for (const injury of recoveringInjuries) {
    const player = injury.players;
    if (!player?.team_id) continue;

    notifications.push({
      team_id: player.team_id,
      type: 'player_recovered' as any,
      title: '💪 Player Recovered',
      message: `${player.first_name} ${player.last_name} has recovered from their ${injury.injury_types?.name || 'injury'} and is available for selection!`,
      player_id: injury.player_id,
    });
  }

  return { recoveredCount: recoveringInjuries.length, notifications };
}