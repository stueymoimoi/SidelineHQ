/**
 * SidelineHQ Game Engine Types
 */

import { PROGRESS_STAGES } from './constants';

// ===========================================
// PROGRESS STAGE TYPE
// ===========================================

export type ProgressStage = typeof PROGRESS_STAGES[number];

// ===========================================
// DATABASE MODELS
// ===========================================

export interface Player {
  id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  position: string;
  secondary_position: string | null;
  age: number;
  overall: number;
  
  // Stats (1-8 tier scale)
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  
  // Hidden stats
  potential?: number;
  match_power?: number;
  goal_kicking_ability?: number;
  
  // Training system
  current_training: string | null;
  training_progress: string | null;
  fatigue: number;
  
  // Training system v2.0
  training_affinity?: Record<string, 'high' | 'medium'>;
  durability?: 'fragile' | 'normal' | 'durable' | 'ironman';
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
  division: number;
  
  // Colors
  primary_color: string;
  secondary_color: string;
  tertiary_color?: string;
  
  // Season stats
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface Fixture {
  id: string;
  season: number;
  round: number;
  home_team_id: string;
  away_team_id: string;
  played: boolean;
  
  // Results (populated after match)
  home_score?: number;
  away_score?: number;
  
  // Timestamps
  match_date?: string;
  created_at?: string;
}

export interface TeamTactics {
  id: string;
  team_id: string;
  
  // Tactical settings
  attack_focus: AttackFocus;
  defense_focus: DefenseFocus;
  
  // Starting 13
  pos_fullback: string | null;
  pos_winger_r: string | null;
  pos_centre_r: string | null;
  pos_centre_l: string | null;
  pos_winger_l: string | null;
  pos_five_eighth: string | null;
  pos_halfback: string | null;
  pos_prop_l: string | null;
  pos_hooker: string | null;
  pos_prop_r: string | null;
  pos_second_row_l: string | null;
  pos_second_row_r: string | null;
  pos_lock: string | null;
  
  // Bench
  bench_1: string | null;
  bench_2: string | null;
  bench_3: string | null;
  bench_4: string | null;
  
  // Special roles
  goal_kicker: string | null;
  captain: string | null;
  
  // Timestamps
  updated_at?: string;
}

export interface Notification {
  id?: string;
  team_id: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Optional references
  player_id?: string;
  fixture_id?: string;
  
  // Status
  read?: boolean;
  created_at?: string;
}

// ===========================================
// ENUMS / UNION TYPES
// ===========================================

export type AttackFocus = 
  | 'structured' 
  | 'expansive' 
  | 'direct' 
  | 'kicking';

export type DefenseFocus = 
  | 'slide' 
  | 'rush' 
  | 'umbrella' 
  | 'zone';

export type NotificationType = 
  | 'match_win'
  | 'match_loss'
  | 'match_draw'
  | 'motm'
  | 'motm_opponent'
  | 'player_improvement'
  | 'player_decline'
  | 'player_retired'
  | 'retirement_warning'
  | 'player_released'
  | 'free_agent_signed'
  | 'free_agent_announcement'
  | 'new_free_agent'
  | 'system';

// ===========================================
// MATCH ENGINE TYPES
// ===========================================

export interface MatchResult {
  fixture_id: string;
  season: number;
  round: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  motm_player_id: string | null;
  motm_reason: string;
}

export interface PlayerMatchStats {
  fixture_id: string;
  player_id: string;
  team_id: string;
  jersey_number: number;
  player_name: string;
  ovr: number;
  
  // Performance
  points: number;
  tries: number;
  try_assists: number;
  goals_made: number;
  goals_attempted: number;
  metres: number;
  tackles: number;
  missed_tackles: number;
  errors: number;
  line_breaks: number;
  tackle_breaks: number;
  minutes_played: number;
  rating: number;
}
