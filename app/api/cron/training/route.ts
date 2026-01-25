/**
 * SidelineHQ Cron: TRAINING
 * 
 * Phase 2 of 4 - Runs at 6:05pm AEST (8:05 UTC)
 * - Processes training progress for all players
 * - Stat gains based on training stage + affinities
 * 
 * Schedule: 5 8 * * 0,2,4
 */

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { processAllTraining } from '@/lib/training';

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
    
    // Load all players
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
    
    // Process training
    const { playerUpdates, notifications: trainingNotifications, improvementCount } = processAllTraining(allPlayers);
    
    logs.push(`Training processed: ${improvementCount} players improved`);
    
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
      playersProcessed: allPlayers.length,
      improvements: improvementCount,
      executionTime: totalTime,
      logs
    });
    
  } catch (error) {
    console.error('Training cron error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
