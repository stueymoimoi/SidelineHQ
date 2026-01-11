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

// Position slots for a 17-man squad
const SQUAD_POSITIONS = [
  { pos: 'Fullback', count: 1 },
  { pos: 'Winger', count: 2 },
  { pos: 'Centre', count: 2 },
  { pos: 'Five-Eighth', count: 1 },
  { pos: 'Halfback', count: 1 },
  { pos: 'Prop', count: 2 },
  { pos: 'Hooker', count: 1 },
  { pos: 'Second Row', count: 2 },
  { pos: 'Lock', count: 1 },
  // Bench (4 interchange)
  { pos: 'Prop', count: 1, bench: true },
  { pos: 'Hooker', count: 1, bench: true },
  { pos: 'Second Row', count: 1, bench: true },
  { pos: 'Lock', count: 1, bench: true },
];

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
  const [selectedTab, setSelectedTab] = useState<'origin' | 'national' | 'u23'>('origin');
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

      // Get ALL players from ALL divisions
      const { data: playersData } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, age, overall, match_power, nationality, state, team_id');

      setAllPlayers(playersData || []);

      // Get all teams for display
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

  // Select best players for a position by match_power
  const selectBestForPosition = (eligiblePlayers: Player[], position: string, count: number, excludeIds: Set<string>) => {
    return eligiblePlayers
      .filter(p => p.position === position && !excludeIds.has(p.id))
      .sort((a, b) => b.match_power - a.match_power)
      .slice(0, count);
  };

  // Build a 17-man squad
  const buildSquad = (eligiblePlayers: Player[]) => {
    const squad: Player[] = [];
    const selectedIds = new Set<string>();

    // Starting 13
    SQUAD_POSITIONS.forEach(({ pos, count, bench }) => {
      if (!bench) {
        const selected = selectBestForPosition(eligiblePlayers, pos, count, selectedIds);
        selected.forEach(p => {
          squad.push(p);
          selectedIds.add(p.id);
        });
      }
    });

    // Bench 4 (versatile utility selections)
    SQUAD_POSITIONS.forEach(({ pos, count, bench }) => {
      if (bench) {
        const selected = selectBestForPosition(eligiblePlayers, pos, count, selectedIds);
        selected.forEach(p => {
          squad.push(p);
          selectedIds.add(p.id);
        });
      }
    });

    return squad;
  };

  // Get State of Origin squad
  const getOriginSquad = (stateCode: string) => {
    const eligible = allPlayers.filter(p => p.nationality === 'AUS' && p.state === stateCode);
    return buildSquad(eligible);
  };

  // Get National squad
  const getNationalSquad = (nationalityCode: string) => {
    const eligible = allPlayers.filter(p => p.nationality === nationalityCode);
    return buildSquad(eligible);
  };

  // Get U/23 National squad
  const getU23Squad = (nationalityCode: string) => {
    const eligible = allPlayers.filter(p => p.nationality === nationalityCode && p.age <= 23);
    return buildSquad(eligible);
  };

  // Get team name by ID
  const getTeamName = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown';
  };

  // Get team division by ID
  const getTeamDivision = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
    return team ? team.division : 0;
  };

  const getPositionColor = (position: string) => {
    const colors: Record<string, string> = {
      'Fullback': 'bg-purple-600',
      'Winger': 'bg-blue-600',
      'Centre': 'bg-green-600',
      'Five-Eighth': 'bg-yellow-600',
      'Halfback': 'bg-yellow-500',
      'Prop': 'bg-red-600',
      'Hooker': 'bg-orange-600',
      'Second Row': 'bg-pink-600',
      'Lock': 'bg-red-700',
    };
    return colors[position] || 'bg-gray-600';
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
      return getOriginSquad(selectedTeam);
    } else if (selectedTab === 'national') {
      return getNationalSquad(selectedTeam);
    } else {
      return getU23Squad(selectedTeam);
    }
  };

  // Get available teams for current tab
  const getAvailableTeams = () => {
    if (selectedTab === 'origin') {
      return REP_TEAMS.origin;
    } else {
      return REP_TEAMS.national;
    }
  };

  // Get current team info
  const getCurrentTeamInfo = () => {
    if (selectedTab === 'origin') {
      return REP_TEAMS.origin.find(t => t.code === selectedTeam);
    } else {
      return REP_TEAMS.national.find(t => t.code === selectedTeam);
    }
  };

  const currentSquad = getCurrentSquad();
  const teamInfo = getCurrentTeamInfo();

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
        <div className="flex gap-2 mb-6">
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
            🌟 U/23 Teams
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
              {selectedTab === 'u23' && ' U/23'}
            </button>
          ))}
        </div>

        {/* Squad Display */}
        <div 
          className="rounded-xl p-6 mb-6"
          style={{ 
            backgroundColor: teamInfo?.color || '#333',
            color: teamInfo?.textColor || '#fff'
          }}
        >
          <h2 className="text-2xl font-bold mb-1">
            {(teamInfo as any)?.flag && <span className="mr-2">{(teamInfo as any).flag}</span>}
            {teamInfo?.name || selectedTeam}
            {selectedTab === 'u23' && ' U/23'}
          </h2>
          <p className="opacity-70 mb-4">
            {selectedTab === 'origin' && 'State of Origin Representative Squad'}
            {selectedTab === 'national' && 'Senior National Team'}
            {selectedTab === 'u23' && 'Under 23 National Team'}
          </p>
          
          <p className="text-sm opacity-60">
            Selected from {allPlayers.filter(p => {
              if (selectedTab === 'origin') return p.nationality === 'AUS' && p.state === selectedTeam;
              if (selectedTab === 'u23') return p.nationality === selectedTeam && p.age <= 23;
              return p.nationality === selectedTeam;
            }).length} eligible players across all 10 divisions
          </p>
        </div>

        {/* Squad List */}
        {currentSquad.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">No eligible players found</p>
            <p className="text-gray-500 text-sm mt-2">
              {selectedTab === 'u23' && 'Players must be 23 or younger'}
            </p>
          </div>
        ) : (
          <>
            {/* Starting XIII */}
            <h3 className="text-white font-bold mb-3">Starting XIII</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {currentSquad.slice(0, 13).map((player, index) => {
                const isMyPlayer = player.team_id === userTeamId;
                return (
                  <div 
                    key={player.id}
                    className={`bg-gray-800 rounded-lg p-3 ${isMyPlayer ? 'ring-2 ring-yellow-500' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 text-xs">#{index + 1}</span>
                          <span className={`${getPositionColor(player.position)} text-white text-xs px-2 py-0.5 rounded`}>
                            {player.position}
                          </span>
                          {isMyPlayer && <span className="text-yellow-500 text-xs">⭐ YOUR PLAYER</span>}
                        </div>
                        <p className="text-gray-300 text-sm">{player.first_name}</p>
                        <p className="text-white font-bold">{player.last_name}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {getTeamName(player.team_id)} (Div {getTeamDivision(player.team_id)})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`${getOvrColor(player.overall)} text-white px-2 py-1 rounded font-bold text-sm`}>
                          {player.overall}
                        </span>
                        <p className="text-gray-500 text-xs mt-1">Age {player.age}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bench */}
            {currentSquad.length > 13 && (
              <>
                <h3 className="text-white font-bold mb-3">Bench</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {currentSquad.slice(13).map((player, index) => {
                    const isMyPlayer = player.team_id === userTeamId;
                    return (
                      <div 
                        key={player.id}
                        className={`bg-gray-800 rounded-lg p-3 ${isMyPlayer ? 'ring-2 ring-yellow-500' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-500 text-xs">#{14 + index}</span>
                              <span className={`${getPositionColor(player.position)} text-white text-xs px-2 py-0.5 rounded`}>
                                {player.position}
                              </span>
                            </div>
                            <p className="text-white font-bold text-sm">{player.first_name} {player.last_name}</p>
                            <p className="text-gray-500 text-xs">
                              {getTeamName(player.team_id)}
                            </p>
                            {isMyPlayer && <span className="text-yellow-500 text-xs">⭐ YOURS</span>}
                          </div>
                          <span className={`${getOvrColor(player.overall)} text-white px-2 py-1 rounded font-bold text-sm`}>
                            {player.overall}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="bg-gray-800/50 rounded-lg p-4 mt-6">
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
