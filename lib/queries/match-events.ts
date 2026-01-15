/**
 * Match Events Queries
 * 
 * Queries for match timeline data used by:
 * - MatchTimeline component (Match Centre page)
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export interface MatchEvent {
  id: string;
  fixture_id: string;
  minute: number;
  event_type: 'TRY' | 'KICK' | 'ERROR' | 'HALF_TIME' | 'FULL_TIME';
  display_text: string | null;
  team_id: string | null;
  team_name: string | null;
  team_abbr: string | null;
  team_color: string | null;
  player_id: string | null;
  player_name: string | null;
}

// ===========================================
// QUERY: Get Match Events (for Timeline)
// ===========================================

export async function getMatchEvents(
  supabase: SupabaseClient,
  fixtureId: string
): Promise<MatchEvent[]> {
  try {
    const { data: events, error } = await supabase
      .from('match_events')
      .select(`
        id,
        fixture_id,
        minute,
        event_type,
        display_text,
        team_id,
        player_id,
        team:teams(id, name, city, primary_color),
        player:players(id, first_name, last_name)
      `)
      .eq('fixture_id', fixtureId)
      .order('minute', { ascending: true });

    if (error) {
      console.error('Error fetching match events:', error);
      return [];
    }

    return (events || []).map((e: any) => {
      // Handle joined data (could be object or array depending on Supabase version)
      const team = Array.isArray(e.team) ? e.team[0] : e.team;
      const player = Array.isArray(e.player) ? e.player[0] : e.player;

      return {
        id: e.id,
        fixture_id: e.fixture_id,
        minute: e.minute,
        event_type: e.event_type as MatchEvent['event_type'],
        display_text: e.display_text,
        team_id: team?.id || null,
        team_name: team?.name || null,
        team_abbr: team ? getTeamAbbr(team.name, team.city) : null,
        team_color: team?.primary_color || null,
        player_id: player?.id || null,
        player_name: player ? `${player.first_name.charAt(0)}. ${player.last_name}` : null
      };
    });
  } catch (error) {
    console.error('Error in getMatchEvents:', error);
    return [];
  }
}

// ===========================================
// QUERY: Check if Events Exist for Match
// ===========================================

export async function hasMatchEvents(
  supabase: SupabaseClient,
  fixtureId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('match_events')
      .select('id', { count: 'exact', head: true })
      .eq('fixture_id', fixtureId);

    if (error) {
      console.error('Error checking match events:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in hasMatchEvents:', error);
    return false;
  }
}

// ===========================================
// HELPER: Get Team Abbreviation
// ===========================================

function getTeamAbbr(name: string, city: string): string {
  // Map of team names to abbreviations
  const abbrs: Record<string, string> = {
    'Canberra Frost': 'CAN',
    'Sydney Serpents': 'SYD',
    'Brisbane Raptors': 'BRI',
    'Melbourne Wolves': 'MEL',
    'Newcastle Steelers': 'NEW',
    'Gold Coast Pelicans': 'GOL',
    'Perth Quokkas': 'PER',
    'Adelaide Coopers': 'ADE',
    'Townsville Cassowaries': 'TOW',
    'Wollongong Ironmen': 'WOL',
  };

  // Check if we have a known abbreviation
  if (abbrs[name]) {
    return abbrs[name];
  }

  // Fallback: First 3 letters of city
  return city.substring(0, 3).toUpperCase();
}

// ===========================================
// HELPER: Get Event Icon
// ===========================================

export function getEventIcon(eventType: MatchEvent['event_type']): string {
  switch (eventType) {
    case 'TRY': return '🏉';
    case 'KICK': return '🦵';
    case 'ERROR': return '❌';
    case 'HALF_TIME': return '⏸️';
    case 'FULL_TIME': return '🏁';
    default: return '•';
  }
}

// ===========================================
// HELPER: Format Event for Display
// ===========================================

export function formatEventDisplay(event: MatchEvent): string {
  const minute = `${event.minute}'`;
  const icon = getEventIcon(event.event_type);

  switch (event.event_type) {
    case 'TRY':
      return `${minute} ${icon} TRY (${event.player_name}) - ${event.team_abbr}`;
    case 'KICK':
      return `${minute} ${icon} KICK (${event.player_name}) - ${event.team_abbr}`;
    case 'ERROR':
      return `${minute} ${icon} ERROR (${event.player_name}) - ${event.team_abbr}`;
    case 'HALF_TIME':
      return `${minute} ${icon} HALF-TIME`;
    case 'FULL_TIME':
      return `${minute} ${icon} FULL-TIME`;
    default:
      return `${minute} ${event.event_type}`;
  }
}