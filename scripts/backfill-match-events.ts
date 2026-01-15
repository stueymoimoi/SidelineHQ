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
  event_type: 'TRY' | 'KICK' | 'HALF_TIME' | 'FULL_TIME';
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
  
  // Reserve 40 for half-time and 80 for full-time
  usedMinutes.add(40);
  usedMinutes.add(80);

  // Helper to get a unique minute
  const getUniqueMinute = (preferredHalf: 1 | 2): number => {
    const min = preferredHalf === 1 ? 1 : 41;
    const max = preferredHalf === 1 ? 38 : 78; // Leave room for +1 for conversions
    
    let attempts = 0;
    while (attempts < 50) {
      const minute = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!usedMinutes.has(minute) && !usedMinutes.has(minute + 1)) {
        usedMinutes.add(minute);
        return minute;
      }
      attempts++;
    }
    // Fallback: just find any unused minute
    for (let m = min; m <= max; m++) {
      if (!usedMinutes.has(m) && !usedMinutes.has(m + 1)) {
        usedMinutes.add(m);
        return m;
      }
    }
    return preferredHalf === 1 ? 20 : 60;
  };

  // Collect all tries and goals
  interface TryEvent {
    team_id: string;
    player_id: string;
    player_name: string;
  }
  
  interface GoalEvent {
    team_id: string;
    player_id: string;
    player_name: string;
  }

  const homeTries: TryEvent[] = [];
  const awayTries: TryEvent[] = [];
  const homeGoals: GoalEvent[] = [];
  const awayGoals: GoalEvent[] = [];

  for (const stat of playerStats) {
    const isHome = stat.team_id === match.home_team_id;
    
    // Add tries
    for (let i = 0; i < (stat.tries || 0); i++) {
      const tryEvent = { team_id: stat.team_id, player_id: stat.player_id, player_name: stat.player_name };
      if (isHome) homeTries.push(tryEvent);
      else awayTries.push(tryEvent);
    }
    
    // Add goals
    for (let i = 0; i < (stat.goals_made || 0); i++) {
      const goalEvent = { team_id: stat.team_id, player_id: stat.player_id, player_name: stat.player_name };
      if (isHome) homeGoals.push(goalEvent);
      else awayGoals.push(goalEvent);
    }
  }

  // Generate TRY events with GOAL immediately after (if available)
  const generateTryWithGoal = (tries: TryEvent[], goals: GoalEvent[], half: 1 | 2) => {
    for (const tryEvent of tries) {
      const minute = getUniqueMinute(half);
      
      // Add TRY
      events.push({
        fixture_id: match.fixture_id,
        minute: minute,
        event_type: 'TRY',
        team_id: tryEvent.team_id,
        player_id: tryEvent.player_id,
        display_text: `TRY - ${tryEvent.player_name}`
      });

      // Add GOAL immediately after if available
      if (goals.length > 0) {
        const goal = goals.shift()!;
        usedMinutes.add(minute + 1);
        events.push({
          fixture_id: match.fixture_id,
          minute: minute + 1,
          event_type: 'KICK',
          team_id: goal.team_id,
          player_id: goal.player_id,
          display_text: `GOAL - ${goal.player_name}`
        });
      }
    }
  };

  // Distribute tries across both halves
  const homeFirstHalf = homeTries.splice(0, Math.ceil(homeTries.length / 2));
  const homeSecondHalf = homeTries;
  const awayFirstHalf = awayTries.splice(0, Math.ceil(awayTries.length / 2));
  const awaySecondHalf = awayTries;

  // Generate events - mix home and away for realistic feel
  generateTryWithGoal(homeFirstHalf, homeGoals, 1);
  generateTryWithGoal(awayFirstHalf, awayGoals, 1);
  generateTryWithGoal(homeSecondHalf, homeGoals, 2);
  generateTryWithGoal(awaySecondHalf, awayGoals, 2);

  // Add any remaining goals as penalty goals (no try before them)
  for (const goal of [...homeGoals, ...awayGoals]) {
    const half = Math.random() < 0.5 ? 1 : 2;
    const minute = getUniqueMinute(half);
    events.push({
      fixture_id: match.fixture_id,
      minute: minute,
      event_type: 'KICK',
      team_id: goal.team_id,
      player_id: goal.player_id,
      display_text: `PENALTY GOAL - ${goal.player_name}`
    });
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