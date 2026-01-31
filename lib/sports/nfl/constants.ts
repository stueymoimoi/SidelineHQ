/**
 * SidelineHQ - NFL Constants
 * 
 * American Football configuration for positions, stats, tactics, and weightings.
 */

// ===========================================
// SEASON CONFIG
// ===========================================

export const NFL_SEASON = 1;
export const NFL_ROUNDS = 22;
export const NFL_TEAMS_PER_DIVISION = 10;
export const NFL_DIVISIONS = 10;
export const NFL_TOTAL_TEAMS = 100;
export const NFL_SQUAD_SIZE = 25;
export const NFL_STARTING_LINEUP = 21;
export const NFL_BENCH_SIZE = 4;

// ===========================================
// GAME SETTINGS
// ===========================================

export const NFL_HOME_ADVANTAGE = 3;
export const NFL_COACHING_BONUS = 2;
export const NFL_FATIGUE_PER_MATCH = 5;

// ===========================================
// POSITIONS (21 starters + bench)
// ===========================================

export const NFL_POSITIONS = [
  // Offense (11)
  'QB',   // Quarterback
  'RB',   // Running Back
  'WR1',  // Wide Receiver 1
  'WR2',  // Wide Receiver 2
  'WR3',  // Wide Receiver 3
  'TE',   // Tight End
  'LT',   // Left Tackle
  'LG',   // Left Guard
  'C',    // Center
  'RG',   // Right Guard
  'RT',   // Right Tackle
  
  // Defense (10)
  'DE1',  // Defensive End 1
  'DE2',  // Defensive End 2
  'DT1',  // Defensive Tackle 1
  'DT2',  // Defensive Tackle 2
  'LB1',  // Linebacker 1
  'LB2',  // Linebacker 2
  'LB3',  // Linebacker 3
  'CB1',  // Cornerback 1
  'CB2',  // Cornerback 2
  'S',    // Safety
] as const;

export type NFLPosition = typeof NFL_POSITIONS[number];

// Position categories for easier grouping
export const NFL_POSITION_CATEGORIES = {
  quarterback: ['QB'],
  skill: ['RB', 'WR1', 'WR2', 'WR3', 'TE'],
  offensive_line: ['LT', 'LG', 'C', 'RG', 'RT'],
  defensive_line: ['DE1', 'DE2', 'DT1', 'DT2'],
  linebacker: ['LB1', 'LB2', 'LB3'],
  secondary: ['CB1', 'CB2', 'S'],
} as const;

// Display names for UI
export const NFL_POSITION_NAMES: Record<string, string> = {
  'QB': 'Quarterback',
  'RB': 'Running Back',
  'WR1': 'Wide Receiver',
  'WR2': 'Wide Receiver',
  'WR3': 'Wide Receiver',
  'TE': 'Tight End',
  'LT': 'Left Tackle',
  'LG': 'Left Guard',
  'C': 'Center',
  'RG': 'Right Guard',
  'RT': 'Right Tackle',
  'DE1': 'Defensive End',
  'DE2': 'Defensive End',
  'DT1': 'Defensive Tackle',
  'DT2': 'Defensive Tackle',
  'LB1': 'Linebacker',
  'LB2': 'Linebacker',
  'LB3': 'Linebacker',
  'CB1': 'Cornerback',
  'CB2': 'Cornerback',
  'S': 'Safety',
};

// Short display (without numbers)
export const NFL_POSITION_SHORT: Record<string, string> = {
  'QB': 'QB',
  'RB': 'RB',
  'WR1': 'WR',
  'WR2': 'WR',
  'WR3': 'WR',
  'TE': 'TE',
  'LT': 'OT',
  'LG': 'OG',
  'C': 'C',
  'RG': 'OG',
  'RT': 'OT',
  'DE1': 'DE',
  'DE2': 'DE',
  'DT1': 'DT',
  'DT2': 'DT',
  'LB1': 'LB',
  'LB2': 'LB',
  'LB3': 'LB',
  'CB1': 'CB',
  'CB2': 'CB',
  'S': 'S',
};

// ===========================================
// STATS (7 stats, 1-8 scale each)
// ===========================================

