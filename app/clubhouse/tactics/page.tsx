'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

const ATTACK_OPTIONS = [
  { value: 'power', label: 'Power', emoji: '💪', desc: 'Middle dominance, post-contact metres, slow grind' },
  { value: 'structured', label: 'Structured', emoji: '📋', desc: 'Set plays, sweeps, decoys, precision execution' },
  { value: 'tempo', label: 'Tempo', emoji: '⚡', desc: 'Fast ruck, quick shifts, exploit defensive fatigue' },
  { value: 'edge', label: 'Edge', emoji: '🎯', desc: 'Width focus, overlaps, kicks to corners' },
];

const DEFENSE_OPTIONS = [
  { value: 'rush', label: 'Rush', emoji: '🏃', desc: 'Aggressive line speed, pressure the ball early' },
  { value: 'slide', label: 'Slide', emoji: '🔄', desc: 'Stay connected, drift across, push to touchline' },
  { value: 'jam', label: 'Jam', emoji: '🧱', desc: 'Compress the edges, shut the gate, force errors' },
  { value: 'territory', label: 'Territory', emoji: '📍', desc: 'Defend the long field, kick chase, win field position' },
];

const shouldShowSide = (position: string) => {
  return ['Winger', 'Centre', 'Second Row'].includes(position);
};

const getSideBadge = (side: string | null) => {
  switch (side) {
    case 'left':
      return { text: 'L', bg: 'bg-orange-500', title: 'Left-sided specialist' };
    case 'right':
      return { text: 'R', bg: 'bg-blue-500', title: 'Right-sided specialist' };
    case 'both':
      return { text: 'L/R', bg: 'bg-gray-500', title: 'Versatile - plays both sides' };
    default:
      return { text: '?', bg: 'bg-yellow-500', title: 'Developing - side not yet determined' };
  }
};

const GoalPosts = ({ flipped = false }: { flipped?: boolean }) => (
  <svg 
    width="80" 
    height="40" 
    viewBox="0 0 80 40" 
    className={flipped ? 'rotate-180' : ''}
  >
    <rect x="15" y="20" width="4" height="20" fill="white" opacity="0.9" />
    <rect x="61" y="20" width="4" height="20" fill="white" opacity="0.9" />
    <rect x="15" y="16" width="50" height="4" fill="white" opacity="0.9" />
    <rect x="16" y="0" width="2" height="16" fill="white" opacity="0.9" />
    <rect x="62" y="0" width="2" height="16" fill="white" opacity="0.9" />
  </svg>
);

