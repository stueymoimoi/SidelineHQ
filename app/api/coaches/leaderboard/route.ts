/**
 * Coach XP Leaderboard API
 * 
 * GET /api/coaches/leaderboard
 * 
 * Returns top coaches by XP with their level, title, team info, and streak
 * 
 * Query params:
 * - limit: number of results (default 20, max 100)
 * - division: filter by division (optional)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getCoachLevel } from '@/lib/game-engine/constants';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  
  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const division = searchParams.get('division');
  
  try {
    // Fetch coaches with team info
    let query = supabase
      .from('coaches')
      .select(`
        id,
        coach_name,
        xp,
        level,
        current_streak,
        team:teams!coaches_team_id_fkey (
          id,
          name,
          mascot,
          division
        )
      `)
      .not('team_id', 'is', null)
      .order('xp', { ascending: false })
      .limit(limit);
    
    const { data: coaches, error } = await query;
    
    if (error) {
      console.error('Leaderboard query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    // Filter by division if specified (post-query since it's a joined field)
    let filteredCoaches = coaches || [];
    if (division) {
      const divNum = parseInt(division);
      filteredCoaches = filteredCoaches.filter((c: any) => c.team?.division === divNum);
    }
    
    // Build leaderboard with computed fields
    const leaderboard = filteredCoaches.map((coach: any, index: number) => {
      const levelInfo = getCoachLevel(coach.xp || 0);
      
      return {
        rank: index + 1,
        coach_id: coach.id,
        coach_name: coach.coach_name || 'Unknown Coach',
        xp: coach.xp || 0,
        level: levelInfo.level,
        title: levelInfo.title,
        progress_to_next: levelInfo.progress,
        xp_for_next: levelInfo.xpForNext,
        current_streak: coach.current_streak || 0,
        team: coach.team ? {
          id: coach.team.id,
          name: coach.team.name,
          mascot: coach.team.mascot,
          division: coach.team.division,
        } : null,
      };
    });
    
    return NextResponse.json({
      success: true,
      leaderboard,
      total: leaderboard.length,
      filters: {
        division: division ? parseInt(division) : null,
        limit,
      }
    });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}