// lib/game-engine/traits/types.ts
// ============================================
// TRAIT SYSTEM TYPES & CONSTANTS
// Unit 1: Types, enums, display mapping (no logic)
// ============================================

// -----------------------------
// TIER 1: VISIBLE TRAITS
// -----------------------------

export const VISIBLE_TRAITS = [
  'fiery',
  'confident',
  'showman',
  'composed',
  'clutch',
  'prodigy',
  'leader',
  'loyal',
] as const;

export type VisibleTrait = (typeof VISIBLE_TRAITS)[number];

export const VISIBLE_TRAIT_DISPLAY: Record<VisibleTrait, string> = {
  fiery: 'Fiery',
  confident: 'Confident',
  showman: 'Showman',
  composed: 'Composed',
  clutch: 'Clutch',
  prodigy: 'Prodigy',
  leader: 'Leader',
  loyal: 'Loyal',
};

// -----------------------------
// TIER 2: HIDDEN TRAITS
// -----------------------------

export const HIDDEN_TRAITS = [
  'big_game_player',
  'front_runner',
  'iron_man',
  'glass_cannon',
  'impact_sub',
  'workhorse',
  'x_factor',
] as const;

export type HiddenTrait = (typeof HIDDEN_TRAITS)[number];

// -----------------------------
// TRAIT EFFECT CONSTANTS
// -----------------------------

export const TRAIT_CONSTANTS = {
  // Tier 1 positive/negative values
  fiery: { statBonus: 0.12, sinBinMultiplier: 1.4 },
  confident: { winBonus: 0.12, lossPenalty: -0.12 },
  showman: { homeBonus: 0.15, awayPenalty: -0.10 },
  composed: { varianceCap: 0.10, peakPenalty: -0.08 },
  clutch: { closeGameBonus: 0.15, closeGamePenalty: -0.10 },
  prodigy: { trainingBonus: 0.20, finalsPenalty: -0.10 },
  leader: { teamBonus: 0.02, teamPenalty: -0.02 },
  loyal: { loyaltyBonus: 0.10, newPlayerPenalty: -0.10 },

  // Tier 2 values
  big_game_player: { finalsBonus: 0.12 },
  front_runner: { leadingBonus: 0.10, trailingPenalty: -0.10 },
  iron_man: { fatigueReduction: 0.30 },
  glass_cannon: { freshBonus: 0.15, tiredPenalty: -0.15 },
  impact_sub: { benchBonus: 0.20 },
  workhorse: { tackleBonus: 0.15, metreBonus: 0.10 },
  x_factor: { varianceMultiplier: 0.35 },

  // Thresholds
  thresholds: {
    losingMargin: 6,
    closeGameMargin: 6,
    fitnessHigh: 80,
    fitnessLow: 50,
    loyaltySeasons: 1,
    newPlayerGames: 8,
  },

  // Stacking cap
  maxStackedModifier: 0.30,
} as const;

// -----------------------------
// DISTRIBUTION CONSTANTS
// -----------------------------

export const TRAIT_DISTRIBUTION = {
  noTraits: 0.60,           // 60% have no traits
  visibleOnly: 0.28,        // 28% have 1 visible only
  hiddenOnly: 0.08,         // 8% have 1 hidden only
  both: 0.04,               // 4% have both
} as const;

// -----------------------------
// CONTEXT TYPES
// -----------------------------

export interface GameContext {
  isHome: boolean;
  isFinals: boolean;
  isOrigin: boolean;
  currentMargin: number;        // Positive = winning, negative = losing
  marginAtHalftime: number;     // Positive = was winning at half
  isSecondHalf: boolean;
  opponentTeamId: string;
}

export interface MatchContext {
  previousGameWon: boolean | null;  // null if first game
  seasonsAtClub: number;
  gamesAtClubSinceTransfer: number;
  isCaptain: boolean;
  isStarting: boolean;              // false = named on bench
  currentFitness: number;           // 0-100
}

export interface PlayerTraitData {
  visibleTrait: VisibleTrait | null;
  visibleTraitPositive: boolean | null;
  hiddenTrait: HiddenTrait | null;
}

