/**
 * SidelineHQ Game Engine Types
 * Central type definitions for match simulation
 */

// ===========================================
// PLAYER TYPES
// ===========================================

export type StatTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StatLabel = 
  | 'NONE' 
  | 'POOR' 
  | 'OK' 
  | 'GOOD' 
  | 'GREAT' 
  | 'EXCELLENT' 
  | 'ELITE' 
  | 'LEGEND';

export type Position =
  | 'Fullback'
  | 'Winger'
  | 'Centre'
  | 'Five-Eighth'
  | 'Halfback'
  | 'Prop'
  | 'Hooker'
  | 'Second Row'
  | 'Lock';

export interface Player {
  id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  position: Position;
  age: number;
  
  // Stats (1-100 scale currently, will be 1-8 tiers)
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  
  // Derived
  overall: number;
  potential: number;
  fatigue: number;
  
  // Training
  current_training: string | null;
  training_progress: ProgressStage;
}

// ===========================================
// TEAM TYPES
// ===========================================

export interface Team {
  id: string;
  name: string;
  city: string;
  division: number;
  primary_color: string;
  secondary_color: string;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
}

// ===========================================
// TACTICS TYPES
// ===========================================

export type AttackFocus = 
  | 'structured' 
  | 'raid_left' 
  | 'raid_right' 
  | 'up_the_guts' 
  | 'off_the_cuff';

export type DefenseFocus = 
  | 'line_speed' 
  | 'shift_left' 
  | 'shift_right' 
  | 'brick_wall';

export interface TeamTactics {
  team_id: string;
  attack_focus: AttackFocus;
  defense_focus: DefenseFocus;
  
  // Starting 13
  pos_fullback: string | null;
  pos_winger_l: string | null;
  pos_winger_r: string | null;
  pos_centre_l: string | null;
  pos_centre_r: string | null;
  pos_five_eighth: string | null;
  pos_halfback: string | null;
  pos_prop_l: string | null;
  pos_prop_r: string | null;
  pos_hooker: string | null;
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
}

// ===========================================
// MATCH TYPES
// ===========================================

export interface Fixture {
  id: string;
  season: number;
  round: number;
  home_team_id: string;
  away_team_id: string;
  played: boolean;
}

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

export interface GameContext {
  totalPoints: number;
  margin: number;
  teamWon: boolean;
}

// ===========================================
// PLAYER STATS TYPES
// ===========================================

export interface GeneratedStats {
  metres: number;
  tackles: number;
  missedTackles: number;
  errors: number;
  lineBreaks: number;
  tackleBreaks: number;
}

export interface FullPlayerStats extends GeneratedStats {
  tries: number;
  tryAssists: number;
  goals: number;
}

export interface PlayerMatchStats {
  fixture_id: string;
  player_id: string;
  team_id: string;
  jersey_number: number;
  player_name: string;
  ovr: number;
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

export interface PlayerStatWithInfluence extends PlayerMatchStats {
  motm_influence: number;
  is_captain: boolean;
}

// ===========================================
// POSITION CONFIG TYPES
// ===========================================

export interface PositionConfig {
  metresBase: number;
  tacklesBase: number;
  touchesBase: number;
}

// ===========================================
// TRAINING TYPES
// ===========================================

export type ProgressStage = 
  | 'NONE' 
  | 'POOR' 
  | 'FAIR' 
  | 'GOOD' 
  | 'VERY GOOD' 
  | 'EXCELLENT';

export type TrainableStat = 
  | 'Speed' 
  | 'Strength' 
  | 'Power' 
  | 'Passing' 
  | 'Stamina' 
  | 'Tackling' 
  | 'Kicking' 
  | 'Rest';

// ===========================================
// FREE AGENCY TYPES
// ===========================================

export type PlayerType = 
  | 'ambitious_star' 
  | 'young_prospect' 
  | 'journeyman' 
  | 'veteran';

export interface FreeAgent {
  id: string;
  player_id: string;
  released_by_team_id: string;
  available_round: number;
  claimed: boolean;
  players?: Player;
}

export interface FreeAgentClaim {
  id: string;
  free_agent_id: string;
  team_id: string;
  release_player_id: string | null;
}

export interface TeamScore {
  teamId: string;
  score: number;
  releasePlayerId: string | null;
}

// ===========================================
// NOTIFICATION TYPES
// ===========================================

export type NotificationType =
  | 'match_win'
  | 'match_loss'
  | 'match_draw'
  | 'motm'
  | 'motm_opponent'
  | 'player_improvement'
  | 'free_agent_signed'
  | 'free_agent_lost'
  | 'free_agent_update';

export interface Notification {
  team_id: string;
  type: NotificationType;
  title: string;
  message: string;
  fixture_id?: string;
  player_id?: string;
}

// ===========================================
// TACTICAL BONUS TYPES
// ===========================================

export interface TacticalBonusResult {
  bonus: number;
  description: string;
}

// ===========================================
// TRY DISTRIBUTION TYPES
// ===========================================

export interface TryDistribution {
  tryScorers: Record<string, number>;
  tryAssisters: Record<string, number>;
}