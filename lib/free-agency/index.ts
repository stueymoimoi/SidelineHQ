/**
 * SidelineHQ Free Agency System
 * Smart player assignment based on player personality types
 */

import type {
  Player,
  Team,
  FreeAgent,
  FreeAgentClaim,
  TeamScore,
  PlayerType,
  Notification
} from '../game-engine/types';
import {
  AMBITIOUS_STAR_OVR_THRESHOLD,
  YOUNG_PROSPECT_AGE_THRESHOLD,
  VETERAN_AGE_THRESHOLD,
  MAX_SQUAD_SIZE
} from '../game-engine/constants';

// ===========================================
// PLAYER TYPE DETECTION
// ===========================================

/**
 * Determine a player's personality type for free agency decisions
 */
export function getPlayerType(player: Player): PlayerType {
  if (player.overall >= AMBITIOUS_STAR_OVR_THRESHOLD) {
    return 'ambitious_star';
  }
  if (player.age <= YOUNG_PROSPECT_AGE_THRESHOLD && player.overall < AMBITIOUS_STAR_OVR_THRESHOLD) {
    return 'young_prospect';
  }
  if (player.age >= VETERAN_AGE_THRESHOLD && player.overall < AMBITIOUS_STAR_OVR_THRESHOLD) {
    return 'veteran';
  }
  return 'journeyman';
}

// ===========================================
// TEAM ATTRACTIVENESS SCORING
// ===========================================

export interface TeamContext {
  team: Team;
  squadSize: number;
  hasPositionNeed: boolean;
  ladderPosition: number;
}

/**
 * Calculate how attractive a team is to a free agent
 * 
 * @param player - The free agent player
 * @param teamContext - Context about the claiming team
 * @returns Attractiveness score (higher = more attractive)
 */
export function calculateTeamAttractiveness(
  player: Player,
  teamContext: TeamContext
): number {
  const { team, squadSize, hasPositionNeed, ladderPosition } = teamContext;
  const playerType = getPlayerType(player);

  let score = 0;

  // === BASE FACTORS (all players) ===

  // Division factor (Div 1 = 45 points, Div 10 = 0 points)
  const divisionScore = (10 - team.division) * 5;
  score += divisionScore;

  // Ladder position within division (1st = 9 points, 10th = 0 points)
  const ladderScore = (10 - ladderPosition);
  score += ladderScore;

  // Win record bonus
  const winBonus = (team.wins * 2) + team.draws;
  score += winBonus;

  // Squad size factor (smaller squad = more opportunity)
  const squadBonus = (MAX_SQUAD_SIZE - squadSize) * 2;
  score += squadBonus;

  // Position need bonus
  const positionBonus = hasPositionNeed ? 10 : 0;
  score += positionBonus;

  // === PLAYER TYPE MODIFIERS ===

  if (playerType === 'ambitious_star') {
    // Stars prefer higher divisions and winning teams
    score += divisionScore * 0.5;              // Extra 50% division weight
    if (ladderPosition <= 3) score += 20;      // Top 3 in division bonus
    if (team.division >= 8) score -= 30;       // Heavily penalize low divisions
  }

  if (playerType === 'young_prospect') {
    // Young players want game time
    score += squadBonus * 0.5;                 // Extra squad size weight
    score += positionBonus * 0.5;              // Extra position need weight
    score -= divisionScore * 0.5;              // Care less about prestige
  }

  if (playerType === 'veteran') {
    // Veterans are grateful for any interest
    score += 5;                                // Flat bonus
    score -= divisionScore * 0.7;              // Care much less about prestige
  }

  // Journeymen get base calculation only (no modifiers)

  // === RANDOM FACTOR ===
  score += Math.random() * 10;                 // 0-10 for unpredictability

  return score;
}

// ===========================================
// FREE AGENT PROCESSING
// ===========================================

export interface FreeAgentProcessingResult {
  winnerId: string;
  winningTeam: Team;
  losers: TeamScore[];
  releasePlayerId: string | null;
  notifications: Notification[];
}