export default function TacticsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tactics, setTactics] = useState<Tactics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showKickerModal, setShowKickerModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const router = useRouter();

  const saveToDatabase = useCallback(async (tacticsToSave: Tactics) => {
    if (!tacticsToSave) return;
        console.log('Saving tactics:', tacticsToSave.attack_focus, tacticsToSave.defense_focus);
    
    setSaveStatus('saving');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!coach?.team_id) return;

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
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  useEffect(() => {
    if (initialLoad || !tactics) return;
    
    const timeout = setTimeout(() => {
      saveToDatabase(tactics);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [tactics, saveToDatabase, initialLoad]);

  useEffect(() => {
    loadData();
  }, []);

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

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      setTeam(teamData);

      const { data: playersData } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, age, overall, kicking, goal_kick_attempts, goal_kick_successes, nationality, state, dominant_side')
        .eq('team_id', coach.team_id)
        .order('overall', { ascending: false });

      setPlayers(playersData || []);

      const { data: tacticsData } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', coach.team_id)
        .single();

      setTactics({
        ...tacticsData,
        attack_focus: tacticsData?.attack_focus || '',
        defense_focus: tacticsData?.defense_focus || '',
      });
      
      setTimeout(() => setInitialLoad(false), 100);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerById = (id: string | null) => {
    if (!id) return null;
    return players.find(p => p.id === id) || null;
  };

  const isPlayerSelected = (playerId: string) => {
    if (!tactics) return false;
    const allPositions = [
      'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
      'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
      'pos_second_row_l', 'pos_second_row_r', 'pos_lock', 'bench_1', 'bench_2', 'bench_3', 'bench_4'
    ];
    return allPositions.some(pos => (tactics as any)[pos] === playerId);
  };

  const handleSelectPlayer = (posKey: string, playerId: string) => {
    if (!tactics) return;
    setTactics({ ...tactics, [posKey]: playerId || null });
    setSelectedPosition(null);
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
    
    let sampleIndicator = '';
    if (attempts < 5) sampleIndicator = '*';
    
    return { 
      rate: `${successes}/${attempts} (${percentage}%)${sampleIndicator}`, 
      color,
      label: attempts >= 15 ? 'Reliable sample' : attempts >= 5 ? 'Small sample' : 'Very small sample'
    };
  };

  const PositionSlot = ({ posKey, label, number }: { posKey: string; label: string; number: number }) => {
    const player = getPlayerById((tactics as any)?.[posKey]);
    const isKicker = tactics?.goal_kicker === player?.id;
    const isCaptain = tactics?.captain === player?.id;
    
    const showSide = player && shouldShowSide(player.position);
    const sideBadge = player ? getSideBadge(player.dominant_side) : null;
    
    return (
      <div
        onClick={() => setSelectedPosition(posKey)}
        className="bg-gray-800/90 rounded-lg p-2 cursor-pointer hover:bg-gray-700 transition border-2 border-gray-600 hover:border-green-500 min-w-[100px] text-center"
      >
        <div className="text-xs text-gray-400">#{number} {label}</div>
        {player ? (
          <>
            <div className="text-center truncate">
              <p className="text-white text-xs">{isCaptain && '👑 '}{player.first_name}</p>
              <p className="text-white font-bold text-sm">{player.last_name}</p>
            </div>
            <div className="flex justify-center items-center gap-1">
              <span className="text-xs font-bold text-green-400">
                {player.overall}
              </span>
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
            <p className="text-gray-500 text-[10px]">{player.position}</p>
          </>
        ) : (
          <div className="text-gray-500 text-sm font-semibold">Empty</div>
        )}
      </div>
    );
  };

  const currentKicker = getPlayerById(tactics?.goal_kicker || null);
  const currentKickerStats = currentKicker ? getConversionDisplay(currentKicker) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading tactics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color} 0%, ${team?.secondary_color} 100%)`
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

        {/* ATTACK & DEFENSE FOCUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">⚔️ Attack Style</h3>
            <div className="space-y-2">
              {ATTACK_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTactics({ 
                    ...tactics!, 
                    attack_focus: tactics?.attack_focus === option.value ? '' : option.value 
                  })}
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

          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">🛡️ Defence Style</h3>
            <div className="space-y-2">
              {DEFENSE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTactics({ 
                    ...tactics!, 
                    defense_focus: tactics?.defense_focus === option.value ? '' : option.value 
                  })}
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
            
            {/* Props & Hooker (TOP - closest to opposition) */}
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

            {/* Fullback (BOTTOM - your try line) */}
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
            onChange={(e) => setTactics({ ...tactics!, captain: e.target.value || null })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-500"
          >
            <option value="">-- Select Captain --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.position}, {p.overall} OVR)
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Select Player</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => handleSelectPlayer(selectedPosition, '')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-400 p-3 rounded-lg text-left"
              >
                -- Clear Position --
              </button>
              
              {players.map((p) => {
                const alreadySelected = isPlayerSelected(p.id) && (tactics as any)?.[selectedPosition] !== p.id;
                const showSide = shouldShowSide(p.position);
                const sideBadge = getSideBadge(p.dominant_side);
                
                return (
                  <button
                    key={p.id}
                    onClick={() => !alreadySelected && handleSelectPlayer(selectedPosition, p.id)}
                    disabled={alreadySelected}
                    className={`w-full p-3 rounded-lg text-left flex justify-between items-center ${
                      alreadySelected 
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {p.first_name} {p.last_name}
                        {showSide && (
                          <span className={`${sideBadge.bg} text-white text-xs px-1.5 py-0.5 rounded font-bold`}>
                            {sideBadge.text}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{p.position} • Age {p.age}</div>
                    </div>
                    <span className="font-bold text-green-500">{p.overall}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedPosition(null)}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Goal Kicker Modal */}
      {showKickerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Select Goal Kicker</h3>
            
            <div className="space-y-2">
              {players
                .sort((a, b) => b.kicking - a.kicking)
                .map((p) => {
                  const stats = getConversionDisplay(p);
                  const isCurrentKicker = tactics?.goal_kicker === p.id;
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTactics({ ...tactics!, goal_kicker: p.id });
                        setShowKickerModal(false);
                      }}
                      className={`w-full p-3 rounded-lg text-left flex justify-between items-center ${
                        isCurrentKicker
                          ? 'bg-green-600/30 border-2 border-green-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div>
                        <div className="text-white font-bold">{p.first_name} {p.last_name}</div>
                        <div className="text-sm text-gray-400">{p.position} • Kicking: {p.kicking}</div>
                      </div>
                      <span className={`font-bold ${stats.color}`}>{stats.rate}</span>
                    </button>
                  );
                })}
            </div>

            <button
              onClick={() => setShowKickerModal(false)}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}