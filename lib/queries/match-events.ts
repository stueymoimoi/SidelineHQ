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
    // Simple query without joins
    const { data: events, error } = await supabase
      .from('match_events')
      .select('id, fixture_id, minute, event_type, display_text, team_id, player_id')
      .eq('fixture_id', fixtureId)
      .order('minute', { ascending: true });

    if (error) {
      console.error('Error fetching match events:', error);
      return [];
    }

    if (!events || events.length === 0) {
      return [];
    }

    // Get unique team IDs and player IDs
    const teamIds = [...new Set(events.map(e => e.team_id).filter(Boolean))];
    const playerIds = [...new Set(events.map(e => e.player_id).filter(Boolean))];

    // Fetch teams
    let teamsMap: Record<string, any> = {};
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, city, primary_color')
        .in('id', teamIds);
      
      (teams || []).forEach(t => { teamsMap[t.id] = t; });
    }

    // Fetch players
    let playersMap: Record<string, any> = {};
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .in('id', playerIds);
      
      (players || []).forEach(p => { playersMap[p.id] = p; });
    }

    // Map events with team and player data
    return events.map(e => {
      const team = e.team_id ? teamsMap[e.team_id] : null;
      const player = e.player_id ? playersMap[e.player_id] : null;

      return {
        id: e.id,
        fixture_id: e.fixture_id,
        minute: e.minute,
        event_type: e.event_type as MatchEvent['event_type'],
        display_text: e.display_text,
        team_id: e.team_id,
        team_name: team?.name || null,
        team_abbr: team ? getTeamAbbr(team.name, team.city) : null,
        team_color: team?.primary_color || null,
        player_id: e.player_id,
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

  if (abbrs[name]) {
    return abbrs[name];
  }

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