export const NFL_STATS = [
  'speed',      // ⚡ Sprint speed, acceleration
  'strength',   // 💪 Blocking, tackling power
  'power',      // 💥 Break tackles, hit power
  'agility',    // 🔄 Change of direction, elusiveness
  'awareness',  // 🧠 Football IQ, reading plays
  'catching',   // 🙌 Receiving ability, hands
  'arm_kick',   // 🎯 Throwing/Kicking accuracy & power
] as const;

export type NFLStat = typeof NFL_STATS[number];

export const NFL_STAT_LABELS: Record<NFLStat, string> = {
  speed: 'Speed',
  strength: 'Strength',
  power: 'Power',
  agility: 'Agility',
  awareness: 'Awareness',
  catching: 'Catching',
  arm_kick: 'Arm/Kick',
};

export const NFL_STAT_EMOJIS: Record<NFLStat, string> = {
  speed: '⚡',
  strength: '💪',
  power: '💥',
  agility: '🔄',
  awareness: '🧠',
  catching: '🙌',
  arm_kick: '🎯',
};

// ===========================================
// STAT TIERS (1-8 scale)
// ===========================================

export const NFL_STAT_TIERS = {
  1: { label: 'Poor', color: 'text-red-500' },
  2: { label: 'Below Average', color: 'text-red-400' },
  3: { label: 'Average', color: 'text-orange-400' },
  4: { label: 'Decent', color: 'text-yellow-400' },
  5: { label: 'Good', color: 'text-yellow-300' },
  6: { label: 'Great', color: 'text-green-400' },
  7: { label: 'Elite', color: 'text-green-300' },
  8: { label: 'Superstar', color: 'text-cyan-400' },
} as const;

// OVR calculation: sum of 7 stats (range 0-49)
export const NFL_OVR_MIN = 7;
export const NFL_OVR_MAX = 56;

// ===========================================
// POSITION STAT WEIGHTS
// ===========================================

// How important each stat is for each position (0-10 scale)
// Higher weight = stat matters more for that position's OVR calculation

