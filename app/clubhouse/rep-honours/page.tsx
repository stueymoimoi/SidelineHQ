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
  match_power: number;
  nationality: string;
  state: string | null;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  division: number;
}

const REP_TEAMS = {
  origin: [
    { code: 'NSW', name: 'New South Wales', color: '#87CEEB', textColor: '#000' },
    { code: 'QLD', name: 'Queensland', color: '#800020', textColor: '#fff' },
  ],
  national: [
    { code: 'AUS', name: 'Australia', flag: '🇦🇺', color: '#FFD700', textColor: '#006400' },
    { code: 'NZL', name: 'New Zealand', flag: '🇳🇿', color: '#000000', textColor: '#fff' },
    { code: 'TON', name: 'Tonga', flag: '🇹🇴', color: '#C10000', textColor: '#fff' },
    { code: 'SAM', name: 'Samoa', flag: '🇼🇸', color: '#00247D', textColor: '#fff' },
    { code: 'FIJ', name: 'Fiji', flag: '🇫🇯', color: '#68BFE5', textColor: '#000' },
    { code: 'PNG', name: 'Papua New Guinea', flag: '🇵🇬', color: '#CE1126', textColor: '#FFD100' },
    { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#FFFFFF', textColor: '#CE1124' },
  ]
};

export default function RepHonoursPage() {
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTab, setSelectedTab] = useState<'origin' | 'origin_u23' | 'national' | 'u23'>('origin');
  const [selectedTeam, setSelectedTeam] = useState<string>('NSW');
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  
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

      if (coach?.team_id) {
        setUserTeamId(coach.team_id);
      }

      const { data: playersData } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, age, overall, match_power, nationality, state, team_id');

      setAllPlayers(playersData || []);

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, division');

      setAllTeams(teamsData || []);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Select best player for a position by match_power
  const selectBestForPosition = (eligiblePlayers: Player[], position: string, count: number, excludeIds: Set<string>) => {
    return eligiblePlayers
      .filter(p => p.position === position && !excludeIds.has(p.id))
      .sort((a, b) => b.match_power - a.match_power)
      .slice(0, count);
  };

  // Build a 17-man squad with position mapping
  const buildSquad = (eligiblePlayers: Player[]) => {
    const squad: Record<string, Player | null> = {
      fullback: null,
      winger_l: null,
      winger_r: null,
      centre_l: null,
      centre_r: null,
      five_eighth: null,
      halfback: null,
      prop_l: null,
      prop_r: null,
      hooker: null,
      second_row_l: null,
      second_row_r: null,
      lock: null,
      bench_1: null,
      bench_2: null,
      bench_3: null,
      bench_4: null,
    };
    
    const selectedIds = new Set<string>();

    // Fullback
    const fb = selectBestForPosition(eligiblePlayers, 'Fullback', 1, selectedIds);
    if (fb[0]) { squad.fullback = fb[0]; selectedIds.add(fb[0].id); }

    // Wingers
    const wingers = selectBestForPosition(eligiblePlayers, 'Winger', 2, selectedIds);
    if (wingers[0]) { squad.winger_l = wingers[0]; selectedIds.add(wingers[0].id); }
    if (wingers[1]) { squad.winger_r = wingers[1]; selectedIds.add(wingers[1].id); }

    // Centres
    const centres = selectBestForPosition(eligiblePlayers, 'Centre', 2, selectedIds);
    if (centres[0]) { squad.centre_l = centres[0]; selectedIds.add(centres[0].id); }
    if (centres[1]) { squad.centre_r = centres[1]; selectedIds.add(centres[1].id); }

    // Five-Eighth
    const fe = selectBestForPosition(eligiblePlayers, 'Five-Eighth', 1, selectedIds);
    if (fe[0]) { squad.five_eighth = fe[0]; selectedIds.add(fe[0].id); }

    // Halfback
    const hb = selectBestForPosition(eligiblePlayers, 'Halfback', 1, selectedIds);
    if (hb[0]) { squad.halfback = hb[0]; selectedIds.add(hb[0].id); }

    // Props
    const props = selectBestForPosition(eligiblePlayers, 'Prop', 2, selectedIds);
    if (props[0]) { squad.prop_l = props[0]; selectedIds.add(props[0].id); }
    if (props[1]) { squad.prop_r = props[1]; selectedIds.add(props[1].id); }

    // Hooker
    const hooker = selectBestForPosition(eligiblePlayers, 'Hooker', 1, selectedIds);
    if (hooker[0]) { squad.hooker = hooker[0]; selectedIds.add(hooker[0].id); }

    // Second Row
    const sr = selectBestForPosition(eligiblePlayers, 'Second Row', 2, selectedIds);
    if (sr[0]) { squad.second_row_l = sr[0]; selectedIds.add(sr[0].id); }
    if (sr[1]) { squad.second_row_r = sr[1]; selectedIds.add(sr[1].id); }

    // Lock
    const lock = selectBestForPosition(eligiblePlayers, 'Lock', 1, selectedIds);
    if (lock[0]) { squad.lock = lock[0]; selectedIds.add(lock[0].id); }

    // Bench - get best remaining by position
    const benchProp = selectBestForPosition(eligiblePlayers, 'Prop', 1, selectedIds);
    if (benchProp[0]) { squad.bench_1 = benchProp[0]; selectedIds.add(benchProp[0].id); }

    const benchHooker = selectBestForPosition(eligiblePlayers, 'Hooker', 1, selectedIds);
    if (benchHooker[0]) { squad.bench_2 = benchHooker[0]; selectedIds.add(benchHooker[0].id); }

    const benchSR = selectBestForPosition(eligiblePlayers, 'Second Row', 1, selectedIds);
    if (benchSR[0]) { squad.bench_3 = benchSR[0]; selectedIds.add(benchSR[0].id); }

    // Utility - could be anyone remaining with high match power
    const remaining = eligiblePlayers
      .filter(p => !selectedIds.has(p.id))
      .sort((a, b) => b.match_power - a.match_power);
    if (remaining[0]) { squad.bench_4 = remaining[0]; selectedIds.add(remaining[0].id); }

    return squad;
  };

  // Get State of Origin squad
  const getOriginSquad = (stateCode: string, u23Only: boolean = false) => {
    let eligible = allPlayers.filter(p => p.nationality === 'AUS' && p.state === stateCode);
    if (u23Only) eligible = eligible.filter(p => p.age <= 23);
    return buildSquad(eligible);
  };

  // Get National squad
  const getNationalSquad = (nationalityCode: string, u23Only: boolean = false) => {
    let eligible = allPlayers.filter(p => p.nationality === nationalityCode);
    if (u23Only) eligible = eligible.filter(p => p.age <= 23);
    return buildSquad(eligible);
  };

  // Get team name by ID
  const getTeamName = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown';
  };

  const getTeamDivision = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
    return team ? team.division : 0;
  };

  const getOvrColor = (ovr: number) => {
    if (ovr >= 41) return 'bg-purple-500';
    if (ovr >= 35) return 'bg-green-500';
    if (ovr >= 29) return 'bg-green-600';
    if (ovr >= 23) return 'bg-yellow-500';
    if (ovr >= 17) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Get current squad based on selection
  const getCurrentSquad = () => {
    if (selectedTab === 'origin') {
      return getOriginSquad(selectedTeam, false);
    } else if (selectedTab === 'origin_u23') {
      return getOriginSquad(selectedTeam, true);
    } else if (selectedTab === 'national') {
      return getNationalSquad(selectedTeam, false);
    } else {
      return getNationalSquad(selectedTeam, true);
    }
  };

  // Get available teams for current tab
  const getAvailableTeams = () => {
    if (selectedTab === 'origin' || selectedTab === 'origin_u23') {
      return REP_TEAMS.origin;
    } else {
      return REP_TEAMS.national;
    }
  };

  // Get current team info
  const getCurrentTeamInfo = () => {
    if (selectedTab === 'origin' || selectedTab === 'origin_u23') {
      return REP_TEAMS.origin.find(t => t.code === selectedTeam);
    } else {
      return REP_TEAMS.national.find(t => t.code === selectedTeam);
    }
  };

  // Player slot component for the field
  const PlayerSlot = ({ player, number }: { player: Player | null; number: number }) => {
    if (!player) {
      return (
        <div className="bg-gray-800/70 rounded-lg p-2 min-w-[90px] text-center border-2 border-gray-600">
          <div className="text-xs text-gray-500">#{number}</div>
          <div className="text-gray-600 text-sm">Empty</div>
        </div>
      );
    }

    const isMyPlayer = player.team_id === userTeamId;
    
    return (
      <div className={`bg-gray-800/90 rounded-lg p-2 min-w-[90px] text-center border-2 ${isMyPlayer ? 'border-yellow-500 ring-2 ring-yellow-500/50' : 'border-green-500'}`}>
        <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
          #{number}
          {isMyPlayer && <span className="text-yellow-500">⭐</span>}
        </div>
        <p className="text-white text-xs truncate">{player.first_name}</p>
        <p className="text-white font-bold text-sm truncate">{player.last_name}</p>
        <div className="flex justify-center items-center gap-1 mt-1">
          <span className={`${getOvrColor(player.overall)} text-white text-xs px-1.5 py-0.5 rounded font-bold`}>
            {player.overall}
          </span>
        </div>
        <p className="text-gray-500 text-[10px] truncate mt-1">{getTeamName(player.team_id)}</p>
      </div>
    );
  };

  const currentSquad = getCurrentSquad();
  const teamInfo = getCurrentTeamInfo();

  // Count how many of user's players made the squad
  const myPlayersInSquad = Object.values(currentSquad).filter(p => p && p.team_id === userTeamId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading rep teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-yellow-600 to-yellow-800">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏅 Rep Honours</h1>
          <p className="text-white/80">Representative teams from across all divisions</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        
        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSelectedTab('origin'); setSelectedTeam('NSW'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'origin' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🏆 State of Origin
          </button>
          <button
            onClick={() => { setSelectedTab('origin_u23'); setSelectedTeam('NSW'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'origin_u23' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌟 Origin U/23
          </button>
          <button
            onClick={() => { setSelectedTab('national'); setSelectedTeam('AUS'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'national' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌏 National Teams
          </button>
          <button
            onClick={() => { setSelectedTab('u23'); setSelectedTeam('AUS'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'u23' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌟 National U/23
          </button>
        </div>

        {/* Team Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {getAvailableTeams().map((team: any) => (
            <button
              key={team.code}
              onClick={() => setSelectedTeam(team.code)}
              className={`px-4 py-2 rounded-lg font-bold transition border-2 ${
                selectedTeam === team.code
                  ? 'border-white'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ 
                backgroundColor: team.color, 
                color: team.textColor 
              }}
            >
              {team.flag && <span className="mr-1">{team.flag}</span>}
              {team.name}
            </button>
          ))}
        </div>

        {/* Squad Header */}
        <div 
          className="rounded-xl p-4 mb-4"
          style={{ 
            backgroundColor: teamInfo?.color || '#333',
            color: teamInfo?.textColor || '#fff'
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {(teamInfo as any)?.flag && <span className="mr-2">{(teamInfo as any).flag}</span>}
                {teamInfo?.name || selectedTeam}
                {(selectedTab === 'u23' || selectedTab === 'origin_u23') && ' U/23'}
              </h2>
              <p className="opacity-70 text-sm">
                {(selectedTab === 'origin' || selectedTab === 'origin_u23') && 'State of Origin'}
                {selectedTab === 'national' && 'Senior National Team'}
                {selectedTab === 'u23' && 'Under 23 National Team'}
              </p>
            </div>
            {myPlayersInSquad > 0 && (
              <div className="bg-black/30 rounded-lg px-3 py-2 text-center">
                <p className="text-2xl font-bold">{myPlayersInSquad}</p>
                <p className="text-xs opacity-70">Your Players</p>
              </div>
            )}
          </div>
        </div>

        {/* Football Field Layout */}
        <div 
          className="rounded-xl p-4 mb-6 relative overflow-hidden border-4 border-white/50"
          style={{
            background: 'linear-gradient(to bottom, #2d5a27 0%, #3d7a37 50%, #2d5a27 100%)',
            minHeight: '700px'
          }}
        >
          {/* Top Goalpost */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <div className="absolute -left-10 top-0 w-2 h-16 bg-white shadow-lg"></div>
            <div className="absolute left-8 top-0 w-2 h-16 bg-white shadow-lg"></div>
            <div className="absolute -left-10 top-8 w-[76px] h-2 bg-white shadow-lg"></div>
          </div>
          
          {/* Top Try Line */}
          <div className="absolute top-20 inset-x-0 border-t-4 border-white"></div>

          {/* Field Lines */}
          <div className="absolute top-[30%] inset-x-0 border-t-2 border-white/30"></div>
          <div className="absolute top-1/2 inset-x-0 border-t-2 border-white/50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-2 border-white/30 rounded-full"></div>
          <div className="absolute top-[70%] inset-x-0 border-t-2 border-white/30"></div>

          {/* Bottom Try Line */}
          <div className="absolute bottom-20 inset-x-0 border-t-4 border-white"></div>
          
          {/* Bottom Goalpost */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div className="absolute -left-10 bottom-0 w-2 h-16 bg-white shadow-lg"></div>
            <div className="absolute left-8 bottom-0 w-2 h-16 bg-white shadow-lg"></div>
            <div className="absolute -left-10 bottom-8 w-[76px] h-2 bg-white shadow-lg"></div>
          </div>

          {/* Positions Layout */}
          <div className="relative z-10 flex flex-col items-center gap-2 pt-24 pb-24">
            
            {/* Fullback - #1 */}
            <div className="flex justify-center">
              <PlayerSlot player={currentSquad.fullback} number={1} />
            </div>

            {/* Wingers - #2, #5 */}
            <div className="flex justify-between w-full max-w-lg px-2">
              <PlayerSlot player={currentSquad.winger_l} number={2} />
              <PlayerSlot player={currentSquad.winger_r} number={5} />
            </div>

            {/* Centres - #3, #4 */}
            <div className="flex justify-center gap-16">
              <PlayerSlot player={currentSquad.centre_l} number={3} />
              <PlayerSlot player={currentSquad.centre_r} number={4} />
            </div>

            {/* Five-Eighth - #6 */}
            <div className="flex justify-center">
              <PlayerSlot player={currentSquad.five_eighth} number={6} />
            </div>

            {/* Halfback - #7 */}
            <div className="flex justify-center">
              <PlayerSlot player={currentSquad.halfback} number={7} />
            </div>

            {/* Lock - #13 */}
            <div className="flex justify-center">
              <PlayerSlot player={currentSquad.lock} number={13} />
            </div>

            {/* Second Row - #11, #12 */}
            <div className="flex justify-center gap-16">
              <PlayerSlot player={currentSquad.second_row_l} number={11} />
              <PlayerSlot player={currentSquad.second_row_r} number={12} />
            </div>

            {/* Props & Hooker - #8, #9, #10 */}
            <div className="flex justify-center gap-2">
              <PlayerSlot player={currentSquad.prop_l} number={8} />
              <PlayerSlot player={currentSquad.hooker} number={9} />
              <PlayerSlot player={currentSquad.prop_r} number={10} />
            </div>
          </div>
        </div>

        {/* Bench */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">🪑 Bench</h3>
          <div className="flex justify-center gap-3 flex-wrap">
            <PlayerSlot player={currentSquad.bench_1} number={14} />
            <PlayerSlot player={currentSquad.bench_2} number={15} />
            <PlayerSlot player={currentSquad.bench_3} number={16} />
            <PlayerSlot player={currentSquad.bench_4} number={17} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm mb-6">
          <span className="text-yellow-400">⭐ Your Player</span>
          <span className="text-green-400">● Selected</span>
        </div>

        {/* Info Box */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-white font-bold mb-2">ℹ️ How Rep Selection Works</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Players are selected from <strong>all 10 divisions</strong> based on position fit</li>
            <li>• Selection considers how well a player's stats suit their position</li>
            <li>• A lower OVR player may be selected if they're perfect for their role</li>
            <li>• Your players are highlighted with ⭐ if they make a squad</li>
            <li>• U/23 teams only include players aged 23 or younger</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
