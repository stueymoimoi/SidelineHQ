import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map player positions to tactics fields (priority order)
const POSITION_TO_FIELDS: Record<string, string[]> = {
  'Fullback': ['pos_fullback'],
  'Winger': ['pos_winger_l', 'pos_winger_r'],
  'Centre': ['pos_centre_l', 'pos_centre_r'],
  'Five-Eighth': ['pos_five_eighth'],
  'Halfback': ['pos_halfback'],
  'Prop': ['pos_prop_l', 'pos_prop_r'],
  'Hooker': ['pos_hooker'],
  'Second Row': ['pos_second_row_l', 'pos_second_row_r'],
  'Lock': ['pos_lock'],
};

// Position priority for filling bench (versatile players first)
const BENCH_PRIORITY = ['Prop', 'Second Row', 'Hooker', 'Lock', 'Centre', 'Halfback', 'Five-Eighth', 'Winger', 'Fullback'];

interface Player {
  id: string;
  position: string;
  overall: number;
  fatigue: number;
  injury_status?: string;
}

interface TacticsUpdate {
  pos_fullback?: string;
  pos_winger_l?: string;
  pos_winger_r?: string;
  pos_centre_l?: string;
  pos_centre_r?: string;
  pos_five_eighth?: string;
  pos_halfback?: string;
  pos_prop_l?: string;
  pos_prop_r?: string;
  pos_hooker?: string;
  pos_second_row_l?: string;
  pos_second_row_r?: string;
  pos_lock?: string;
  bench_1?: string;
  bench_2?: string;
  bench_3?: string;
  bench_4?: string;
  captain?: string;
  goal_kicker?: string;
  updated_at?: string;
}

/**
 * Generate optimal lineup for a team based on available players
 */
export function generateLineup(players: Player[], injuredPlayerIds: Set<string> = new Set()): TacticsUpdate {
  // Filter out injured players and sort by overall (best first), then by fitness
  const available = players
    .filter(p => !injuredPlayerIds.has(p.id))
    .sort((a, b) => {
      // Primary: higher overall first
      if (b.overall !== a.overall) return b.overall - a.overall;
      // Secondary: lower fatigue (higher fitness) first
      return (a.fatigue || 0) - (b.fatigue || 0);
    });

  const tactics: TacticsUpdate = {};
  const usedPlayerIds = new Set<string>();

  // Fill starting positions (1-13)
  const positionOrder = [
    'Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback',
    'Prop', 'Hooker', 'Second Row', 'Lock'
  ];

  for (const position of positionOrder) {
    const fields = POSITION_TO_FIELDS[position];
    const positionPlayers = available.filter(
      p => p.position === position && !usedPlayerIds.has(p.id)
    );

    for (const field of fields) {
      const player = positionPlayers.shift();
      if (player) {
        tactics[field as keyof TacticsUpdate] = player.id;
        usedPlayerIds.add(player.id);
      }
    }
  }

  // Fill bench (14-17) with best remaining players, prioritizing forwards
  const benchFields = ['bench_1', 'bench_2', 'bench_3', 'bench_4'];
  const remainingPlayers = available.filter(p => !usedPlayerIds.has(p.id));
  
  // Sort remaining by bench priority (forwards first for impact)
  remainingPlayers.sort((a, b) => {
    const aPriority = BENCH_PRIORITY.indexOf(a.position);
    const bPriority = BENCH_PRIORITY.indexOf(b.position);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.overall - a.overall;
  });

  for (let i = 0; i < benchFields.length && i < remainingPlayers.length; i++) {
    tactics[benchFields[i] as keyof TacticsUpdate] = remainingPlayers[i].id;
    usedPlayerIds.add(remainingPlayers[i].id);
  }

  // Set captain (highest overall starter)
  const starters = available.filter(p => usedPlayerIds.has(p.id)).slice(0, 13);
  if (starters.length > 0) {
    tactics.captain = starters[0].id; // Already sorted by overall
  }

  // Set goal kicker (prefer Fullback, then Halfback, then Five-Eighth)
  const kickerPriority = ['Fullback', 'Halfback', 'Five-Eighth'];
  for (const pos of kickerPriority) {
    const kicker = available.find(p => p.position === pos && usedPlayerIds.has(p.id));
    if (kicker) {
      tactics.goal_kicker = kicker.id;
      break;
    }
  }

  tactics.updated_at = new Date().toISOString();

  return tactics;
}

/**
 * Auto-fill tactics for all teams that have empty/incomplete lineups
 */
