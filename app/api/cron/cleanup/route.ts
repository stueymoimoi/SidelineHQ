/**
 * SidelineHQ Cron: CLEANUP
 * 
 * Phase 4 of 4 - Runs at 6:15pm AEST (8:15 UTC)
 * - Processes morale changes
 * - Sets maintenance mode OFF
 * 
 * Schedule: 15 8 * * 0,2,4
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SEASON } from '@/lib/game-engine/constants';
import type { Notification } from '@/lib/game-engine/types';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Morale constants (from your Morale v2 system)
const MORALE_CHANGES = {
  TEAM_WIN: 3,
  TEAM_LOSS: -2,
  WIN_STREAK_BONUS: 2,      // 3+ wins
  LOSS_STREAK_PENALTY: -2,  // 3+ losses
  MOTM: 5,
  PLAYED: 1,
  DIDNT_PLAY: -1,
  TRANSFER_LISTED: -3,
  AVAILABLE_TAG: -2,
  UNTOUCHABLE_TAG: 2,
};

export async function GET(request: Request) {
  const startTime = Date.now();
  const supabase = getSupabase();
  const logs: string[] = [];
  
  // Auth check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron');
  
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!isVercelCron && secret !== CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await supabase.from('game_state').update({ current_phase: 'cleanup' }).eq('id', 1);
    logs.push('🧹 Cleanup phase started');
    
    // Get current round (most recently played)
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('round')
      .eq('season', SEASON)
      .eq('played', true)
      .order('round', { ascending: false })
      .limit(1);
    
    const currentRound = fixtures?.[0]?.round || 1;
    logs.push(`Current round: ${currentRound}`);
    
    // ===========================================
    // MORALE PROCESSING
    // ===========================================
    
    // Get this round's match results
    const { data: matchResults } = await supabase
      .from('match_results')
      .select('*, home_team:teams!match_results_home_team_id_fkey(id, name), away_team:teams!match_results_away_team_id_fkey(id, name)')
      .eq('round', currentRound)
      .eq('season', SEASON);
    
    // Get this round's player stats (who played)
    const { data: playerStats } = await supabase
      .from('player_match_stats')
      .select('player_id, team_id')
      .in('fixture_id', (matchResults || []).map(m => m.fixture_id));
    
    const playersWhoPlayed = new Set((playerStats || []).map(s => s.player_id));
    
    // Build team results map
    const teamResults: Record<string, { won: boolean; lost: boolean; draw: boolean }> = {};
    for (const result of (matchResults || [])) {
      const homeWon = result.home_score > result.away_score;
      const awayWon = result.away_score > result.home_score;
      const draw = result.home_score === result.away_score;
      
      teamResults[result.home_team_id] = { won: homeWon, lost: awayWon, draw };
      teamResults[result.away_team_id] = { won: awayWon, lost: homeWon, draw };
    }
    
    // Get MOTM players
    const motmPlayerIds = new Set(
      (matchResults || [])
        .filter(m => m.motm_player_id)
        .map(m => m.motm_player_id)
    );
    
    // Get teams data for streak calculation
    const { data: teams } = await supabase.from('teams').select('id, wins, losses');
    const teamsMap: Record<string, { wins: number; losses: number }> = {};
    (teams || []).forEach(t => { teamsMap[t.id] = { wins: t.wins, losses: t.losses }; });
    
    // Load all players
    const [p1, p2, p3] = await Promise.all([
      supabase.from('players').select('id, team_id, morale, availability').range(0, 999),
      supabase.from('players').select('id, team_id, morale, availability').range(1000, 1999),
      supabase.from('players').select('id, team_id, morale, availability').range(2000, 2999),
    ]);
    const allPlayers = [...(p1.data || []), ...(p2.data || []), ...(p3.data || [])];
    
    // Get transfer-listed players
    const { data: transferListings } = await supabase
      .from('transfer_listings')
      .select('player_id')
      .eq('status', 'active');
    const transferListedIds = new Set((transferListings || []).map(t => t.player_id));
    
    // Process morale for each player
    const moraleUpdates: { id: string; morale: number }[] = [];
    let moraleChanges = 0;
    
    for (const player of allPlayers) {
      if (!player.team_id) continue;
      
      let moraleChange = 0;
      const teamResult = teamResults[player.team_id];
      const team = teamsMap[player.team_id];
      
      // Team result
      if (teamResult) {
        if (teamResult.won) moraleChange += MORALE_CHANGES.TEAM_WIN;
        if (teamResult.lost) moraleChange += MORALE_CHANGES.TEAM_LOSS;
        // Draw = no change
      }
      
      // Win/loss streak bonus (simplified - check if 3+ wins or losses)
      if (team) {
        if (team.wins >= 3) moraleChange += MORALE_CHANGES.WIN_STREAK_BONUS;
        if (team.losses >= 3) moraleChange += MORALE_CHANGES.LOSS_STREAK_PENALTY;
      }
      
      // MOTM bonus
      if (motmPlayerIds.has(player.id)) {
        moraleChange += MORALE_CHANGES.MOTM;
      }
      
      // Played vs didn't play
      if (playersWhoPlayed.has(player.id)) {
        moraleChange += MORALE_CHANGES.PLAYED;
      } else if (teamResult) {
        // Only penalize if their team played but they didn't
        moraleChange += MORALE_CHANGES.DIDNT_PLAY;
      }
      
      // Transfer listed penalty
      if (transferListedIds.has(player.id)) {
        moraleChange += MORALE_CHANGES.TRANSFER_LISTED;
      }
      
      // Availability tag effects
      if (player.availability === 'available') {
        moraleChange += MORALE_CHANGES.AVAILABLE_TAG;
      } else if (player.availability === 'untouchable') {
        moraleChange += MORALE_CHANGES.UNTOUCHABLE_TAG;
      }
      
      // Apply change (clamped to 0-100)
      if (moraleChange !== 0) {
        const currentMorale = player.morale ?? 50;
        const newMorale = Math.max(0, Math.min(100, currentMorale + moraleChange));
        
        if (newMorale !== currentMorale) {
          moraleUpdates.push({ id: player.id, morale: newMorale });
          moraleChanges++;
        }
      }
    }
    
    // Save morale updates in chunks
    if (moraleUpdates.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < moraleUpdates.length; i += chunkSize) {
        const chunk = moraleUpdates.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(update =>
            supabase.from('players').update({ morale: update.morale }).eq('id', update.id)
          )
        );
      }
    }
    
    logs.push(`😊 Morale: ${moraleChanges} players updated`);
    
    // ===========================================
    // TURN OFF MAINTENANCE MODE
    // ===========================================
    
    await supabase.from('game_state').update({ 
      maintenance: false, 
      current_phase: null,
      last_cron_run: new Date().toISOString()
    }).eq('id', 1);
    
    logs.push('🔓 Maintenance mode OFF');
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Cleanup complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      phase: 'cleanup',
      moraleUpdates: moraleChanges,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Cleanup cron error:', error);
    // Still try to turn off maintenance mode
    await supabase.from('game_state').update({ maintenance: false, current_phase: 'error' }).eq('id', 1);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
