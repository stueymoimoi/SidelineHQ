/**
 * SidelineHQ Cron: FINANCES
 * 
 * Phase 3 of 5 - Runs at 6:10pm AEST (8:10 UTC)
 * 
 * SUNDAY: Full processing (wages, grants, revenue, contracts)
 * TUE/THU: Light processing (just contracts + AI renewals)
 * 
 * Schedule: 10 8 * * 0,2,4
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SEASON } from '@/lib/game-engine/constants';
import { 
  processAllTeamFinances, 
  processAIContractRenewals,
  ENABLE_FINANCES 
} from '@/lib/finances';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// OPTIMIZED CONTRACT COUNTDOWN
// Uses database function for single-call update
// ============================================
async function processContractCountdownOptimized(
  supabase: any
): Promise<{ updated: number; expired: number }> {
  
  // 1. Try to use the RPC function first (single SQL call)
  let updated = 0;
  const { data: rpcResult, error: rpcError } = await supabase.rpc('decrement_all_contracts');
  
  if (!rpcError && rpcResult !== null) {
    updated = rpcResult;
  } else {
    // Fallback: batch update in parallel chunks
    const { data: contracts } = await supabase
      .from('player_contracts')
      .select('id, weeks_remaining')
      .gt('weeks_remaining', 0);
    
    if (contracts && contracts.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < contracts.length; i += chunkSize) {
        const chunk = contracts.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((contract: any) =>
            supabase
              .from('player_contracts')
              .update({ 
                weeks_remaining: contract.weeks_remaining - 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contract.id)
          )
        );
      }
      updated = contracts.length;
    }
  }

  // 2. Handle expired contracts (batch operations)
  const { data: expiredContracts } = await supabase
    .from('player_contracts')
    .select('id, player_id, team_id')
    .lte('weeks_remaining', 0);

  let expired = 0;
  if (expiredContracts && expiredContracts.length > 0) {
    const playerIds = expiredContracts.map((c: any) => c.player_id);
    const contractIds = expiredContracts.map((c: any) => c.id);
    
    // Get current round for free agent availability
    const { data: roundData } = await supabase
      .from('fixtures')
      .select('round')
      .eq('season', SEASON)
      .eq('played', true)
      .order('round', { ascending: false })
      .limit(1);
    const currentRound = roundData?.[0]?.round || 1;
    
    // Batch insert to free_agents
    const freeAgentInserts = expiredContracts.map((contract: any) => ({
      player_id: contract.player_id,
      released_by_team_id: contract.team_id,
      available_round: currentRound + 1,
      claimed: false,
    }));
    
    await supabase.from('free_agents').insert(freeAgentInserts);
    
    // Batch delete contracts
    await supabase
      .from('player_contracts')
      .delete()
      .in('id', contractIds);
    
    // Batch update players
    await supabase
      .from('players')
      .update({ team_id: null })
      .in('id', playerIds);
    
    expired = expiredContracts.length;
  }

  return { updated, expired };
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
    await supabase.from('game_state').update({ current_phase: 'finances' }).eq('id', 1);
    logs.push('💰 Finances phase started');
    
    const today = new Date();
    const isSunday = today.getUTCDay() === 0;
    
    // Get current round
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('round')
      .eq('season', SEASON)
      .eq('played', true)
      .order('round', { ascending: false })
      .limit(1);
    
    const currentRound = fixtures?.[0]?.round || 1;
    logs.push(`Round: ${currentRound}, Sunday: ${isSunday}`);
    
    // ===========================================
    // SUNDAY ONLY: Reset weekly transfers
    // ===========================================
    if (isSunday) {
      await supabase.from('teams').update({ weekly_transfers_used: 0 }).gte('weekly_transfers_used', 0);
      logs.push('🔄 Weekly transfers reset');
    }
    
    if (ENABLE_FINANCES) {
      // ===========================================
      // SUNDAY ONLY: Full team finances (wages, grants, revenue)
      // This is the slow part - only run on Sundays
      // ===========================================
      if (isSunday) {
        const financeStart = Date.now();
        const financeResults = await processAllTeamFinances(supabase, SEASON, currentRound, true);
        const successCount = financeResults.filter(r => r.success).length;
        logs.push(`💰 Full finances: ${successCount}/${financeResults.length} teams (${Date.now() - financeStart}ms)`);
      } else {
        logs.push('💰 Skipping full finances (not Sunday)');
      }
      
      // ===========================================
      // EVERY RUN: AI contract renewals (fast)
      // ===========================================
      const aiStart = Date.now();
      const aiRenewalResult = await processAIContractRenewals(supabase, currentRound);
      logs.push(`🤖 AI: ${aiRenewalResult.renewed} renewed, ${aiRenewalResult.released} releasing (${Date.now() - aiStart}ms)`);
      
      // ===========================================
      // EVERY RUN: Contract countdown (optimized)
      // ===========================================
      const contractStart = Date.now();
      const contractResult = await processContractCountdownOptimized(supabase);
      logs.push(`📝 Contracts: ${contractResult.updated} decremented, ${contractResult.expired} expired (${Date.now() - contractStart}ms)`);
    }
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Complete in ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      phase: 'finances',
      isSunday,
      currentRound,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Finances cron error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