export async function autoFillAllTeamTactics(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  // Get all teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name');

  if (teamsError || !teams) {
    return { updated: 0, errors: ['Failed to fetch teams: ' + teamsError?.message] };
  }

  // Get all currently injured players (active injuries)
  const { data: activeInjuries } = await supabase
    .from('player_injuries')
    .select('player_id')
    .eq('is_active', true);
  
  const injuredPlayerIds = new Set<string>(
    (activeInjuries || []).map(i => i.player_id)
  );

  for (const team of teams) {
    try {
      // Get current tactics
      const { data: tactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', team.id)
        .single();

      // Check if lineup is incomplete (any starting position is null)
      const startingFields = [
        'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
        'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
        'pos_second_row_l', 'pos_second_row_r', 'pos_lock'
      ];

      const isIncomplete = !tactics || startingFields.some(f => !tactics[f]);

      if (!isIncomplete) continue; // Skip teams with complete lineups

      // Get team's players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, position, overall, fatigue')
        .eq('team_id', team.id);

      if (playersError || !players || players.length < 17) {
        errors.push(`${team.name}: Not enough players (${players?.length || 0})`);
        continue;
      }

      // Generate lineup (excluding injured players)
      const newTactics = generateLineup(players, injuredPlayerIds);

      // Update or insert tactics
      if (tactics) {
        // Merge: only fill null fields
        const mergedTactics: TacticsUpdate = { ...newTactics };
        for (const field of [...startingFields, 'bench_1', 'bench_2', 'bench_3', 'bench_4', 'captain', 'goal_kicker']) {
          if (tactics[field]) {
            mergedTactics[field as keyof TacticsUpdate] = tactics[field];
          }
        }

        const { error: updateError } = await supabase
          .from('team_tactics')
          .update(mergedTactics)
          .eq('team_id', team.id);

        if (updateError) {
          errors.push(`${team.name}: Update failed - ${updateError.message}`);
        } else {
          updated++;
        }
      } else {
        // Insert new tactics record
        const { error: insertError } = await supabase
          .from('team_tactics')
          .insert({ team_id: team.id, ...newTactics });

        if (insertError) {
          errors.push(`${team.name}: Insert failed - ${insertError.message}`);
        } else {
          updated++;
        }
      }
    } catch (err) {
      errors.push(`${team.name}: ${err}`);
    }
  }

  return { updated, errors };
}

/**
 * Auto-fill tactics for a single team
 */
export async function autoFillTeamTactics(teamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, position, overall, fatigue')
      .eq('team_id', teamId);

    if (playersError || !players || players.length < 17) {
      return { success: false, error: `Not enough players (${players?.length || 0})` };
    }

    // Get injured players for this team
    const { data: activeInjuries } = await supabase
      .from('player_injuries')
      .select('player_id')
      .eq('is_active', true);
    
    const injuredPlayerIds = new Set<string>(
      (activeInjuries || []).map(i => i.player_id)
    );

    const newTactics = generateLineup(players, injuredPlayerIds);

    const { error: upsertError } = await supabase
      .from('team_tactics')
      .upsert({ team_id: teamId, ...newTactics }, { onConflict: 'team_id' });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Scan all team lineups and replace any injured players with best available
 * This ensures coaches who left injured players in their lineup get auto-fixed
 */
export async function replaceInjuredPlayersInLineups(): Promise<{ 
  teamsFixed: number; 
  playersReplaced: number;
  replacements: { teamId: string; injuredPlayerId: string; replacementPlayerId: string; position: string }[];
  errors: string[] 
}> {
  const errors: string[] = [];
  let teamsFixed = 0;
  let playersReplaced = 0;
  const replacements: { teamId: string; injuredPlayerId: string; replacementPlayerId: string; position: string }[] = [];

  // Get all active injuries
  const { data: activeInjuries } = await supabase
    .from('player_injuries')
    .select('player_id')
    .eq('is_active', true);
  
  const injuredPlayerIds = new Set<string>(
    (activeInjuries || []).map(i => i.player_id)
  );

  if (injuredPlayerIds.size === 0) {
    return { teamsFixed: 0, playersReplaced: 0, replacements: [], errors: [] };
  }

  // Get all team tactics
  const { data: allTactics, error: tacticsError } = await supabase
    .from('team_tactics')
    .select('*');

  if (tacticsError || !allTactics) {
    return { teamsFixed: 0, playersReplaced: 0, replacements: [], errors: ['Failed to fetch tactics'] };
  }

  const positionFields = [
    'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
    'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
    'pos_second_row_l', 'pos_second_row_r', 'pos_lock',
    'bench_1', 'bench_2', 'bench_3', 'bench_4'
  ];

  for (const tactics of allTactics) {
    // Find injured players in this lineup
    const injuredInLineup: { field: string; playerId: string }[] = [];
    const currentLineupIds = new Set<string>();

    for (const field of positionFields) {
      const playerId = tactics[field];
      if (playerId) {
        currentLineupIds.add(playerId);
        if (injuredPlayerIds.has(playerId)) {
          injuredInLineup.push({ field, playerId });
        }
      }
    }

    if (injuredInLineup.length === 0) continue;

    // Get all players for this team
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id, position, overall, fatigue')
      .eq('team_id', tactics.team_id);

    if (!teamPlayers) continue;

    // Find available replacements (not in lineup, not injured)
    const availableReplacements = teamPlayers
      .filter(p => !currentLineupIds.has(p.id) && !injuredPlayerIds.has(p.id))
      .sort((a, b) => b.overall - a.overall);

    const tacticsUpdate: Record<string, string> = {};
    let teamHadReplacements = false;

    for (const { field, playerId } of injuredInLineup) {
      // Find best available replacement
      const replacement = availableReplacements.shift();
      
      if (replacement) {
        tacticsUpdate[field] = replacement.id;
        currentLineupIds.add(replacement.id);
        teamHadReplacements = true;
        playersReplaced++;
        
        replacements.push({
          teamId: tactics.team_id,
          injuredPlayerId: playerId,
          replacementPlayerId: replacement.id,
          position: field
        });
      } else {
        // No replacement available - clear the position
        tacticsUpdate[field] = null as any;
        errors.push(`Team ${tactics.team_id}: No replacement for injured player in ${field}`);
      }
    }

    if (Object.keys(tacticsUpdate).length > 0) {
      tacticsUpdate['updated_at'] = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('team_tactics')
        .update(tacticsUpdate)
        .eq('team_id', tactics.team_id);

      if (updateError) {
        errors.push(`Team ${tactics.team_id}: Update failed - ${updateError.message}`);
      } else if (teamHadReplacements) {
        teamsFixed++;
      }
    }
  }

  return { teamsFixed, playersReplaced, replacements, errors };
}