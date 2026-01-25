/**
 * SidelineHQ Cron: FINANCES
 * 
 * Phase 3 of 5 - Runs at 6:10pm AEST (8:10 UTC)
 * - Match revenue (every run)
 * - Wages + grants (Sunday only)
 * - Contract countdown
 * - AI contract renewals
 * - Weekly transfer reset (Sunday only)
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
  processContractCountdown, 
  processAIContractRenewals,
  ENABLE_FINANCES 
} from '@/lib/finances';

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
    logs.push(`Current round: ${currentRound}, Sunday: ${isSunday}`);
    
    // ===========================================
    // SUNDAY: Reset weekly transfers
    // ===========================================
    
    if (isSunday) {
      await supabase.from('teams').update({ weekly_transfers_used: 0 }).gte('weekly_transfers_used', 0);
      logs.push('🔄 Weekly transfer counts reset');
    }
    
    // ===========================================
    // FINANCES
    // ===========================================
    
    if (ENABLE_FINANCES) {
      const financeResults = await processAllTeamFinances(supabase, SEASON, currentRound, isSunday);
      const successCount = financeResults.filter(r => r.success).length;
      logs.push(`💰 Finances: ${successCount}/${financeResults.length} teams`);
      
      const aiRenewalResult = await processAIContractRenewals(supabase, currentRound);
      logs.push(`🤖 AI Renewals: ${aiRenewalResult.renewed} renewed, ${aiRenewalResult.released} releasing`);
      
      const contractResult = await processContractCountdown(supabase);
      logs.push(`📝 Contracts: ${contractResult.updated} updated, ${contractResult.expired} expired`);
    }
    
    const totalTime = Date.now() - startTime;
    logs.push(`✅ Finances complete in ${totalTime}ms`);
    
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
