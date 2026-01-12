'use client';

import { useState, useEffect } from 'react';
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
  { value: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'Spread attack evenly across the field' },
  { value: 'left', label: 'Left Edge', emoji: '⬅️', desc: 'Focus attack through left winger & centre' },
  { value: 'middle', label: 'Middle', emoji: '⬆️', desc: 'Attack through forwards up the guts' },
  { value: 'right', label: 'Right Edge', emoji: '➡️', desc: 'Focus attack through right winger & centre' },
];

const DEFENSE_OPTIONS = [
  { value: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'Defend evenly across the field' },
  { value: 'left', label: 'Guard Left', emoji: '🛡️⬅️', desc: 'Extra cover on left edge' },
  { value: 'middle', label: 'Pack Middle', emoji: '🛡️⬆️', desc: 'Clog the middle, stop forward runs' },
  { value: 'right', label: 'Guard Right', emoji: '🛡️➡️', desc: 'Extra cover on right edge' },
];

export default function TacticsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tactics, setTactics] = useState<Tactics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showKickerModal, setShowKickerModal] = useState(false);
  
  const router = useRouter();

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
        .select('id, first_name, last_name, position, age, overall, kicking, goal_kick_attempts, goal_kick_successes, nationality, state')
        .eq('team_id', coach.team_id)
        .order('overall', { ascending: false });

      setPlayers(playersData || []);

      const { data: tacticsData } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', coach.team_id)
        .single();

      // Set defaults if not present
      setTactics({
        ...tacticsData,
        attack_focus: tacticsData?.attack_focus || 'balanced',
        defense_focus: tacticsData?.defense_focus || 'balanced',
      });

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

  const getPositionStatus = (player: Player | null, naturalPosition: string) => {
    if (!player) return 'empty';
    if (player.position === naturalPosition) return 'natural';
    return 'wrong';
  };

  const handleSelectPlayer = (posKey: string, playerId: string) => {
    if (!tactics) return;
    setTactics({ ...tactics, [posKey]: playerId || null });
    setSelectedPosition(null);
  };

  const handleSave = async () => {
    if (!tactics || !team) return;
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('team_tactics')
        .update({
          pos_fullback: tactics.pos_fullback,
          pos_winger_l: tactics.pos_winger_l,
          pos_winger_r: tactics.pos_winger_r,
          pos_centre_l: tactics.pos_centre_l,
          pos_centre_r: tactics.pos_centre_r,
          pos_five_eighth: tactics.pos_five_eighth,
          pos_halfback: tactics.pos_halfback,
          pos_prop_l: tactics.pos_prop_l,
          pos_prop_r: tactics.pos_prop_r,
          pos_hooker: tactics.pos_hooker,
          pos_second_row_l: tactics.pos_second_row_l,
          pos_second_row_r: tactics.pos_second_row_r,
          pos_lock: tactics.pos_lock,
          bench_1: tactics.bench_1,
          bench_2: tactics.bench_2,
          bench_3: tactics.bench_3,
          bench_4: tactics.bench_4,
          goal_kicker: tactics.goal_kicker,
          captain: tactics.captain,
          attack_focus: tactics.attack_focus,
          defense_focus: tactics.defense_focus,
        })
        .eq('team_id', team.id);

      if (error) throw error;
      setMessage('✅ Tactics saved!');
    } catch (err: any) {
      setMessage('❌ Error saving tactics');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Get conversion rate display
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

  const PositionSlot = ({ posKey, label, number, natural }: { posKey: string; label: string; number: number; natural: string }) => {
    const player = getPlayerById((tactics as any)?.[posKey]);
    const status = getPositionStatus(player, natural);
    const isKicker = tactics?.goal_kicker === player?.id;
    const isCaptain = tactics?.captain === player?.id;
    
    const borderColor = status === 'wrong' ? 'border-red-500' : 
                        status === 'natural' ? 'border-green-500' : 'border-gray-600';
    
    return (
      <div
        onClick={() => setSelectedPosition(posKey)}
        className={`bg-gray-800/90 rounded-lg p-2 cursor-pointer hover:bg-gray-700 transition border-2 ${borderColor} min-w-[100px] text-center`}
      >
        <div className="text-xs text-gray-400">#{number} {label}</div>
        {player ? (
          <>
            <div className="text-center truncate">
              <p className="text-white text-xs">{isCaptain && '👑 '}{player.first_name}</p>
              <p className="text-white font-bold text-sm">{player.last_name}</p>
            </div>
            <div className="flex justify-center items-center gap-1">
              <span className={`text-xs font-bold ${
                status === 'wrong' ? 'text-red-400' : 'text-green-400'
              }`}>
                {player.overall}
              </span>
              {isKicker && <span className="text-xs">🎯</span>}
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-sm font-semibold">Empty</div>
        )}
      </div>
    );
  };

  // Get current goal kicker
  const currentKicker = getPlayerById(tactics?.goal_kicker || null);
  const currentKickerStats = currentKicker ? getConversionDisplay(currentKicker) : null;

  // Get other potential kickers
  const otherKickers = players
    .filter(p => p.id !== tactics?.goal_kicker)
    .sort((a, b) => {
      if ((b.goal_kick_attempts || 0) !== (a.goal_kick_attempts || 0)) {
        return (b.goal_kick_attempts || 0) - (a.goal_kick_attempts || 0);
      }
      return b.kicking - a.kicking;
    })
    .slice(0, 5);

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
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">📋 Tactics</h1>
          <p className="text-white/80">{team?.name} • Set Your Lineup</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        {/* ATTACK & DEFENSE FOCUS - NEW SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Attack Focus */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">⚔️ Attack Focus</h3>
            <p className="text-gray-500 text-xs mb-3">Where will you focus your attacking plays?</p>
            <div className="space-y-2">
              {ATTACK_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTactics({ ...tactics!, attack_focus: option.value })}
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

          {/* Defense Focus */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">🛡️ Defense Focus</h3>
            <p className="text-gray-500 text-xs mb-3">Where will you concentrate your defense?</p>
            <div className="space-y-2">
              {DEFENSE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTactics({ ...tactics!, defense_focus: option.value })}
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

        {/* Tactical Tips */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
          <h4 className="text-yellow-400 font-bold text-sm mb-2">💡 Tactical Tips</h4>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• <strong>Counter your opponent:</strong> If they attack left, defend left to neutralize</li>
            <li>• <strong>Mismatch advantage:</strong> Attacking where they're not defending gives ~10% boost</li>
            <li>• <strong>Middle attack:</strong> Works best with strong Props, Hooker & Lock</li>
            <li>• <strong>Edge attacks:</strong> Rely on quality Halves to unlock your outside backs</li>
          </ul>
        </div>

        {/* Football Field */}
        <div 
          className="rounded-xl p-6 mb-6 relative overflow-hidden border-4 border-white/50"
          style={{
            background: 'linear-gradient(to bottom, #2d5a27 0%, #3d7a37 50%, #2d5a27 100%)',
            minHeight: '750px'
          }}
        >
          {/* Top Goalpost */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <div className="absolute -left-10 top-0 w-2 h-20 bg-white shadow-lg"></div>
            <div className="absolute left-8 top-0 w-2 h-20 bg-white shadow-lg"></div>
            <div className="absolute -left-10 top-10 w-[76px] h-2 bg-white shadow-lg"></div>
          </div>
          
          {/* Top Try Line */}
          <div className="absolute top-24 inset-x-0 border-t-4 border-white"></div>

          {/* Field Lines */}
          <div className="absolute top-[28%] inset-x-0 border-t-2 border-white/40"></div>
          <div className="absolute top-[28%] left-4 -translate-y-1/2 text-white/30 text-xs">20m</div>
          
          <div className="absolute top-[40%] inset-x-0 border-t-2 border-white/40"></div>
          <div className="absolute top-[40%] left-4 -translate-y-1/2 text-white/30 text-xs">40m</div>
          
          <div className="absolute top-1/2 inset-x-0 border-t-2 border-white/60"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/40 rounded-full"></div>
          <div className="absolute top-1/2 left-4 -translate-y-1/2 text-white/40 text-xs font-bold">HALFWAY</div>
          
          <div className="absolute top-[60%] inset-x-0 border-t-2 border-white/40"></div>
          <div className="absolute top-[60%] left-4 -translate-y-1/2 text-white/30 text-xs">40m</div>
          
          <div className="absolute top-[72%] inset-x-0 border-t-2 border-white/40"></div>
          <div className="absolute top-[72%] left-4 -translate-y-1/2 text-white/30 text-xs">20m</div>

          {/* Bottom Try Line */}
          <div className="absolute bottom-24 inset-x-0 border-t-4 border-white"></div>
          
          {/* Bottom Goalpost */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div className="absolute -left-10 bottom-0 w-2 h-20 bg-white shadow-lg"></div>
            <div className="absolute left-8 bottom-0 w-2 h-20 bg-white shadow-lg"></div>
            <div className="absolute -left-10 bottom-10 w-[76px] h-2 bg-white shadow-lg"></div>
          </div>

          {/* Positions Layout */}
          <div className="relative z-10 flex flex-col items-center gap-3 pt-28 pb-28">
            
            {/* Fullback */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_fullback" label="FB" number={1} natural="Fullback" />
            </div>

            {/* Wingers */}
            <div className="flex justify-between w-full max-w-lg px-4">
              <PositionSlot posKey="pos_winger_l" label="LW" number={2} natural="Winger" />
              <PositionSlot posKey="pos_winger_r" label="RW" number={5} natural="Winger" />
            </div>

            {/* Centres */}
            <div className="flex justify-center gap-24">
              <PositionSlot posKey="pos_centre_l" label="LC" number={3} natural="Centre" />
              <PositionSlot posKey="pos_centre_r" label="RC" number={4} natural="Centre" />
            </div>

            {/* Five-Eighth */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_five_eighth" label="FE" number={6} natural="Five-Eighth" />
            </div>

            {/* Halfback */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_halfback" label="HB" number={7} natural="Halfback" />
            </div>

            {/* Lock */}
            <div className="flex justify-center">
              <PositionSlot posKey="pos_lock" label="LK" number={13} natural="Lock" />
            </div>

            {/* Second Row */}
            <div className="flex justify-center gap-24">
              <PositionSlot posKey="pos_second_row_l" label="2R" number={11} natural="Second Row" />
              <PositionSlot posKey="pos_second_row_r" label="2R" number={12} natural="Second Row" />
            </div>

            {/* Props & Hooker */}
            <div className="flex justify-center gap-4">
              <PositionSlot posKey="pos_prop_l" label="PR" number={8} natural="Prop" />
              <PositionSlot posKey="pos_hooker" label="HK" number={9} natural="Hooker" />
              <PositionSlot posKey="pos_prop_r" label="PR" number={10} natural="Prop" />
            </div>
          </div>
        </div>

        {/* Bench */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">🪑 Bench</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            <PositionSlot posKey="bench_1" label="B" number={14} natural="" />
            <PositionSlot posKey="bench_2" label="B" number={15} natural="" />
            <PositionSlot posKey="bench_3" label="B" number={16} natural="" />
            <PositionSlot posKey="bench_4" label="B" number={17} natural="" />
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
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition mb-4"
          >
            Change Goal Kicker
          </button>

          {otherKickers.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-2">Other Options:</p>
              <div className="space-y-1">
                {otherKickers.slice(0, 3).map(p => {
                  const stats = getConversionDisplay(p);
                  return (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-gray-400">{p.first_name} {p.last_name} ({p.age})</span>
                      <span className={stats.color}>{stats.rate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 text-xs mt-3">
            * Small sample size • Conversion rates update after matches
          </p>
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
                {p.first_name} {p.last_name} ({p.position}, Age {p.age}, {p.overall} OVR)
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm mb-6">
          <span className="text-green-400">● Natural Position</span>
          <span className="text-red-400">● Wrong Position</span>
        </div>

        {/* Save Button */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center ${message.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message}
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : '💾 Save Tactics'}
        </button>
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
                      <div className="font-bold">{p.first_name} {p.last_name}</div>
                      <div className="text-sm text-gray-400">
                        {p.position} • Age {p.age} • {p.nationality}{p.state ? `, ${p.state}` : ''}
                      </div>
                    </div>
                    <span className="text-green-500 font-bold">{p.overall}</span>
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

      {/* Goal Kicker Selection Modal */}
      {showKickerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">Select Goal Kicker</h3>
            <p className="text-gray-400 text-sm mb-4">
              Choose who takes conversions and penalties. Test different players to discover hidden talent!
            </p>
            
            <div className="space-y-2">
              {players
                .sort((a, b) => {
                  const aAttempts = a.goal_kick_attempts || 0;
                  const bAttempts = b.goal_kick_attempts || 0;
                  if (bAttempts !== aAttempts) return bAttempts - aAttempts;
                  
                  const aRate = aAttempts > 0 ? (a.goal_kick_successes || 0) / aAttempts : 0;
                  const bRate = bAttempts > 0 ? (b.goal_kick_successes || 0) / bAttempts : 0;
                  return bRate - aRate;
                })
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
                        <div className="text-white font-bold">
                          {p.first_name} {p.last_name}
                          {isCurrentKicker && <span className="text-green-400 ml-2">✓</span>}
                        </div>
                        <div className="text-sm text-gray-400">{p.position} • Age {p.age}</div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${stats.color}`}>{stats.rate}</span>
                      </div>
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