/**
 * SidelineHQ Origin Squad Selection Logic
 * 
 * Selects 17-man squads based on match_power (hidden stat).
 * Auto-selects top players by position from eligible pool.
 */

import type { Player } from '@/lib/game-engine/types';

// ============================================
// TYPES
// ============================================

export type OriginTeam = 'NSW' | 'QLD';

export interface OriginSquadPlayer {
  player: Player;
  jerseyNumber: number;
  positionName: string;
  isCaptain: boolean;
}

export interface OriginSquad {
  team: OriginTeam;
  players: OriginSquadPlayer[];
  captain: Player | null;
  goalKicker: Player | null;
}

// ============================================
// CONSTANTS
// ============================================

/** Origin rounds for Season 0 */
export const ORIGIN_ROUNDS = [9, 12, 15] as const;

/** Position structure for 17-man Origin squad */
const STARTING_POSITIONS = [
  { jersey: 1,  position: 'Fullback' },
  { jersey: 2,  position: 'Winger' },
  { jersey: 3,  position: 'Centre' },
  { jersey: 4,  position: 'Centre' },
  { jersey: 5,  position: 'Winger' },
  { jersey: 6,  position: 'Five-Eighth' },
  { jersey: 7,  position: 'Halfback' },
  { jersey: 8,  position: 'Prop' },
  { jersey: 9,  position: 'Hooker' },
  { jersey: 10, position: 'Prop' },
  { jersey: 11, position: 'Second Row' },
  { jersey: 12, position: 'Second Row' },
  { jersey: 13, position: 'Lock' },
] as const;

/** Bench positions with preferred position types */
const BENCH_SLOTS = [
  { jersey: 14, preferredPositions: ['Hooker', 'Halfback', 'Five-Eighth'] },  // Utility
  { jersey: 15, preferredPositions: ['Prop', 'Lock', 'Second Row'] },         // Forward
  { jersey: 16, preferredPositions: ['Prop', 'Second Row', 'Lock'] },         // Forward
  { jersey: 17, preferredPositions: ['Second Row', 'Centre', 'Lock'] },       // Versatile
] as const;

/** Leadership positions for captain selection (in priority order) */
const CAPTAIN_POSITIONS = [13, 9, 7, 6, 11, 12] as const; // Lock, Hooker, Halfback, 5/8, Second Rows

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get player's effective match power for selection
 */
function getMatchPower(player: Player): number {
  return player.match_power || player.overall || 0;
}

/**
 * Select best available players for a position
 */
function selectBestForPosition(
  candidates: Player[],
  position: string,
  count: number,
  excludeIds: Set<string>
): Player[] {
  return candidates
    .filter(p => p.position === position && !excludeIds.has(p.id))
    .sort((a, b) => getMatchPower(b) - getMatchPower(a))
    .slice(0, count);
}

// ============================================
// MAIN SELECTION FUNCTION
// ============================================

/**
 * Select Origin squad based on match_power
 * 
 * @param allPlayers - All players in the game
 * @param team - 'NSW' or 'QLD'
 * @returns Complete 17-man Origin squad
 */
export function selectOriginSquad(
  allPlayers: Player[],
  team: OriginTeam
): OriginSquad {
  // Filter to eligible players (correct state + on a team)
  const eligiblePlayers = allPlayers.filter(
    p => p.state === team && p.team_id !== null
  );
  
  // Sort by match_power descending for greedy selection
  const candidates = [...eligiblePlayers].sort(
    (a, b) => getMatchPower(b) - getMatchPower(a)
  );
  
  const selectedPlayers: OriginSquadPlayer[] = [];
  const usedPlayerIds = new Set<string>();
  
  // === PHASE 1: Fill starting 13 positions ===
  for (const slot of STARTING_POSITIONS) {
    const player = selectBestForPosition(candidates, slot.position, 1, usedPlayerIds)[0];
    
    if (player) {
      selectedPlayers.push({
        player,
        jerseyNumber: slot.jersey,
        positionName: slot.position,
        isCaptain: false
      });
      usedPlayerIds.add(player.id);
    }
  }
  
  // === PHASE 2: Fill bench (jerseys 14-17) ===
  for (const slot of BENCH_SLOTS) {
    let selectedPlayer: Player | undefined;
    
    // Try preferred positions first
    for (const pos of slot.preferredPositions) {
      selectedPlayer = selectBestForPosition(candidates, pos, 1, usedPlayerIds)[0];
      if (selectedPlayer) break;
    }
    
    // Fallback: take highest match_power available
    if (!selectedPlayer) {
      selectedPlayer = candidates.find(p => !usedPlayerIds.has(p.id));
    }
    
    if (selectedPlayer) {
      selectedPlayers.push({
        player: selectedPlayer,
        jerseyNumber: slot.jersey,
        positionName: 'Interchange',
        isCaptain: false
      });
      usedPlayerIds.add(selectedPlayer.id);
    }
  }
  
  // === PHASE 3: Select Captain ===
  // Pick from leadership positions in priority order
  let captain: Player | null = null;
  
  for (const jerseyNum of CAPTAIN_POSITIONS) {
    const squadPlayer = selectedPlayers.find(p => p.jerseyNumber === jerseyNum);
    if (squadPlayer) {
      squadPlayer.isCaptain = true;
      captain = squadPlayer.player;
      break;
    }
  }
  
  // Fallback: highest match_power in squad
  if (!captain && selectedPlayers.length > 0) {
    const highestMP = selectedPlayers.reduce((best, curr) => 
      getMatchPower(curr.player) > getMatchPower(best.player) ? curr : best
    );
    highestMP.isCaptain = true;
    captain = highestMP.player;
  }
  
  // === PHASE 4: Select Goal Kicker ===
  // Highest kicking stat among backs (jerseys 1-7)
  const backs = selectedPlayers
    .filter(p => p.jerseyNumber <= 7)
    .sort((a, b) => (b.player.kicking || 0) - (a.player.kicking || 0));
  
  const goalKicker = backs[0]?.player || null;
  
  return {
    team,
    players: selectedPlayers,
    captain,
    goalKicker
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all Origin-eligible players for a team
 */
export function getOriginEligiblePlayers(
  allPlayers: Player[],
  team: OriginTeam
): Player[] {
  return allPlayers
    .filter(p => p.state === team && p.team_id !== null)
    .sort((a, b) => getMatchPower(b) - getMatchPower(a));
}

/**
 * Check if a round is an Origin round
 */
export function isOriginRound(round: number): boolean {
  return ORIGIN_ROUNDS.includes(round as typeof ORIGIN_ROUNDS[number]);
}

/**
 * Get the Origin game number for a round (1, 2, or 3)
 */
export function getOriginGameNumber(round: number): 1 | 2 | 3 | null {
  const index = ORIGIN_ROUNDS.indexOf(round as typeof ORIGIN_ROUNDS[number]);
  return index >= 0 ? (index + 1) as 1 | 2 | 3 : null;
}

/**
 * Get player IDs from an Origin squad
 */
export function getSquadPlayerIds(squad: OriginSquad): string[] {
  return squad.players.map(p => p.player.id);
}
