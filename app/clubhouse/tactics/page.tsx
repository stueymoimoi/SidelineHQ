'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TYPES
// ============================================

interface PlayerInjury {
  id: string;
  injury_type_id: string;
  round_return: number;
  is_active: boolean;
  injury_types: {
    name: string;
    severity: 'minor' | 'moderate' | 'major';
  }[];
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  kicking: number;
  goal_kick_attempts: number;
  goal_kick_successes: number;
  nationality: string;
  state: string | null;
  dominant_side: string | null;
  visible_trait: string | null;
  fatigue?: number;
  player_injuries?: PlayerInjury[];
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
}

interface Tactics {
  id: string;
  team_id: string;
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
  bench_1: string | null;
  bench_2: string | null;
  bench_3: string | null;
  bench_4: string | null;
  goal_kicker: string | null;
  captain: string | null;
  attack_focus: string;
  defense_focus: string;
}

// ============================================
// CONSTANTS
// ============================================

const POSITION_KEYS = [
  'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
  'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
  'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
] as const;

const POSITION_LABELS: Record<string, { label: string; number: number }> = {
  pos_fullback: { label: 'Fullback', number: 1 },
  pos_winger_l: { label: 'Left Wing', number: 2 },
  pos_centre_l: { label: 'Left Centre', number: 3 },
  pos_centre_r: { label: 'Right Centre', number: 4 },
  pos_winger_r: { label: 'Right Wing', number: 5 },
  pos_five_eighth: { label: 'Five-Eighth', number: 6 },
  pos_halfback: { label: 'Halfback', number: 7 },
  pos_prop_l: { label: 'Prop', number: 8 },
  pos_hooker: { label: 'Hooker', number: 9 },
  pos_prop_r: { label: 'Prop', number: 10 },
  pos_second_row_l: { label: '2nd Row', number: 11 },
  pos_second_row_r: { label: '2nd Row', number: 12 },
  pos_lock: { label: 'Lock', number: 13 },
  bench_1: { label: 'Bench', number: 14 },
  bench_2: { label: 'Bench', number: 15 },
  bench_3: { label: 'Bench', number: 16 },
  bench_4: { label: 'Bench', number: 17 },
};

const ATTACK_OPTIONS = [
  { value: 'power', label: 'Power', emoji: '💪', desc: 'Middle dominance, post-contact metres, slow grind' },
  { value: 'structured', label: 'Structured', emoji: '📋', desc: 'Set plays, sweeps, decoys, precision execution' },
  { value: 'tempo', label: 'Tempo', emoji: '⚡', desc: 'Fast ruck, quick shifts, exploit defensive fatigue' },
  { value: 'edge', label: 'Edge', emoji: '🎯', desc: 'Width focus, overlaps, kicks to corners' },
] as const;

const DEFENSE_OPTIONS = [
  { value: 'rush', label: 'Rush', emoji: '🏃', desc: 'Aggressive line speed, pressure the ball early' },
  { value: 'slide', label: 'Slide', emoji: '🔄', desc: 'Stay connected, drift across, push to touchline' },
  { value: 'jam', label: 'Jam', emoji: '🧱', desc: 'Compress the edges, shut the gate, force errors' },
  { value: 'territory', label: 'Territory', emoji: '📍', desc: 'Defend the long field, kick chase, win field position' },
] as const;

const SIDED_POSITIONS = new Set(['Winger', 'Centre', 'Second Row']);

const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  fiery: 'Fiery',
  confident: 'Confident',
  showman: 'Showman',
  professional: 'Professional',
  clutch: 'Clutch',
  prodigy: 'Prodigy',
  leader: 'Leader',
  loyal: 'Loyal',
};