export const NFL_POSITION_WEIGHTS: Record<string, Record<NFLStat, number>> = {
  // Quarterback - Arm/Kick and Awareness are critical
  'QB': {
    speed: 3,
    strength: 2,
    power: 2,
    agility: 5,
    awareness: 10,
    catching: 1,
    arm_kick: 10,
  },
  
  // Running Back - Speed, Power, Agility key
  'RB': {
    speed: 9,
    strength: 5,
    power: 8,
    agility: 9,
    awareness: 5,
    catching: 6,
    arm_kick: 1,
  },
  
  // Wide Receiver - Speed, Catching, Agility
  'WR1': {
    speed: 10,
    strength: 3,
    power: 4,
    agility: 8,
    awareness: 6,
    catching: 10,
    arm_kick: 1,
  },
  'WR2': {
    speed: 10,
    strength: 3,
    power: 4,
    agility: 8,
    awareness: 6,
    catching: 10,
    arm_kick: 1,
  },
  'WR3': {
    speed: 10,
    strength: 3,
    power: 4,
    agility: 8,
    awareness: 6,
    catching: 10,
    arm_kick: 1,
  },
  
  // Tight End - Balanced: Catching, Strength, Blocking
  'TE': {
    speed: 6,
    strength: 8,
    power: 7,
    agility: 5,
    awareness: 6,
    catching: 9,
    arm_kick: 1,
  },
  
  // Offensive Line - Strength and Power dominant
  'LT': {
    speed: 3,
    strength: 10,
    power: 9,
    agility: 4,
    awareness: 7,
    catching: 1,
    arm_kick: 1,
  },
  'LG': {
    speed: 2,
    strength: 10,
    power: 9,
    agility: 3,
    awareness: 7,
    catching: 1,
    arm_kick: 1,
  },
  'C': {
    speed: 2,
    strength: 10,
    power: 8,
    agility: 3,
    awareness: 9,
    catching: 1,
    arm_kick: 1,
  },
  'RG': {
    speed: 2,
    strength: 10,
    power: 9,
    agility: 3,
    awareness: 7,
    catching: 1,
    arm_kick: 1,
  },
  'RT': {
    speed: 3,
    strength: 10,
    power: 9,
    agility: 4,
    awareness: 7,
    catching: 1,
    arm_kick: 1,
  },
  
  // Defensive End - Speed, Strength, Power
  'DE1': {
    speed: 8,
    strength: 9,
    power: 9,
    agility: 6,
    awareness: 6,
    catching: 1,
    arm_kick: 1,
  },
  'DE2': {
    speed: 8,
    strength: 9,
    power: 9,
    agility: 6,
    awareness: 6,
    catching: 1,
    arm_kick: 1,
  },
  
  // Defensive Tackle - Strength and Power, less speed
  'DT1': {
    speed: 4,
    strength: 10,
    power: 10,
    agility: 4,
    awareness: 6,
    catching: 1,
    arm_kick: 1,
  },
  'DT2': {
    speed: 4,
    strength: 10,
    power: 10,
    agility: 4,
    awareness: 6,
    catching: 1,
    arm_kick: 1,
  },
  
  // Linebacker - Balanced across most stats
  'LB1': {
    speed: 7,
    strength: 8,
    power: 8,
    agility: 6,
    awareness: 8,
    catching: 4,
    arm_kick: 1,
  },
  'LB2': {
    speed: 7,
    strength: 8,
    power: 8,
    agility: 6,
    awareness: 8,
    catching: 4,
    arm_kick: 1,
  },
  'LB3': {
    speed: 7,
    strength: 8,
    power: 8,
    agility: 6,
    awareness: 8,
    catching: 4,
    arm_kick: 1,
  },
  
  // Cornerback - Speed, Agility, Catching (interceptions)
  'CB1': {
    speed: 10,
    strength: 4,
    power: 4,
    agility: 9,
    awareness: 8,
    catching: 7,
    arm_kick: 1,
  },
  'CB2': {
    speed: 10,
    strength: 4,
    power: 4,
    agility: 9,
    awareness: 8,
    catching: 7,
    arm_kick: 1,
  },
  
  // Safety - Speed, Awareness, Catching
  'S': {
    speed: 9,
    strength: 5,
    power: 6,
    agility: 7,
    awareness: 9,
    catching: 6,
    arm_kick: 1,
  },
};

// ===========================================
// TACTICS - OFFENSE
// ===========================================

export const NFL_OFFENSE_TACTICS = [
  'west_coast',   // Short passes, high completion %
  'air_raid',     // Aggressive downfield passing
  'power_run',    // Run-heavy, physical
  'zone_run',     // Outside runs, misdirection
  'balanced',     // Mix of everything
] as const;

export type NFLOffenseTactic = typeof NFL_OFFENSE_TACTICS[number];

export const NFL_OFFENSE_LABELS: Record<NFLOffenseTactic, string> = {
  west_coast: 'West Coast',
  air_raid: 'Air Raid',
  power_run: 'Power Run',
  zone_run: 'Zone Run',
  balanced: 'Balanced',
};

export const NFL_OFFENSE_DESCRIPTIONS: Record<NFLOffenseTactic, string> = {
  west_coast: 'Short, quick passes to control the clock and move the chains.',
  air_raid: 'Aggressive vertical passing attack. High risk, high reward.',
  power_run: 'Pound the ball between the tackles. Physical, grinding football.',
  zone_run: 'Outside zone runs and misdirection. Attack the edges.',
  balanced: 'Unpredictable mix of run and pass. Keep defenses guessing.',
};

// ===========================================
// TACTICS - DEFENSE
// ===========================================

export const NFL_DEFENSE_TACTICS = [
  'base_4_3',     // Standard 4 linemen, 3 linebackers
  'blitz_3_4',    // 3 linemen, 4 linebackers, aggressive
  'cover_2',      // Two deep safeties, protect against big plays
  'man_press',    // Man coverage, press at line
] as const;

export type NFLDefenseTactic = typeof NFL_DEFENSE_TACTICS[number];

export const NFL_DEFENSE_LABELS: Record<NFLDefenseTactic, string> = {
  base_4_3: '4-3 Base',
  blitz_3_4: '3-4 Blitz',
  cover_2: 'Cover 2',
  man_press: 'Man Press',
};

