/**
 * SidelineHQ Game Engine Types
 */

// ===========================================
// PROGRESS STAGE TYPE (defined here to avoid circular import)
// ===========================================

export type ProgressStage = 'NONE' | 'POOR' | 'FAIR' | 'GOOD' | 'VERY GOOD' | 'EXCELLENT';

// ===========================================
// POSITION CONFIG TYPE
// ===========================================

export interface PositionConfig {
  metresBase: number;
  tacklesBase: number;
  touchesBase: number;
}

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
  
  // Origin eligibility
  state?: string | null;
  nationality?: string | null;
  
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
  
  // Trait system
  visible_trait?: string | null;
  visible_trait_positive?: boolean | null;
  hidden_trait?: string | null;
  
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
  | 'free_agent_lost'
  | 'free_agent_update'
  | 'new_free_agent'
  | 'system'
  | 'origin_selection'
| 'origin_motm';

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

// ===========================================
// STAT GENERATION TYPES
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

export interface GameContext {
  totalPoints: number;
  margin: number;
  teamWon: boolean;
}

export interface TryDistribution {
  tryScorers: Record<string, number>;
  tryAssisters: Record<string, number>;
}

// ===========================================
// FREE AGENCY TYPES
// ===========================================

export interface FreeAgent {
  id: string;
  player_id: string;
  released_by_team_id: string | null;
  available_round: number;
  claimed: boolean;
  created_at?: string;
  players?: Player;
}

export interface FreeAgentClaim {
  id: string;
  free_agent_id: string;
  team_id: string;
  release_player_id: string | null;
  created_at?: string;
}

export interface TeamScore {
  teamId: string;
  score: number;
  releasePlayerId: string | null;
}

export type PlayerType = 
  | 'ambitious_star'
  | 'young_prospect'
  | 'veteran'
  | 'journeyman';

// ===========================================
// TACTICAL TYPES
// ===========================================

export interface TacticalBonusResult {
  bonus: number;
  description: string;
}
// ===========================================
// ORIGIN SYSTEM TYPES
// ===========================================

export interface OriginSeries {
  id: string;
  season: number;
  nsw_wins: number;
  qld_wins: number;
  series_winner: 'NSW' | 'QLD' | null;
  series_status: 'scheduled' | 'in_progress' | 'complete';
}

export interface OriginFixture {
  id: string;
  season: number;
  game_number: 1 | 2 | 3;
  round: number;
  venue: string | null;
  home_team: 'NSW' | 'QLD';
  away_team: 'NSW' | 'QLD';
  played: boolean;
  home_score: number | null;
  away_score: number | null;
  motm_player_id: string | null;
  motm_reason: string | null;
}

export interface OriginSelection {
  id: string;
  origin_fixture_id: string;
  player_id: string;
  team: 'NSW' | 'QLD';
  jersey_number: number;
  position_name: string;
  is_captain: boolean;
}

export interface OriginPlayerStats {
  id: string;
  origin_fixture_id: string;
  player_id: string;
  team: 'NSW' | 'QLD';
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

export type OriginTeam = 'NSW' | 'QLD';