const POSITION_FILTERS = [
  { label: 'All', positions: null },
  { label: 'Backs', positions: ['Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback'] },
  { label: 'Forwards', positions: ['Prop', 'Hooker', 'Second Row', 'Lock'] },
  { label: 'Halves', positions: ['Five-Eighth', 'Halfback'] },
  { label: 'Outside', positions: ['Fullback', 'Winger', 'Centre'] },
  { label: 'Middle', positions: ['Prop', 'Hooker', 'Lock'] },
  { label: 'Edge', positions: ['Second Row', 'Winger', 'Centre'] },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const getActiveInjury = (player: Player): PlayerInjury | null => {
  if (!player.player_injuries || player.player_injuries.length === 0) return null;
  return player.player_injuries.find(i => i.is_active) || null;
};

const getSideBadge = (side: string | null) => {
  switch (side) {
    case 'left': return { text: 'L', bg: 'bg-orange-500', title: 'Left-sided specialist' };
    case 'right': return { text: 'R', bg: 'bg-blue-500', title: 'Right-sided specialist' };
    case 'both': return { text: 'L/R', bg: 'bg-gray-500', title: 'Versatile - plays both sides' };
    default: return { text: '?', bg: 'bg-yellow-500', title: 'Developing - side not yet determined' };
  }
};

const getConversionDisplay = (player: Player) => {
  const attempts = player.goal_kick_attempts || 0;
  const successes = player.goal_kick_successes || 0;
  
  if (attempts === 0) {
    return { rate: '—', color: 'text-gray-500', label: 'No attempts' };
  }
  
  const percentage = Math.round((successes / attempts) * 100);
  let color = 'text-red-400';
  if (percentage >= 75) color = 'text-green-400';
  else if (percentage >= 60) color = 'text-yellow-400';
  else if (percentage >= 45) color = 'text-orange-400';
  
  const sampleIndicator = attempts < 5 ? '*' : '';
  const label = attempts >= 15 ? 'Reliable sample' : attempts >= 5 ? 'Small sample' : 'Very small sample';
  
  return { rate: `${successes}/${attempts} (${percentage}%)${sampleIndicator}`, color, label };
};

const getFitnessColor = (fatigue: number | undefined): string => {
  const fitness = 100 - (fatigue || 0);
  if (fitness >= 80) return 'text-green-400';
  if (fitness >= 60) return 'text-yellow-400';
  if (fitness >= 40) return 'text-orange-400';
  return 'text-red-400';
};

const getFitness = (fatigue: number | undefined): number => {
  return 100 - (fatigue || 0);
};

// ============================================
// COMPONENTS
// ============================================

const GoalPosts = ({ flipped = false }: { flipped?: boolean }) => (
  <svg width="80" height="40" viewBox="0 0 80 40" className={flipped ? 'rotate-180' : ''}>
    <rect x="15" y="20" width="4" height="20" fill="white" opacity="0.9" />
    <rect x="61" y="20" width="4" height="20" fill="white" opacity="0.9" />
    <rect x="15" y="16" width="50" height="4" fill="white" opacity="0.9" />
    <rect x="16" y="0" width="2" height="16" fill="white" opacity="0.9" />
    <rect x="62" y="0" width="2" height="16" fill="white" opacity="0.9" />
  </svg>
);

const TraitBadge = ({ trait }: { trait: string | null }) => {
  if (!trait) return null;
  const displayName = TRAIT_DISPLAY_NAMES[trait] || trait;
  return (
    <span className="bg-purple-600/80 text-purple-100 text-[9px] px-1.5 py-0.5 rounded font-medium">
      {displayName}
    </span>
  );
};

const InjuryBadge = ({ injury }: { injury: PlayerInjury }) => {
  const injuryType = injury.injury_types?.[0];
  const severityColors = {
    minor: 'bg-yellow-600/80 text-yellow-100',
    moderate: 'bg-orange-600/80 text-orange-100',
    major: 'bg-red-600/80 text-red-100',
  };
  const colorClass = injuryType ? severityColors[injuryType.severity] : 'bg-red-600/80 text-red-100';
  
  return (
    <span className={`${colorClass} text-[9px] px-1.5 py-0.5 rounded font-medium`}>
      🏥 R{injury.round_return}
    </span>
  );
};

// ============================================
// PLAYER SELECTION MODAL COMPONENT
// ============================================

interface PlayerSelectionModalProps {
  players: Player[];
  selectedPosition: string;
  selectedPlayerIds: Set<string>;
  injuredPlayerIds: Set<string>;
  tactics: Tactics | null;
  onSelectPlayer: (posKey: string, playerId: string) => void;
  onClose: () => void;
}

function PlayerSelectionModal({
  players,
  selectedPosition,
  selectedPlayerIds,
  injuredPlayerIds,
  tactics,
  onSelectPlayer,
  onClose,
}: PlayerSelectionModalProps) {
  const [positionFilter, setPositionFilter] = useState<string[] | null>(null);
  
  // Auto-detect best filter based on position being filled
  useEffect(() => {
    const posKey = selectedPosition.toLowerCase();
    if (posKey.includes('fullback') || posKey.includes('winger') || posKey.includes('centre')) {
      setPositionFilter(['Fullback', 'Winger', 'Centre']);
    } else if (posKey.includes('halfback') || posKey.includes('five_eighth')) {
      setPositionFilter(['Five-Eighth', 'Halfback']);
    } else if (posKey.includes('prop') || posKey.includes('hooker') || posKey.includes('lock')) {
      setPositionFilter(['Prop', 'Hooker', 'Lock']);
    } else if (posKey.includes('second_row')) {
      setPositionFilter(['Second Row', 'Lock']);
    } else {
      setPositionFilter(null);
    }
  }, [selectedPosition]);

  const filteredPlayers = useMemo(() => {
    if (!positionFilter) return players;
    return players.filter(p => positionFilter.includes(p.position));
  }, [players, positionFilter]);

  const isFilterActive = (filterPositions: string[] | null) => {
    if (positionFilter === null && filterPositions === null) return true;
    if (positionFilter === null || filterPositions === null) return false;
    return positionFilter.length === filterPositions.length &&
      positionFilter.every(p => filterPositions.includes(p));
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Select Player</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Position Filter Tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-700 flex-shrink-0">
          {POSITION_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setPositionFilter(filter.positions)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                isFilterActive(filter.positions)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Clear Position */}
          <button
            onClick={() => onSelectPlayer(selectedPosition, '')}
            className="w-full bg-red-900/30 hover:bg-red-800/50 text-red-400 py-1.5 px-3 rounded text-sm text-left border border-red-800/50"
          >
            ✕ Clear Position
          </button>
          
          {filteredPlayers.map((p) => {
            const alreadySelected = false; // Allow swapping - anyone can be selected
            const isInjured = injuredPlayerIds.has(p.id);
            const activeInjury = getActiveInjury(p);
            const showSide = SIDED_POSITIONS.has(p.position);
            const sideBadge = getSideBadge(p.dominant_side);
            const isDisabled = alreadySelected || isInjured;
            const fitness = getFitness(p.fatigue);
            
            return (
              <button
                key={p.id}
                onClick={() => !isDisabled && onSelectPlayer(selectedPosition, p.id)}
                disabled={isDisabled}
                className={`w-full py-1.5 px-2 rounded text-left flex justify-between items-center ${
                  isInjured
                    ? 'bg-red-900/20 text-red-300 cursor-not-allowed'
                    : alreadySelected 
                      ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed' 
                      : 'bg-gray-700/50 hover:bg-gray-600 text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold text-sm w-7 text-center ${isInjured ? 'text-red-400' : 'text-green-400'}`}>
                    {isInjured ? '🏥' : p.overall}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{p.first_name.charAt(0)}. {p.last_name}</span>
                      {showSide && (
                        <span className={`${sideBadge.bg} text-white text-[10px] px-1 rounded font-bold flex-shrink-0`}>
                          {sideBadge.text}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <span>{p.position}</span>
                      <span className={getFitnessColor(p.fatigue)}>{fitness}%</span>
                      {p.visible_trait && !isInjured && (
                        <span className="text-purple-400">• {TRAIT_DISPLAY_NAMES[p.visible_trait] || p.visible_trait}</span>
                      )}
                      {isInjured && activeInjury && (
                        <span className="text-red-400">• R{activeInjury.round_return}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          
          {filteredPlayers.length === 0 && (
            <div className="text-center text-gray-500 py-4 text-sm">
              No players match this filter
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// POSITION SELECTION MODAL (for reserves)
// ============================================

interface PositionSelectionModalProps {
  player: Player;
  tactics: Tactics | null;
  playerMap: Map<string, Player>;
  onSelectPosition: (posKey: string, playerId: string) => void;
  onClose: () => void;
}

function PositionSelectionModal({
  player,
  tactics,
  playerMap,
  onSelectPosition,
  onClose,
}: PositionSelectionModalProps) {
  
  const positionGroups = [
    { 
      label: 'Backs', 
      positions: ['pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r', 'pos_five_eighth', 'pos_halfback'] 
    },
    { 
      label: 'Forwards', 
      positions: ['pos_prop_l', 'pos_hooker', 'pos_prop_r', 'pos_second_row_l', 'pos_second_row_r', 'pos_lock'] 
    },
    { 
      label: 'Bench', 
      positions: ['bench_1', 'bench_2', 'bench_3', 'bench_4'] 
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Place in Position</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none px-2"
            >
              ×
            </button>
          </div>
          <div className="mt-2 bg-gray-700 rounded-lg p-2 flex items-center gap-3">
            <span className="text-green-400 font-bold">{player.overall}</span>
            <div>
              <p className="text-white font-medium">{player.first_name} {player.last_name}</p>
              <p className="text-gray-400 text-xs">{player.position}</p>
            </div>
          </div>
        </div>

        {/* Position List */}
        <div className="flex-1 overflow-y-auto p-2">
          {positionGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-gray-500 text-xs font-bold uppercase mb-1 px-1">{group.label}</p>
              <div className="space-y-1">
                {group.positions.map((posKey) => {
                  const info = POSITION_LABELS[posKey];
                  const currentPlayerId = (tactics as any)?.[posKey] as string | null;
                  const currentPlayer = currentPlayerId ? playerMap.get(currentPlayerId) : null;
                  
                  return (
                    <button
                      key={posKey}
                      onClick={() => onSelectPosition(posKey, player.id)}
                      className="w-full py-2 px-3 rounded bg-gray-700/50 hover:bg-gray-600 text-left flex justify-between items-center"
                    >
                      <div>
                        <span className="text-white font-medium">#{info.number} {info.label}</span>
                      </div>
                      <div className="text-right">
                        {currentPlayer ? (
                          <span className="text-gray-400 text-sm">
                            {currentPlayer.first_name.charAt(0)}. {currentPlayer.last_name}
                            <span className="text-orange-400 ml-1">↔</span>
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">Empty</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TacticsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tactics, setTactics] = useState<Tactics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedReserve, setSelectedReserve] = useState<Player | null>(null);
  const [showKickerModal, setShowKickerModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  
  const router = useRouter();

  // ============================================
  // MEMOIZED LOOKUPS (O(1) instead of O(n))
  // ============================================
  
  const playerMap = useMemo(() => {
    return new Map(players.map(p => [p.id, p]));
  }, [players]);

  const playerIdSet = useMemo(() => {
    return new Set(players.map(p => p.id));
  }, [players]);

  const selectedPlayerIds = useMemo(() => {
    if (!tactics) return new Set<string>();
    const ids = new Set<string>();
    for (const key of POSITION_KEYS) {
      const playerId = tactics[key as keyof Tactics] as string | null;
      if (playerId) ids.add(playerId);
    }
    return ids;
  }, [tactics]);

  // Players NOT in the 17
  const reservePlayers = useMemo(() => {
    return players
      .filter(p => !selectedPlayerIds.has(p.id))
      .sort((a, b) => (b.overall || 0) - (a.overall || 0));
  }, [players, selectedPlayerIds]);

  const playersSortedByKicking = useMemo(() => {
    return [...players].sort((a, b) => b.kicking - a.kicking);
  }, [players]);

  // Set of injured player IDs for quick lookup
  const injuredPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const player of players) {
      const injury = getActiveInjury(player);
      if (injury) ids.add(player.id);
    }
    return ids;
  }, [players]);

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  const saveToDatabase = useCallback(async (tacticsToSave: Tactics) => {
    if (!tacticsToSave || !teamId) return;
    
    setSaveStatus('saving');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id || coach.team_id !== teamId) {
        console.error('Team ID mismatch - potential security issue');
        setSaveStatus('error');
        return;
      }

      const { error } = await supabase
        .from('team_tactics')
        .update({
          pos_fullback: tacticsToSave.pos_fullback,
          pos_winger_l: tacticsToSave.pos_winger_l,
          pos_winger_r: tacticsToSave.pos_winger_r,
          pos_centre_l: tacticsToSave.pos_centre_l,
          pos_centre_r: tacticsToSave.pos_centre_r,
          pos_five_eighth: tacticsToSave.pos_five_eighth,
          pos_halfback: tacticsToSave.pos_halfback,
          pos_prop_l: tacticsToSave.pos_prop_l,
          pos_prop_r: tacticsToSave.pos_prop_r,
          pos_hooker: tacticsToSave.pos_hooker,
          pos_second_row_l: tacticsToSave.pos_second_row_l,
          pos_second_row_r: tacticsToSave.pos_second_row_r,
          pos_lock: tacticsToSave.pos_lock,
          bench_1: tacticsToSave.bench_1,
          bench_2: tacticsToSave.bench_2,
          bench_3: tacticsToSave.bench_3,
          bench_4: tacticsToSave.bench_4,
          goal_kicker: tacticsToSave.goal_kicker,
          captain: tacticsToSave.captain,
          attack_focus: tacticsToSave.attack_focus,
          defense_focus: tacticsToSave.defense_focus,
        })
        .eq('team_id', coach.team_id);

      if (error) throw error;
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [teamId, router]);

  // Auto-save with debounce
  useEffect(() => {
    if (initialLoad || !tactics) return;
    
    const timeout = setTimeout(() => {
      saveToDatabase(tactics);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [tactics, saveToDatabase, initialLoad]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data: coach } = await supabase
          .from('coaches')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (!coach?.team_id) {
          router.push('/choose-team');
          return;
        }

        setTeamId(coach.team_id);

        const [teamResult, playersResult, tacticsResult] = await Promise.all([
          supabase
            .from('teams')
            .select('id, name, primary_color, secondary_color')
            .eq('id', coach.team_id)
            .single(),
          supabase
            .from('players')
            .select('id, first_name, last_name, position, age, overall, kicking, goal_kick_attempts, goal_kick_successes, nationality, state, dominant_side, visible_trait, fatigue, player_injuries(id, injury_type_id, round_return, is_active, injury_types(name, severity))')
            .eq('team_id', coach.team_id)
            .order('overall', { ascending: false }),
          supabase
            .from('team_tactics')
            .select('*')
            .eq('team_id', coach.team_id)
            .single(),
        ]);

        setTeam(teamResult.data);
        setPlayers(playersResult.data || []);
        setTactics({
          ...tacticsResult.data,
          attack_focus: tacticsResult.data?.attack_focus || '',
          defense_focus: tacticsResult.data?.defense_focus || '',
        });
        
        setTimeout(() => setInitialLoad(false), 100);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleSelectPlayer = useCallback((posKey: string, playerId: string) => {
    if (!tactics) return;
    
    // Security: Validate player belongs to team
    if (playerId && !playerIdSet.has(playerId)) {
      console.error('Invalid player ID - not on team');
      return;
    }

    // Block selecting injured players
    if (playerId && injuredPlayerIds.has(playerId)) {
      console.error('Cannot select injured player');
      return;
    }
    
    // Check if player is already in another position (swap scenario)
    const currentPositionOfPlayer = POSITION_KEYS.find(
      key => (tactics as any)[key] === playerId
    );
    
    // Get who's currently in the target position
    const currentPlayerInTargetPos = (tactics as any)[posKey] as string | null;
    
    setTactics(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      
      // Put new player in target position
      (updated as any)[posKey] = playerId || null;
      
      // If player was in another position, swap the old player there
      if (currentPositionOfPlayer && currentPlayerInTargetPos) {
        (updated as any)[currentPositionOfPlayer] = currentPlayerInTargetPos;
      } else if (currentPositionOfPlayer) {
        // Player was somewhere else, clear that spot
        (updated as any)[currentPositionOfPlayer] = null;
      }
      
      return updated;
    });
    
    setSelectedPosition(null);
    setSelectedReserve(null);
  }, [tactics, playerIdSet, injuredPlayerIds]);

  const handleClearPosition = useCallback((posKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tactics) return;
    setTactics(prev => prev ? { ...prev, [posKey]: null } : null);
  }, [tactics]);

  const handleTacticToggle = useCallback((type: 'attack' | 'defense', value: string) => {
    if (!tactics) return;
    const key = type === 'attack' ? 'attack_focus' : 'defense_focus';
    setTactics(prev => prev ? { 
      ...prev, 
      [key]: prev[key] === value ? '' : value 
    } : null);
  }, [tactics]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const PositionSlot = useCallback(({ posKey, label, number }: { posKey: string; label: string; number: number }) => {
    const playerId = (tactics as any)?.[posKey] as string | null;
    const player = playerId ? playerMap.get(playerId) : null;
    const isKicker = tactics?.goal_kicker === player?.id;
    const isCaptain = tactics?.captain === player?.id;
    const showSide = player && SIDED_POSITIONS.has(player.position);
    const sideBadge = player ? getSideBadge(player.dominant_side) : null;
    const activeInjury = player ? getActiveInjury(player) : null;
    
    return (
      <div
        onClick={() => setSelectedPosition(posKey)}
        className={`bg-gray-800/90 rounded-lg p-2 cursor-pointer hover:bg-gray-700 transition border-2 min-w-[100px] text-center relative group ${
          activeInjury ? 'border-red-500 bg-red-900/30' : 'border-gray-600 hover:border-green-500'
        }`}
      >
        {/* Clear button */}
        {player && (
          <button
            onClick={(e) => handleClearPosition(posKey, e)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center"
            title="Clear position"
          >
            ✕
          </button>
        )}
        
        <div className="text-xs text-gray-400">#{number} {label}</div>
        {player ? (
          <>
            <div className="text-center truncate">
              <p className="text-white text-xs">{isCaptain && '👑 '}{player.first_name}</p>
              <p className="text-white font-bold text-sm">{player.last_name}</p>
            </div>
            <div className="flex justify-center items-center gap-1 flex-wrap">
              <span className="text-xs font-bold text-green-400">{player.overall}</span>
              {isKicker && <span className="text-xs">🎯</span>}
              {showSide && sideBadge && (
                <span 
                  className={`${sideBadge.bg} text-white text-[10px] px-1 rounded font-bold`}
                  title={sideBadge.title}
                >
                  {sideBadge.text}
                </span>
              )}
            </div>
            {activeInjury && (
              <div className="mt-1">
                <InjuryBadge injury={activeInjury} />
              </div>
            )}
            {!activeInjury && player.visible_trait && (
              <div className="mt-1">
                <TraitBadge trait={player.visible_trait} />
              </div>
            )}
            <p className="text-gray-500 text-[10px]">{player.position}</p>
          </>
        ) : (
          <div className="text-gray-500 text-sm font-semibold py-2">Empty</div>
        )}
      </div>
    );
  }, [tactics, playerMap, handleClearPosition]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading tactics...</div>
      </div>
    );
  }

  const currentKicker = tactics?.goal_kicker ? playerMap.get(tactics.goal_kicker) : null;
  const currentKickerStats = currentKicker ? getConversionDisplay(currentKicker) : null;

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
                ← Back to Clubhouse
              </Link>
              <h1 className="text-3xl font-bold text-white">📋 Tactics</h1>
              <p className="text-white/80">{team?.name} • Set Your Lineup</p>
            </div>
            
            <div className="text-right">
              {saveStatus === 'saving' && (
                <span className="text-yellow-400 text-sm animate-pulse">💾 Saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-400 text-sm">✅ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 text-sm">❌ Error saving</span>
              )}
              {saveStatus === 'idle' && (
                <span className="text-white/50 text-sm">Auto-save on</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        {/* Injured Players Warning */}
        {injuredPlayerIds.size > 0 && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-4 mb-6">
            <h3 className="text-red-400 font-bold mb-2">🏥 Injured Players ({injuredPlayerIds.size})</h3>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => injuredPlayerIds.has(p.id)).map(p => {
                const injury = getActiveInjury(p);
                const injuryType = injury?.injury_types?.[0];
                return (
                  <span key={p.id} className="bg-red-800/50 text-red-200 text-sm px-2 py-1 rounded">
                    {p.first_name} {p.last_name} - {injuryType?.name || 'Injured'} (R{injury?.round_return})
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ATTACK & DEFENSE FOCUS - Side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Attack */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">⚔️ Attack Style</h3>
            <div className="space-y-2">
              {ATTACK_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTacticToggle('attack', option.value)}
                  className={`w-full p-3 rounded-lg text-left transition ${
                    tactics?.attack_focus === option.value
                      ? 'bg-green-600/30 border-2 border-green-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.emoji}</span>
                    <div>
                      <p className="text-white font-bold">{option.label}</p>
                      <p className="text-gray-400 text-xs">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Defense */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">🛡️ Defence Style</h3>
            <div className="space-y-2">
              {DEFENSE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleTacticToggle('defense', option.value)}
                  className={`w-full p-3 rounded-lg text-left transition ${
                    tactics?.defense_focus === option.value
                      ? 'bg-blue-600/30 border-2 border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.emoji}</span>
                    <div>
                      <p className="text-white font-bold">{option.label}</p>
                      <p className="text-gray-400 text-xs">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Football Field */}
        <div 
          className="rounded-xl p-6 mb-6 relative overflow-hidden border-4 border-white/50"
          style={{
            background: 'linear-gradient(to bottom, #2d5a27 0%, #3d7a37 50%, #2d5a27 100%)',
            minHeight: '750px'
          }}
        >
          {/* Direction Indicator - Left Side */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            <div className="w-1 h-24 bg-gradient-to-t from-transparent via-white/60 to-white rounded-full"></div>
            <span className="text-white/80 text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              ATTACK
            </span>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-white/80"></div>
          </div>

          {/* Opposition Goal Posts (top) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <GoalPosts />
            <div className="text-white/50 text-xs font-bold mt-1">OPPOSITION</div>
          </div>
          
          {/* Opposition Try Line */}
          <div className="absolute top-16 inset-x-4 border-t-4 border-white/70 border-dashed"></div>

          {/* Field Lines */}
          <div className="absolute top-[25%] inset-x-4 border-t-2 border-white/30"></div>
          <div className="absolute top-[40%] inset-x-4 border-t-2 border-white/30"></div>
          <div className="absolute top-1/2 inset-x-4 border-t-2 border-white/50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/40 rounded-full"></div>
          <div className="absolute top-[60%] inset-x-4 border-t-2 border-white/30"></div>
          <div className="absolute top-[75%] inset-x-4 border-t-2 border-white/30"></div>

          {/* Your Try Line */}
          <div className="absolute bottom-16 inset-x-4 border-t-4 border-white/70 border-dashed"></div>
          
          {/* Your Goal Posts (bottom) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-white/50 text-xs font-bold mb-1">YOUR GOAL</div>
            <GoalPosts flipped />
          </div>

          {/* Positions Layout */}
          <div className="relative z-10 flex flex-col items-center gap-3 pt-24 pb-24">
            {/* Props & Hooker */}
            <div className="flex justify-center gap-4">
              <PositionSlot posKey="pos_prop_l" label="PR" number={8} />
              <PositionSlot posKey="pos_hooker" label="HK" number={9} />
              <PositionSlot posKey="pos_prop_r" label="PR" number={10} />
            </div>

            {/* Second Row */}
            <div className="flex justify-center gap-24">
              <PositionSlot posKey="pos_second_row_l" label="2R" number={11} />
              <PositionSlot posKey="pos_second_row_r" label="2R" number={12} />
            </div>

            {/* Lock */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_lock" label="LK" number={13} />
            </div>

            {/* Halfback */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_halfback" label="HB" number={7} />
            </div>

            {/* Five-Eighth */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_five_eighth" label="FE" number={6} />
            </div>

            {/* Centres */}
            <div className="flex justify-center gap-24">
              <PositionSlot posKey="pos_centre_l" label="LC" number={3} />
              <PositionSlot posKey="pos_centre_r" label="RC" number={4} />
            </div>

            {/* Wingers */}
            <div className="flex justify-between w-full max-w-lg px-4">
              <PositionSlot posKey="pos_winger_l" label="LW" number={2} />
              <PositionSlot posKey="pos_winger_r" label="RW" number={5} />
            </div>

            {/* Fullback */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_fullback" label="FB" number={1} />
            </div>
          </div>
        </div>

        {/* Bench */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">🪑 Bench</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            <PositionSlot posKey="bench_1" label="B" number={14} />
            <PositionSlot posKey="bench_2" label="B" number={15} />
            <PositionSlot posKey="bench_3" label="B" number={16} />
            <PositionSlot posKey="bench_4" label="B" number={17} />
          </div>
        </div>

        {/* Reserves Section */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">📋 Reserves ({reservePlayers.length})</h3>
          {reservePlayers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All players are in the 17</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {reservePlayers.map((p) => {
                const isInjured = injuredPlayerIds.has(p.id);
                const activeInjury = getActiveInjury(p);
                const fitness = getFitness(p.fatigue);
                
                return (
                  <button
                    key={p.id}
                    onClick={() => !isInjured && setSelectedReserve(p)}
                    disabled={isInjured}
                    className={`p-2 rounded-lg text-left transition ${
                      isInjured 
                        ? 'bg-red-900/20 cursor-not-allowed border border-red-800/50' 
                        : 'bg-gray-700/50 hover:bg-gray-600 border border-transparent hover:border-green-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isInjured ? 'text-red-400' : 'text-green-400'}`}>
                        {isInjured ? '🏥' : p.overall}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {p.first_name.charAt(0)}. {p.last_name}
                        </p>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-gray-400">{p.position}</span>
                          {!isInjured && (
                            <span className={getFitnessColor(p.fatigue)}>{fitness}%</span>
                          )}
                          {isInjured && activeInjury && (
                            <span className="text-red-400">R{activeInjury.round_return}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Goal Kicker Section */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">🎯 Goal Kicker</h3>
          
          {currentKicker ? (
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400 text-xs">Current Kicker</p>
                  <p className="text-white font-bold text-lg">
                    {currentKicker.first_name} {currentKicker.last_name}
                  </p>
                  <p className="text-gray-500 text-sm">{currentKicker.position} • Age {currentKicker.age}</p>
                  {currentKicker.visible_trait && (
                    <div className="mt-1">
                      <TraitBadge trait={currentKicker.visible_trait} />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${currentKickerStats?.color}`}>
                    {currentKickerStats?.rate}
                  </p>
                  <p className="text-gray-500 text-xs">{currentKickerStats?.label}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4 text-center">
              <p className="text-gray-500">No goal kicker selected</p>
            </div>
          )}

          <button
            onClick={() => setShowKickerModal(true)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
          >
            Change Goal Kicker
          </button>
        </div>

        {/* Captain Section */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">👑 Captain</h3>
          <select
            value={tactics?.captain || ''}
            onChange={(e) => {
              const playerId = e.target.value;
              if (playerId && !playerIdSet.has(playerId)) return;
              setTactics(prev => prev ? { ...prev, captain: playerId || null } : null);
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-500"
          >
            <option value="">-- Select Captain --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.position}, {p.overall} OVR)
                {p.visible_trait ? ` • ${TRAIT_DISPLAY_NAMES[p.visible_trait] || p.visible_trait}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="bg-gray-800 rounded-lg p-3 mb-6">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="bg-orange-500 text-white px-1.5 rounded font-bold">L</span>
              <span className="text-gray-400">Left</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-blue-500 text-white px-1.5 rounded font-bold">R</span>
              <span className="text-gray-400">Right</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-purple-600 text-white px-1.5 rounded font-bold">Trait</span>
              <span className="text-gray-400">Personality</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-red-600 text-white px-1.5 rounded font-bold">🏥</span>
              <span className="text-gray-400">Injured</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">🎯 Kicker</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">👑 Captain</span>
            </span>
          </div>
        </div>

      </div>

      {/* Player Selection Modal */}
      {selectedPosition && (
        <PlayerSelectionModal
          players={players}
          selectedPosition={selectedPosition}
          selectedPlayerIds={selectedPlayerIds}
          injuredPlayerIds={injuredPlayerIds}
          tactics={tactics}
          onSelectPlayer={handleSelectPlayer}
          onClose={() => setSelectedPosition(null)}
        />
      )}

      {/* Reserve Position Selection Modal */}
      {selectedReserve && (
        <PositionSelectionModal
          player={selectedReserve}
          tactics={tactics}
          playerMap={playerMap}
          onSelectPosition={handleSelectPlayer}
          onClose={() => setSelectedReserve(null)}
        />
      )}

      {/* Goal Kicker Modal */}
      {showKickerModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
          onClick={() => setShowKickerModal(false)}
        >
          <div 
            className="bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Select Goal Kicker</h3>
              <button
                onClick={() => setShowKickerModal(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {playersSortedByKicking.map((p) => {
                const stats = getConversionDisplay(p);
                const isCurrentKicker = tactics?.goal_kicker === p.id;
                const isInjured = injuredPlayerIds.has(p.id);
                const activeInjury = getActiveInjury(p);
                
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (isInjured) return;
                      setTactics(prev => prev ? { ...prev, goal_kicker: p.id } : null);
                      setShowKickerModal(false);
                    }}
                    disabled={isInjured}
                    className={`w-full py-1.5 px-2 rounded text-left flex justify-between items-center ${
                      isInjured
                        ? 'bg-red-900/20 text-red-300 cursor-not-allowed'
                        : isCurrentKicker
                          ? 'bg-green-600/30 border border-green-500'
                          : 'bg-gray-700/50 hover:bg-gray-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-white font-medium text-sm flex items-center gap-1.5">
                        <span>{p.first_name.charAt(0)}. {p.last_name}</span>
                        {isInjured && activeInjury && (
                          <span className="text-red-400 text-[10px]">🏥 R{activeInjury.round_return}</span>
                        )}
                        {!isInjured && p.visible_trait && (
                          <span className="text-purple-400 text-[10px]">{TRAIT_DISPLAY_NAMES[p.visible_trait] || p.visible_trait}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">{p.position} • Kick: {p.kicking}</div>
                    </div>
                    <span className={`font-bold text-sm ${isInjured ? 'text-red-400' : stats.color}`}>
                      {isInjured ? '🏥' : stats.rate}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => setShowKickerModal(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
