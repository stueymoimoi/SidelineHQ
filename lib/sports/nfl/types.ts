/**
 * SidelineHQ - NFL Types
 * 
 * TypeScript interfaces for American Football entities.
 */

import type { NFLPosition, NFLOffenseTactic, NFLDefenseTactic, NFLStat } from './constants';

// ===========================================
// PLAYER
// ===========================================

export interface NFLPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: NFLPosition;
  age: number;
  
  // Stats (1-8 scale)
  speed: number;
  strength: number;
  power: number;
  agility: number;
  awareness: number;
  catching: number;
  arm_kick: number;
  
  // Calculated
  overall: number;
  potential: number;
  
  // Team assignment
  team_id: string | null;
  
  // Training & fitness
  training_focus: NFLStat | null;
  fatigue: number;
  fitness: number;
  
  // Injury
  injury_games_remaining: number;
  injury_type: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ===========================================
// TEAM
// ===========================================

export interface NFLTeam {
  id: string;
  name: string;
  city: string;
  mascot: string;
  
  // Colors
  primary_color: string;
  secondary_color: string;
  
  // Division & standings
  division: number;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  
  // Metadata
  created_at: string;
}

// ===========================================
// TACTICS
// ===========================================

export interface NFLTactics {
  id: string;
  team_id: string;
  
  // Scheme selection
  offense_scheme: NFLOffenseTactic;
  defense_scheme: NFLDefenseTactic;
  
  // Starting lineup (21 positions)
  pos_qb: string | null;
  pos_rb: string | null;
  pos_wr1: string | null;
  pos_wr2: string | null;
  pos_wr3: string | null;
  pos_te: string | null;
  pos_lt: string | null;
  pos_lg: string | null;
  pos_c: string | null;
  pos_rg: string | null;
  pos_rt: string | null;
  pos_de1: string | null;
  pos_de2: string | null;
  pos_dt1: string | null;
  pos_dt2: string | null;
  pos_lb1: string | null;
  pos_lb2: string | null;
  pos_lb3: string | null;
  pos_cb1: string | null;
  pos_cb2: string | null;
  pos_s: string | null;
  
  // Bench (4 spots)
  bench_1: string | null;
  bench_2: string | null;
  bench_3: string | null;
  bench_4: string | null;
  
  // Special teams
  kicker: string | null;
  punter: string | null;
  kick_returner: string | null;
  punt_returner: string | null;
  
  // Captain
  captain: string | null;
  
  // Metadata
  updated_at: string;
}

// ===========================================
// FIXTURE
// ===========================================

export interface NFLFixture {
  id: string;
  season: number;
  round: number;
  
  home_team_id: string;
  away_team_id: string;
  
  game_day: 'tuesday' | 'thursday' | 'sunday';
  
  played: boolean;
  
  created_at: string;
}

// ===========================================
// MATCH RESULT
// ===========================================

export interface NFLMatchResult {
  id: string;
  fixture_id: string;
  season: number;
  round: number;
  
  home_team_id: string;
  away_team_id: string;
  
  home_score: number;
  away_score: number;
  
  // Scoring breakdown
  home_touchdowns: number;
  home_field_goals: number;
  home_safeties: number;
  home_two_point_conversions: number;
  
  away_touchdowns: number;
  away_field_goals: number;
  away_safeties: number;
  away_two_point_conversions: number;
  
  // MVP
  mvp_player_id: string | null;
  mvp_reason: string | null;
  
  created_at: string;
}

// ===========================================
// PLAYER MATCH STATS
// ===========================================

export interface NFLPlayerMatchStats {
  id: string;
  fixture_id: string;
  player_id: string;
  team_id: string;
  
  position: NFLPosition;
  snaps_played: number;
  
  // Passing (QB)
  pass_attempts: number;
  pass_completions: number;
  pass_yards: number;
  pass_touchdowns: number;
  interceptions_thrown: number;
  
  // Rushing
  rush_attempts: number;
  rush_yards: number;
  rush_touchdowns: number;
  fumbles: number;
  
  // Receiving
  targets: number;
  receptions: number;
  receiving_yards: number;
  receiving_touchdowns: number;
  drops: number;
  
  // Defense
  tackles: number;
  tackles_for_loss: number;
  sacks: number;
  interceptions: number;
  passes_defended: number;
  forced_fumbles: number;
  fumble_recoveries: number;
  
  // Kicking
  field_goals_attempted: number;
  field_goals_made: number;
  extra_points_attempted: number;
  extra_points_made: number;
  
  // Calculated
  fantasy_points: number;
  rating: number;
  
  created_at: string;
}

// ===========================================
// DRIVE (for match engine)
// ===========================================

export interface NFLDrive {
  start_yard_line: number;
  start_down: number;
  start_distance: number;
  
  plays: NFLPlay[];
  
  result: 'touchdown' | 'field_goal' | 'punt' | 'turnover' | 'downs' | 'safety' | 'end_of_half';
  points_scored: number;
}

export interface NFLPlay {
  type: 'run' | 'pass' | 'punt' | 'field_goal' | 'kneel' | 'spike';
  yards_gained: number;
  result: 'first_down' | 'incomplete' | 'complete' | 'touchdown' | 'interception' | 'fumble' | 'sack' | 'made' | 'missed';
  
  passer_id?: string;
  receiver_id?: string;
  rusher_id?: string;
  tackler_id?: string;
  
  down: number;
  distance: number;
  yard_line: number;
}

// ===========================================
// NOTIFICATION
// ===========================================

export interface NFLNotification {
  id?: string;
  team_id: string;
  type: 'match_win' | 'match_loss' | 'match_draw' | 'mvp' | 'injury' | 'training' | 'free_agent_signed' | 'trade';
  title: string;
  message: string;
  
  player_id?: string;
  fixture_id?: string;
  
  read?: boolean;
  created_at?: string;
}

// ===========================================
// FREE AGENCY
// ===========================================

export interface NFLFreeAgent {
  id: string;
  player_id: string;
  released_by_team_id: string | null;
  available_round: number;
  claimed: boolean;
  created_at: string;
}

export interface NFLFreeAgentClaim {
  id: string;
  free_agent_id: string;
  team_id: string;
  release_player_id: string | null;
  created_at: string;
}