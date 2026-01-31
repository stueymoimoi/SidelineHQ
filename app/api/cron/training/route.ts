/**
 * SidelineHQ Cron: TRAINING
 * 
 * Phase 2 of 4 - Runs at 6:05pm AEST (8:05 UTC)
 * - Processes training progress for all players
 * - Stat gains based on training stage + affinities
 * - REST only gives recovery if player DIDN'T play this round
 * 
 * Schedule: 5 8 * * 0,2,4
 * 
 * UPDATED: January 31, 2026
 * - Checks player_match_stats to see who played
 * - REST skipped if player was in match lineup
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { processAllTraining } from '@/lib/training';
import { SEASON } from '@/lib/game-engine/constants';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    // Update phase
    await supabase.from('game_state').update({ current_phase: 'training' }).eq('id', 1);
    logs.push('📚 Training phase started');
    
    // ===========================================
    // GET CURRENT ROUND FROM GAME STATE
    // ===========================================
    const { data: gameState } = await supabase
      .from('game_state')
      .select('current_round')
      .eq('id', 1)
      .single();
    
    // Get current round from most recent played fixture if game_state doesn't have it
    let currentRound = gameState?.current_round;
    
    if (!currentRound) {
      const { data: lastFixture } = await supabase
        .from('fixtures')
        .select('round')
        .eq('season', SEASON)
        .eq('played', true)
        .order('round', { ascending: false })
        .limit(1)
        .single();
      
      currentRound = lastFixture?.round || 1;
    }
    
    logs.push(`Current round: ${currentRound}`);
    
    // ===========================================
    // GET PLAYERS WHO PLAYED THIS ROUND
    // ===========================================
    const playedThisRound = new Set<string>();
    
    // Check club match stats
    const { data: recentFixtures } = await supabase
      .from('fixtures')
      .select('id')
      .eq('season', SEASON)
      .eq('round', currentRound)
      .eq('played', true);
    
    if (recentFixtures && recentFixtures.length > 0) {
      const fixtureIds = recentFixtures.map(f => f.id);
      
      const { data: matchStats } = await supabase
        .from('player_match_stats')
        .select('player_id')
        .in('fixture_id', fixtureIds);
      
      (matchStats || []).forEach(s => playedThisRound.add(s.player_id));
    }
    
    // Check origin stats (for origin rounds)
    const { data: recentOriginFixture } = await supabase
      .from('origin_fixtures')
      .select('id')
      .eq('season', SEASON)
      .eq('round', currentRound)
      .eq('played', true)
      .single();
    
    if (recentOriginFixture) {
      const { data: originStats } = await supabase
        .from('origin_player_stats')
        .select('player_id')
        .eq('origin_fixture_id', recentOriginFixture.id);
      
      (originStats || []).forEach(s => playedThisRound.add(s.player_id));
    }
    
    logs.push(`Players who played this round: ${playedThisRound.size}`);
    
    // ===========================================
    // LOAD ALL PLAYERS
    // ===========================================
    const [players1, players2, players3] = await Promise.all([
      supabase.from('players').select('*').range(0, 999),
      supabase.from('players').select('*').range(1000, 1999),
      supabase.from('players').select('*').range(2000, 2999),
    ]);
    
    const allPlayers = [
      ...(players1.data || []),
      ...(players2.data || []),
      ...(players3.data || [])
    ];
    
    logs.push(`Loaded ${allPlayers.length} players`);
    
    // ===========================================
    // PROCESS TRAINING (with played info)
    // ===========================================
    const { 
      playerUpdates, 
      notifications: trainingNotifications, 
      improvementCount,
      declineCount,
      restSkippedCount 
    } = processAllTraining(allPlayers, playedThisRound);
    
    logs.push(`Training processed: ${improvementCount} improved, ${declineCount} declined`);
    logs.push(`REST skipped (played in match): ${restSkippedCount} players`);
    
    // Save updates in chunks
    if (playerUpdates.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < playerUpdates.length; i += chunkSize) {
        const chunk = playerUpdates.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(update =>
            supabase.from('players').update(update).eq('id', update.id)
          )
        );
      }
      logs.push(`Saved ${playerUpdates.length} player updates`);
    }
    
    // Save notifications
    if (trainingNotifications.length > 0) {
      await supabase.from('notifications').insert(trainingNotifications);
      logs.push(`Created ${trainingNotifications.length} training notifications`);
    }
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Training complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      phase: 'training',
      round: currentRound,
      playersProcessed: allPlayers.length,
      improvements: improvementCount,
      declines: declineCount,
      restSkipped: restSkippedCount,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Training cron error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