export const NFL_DEFENSE_DESCRIPTIONS: Record<NFLDefenseTactic, string> = {
  base_4_3: 'Standard defense. Balanced against run and pass.',
  blitz_3_4: 'Aggressive blitzing. Pressure the QB but risk big plays.',
  cover_2: 'Two deep safeties protect against long passes. Vulnerable underneath.',
  man_press: 'Physical man coverage at the line. Disrupts timing routes.',
};

// ===========================================
// TACTICAL MATCHUPS
// ===========================================

// Offense vs Defense bonuses (positive = offense wins, negative = defense wins)
export const NFL_TACTICAL_MATCHUPS: Record<NFLOffenseTactic, Record<NFLDefenseTactic, number>> = {
  west_coast: {
    base_4_3: 0,
    blitz_3_4: 3,     // Quick passes beat blitz
    cover_2: -2,      // Cover 2 handles short routes
    man_press: 2,     // Quick timing beats press
  },
  air_raid: {
    base_4_3: 1,
    blitz_3_4: -3,    // Deep routes need time, blitz kills them
    cover_2: -2,      // Cover 2 designed for this
    man_press: 2,     // Can beat man deep
  },
  power_run: {
    base_4_3: 0,
    blitz_3_4: 2,     // Blitz leaves gaps
    cover_2: 1,       // Safeties deep = weak run support
    man_press: -1,    // Extra bodies near line
  },
  zone_run: {
    base_4_3: 1,
    blitz_3_4: 3,     // Misdirection kills aggressive D
    cover_2: 0,
    man_press: -2,    // Disciplined edge setting
  },
  balanced: {
    base_4_3: 0,
    blitz_3_4: 0,
    cover_2: 0,
    man_press: 0,
  },
};

// ===========================================
// POSITION FIELD MAPPING (for tactics)
// ===========================================

export const NFL_POSITION_FIELDS = [
  'pos_qb',
  'pos_rb',
  'pos_wr1',
  'pos_wr2',
  'pos_wr3',
  'pos_te',
  'pos_lt',
  'pos_lg',
  'pos_c',
  'pos_rg',
  'pos_rt',
  'pos_de1',
  'pos_de2',
  'pos_dt1',
  'pos_dt2',
  'pos_lb1',
  'pos_lb2',
  'pos_lb3',
  'pos_cb1',
  'pos_cb2',
  'pos_s',
] as const;

// ===========================================
// MINUTES/SNAPS BY POSITION
// ===========================================

export const NFL_SNAPS_BY_POSITION: Record<string, number> = {
  'QB': 65,
  'RB': 45,
  'WR1': 60,
  'WR2': 55,
  'WR3': 40,
  'TE': 50,
  'LT': 65,
  'LG': 65,
  'C': 65,
  'RG': 65,
  'RT': 65,
  'DE1': 55,
  'DE2': 55,
  'DT1': 50,
  'DT2': 50,
  'LB1': 60,
  'LB2': 55,
  'LB3': 50,
  'CB1': 60,
  'CB2': 60,
  'S': 65,
};

// ===========================================
// SCORING
// ===========================================

export const NFL_SCORING = {
  touchdown: 6,
  extra_point: 1,
  two_point_conversion: 2,
  field_goal: 3,
  safety: 2,
} as const;

// ===========================================
// PLAYER GENERATION RANGES
// ===========================================

export const NFL_PLAYER_AGE_RANGE = { min: 21, max: 35 };
export const NFL_ROOKIE_AGE_RANGE = { min: 21, max: 23 };
export const NFL_VETERAN_AGE_RANGE = { min: 30, max: 35 };

// Stat ranges by division (1 = top, 10 = bottom)
export const NFL_DIVISION_STAT_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 4, max: 8 },
  2: { min: 4, max: 8 },
  3: { min: 3, max: 7 },
  4: { min: 3, max: 7 },
  5: { min: 3, max: 7 },
  6: { min: 2, max: 6 },
  7: { min: 2, max: 6 },
  8: { min: 2, max: 6 },
  9: { min: 1, max: 5 },
  10: { min: 1, max: 5 },
};