/**
 * Process a single free agent with multiple claims
 * 
 * @param freeAgent - The free agent being claimed
 * @param player - The player object
 * @param claims - All claims for this free agent
 * @param teams - Map of all teams
 * @param players - Map of all players
 * @param allTeams - Array of all teams (for ladder calculation)
 * @returns Processing result with winner and notifications
 */
export function processFreeAgentClaims(
  freeAgent: FreeAgent,
  player: Player,
  claims: FreeAgentClaim[],
  teams: Record<string, Team>,
  players: Record<string, Player>,
  allTeams: Team[]
): FreeAgentProcessingResult | null {
  const teamScores: TeamScore[] = [];
  const playerType = getPlayerType(player);

  for (const claim of claims) {
    const claimingTeam = teams[claim.team_id];
    if (!claimingTeam) continue;

    // Get claiming team's squad size
    const squadSize = Object.values(players).filter(p => p.team_id === claim.team_id).length;
    if (squadSize >= MAX_SQUAD_SIZE) continue;

    // Check if team needs this position
    const teamPositions = Object.values(players)
      .filter(p => p.team_id === claim.team_id)
      .map(p => p.position);
    const hasPositionNeed = teamPositions.filter(pos => pos === player.position).length < 2;

    // Calculate ladder position within division
    const divisionTeams = allTeams.filter(t => t.division === claimingTeam.division);
    const sortedDivision = divisionTeams.sort((a, b) => {
      const aPoints = (a.wins * 2) + a.draws;
      const bPoints = (b.wins * 2) + b.draws;
      if (bPoints !== aPoints) return bPoints - aPoints;
      return (b.points_for - b.points_against) - (a.points_for - a.points_against);
    });
    const ladderPosition = sortedDivision.findIndex(t => t.id === claim.team_id) + 1;

    const teamContext: TeamContext = {
      team: claimingTeam,
      squadSize,
      hasPositionNeed,
      ladderPosition
    };

    const score = calculateTeamAttractiveness(player, teamContext);

    teamScores.push({
      teamId: claim.team_id,
      score,
      releasePlayerId: claim.release_player_id
    });
  }

  if (teamScores.length === 0) return null;

  // Sort by score (highest wins)
  teamScores.sort((a, b) => b.score - a.score);
  const winner = teamScores[0];
  const winningTeam = teams[winner.teamId];

  if (!winningTeam) return null;

  // Build notifications
  const notifications: Notification[] = [];

  // Winner notification
  notifications.push({
    team_id: winner.teamId,
    type: 'free_agent_signed',
    title: '🎉 Free Agent Signed!',
    message: `${player.first_name} ${player.last_name} (${player.position}, ${player.overall} OVR) has joined your squad!${teamScores.length > 1 ? ` He chose you over ${teamScores.length - 1} other team${teamScores.length > 2 ? 's' : ''}.` : ''}`,
    player_id: player.id
  });

  // Loser notifications
  for (let i = 1; i < teamScores.length; i++) {
    const loser = teamScores[i];
    const loserTeam = teams[loser.teamId];
    if (!loserTeam) continue;

    let reason = '';
    if (playerType === 'ambitious_star' && loserTeam.division > winningTeam.division) {
      reason = ' He wanted a higher division club.';
    } else if (playerType === 'young_prospect') {
      reason = ' He wanted more game time.';
    }

    notifications.push({
      team_id: loser.teamId,
      type: 'free_agent_lost',
      title: '😢 Claim Unsuccessful',
      message: `${player.first_name} ${player.last_name} signed with ${winningTeam.name} instead.${reason}`,
      player_id: player.id
    });
  }

  // Notification to original team (if different from winner)
  if (freeAgent.released_by_team_id && freeAgent.released_by_team_id !== winner.teamId) {
    notifications.push({
      team_id: freeAgent.released_by_team_id,
      type: 'free_agent_update',
      title: '📋 Former Player Update',
      message: `${player.first_name} ${player.last_name} has signed with ${winningTeam.name}.`,
      player_id: player.id
    });
  }

  return {
    winnerId: winner.teamId,
    winningTeam,
    losers: teamScores.slice(1),
    releasePlayerId: winner.releasePlayerId,
    notifications
  };
}