// -----------------------------
// MODIFIER OUTPUT TYPE
// -----------------------------

export interface TraitModifiers {
  statsMultiplier: number;        // Applied to general performance
  tackleMultiplier: number;       // Applied to tackle count
  metreMultiplier: number;        // Applied to metres gained
  fatigueMultiplier: number;      // Applied to fatigue gain (lower = less fatigue)
  varianceOverride: number | null; // If set, replaces default variance
  sinBinMultiplier: number;       // Applied to sin bin chance
  trainingMultiplier: number;     // Applied to training progression
  teamModifier: number;           // Applied to ALL teammates (Leader only)
}

export const DEFAULT_MODIFIERS: TraitModifiers = {
  statsMultiplier: 1.0,
  tackleMultiplier: 1.0,
  metreMultiplier: 1.0,
  fatigueMultiplier: 1.0,
  varianceOverride: null,
  sinBinMultiplier: 1.0,
  trainingMultiplier: 1.0,
  teamModifier: 0,
};
// ============================================
// TRAIT ASSIGNMENT LOGIC
// Unit 3: Distribution rules + seeded RNG
// ============================================

/**
 * Seeded random number generator (Mulberry32)
 * Produces deterministic sequence from a seed
 */
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a numeric seed from a player's UUID
 */
function uuidToSeed(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Pick a random item from an array using provided random function
 */
function pickRandom<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Assigns traits to a player based on distribution rules.
 * Uses player UUID as seed for reproducible results.
 * 
 * Distribution:
 * - 60% no traits
 * - 28% visible trait only
 * - 8% hidden trait only  
 * - 4% both traits
 */
export function assignTraitsToPlayer(playerId: string): PlayerTraitData {
  const seed = uuidToSeed(playerId);
  const random = createSeededRandom(seed);

  const roll = random();

  let visibleTrait: VisibleTrait | null = null;
  let visibleTraitPositive: boolean | null = null;
  let hiddenTrait: HiddenTrait | null = null;

  if (roll < TRAIT_DISTRIBUTION.noTraits) {
    // 60%: No traits
    // All remain null
  } else if (roll < TRAIT_DISTRIBUTION.noTraits + TRAIT_DISTRIBUTION.visibleOnly) {
    // 28%: Visible trait only
    visibleTrait = pickRandom(VISIBLE_TRAITS, random);
    visibleTraitPositive = random() < 0.5;
  } else if (roll < TRAIT_DISTRIBUTION.noTraits + TRAIT_DISTRIBUTION.visibleOnly + TRAIT_DISTRIBUTION.hiddenOnly) {
    // 8%: Hidden trait only
    hiddenTrait = pickRandom(HIDDEN_TRAITS, random);
  } else {
    // 4%: Both traits
    visibleTrait = pickRandom(VISIBLE_TRAITS, random);
    visibleTraitPositive = random() < 0.5;
    hiddenTrait = pickRandom(HIDDEN_TRAITS, random);
  }

  return {
    visibleTrait,
    visibleTraitPositive,
    hiddenTrait,
  };
}

/**
 * Batch assign traits to multiple players.
 * Returns array of objects ready for DB update.
 */
export function assignTraitsToPlayers(
  playerIds: string[]
): Array<{ id: string } & PlayerTraitData> {
  return playerIds.map((id) => ({
    id,
    ...assignTraitsToPlayer(id),
  }));
}
// ============================================
// TRAIT MODIFIER ENGINE
// Unit 4: calculateTraitModifiers + helpers
// ============================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply stacking cap to a modifier value
 * Ensures total bonus/penalty stays within ±30%
 */
function applyStackingCap(modifier: number): number {
  const { maxStackedModifier } = TRAIT_CONSTANTS;
  return clamp(modifier, -maxStackedModifier, maxStackedModifier);
}

/**
 * Check if game qualifies as "close" (margin ≤ threshold)
 */
function isCloseGame(margin: number): boolean {
  return Math.abs(margin) <= TRAIT_CONSTANTS.thresholds.closeGameMargin;
}

/**
 * Check if player qualifies as "loyal" (1+ seasons at club)
 */
function isLoyal(seasonsAtClub: number): boolean {
  return seasonsAtClub >= TRAIT_CONSTANTS.thresholds.loyaltySeasons;
}

/**
 * Check if player is "new" (first 8 games after transfer)
 */
function isNewToClub(gamesAtClubSinceTransfer: number): boolean {
  return gamesAtClubSinceTransfer < TRAIT_CONSTANTS.thresholds.newPlayerGames;
}

/**
 * Calculate all trait modifiers for a player given game/match context.
 * Returns multipliers to apply to various stats.
 * 
 * IMPORTANT: This is the ONLY function that reads trait effects.
 * All trait logic is centralised here.
 */
export function calculateTraitModifiers(
  traits: PlayerTraitData,
  gameContext: GameContext,
  matchContext: MatchContext
): TraitModifiers {
  // Start with defaults (all 1.0 multipliers, no effects)
  const modifiers: TraitModifiers = { ...DEFAULT_MODIFIERS };
  
  // Track cumulative stats modifier for stacking cap
  let cumulativeStatsBonus = 0;

  // ----- TIER 1: VISIBLE TRAITS -----
  if (traits.visibleTrait && traits.visibleTraitPositive !== null) {
    const isPositive = traits.visibleTraitPositive;
    const tc = TRAIT_CONSTANTS;

    switch (traits.visibleTrait) {
      case 'fiery':
        if (isPositive) {
          // +12% when losing by 6+
          if (gameContext.currentMargin <= -tc.thresholds.losingMargin) {
            cumulativeStatsBonus += tc.fiery.statBonus;
          }
        } else {
          // +40% sin bin chance
          modifiers.sinBinMultiplier = tc.fiery.sinBinMultiplier;
        }
        break;

      case 'confident':
        if (matchContext.previousGameWon !== null) {
          if (isPositive && matchContext.previousGameWon) {
            // +12% after a win
            cumulativeStatsBonus += tc.confident.winBonus;
          } else if (!isPositive && !matchContext.previousGameWon) {
            // -12% after a loss
            cumulativeStatsBonus += tc.confident.lossPenalty;
          }
        }
        break;

      case 'showman':
        if (isPositive && gameContext.isHome) {
          // +15% at home
          cumulativeStatsBonus += tc.showman.homeBonus;
        } else if (!isPositive && !gameContext.isHome) {
          // -10% away
          cumulativeStatsBonus += tc.showman.awayPenalty;
        }
        break;

      case 'composed':
        if (isPositive) {
          // Variance capped at ±10%
          modifiers.varianceOverride = tc.composed.varianceCap;
        } else {
          // -8% peak output (permanent small penalty)
          cumulativeStatsBonus += tc.composed.peakPenalty;
        }
        break;

      case 'clutch':
        if (gameContext.isSecondHalf && isCloseGame(gameContext.currentMargin)) {
          if (isPositive) {
            // +15% in close games (2nd half)
            cumulativeStatsBonus += tc.clutch.closeGameBonus;
          } else {
            // -10% in close games (2nd half)
            cumulativeStatsBonus += tc.clutch.closeGamePenalty;
          }
        }
        break;

      case 'prodigy':
        if (isPositive) {
          // +20% training speed (applied separately)
          modifiers.trainingMultiplier = 1 + tc.prodigy.trainingBonus;
        } else {
          // -10% in finals
          if (gameContext.isFinals) {
            cumulativeStatsBonus += tc.prodigy.finalsPenalty;
          }
        }
        break;

      case 'leader':
        if (matchContext.isCaptain) {
          // Affects teammates, not self
          modifiers.teamModifier = isPositive 
            ? tc.leader.teamBonus 
            : tc.leader.teamPenalty;
        }
        break;

      case 'loyal':
        if (isPositive && isLoyal(matchContext.seasonsAtClub)) {
          // +10% after 1+ seasons
          cumulativeStatsBonus += tc.loyal.loyaltyBonus;
        } else if (!isPositive && isNewToClub(matchContext.gamesAtClubSinceTransfer)) {
          // -10% first 8 games
          cumulativeStatsBonus += tc.loyal.newPlayerPenalty;
        }
        break;
    }
  }

  // ----- TIER 2: HIDDEN TRAITS -----
  if (traits.hiddenTrait) {
    const tc = TRAIT_CONSTANTS;

    switch (traits.hiddenTrait) {
      case 'big_game_player':
        if (gameContext.isFinals || gameContext.isOrigin) {
          cumulativeStatsBonus += tc.big_game_player.finalsBonus;
        }
        break;

      case 'front_runner':
        if (gameContext.marginAtHalftime > 0) {
          // Leading at halftime
          cumulativeStatsBonus += tc.front_runner.leadingBonus;
        } else if (gameContext.marginAtHalftime < 0) {
          // Trailing at halftime
          cumulativeStatsBonus += tc.front_runner.trailingPenalty;
        }
        break;

      case 'iron_man':
        // -30% fatigue gain
        modifiers.fatigueMultiplier = 1 - tc.iron_man.fatigueReduction;
        break;

      case 'glass_cannon':
        if (matchContext.currentFitness > tc.thresholds.fitnessHigh) {
          cumulativeStatsBonus += tc.glass_cannon.freshBonus;
        } else if (matchContext.currentFitness < tc.thresholds.fitnessLow) {
          cumulativeStatsBonus += tc.glass_cannon.tiredPenalty;
        }
        break;

      case 'impact_sub':
        if (!matchContext.isStarting) {
          cumulativeStatsBonus += tc.impact_sub.benchBonus;
        }
        break;

      case 'workhorse':
        modifiers.tackleMultiplier = 1 + tc.workhorse.tackleBonus;
        modifiers.metreMultiplier = 1 + tc.workhorse.metreBonus;
        break;

      case 'x_factor':
        modifiers.varianceOverride = tc.x_factor.varianceMultiplier;
        break;
    }
  }

  // ----- APPLY STACKING CAP -----
  const cappedBonus = applyStackingCap(cumulativeStatsBonus);
  modifiers.statsMultiplier = 1 + cappedBonus;

  return modifiers;
}
// ============================================
// UI-SAFE DATA TRANSFER OBJECTS
// Unit 7: What gets sent to client
// ============================================

/**
 * Player trait data safe to send to UI.
 * Only includes visible trait NAME, never polarity or hidden traits.
 */
export interface PlayerTraitDTO {
  visibleTrait: string | null;
  visibleTraitDisplay: string | null;
}

/**
 * Extract UI-safe trait data from a player.
 * Call this when sending player data to the client.
 * 
 * IMPORTANT: Never send visibleTraitPositive or hiddenTrait to client!
 */
export function getPlayerTraitDTO(player: {
  visible_trait?: string | null;
  visible_trait_positive?: boolean | null;
  hidden_trait?: string | null;
}): PlayerTraitDTO {
  const visibleTrait = player.visible_trait || null;
  
  return {
    visibleTrait,
    visibleTraitDisplay: visibleTrait 
      ? VISIBLE_TRAIT_DISPLAY[visibleTrait as VisibleTrait] || null 
      : null,
  };
}

/**
 * Strip hidden trait data from a player object before sending to client.
 * Returns a new object without sensitive fields.
 */
export function sanitizePlayerForClient<T extends {
  visible_trait?: string | null;
  visible_trait_positive?: boolean | null;
  hidden_trait?: string | null;
}>(player: T): Omit<T, 'visible_trait_positive' | 'hidden_trait'> & PlayerTraitDTO {
  // Destructure to remove sensitive fields
  const { visible_trait_positive, hidden_trait, ...safePlayer } = player;
  
  // Add UI-safe trait data
  const traitDTO = getPlayerTraitDTO(player);
  
  return {
    ...safePlayer,
    visibleTrait: traitDTO.visibleTrait,
    visibleTraitDisplay: traitDTO.visibleTraitDisplay,
  };
}

/**
 * Batch sanitize players for client
 */
export function sanitizePlayersForClient<T extends {
  visible_trait?: string | null;
  visible_trait_positive?: boolean | null;
  hidden_trait?: string | null;
}>(players: T[]): Array<Omit<T, 'visible_trait_positive' | 'hidden_trait'> & PlayerTraitDTO> {
  return players.map(sanitizePlayerForClient);
}