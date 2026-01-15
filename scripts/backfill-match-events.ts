/**
 * Backfill Match Events
 * 
 * Generates timeline events for completed matches that don't have events yet.
 * Run with: npx tsx scripts/backfill-match-events.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

// Initialize Supabase with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

interface PlayerMatchStat {
  id: string;
  fixture_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  tries: number;
  goals_made: number;
  errors: number;
}

interface MatchResult {
  fixture_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  round: number;
}

interface MatchEvent {
  fixture_id: string;
  minute: number;
  event_type: 'TRY' | 'KICK' | 'ERROR' | 'HALF_TIME' | 'FULL_TIME';
  team_id: string | null;
  player_id: string | null;
  display_text: string | null;
}

async function backfillMatchEvents() {
  console.log('🏉 Starting match events backfill...\n');

  // Get all completed matches
  const { data: matchResults, error: matchError } = await supabase
    .from('match_results')
    .select('fixture_id, home_team_id, away_team_id, home_score, away_score, round')
    .order('round', { ascending: true });

  if (matchError) {
    console.error('Error fetching match results:', matchError);
    return;
  }

  console.log(`Found ${matchResults?.length || 0} completed matches\n`);

  let totalEventsCreated = 0;
  let matchesProcessed = 0;
  let matchesSkipped = 0;

  for (const match of matchResults || []) {
    // Check if events already exist for this match
    const { count } = await supabase
      .from('match_events')
      .select('id', { count: 'exact', head: true })
      .eq('fixture_id', match.fixture_id);

    if (count && count > 0) {
      console.log(`⏭️  Round ${match.round}: Match ${match.fixture_id.slice(0, 8)}... already has ${count} events, skipping`);
      matchesSkipped++;
      continue;
    }

    // Get player stats for this match
    const { data: playerStats, error: statsError } = await supabase
      .from('player_match_stats')
      .select('id, fixture_id, player_id, player_name, team_id, tries, goals_made, errors')
      .eq('fixture_id', match.fixture_id);

    if (statsError) {
      console.error(`Error fetching stats for match ${match.fixture_id}:`, statsError);
      continue;
    }

    const events = generateMatchEvents(match, playerStats || []);
    
    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('match_events')
        .insert(events);

      if (insertError) {
        console.error(`Error inserting events for match ${match.fixture_id}:`, insertError);
        continue;
      }

      console.log(`✅ Round ${match.round}: Created ${events.length} events for match ${match.fixture_id.slice(0, 8)}...`);
      totalEventsCreated += events.length;
      matchesProcessed++;
    }
  }

  console.log('\n========================================');
  console.log(`🎉 Backfill complete!`);
  console.log(`   Matches processed: ${matchesProcessed}`);
  console.log(`   Matches skipped: ${matchesSkipped}`);
  console.log(`   Total events created: ${totalEventsCreated}`);
  console.log('========================================\n');
}

function generateMatchEvents(match: MatchResult, playerStats: PlayerMatchStat[]): MatchEvent[] {
  const events: MatchEvent[] = [];
  const usedMinutes = new Set<number>();

  // Helper to get a unique minute
  const getUniqueMinute = (preferredHalf: 1 | 2): number => {
    const min = preferredHalf === 1 ? 1 : 41;
    const max = preferredHalf === 1 ? 39 : 79;
    
    let attempts = 0;
    while (attempts < 50) {
      const minute = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!usedMinutes.has(minute)) {
        usedMinutes.add(minute);
        return minute;
      }
      attempts++;
    }
    // Fallback: just find any unused minute
    for (let m = min; m <= max; m++) {
      if (!usedMinutes.has(m)) {
        usedMinutes.add(m);
        return m;
      }
    }
    return preferredHalf === 1 ? 20 : 60;
  };

  // Group stats by team
  const homeStats = playerStats.filter(p => p.team_id === match.home_team_id);
  const awayStats = playerStats.filter(p => p.team_id === match.away_team_id);

  // Generate TRY events
  for (const stat of playerStats) {
    for (let i = 0; i < (stat.tries || 0); i++) {
      const half = Math.random() < 0.5 ? 1 : 2;
      events.push({
        fixture_id: match.fixture_id,
        minute: getUniqueMinute(half),
        event_type: 'TRY',
        team_id: stat.team_id,
        player_id: stat.player_id,
        display_text: `TRY - ${stat.player_name}`
      });
    }
  }

  // Generate KICK (conversion/penalty) events
  for (const stat of playerStats) {
    for (let i = 0; i < (stat.goals_made || 0); i++) {
      const half = Math.random() < 0.5 ? 1 : 2;
      events.push({
        fixture_id: match.fixture_id,
        minute: getUniqueMinute(half),
        event_type: 'KICK',
        team_id: stat.team_id,
        player_id: stat.player_id,
        display_text: `KICK - ${stat.player_name}`
      });
    }
  }

  // Generate ERROR events (limit to 5 per team to avoid clutter)
  const maxErrors = 5;
  let homeErrors = 0;
  let awayErrors = 0;

  for (const stat of playerStats) {
    const isHome = stat.team_id === match.home_team_id;
    const currentTeamErrors = isHome ? homeErrors : awayErrors;
    
    if (currentTeamErrors >= maxErrors) continue;

    const errorsToAdd = Math.min(stat.errors || 0, maxErrors - currentTeamErrors);
    
    for (let i = 0; i < errorsToAdd; i++) {
      const half = Math.random() < 0.5 ? 1 : 2;
      events.push({
        fixture_id: match.fixture_id,
        minute: getUniqueMinute(half),
        event_type: 'ERROR',
        team_id: stat.team_id,
        player_id: stat.player_id,
        display_text: `ERROR - ${stat.player_name}`
      });

      if (isHome) homeErrors++;
      else awayErrors++;
    }
  }

  // Add HALF_TIME event
  events.push({
    fixture_id: match.fixture_id,
    minute: 40,
    event_type: 'HALF_TIME',
    team_id: null,
    player_id: null,
    display_text: 'HALF-TIME'
  });

  // Add FULL_TIME event
  events.push({
    fixture_id: match.fixture_id,
    minute: 80,
    event_type: 'FULL_TIME',
    team_id: null,
    player_id: null,
    display_text: `FULL-TIME: ${match.home_score} - ${match.away_score}`
  });

  // Sort by minute
  events.sort((a, b) => a.minute - b.minute);

  return events;
}

// Run the backfill
backfillMatchEvents().catch(console.error);