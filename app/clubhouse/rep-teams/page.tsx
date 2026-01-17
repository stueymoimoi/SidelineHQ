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

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  match_power: number;
  state: string | null;
  nationality: string | null;
  team_id: string;
  visible_trait: string | null;
  fatigue?: number;
}

interface Team {
  id: string;
  name: string;
  division: number;
}

interface OriginSeries {
  id: string;
  season: number;
  nsw_wins: number;
  qld_wins: number;
  series_winner: 'NSW' | 'QLD' | null;
  series_status: 'scheduled' | 'in_progress' | 'complete';
}

interface OriginFixture {
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
}

// ============================================
// CONSTANTS
// ============================================

const REP_TEAMS = {
  origin: [
    { code: 'NSW', name: 'NSW Blues', color: '#87CEEB', textColor: '#1a1a2e', gradient: 'from-sky-400 to-blue-600' },
    { code: 'QLD', name: 'QLD Maroons', color: '#800020', textColor: '#fff', gradient: 'from-red-800 to-red-950' },
  ],
  international: [
    { code: 'AUS', name: 'Australia', flag: '🇦🇺', color: '#006400', textColor: '#FFD700', gradient: 'from-green-700 to-yellow-500' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', color: '#000000', textColor: '#fff', gradient: 'from-gray-900 to-gray-700' },
    { code: 'Tonga', name: 'Tonga', flag: '🇹🇴', color: '#C10000', textColor: '#fff', gradient: 'from-red-700 to-red-900' },
    { code: 'Samoa', name: 'Samoa', flag: '🇼🇸', color: '#00247D', textColor: '#fff', gradient: 'from-blue-800 to-blue-950' },
    { code: 'Fiji', name: 'Fiji', flag: '🇫🇯', color: '#68BFE5', textColor: '#000', gradient: 'from-sky-400 to-sky-600' },
    { code: 'PNG', name: 'Papua New Guinea', flag: '🇵🇬', color: '#CE1126', textColor: '#FFD100', gradient: 'from-red-600 to-yellow-500' },
    { code: 'England', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#FFFFFF', textColor: '#CE1124', gradient: 'from-white to-gray-200' },
  ]
};

const TRAIT_DISPLAY: Record<string, string> = {
  fiery: 'Fiery', confident: 'Confident', showman: 'Showman',
  composed: 'Composed', clutch: 'Clutch', prodigy: 'Prodigy',
  leader: 'Leader', loyal: 'Loyal',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getOvrColor = (ovr: number): string => {
  if (ovr >= 41) return 'bg-purple-500';
  if (ovr >= 35) return 'bg-green-500';
  if (ovr >= 29) return 'bg-green-600';
  if (ovr >= 23) return 'bg-yellow-500';
  if (ovr >= 17) return 'bg-orange-500';
  return 'bg-red-500';
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function RepTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTab, setSelectedTab] = useState<'origin' | 'origin_u23' | 'international' | 'international_u23'>('origin');
  const [selectedTeam, setSelectedTeam] = useState<string>('NSW');
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [originSeries, setOriginSeries] = useState<OriginSeries | null>(null);
  const [originFixtures, setOriginFixtures] = useState<OriginFixture[]>([]);
  
  const router = useRouter();

  // ============================================
  // DATA LOADING
  // ============================================

  const loadData = useCallback(async () => {
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

      // Fetch ALL players with dynamic batching
      const playerFields = 'id, first_name, last_name, position, age, overall, match_power, state, nationality, team_id, visible_trait, fatigue';
      const batchSize = 1000;
      let allPlayersData: Player[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('players')
          .select(playerFields)
          .not('team_id', 'is', null)
          .range(offset, offset + batchSize - 1);

        if (error) break;
        if (data && data.length > 0) {
          allPlayersData = [...allPlayersData, ...data];
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, division');

      // Fetch Origin series data (if exists)
      const { data: seriesData } = await supabase
        .from('origin_series')
        .select('*')
        .eq('season', 0)
        .single();

      // Fetch Origin fixtures (if exists)
      const { data: fixturesData } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('season', 0)
        .order('game_number', { ascending: true });

      setAllPlayers(allPlayersData);
      setAllTeams(teamsData || []);
      setOriginSeries(seriesData || null);
      setOriginFixtures(fixturesData || []);

    } catch (err) {
      console.error('Error loading rep teams data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // MEMOIZED DATA
  // ============================================

  const teamMap = useMemo(() => new Map(allTeams.map(t => [t.id, t])), [allTeams]);
  const getTeamName = useCallback((teamId: string): string => teamMap.get(teamId)?.name || 'Unknown', [teamMap]);

  // ============================================
  // SQUAD BUILDING LOGIC
  // ============================================

  const selectBestForPosition = useCallback((
    eligible: Player[], 
    position: string, 
    count: number, 
    excludeIds: Set<string>
  ): Player[] => {
    return eligible
      .filter(p => p.position === position && !excludeIds.has(p.id))
      .sort((a, b) => (b.match_power || b.overall) - (a.match_power || a.overall))
      .slice(0, count);
  }, []);

  const buildSquad = useCallback((eligiblePlayers: Player[]) => {
    const squad: Record<string, Player | null> = {
      fullback: null, winger_l: null, winger_r: null, centre_l: null, centre_r: null,
      five_eighth: null, halfback: null, prop_l: null, prop_r: null, hooker: null,
      second_row_l: null, second_row_r: null, lock: null,
      bench_1: null, bench_2: null, bench_3: null, bench_4: null,
    };
    
    const selectedIds = new Set<string>();
    
    // Starting 13
    const positions = [
      { key: 'fullback', pos: 'Fullback', count: 1 },
      { key: 'winger_l', pos: 'Winger', count: 1 },
      { key: 'winger_r', pos: 'Winger', count: 1 },
      { key: 'centre_l', pos: 'Centre', count: 1 },
      { key: 'centre_r', pos: 'Centre', count: 1 },
      { key: 'five_eighth', pos: 'Five-Eighth', count: 1 },
      { key: 'halfback', pos: 'Halfback', count: 1 },
      { key: 'prop_l', pos: 'Prop', count: 1 },
      { key: 'hooker', pos: 'Hooker', count: 1 },
      { key: 'prop_r', pos: 'Prop', count: 1 },
      { key: 'second_row_l', pos: 'Second Row', count: 1 },
      { key: 'second_row_r', pos: 'Second Row', count: 1 },
      { key: 'lock', pos: 'Lock', count: 1 },
    ];
    
    for (const { key, pos } of positions) {
      const selected = selectBestForPosition(eligiblePlayers, pos, 1, selectedIds);
      if (selected[0]) {
        squad[key] = selected[0];
        selectedIds.add(selected[0].id);
      }
    }
    
    // Bench
    const benchPositions = [
      { key: 'bench_1', pos: 'Prop' },
      { key: 'bench_2', pos: 'Hooker' },
      { key: 'bench_3', pos: 'Second Row' },
    ];
    
    for (const { key, pos } of benchPositions) {
      const selected = selectBestForPosition(eligiblePlayers, pos, 1, selectedIds);
      if (selected[0]) {
        squad[key] = selected[0];
        selectedIds.add(selected[0].id);
      }
    }
    
    // Last bench spot - best remaining player
    const remaining = eligiblePlayers
      .filter(p => !selectedIds.has(p.id))
      .sort((a, b) => (b.match_power || b.overall) - (a.match_power || a.overall));
    if (remaining[0]) {
      squad.bench_4 = remaining[0];
    }
    
    return squad;
  }, [selectBestForPosition]);

  // ============================================
  // SQUAD GETTERS
  // ============================================

  const getOriginSquad = useCallback((stateCode: string, u23Only: boolean = false) => {
    let eligible = allPlayers.filter(p => p.state === stateCode);
    if (u23Only) eligible = eligible.filter(p => p.age <= 23);
    return buildSquad(eligible);
  }, [allPlayers, buildSquad]);

  const getInternationalSquad = useCallback((countryCode: string, u23Only: boolean = false) => {
    let eligible: Player[];
    
    if (countryCode === 'AUS') {
      // Australians: NSW, QLD, or ROA (Rest of Australia)
      eligible = allPlayers.filter(p => p.state && ['NSW', 'QLD', 'ROA'].includes(p.state));
    } else {
      // International: use nationality field
      eligible = allPlayers.filter(p => p.nationality === countryCode);
    }
    
    if (u23Only) eligible = eligible.filter(p => p.age <= 23);
    return buildSquad(eligible);
  }, [allPlayers, buildSquad]);

  const currentSquad = useMemo(() => {
    if (allPlayers.length === 0) {
      return Object.fromEntries([
        'fullback', 'winger_l', 'winger_r', 'centre_l', 'centre_r',
        'five_eighth', 'halfback', 'prop_l', 'prop_r', 'hooker',
        'second_row_l', 'second_row_r', 'lock',
        'bench_1', 'bench_2', 'bench_3', 'bench_4'
      ].map(k => [k, null]));
    }

    if (selectedTab === 'origin') return getOriginSquad(selectedTeam, false);
    if (selectedTab === 'origin_u23') return getOriginSquad(selectedTeam, true);
    if (selectedTab === 'international') return getInternationalSquad(selectedTeam, false);
    return getInternationalSquad(selectedTeam, true);
  }, [selectedTab, selectedTeam, allPlayers.length, getOriginSquad, getInternationalSquad]);

  const availableTeams = useMemo(() => {
    return (selectedTab === 'origin' || selectedTab === 'origin_u23') 
      ? REP_TEAMS.origin 
      : REP_TEAMS.international;
  }, [selectedTab]);

  const teamInfo = useMemo(() => {
    const teams = (selectedTab === 'origin' || selectedTab === 'origin_u23') 
      ? REP_TEAMS.origin 
      : REP_TEAMS.international;
    return teams.find(t => t.code === selectedTeam);
  }, [selectedTab, selectedTeam]);

  const myPlayersInSquad = useMemo(() => {
    return Object.values(currentSquad).filter(p => p && p.team_id === userTeamId).length;
  }, [currentSquad, userTeamId]);

  // ============================================
  // PLAYER CARD COMPONENT (Matches Tactics Page)
  // ============================================

  const PlayerCard = ({ player, label, number }: { player: Player | null; label: string; number: number }) => {
    const isMyPlayer = player?.team_id === userTeamId;
    const traitDisplay = player?.visible_trait ? TRAIT_DISPLAY[player.visible_trait] || player.visible_trait : null;
    
    if (!player) {
      return (
        <div className="bg-gray-800/90 rounded-lg p-2 min-w-[100px] text-center border-2 border-gray-600 border-dashed">
          <div className="text-xs text-gray-400">#{number} {label}</div>
          <div className="text-gray-600 text-sm py-2">—</div>
        </div>
      );
    }
    
    return (
      <Link 
        href={`/player/${player.id}`}
        className={`block bg-gray-800/90 rounded-lg p-2 min-w-[100px] text-center border-2 transition-all hover:bg-gray-700 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 ${
          isMyPlayer ? 'border-yellow-500 ring-2 ring-yellow-500/30' : 'border-gray-600 hover:border-green-500'
        }`}
      >
        <div className="text-xs text-gray-400">
          #{number} {label}
          {isMyPlayer && <span className="text-yellow-500 ml-1">⭐</span>}
        </div>
        <p className="text-white text-xs truncate">{player.first_name}</p>
        <p className="text-white font-bold text-sm truncate">{player.last_name}</p>
        
        <div className="flex justify-center items-center gap-1 mt-1">
          <span className={`${getOvrColor(player.overall)} text-white text-xs px-1.5 py-0.5 rounded font-bold`}>
            {player.overall}
          </span>
        </div>
        
        {traitDisplay && (
          <span className="bg-purple-600/80 text-purple-100 text-[9px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
            {traitDisplay}
          </span>
        )}
        
        <p className="text-gray-500 text-[10px] truncate mt-1">{player.position}</p>
      </Link>
    );
  };

  // ============================================
  // ORIGIN SERIES TRACKER COMPONENT
  // ============================================

  const OriginSeriesTracker = () => {
    if (!originSeries && originFixtures.length === 0) {
      return null;
    }

    const nswWins = originSeries?.nsw_wins || 0;
    const qldWins = originSeries?.qld_wins || 0;
    const seriesWinner = originSeries?.series_winner;

    return (
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <h3 className="text-white font-bold text-lg mb-4 text-center">🏆 State of Origin Series</h3>
        
        {/* Series Score */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={`text-center px-6 py-3 rounded-lg ${seriesWinner === 'NSW' ? 'ring-2 ring-yellow-500' : ''}`}
               style={{ backgroundColor: '#87CEEB', color: '#1a1a2e' }}>
            <p className="font-bold text-lg">NSW</p>
            <p className="text-3xl font-black">{nswWins}</p>
          </div>
          <div className="text-gray-500 text-2xl font-bold">-</div>
          <div className={`text-center px-6 py-3 rounded-lg ${seriesWinner === 'QLD' ? 'ring-2 ring-yellow-500' : ''}`}
               style={{ backgroundColor: '#800020', color: '#fff' }}>
            <p className="font-bold text-lg">QLD</p>
            <p className="text-3xl font-black">{qldWins}</p>
          </div>
        </div>

        {seriesWinner && (
          <p className="text-center text-yellow-400 font-bold mb-4">
            🏆 {seriesWinner === 'NSW' ? 'NSW Blues' : 'QLD Maroons'} win the series!
          </p>
        )}

        {/* Individual Games */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(gameNum => {
            const fixture = originFixtures.find(f => f.game_number === gameNum);
            const isPlayed = fixture?.played;
            
            return (
              <div key={gameNum} className={`text-center p-2 rounded-lg ${isPlayed ? 'bg-gray-700' : 'bg-gray-700/50'}`}>
                <p className="text-xs text-gray-400 mb-1">Game {gameNum}</p>
                {isPlayed && fixture ? (
                  <>
                    <p className="text-white font-bold text-sm">
                      {fixture.home_team} {fixture.home_score} - {fixture.away_score} {fixture.away_team}
                    </p>
                    <p className="text-[10px] text-gray-500">Round {fixture.round}</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm">
                      {fixture ? `${fixture.home_team} vs ${fixture.away_team}` : 'TBD'}
                    </p>
                    <p className="text-[10px] text-gray-500">{fixture ? `Round ${fixture.round}` : ''}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading representative teams...</div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block text-sm">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏅 Representative Teams</h1>
          <p className="text-white/80 mt-1">
            The best players from across all divisions. Click any player to view their full profile.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Origin Series Tracker */}
        {(selectedTab === 'origin' || selectedTab === 'origin_u23') && <OriginSeriesTracker />}
        
        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSelectedTab('origin'); setSelectedTeam('NSW'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'origin' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🏆 State of Origin
          </button>
          <button
            onClick={() => { setSelectedTab('origin_u23'); setSelectedTeam('NSW'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'origin_u23' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌟 Origin U/23
          </button>
          <button
            onClick={() => { setSelectedTab('international'); setSelectedTeam('AUS'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'international' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌏 International
          </button>
          <button
            onClick={() => { setSelectedTab('international_u23'); setSelectedTeam('AUS'); }}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              selectedTab === 'international_u23' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🌟 International U/23
          </button>
        </div>

        {/* Team Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {availableTeams.map((team: any) => (
            <button
              key={team.code}
              onClick={() => setSelectedTeam(team.code)}
              className={`px-4 py-2 rounded-lg font-bold transition border-2 ${
                selectedTeam === team.code ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: team.color, color: team.textColor }}
            >
              {team.flag && <span className="mr-1">{team.flag}</span>}
              {team.name}
            </button>
          ))}
        </div>

        {/* Squad Header */}
        <div 
          className={`rounded-xl p-4 mb-4 bg-gradient-to-r ${teamInfo?.gradient || 'from-gray-700 to-gray-800'}`}
          style={{ color: teamInfo?.textColor || '#fff' }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {(teamInfo as any)?.flag && <span className="mr-2">{(teamInfo as any).flag}</span>}
                {teamInfo?.name || selectedTeam}
                {(selectedTab.includes('u23')) && ' U/23'}
              </h2>
              <p className="opacity-80 text-sm">
                {(selectedTab === 'origin' || selectedTab === 'origin_u23') 
                  ? 'State of Origin • Current Squad' 
                  : 'International Team • Current Squad'}
              </p>
            </div>
            {myPlayersInSquad > 0 && (
              <div className="bg-black/30 rounded-lg px-4 py-2 text-center">
                <p className="text-2xl font-bold">{myPlayersInSquad}</p>
                <p className="text-xs opacity-70">Your Players</p>
              </div>
            )}
          </div>
        </div>

        {/* Football Field Layout - MATCHES TACTICS PAGE */}
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

          {/* Positions Layout - SAME AS TACTICS PAGE */}
          <div className="relative z-10 flex flex-col items-center gap-3 pt-24 pb-24">
            {/* Props & Hooker */}
            <div className="flex justify-center gap-4">
              <PlayerCard player={currentSquad.prop_l} label="PR" number={8} />
              <PlayerCard player={currentSquad.hooker} label="HK" number={9} />
              <PlayerCard player={currentSquad.prop_r} label="PR" number={10} />
            </div>

            {/* Second Row */}
            <div className="flex justify-center gap-24">
              <PlayerCard player={currentSquad.second_row_l} label="2R" number={11} />
              <PlayerCard player={currentSquad.second_row_r} label="2R" number={12} />
            </div>

            {/* Lock */}
            <div className="flex justify-center">
              <PlayerCard player={currentSquad.lock} label="LK" number={13} />
            </div>

            {/* Halfback */}
            <div className="flex justify-center">
              <PlayerCard player={currentSquad.halfback} label="HB" number={7} />
            </div>

            {/* Five-Eighth */}
            <div className="flex justify-center">
              <PlayerCard player={currentSquad.five_eighth} label="FE" number={6} />
            </div>

            {/* Centres */}
            <div className="flex justify-center gap-24">
              <PlayerCard player={currentSquad.centre_l} label="LC" number={3} />
              <PlayerCard player={currentSquad.centre_r} label="RC" number={4} />
            </div>

            {/* Wingers */}
            <div className="flex justify-between w-full max-w-lg px-4">
              <PlayerCard player={currentSquad.winger_l} label="LW" number={2} />
              <PlayerCard player={currentSquad.winger_r} label="RW" number={5} />
            </div>

            {/* Fullback */}
            <div className="flex justify-center">
              <PlayerCard player={currentSquad.fullback} label="FB" number={1} />
            </div>
          </div>
        </div>

        {/* Bench */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3">🪑 Interchange</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            <PlayerCard player={currentSquad.bench_1} label="B" number={14} />
            <PlayerCard player={currentSquad.bench_2} label="B" number={15} />
            <PlayerCard player={currentSquad.bench_3} label="B" number={16} />
            <PlayerCard player={currentSquad.bench_4} label="B" number={17} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-sm mb-6">
          <span className="text-yellow-400 flex items-center gap-1">⭐ Your Player</span>
          <span className="text-blue-400 flex items-center gap-1">🔗 Click to view profile</span>
        </div>

        {/* Info Box */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-bold mb-2">ℹ️ How Representative Selection Works</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Players are selected from <strong className="text-white">all 10 divisions</strong> based on <strong className="text-green-400">positional performance</strong></li>
            <li>• Selection considers overall rating and position-specific attributes</li>
            <li>• <strong className="text-sky-400">State of Origin</strong>: NSW & QLD birthplace only</li>
            <li>• <strong className="text-green-400">International</strong>: Based on birthplace (ROA players eligible for Australia)</li>
            <li>• <strong className="text-purple-400">U/23</strong>: Only players aged 23 or younger</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
