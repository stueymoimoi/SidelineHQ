'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Team {
  id: string;
  name: string;
  city: string;
  primary_color: string;
  secondary_color: string;
}

interface MatchResult {
  id: string;
  fixture_id: string;
  home_score: number;
  away_score: number;
  home_team_id: string;
  away_team_id: string;
  motm_player_id: string | null;
  motm_reason: string | null;
}

interface PlayerStats {
  id: string;
  fixture_id: string;
  player_id: string;
  team_id: string;
  jersey_number: number;
  player_name: string;
  ovr: number;
  points: number;
  tries: number;
  goals_made: number;
  goals_attempted: number;
  metres: number;
  tackles: number;
  missed_tackles: number;
  errors: number;
  minutes_played: number;
  rating: number;
}

interface Fixture {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  season: number;
  played: boolean;
}

type SortKey = 'jersey_number' | 'rating' | 'metres' | 'tackles' | 'tries' | 'points' | 'errors';

export default function MatchCentrePage() {
  const [loading, setLoading] = useState(true);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homeStats, setHomeStats] = useState<PlayerStats[]>([]);
  const [awayStats, setAwayStats] = useState<PlayerStats[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('jersey_number');
  const [sortAsc, setSortAsc] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  
  const router = useRouter();
  const params = useParams();
  const fixtureId = params.fixtureId as string;

  useEffect(() => {
    loadData();
  }, [fixtureId]);

  const loadData = async () => {
    try {
      // Get fixture
      const { data: fixtureData } = await supabase
        .from('fixtures')
        .select('*')
        .eq('id', fixtureId)
        .single();

      if (!fixtureData) {
        router.push('/clubhouse/fixtures');
        return;
      }

      setFixture(fixtureData);

      // Get match result
      const { data: resultData } = await supabase
        .from('match_results')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single();

      setResult(resultData);

      // Get teams
      const { data: homeTeamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', fixtureData.home_team_id)
        .single();

      const { data: awayTeamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', fixtureData.away_team_id)
        .single();

      setHomeTeam(homeTeamData);
      setAwayTeam(awayTeamData);

      // Get player stats
      const { data: statsData } = await supabase
        .from('player_match_stats')
        .select('*')
        .eq('fixture_id', fixtureId);

      const home = (statsData || []).filter(s => s.team_id === fixtureData.home_team_id);
      const away = (statsData || []).filter(s => s.team_id === fixtureData.away_team_id);

      setHomeStats(home);
      setAwayStats(away);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'jersey_number'); // Default asc for jersey, desc for stats
    }
  };

  const sortStats = (stats: PlayerStats[]) => {
    return [...stats].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortAsc) return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-yellow-400 bg-yellow-500/20';
    if (rating >= 7) return 'text-green-400 bg-green-500/20';
    if (rating >= 6) return 'text-blue-400 bg-blue-500/20';
    if (rating >= 5) return 'text-gray-300 bg-gray-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getMotmPlayer = (): PlayerStats | null => {
    if (!result?.motm_player_id) return null;
    const allStats = [...homeStats, ...awayStats];
    return allStats.find(s => s.player_id === result.motm_player_id) || null;
  };

  const motmPlayer = getMotmPlayer();

  const SortHeader = ({ label, sortKeyName, className = '' }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <th 
      onClick={() => handleSort(sortKeyName)}
      className={`px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition ${className}`}
    >
      {label}
      {sortKey === sortKeyName && (
        <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
      )}
    </th>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading match...</div>
      </div>
    );
  }

  if (!fixture || !result) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Match not found</div>
      </div>
    );
  }

  const activeStats = activeTab === 'home' ? sortStats(homeStats) : sortStats(awayStats);
  const activeTeam = activeTab === 'home' ? homeTeam : awayTeam;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse/fixtures" className="text-white/70 hover:text-white mb-4 inline-block">
            ← Back to Fixtures
          </Link>
          
          {/* Score Display */}
          <div className="flex items-center justify-center gap-6 py-6">
            {/* Home Team */}
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-4">
                <div>
                  <p className="text-white font-bold text-xl">{homeTeam?.city}</p>
                  <p className="text-gray-400">{homeTeam?.name}</p>
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ 
                    backgroundColor: homeTeam?.primary_color,
                    color: homeTeam?.secondary_color 
                  }}
                >
                  {homeTeam?.city.substring(0, 3).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-8">
              <div className="text-5xl font-bold text-white">
                {result.home_score} - {result.away_score}
              </div>
              <p className="text-gray-500 mt-2">Round {fixture.round} • Final</p>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ 
                    backgroundColor: awayTeam?.primary_color,
                    color: awayTeam?.secondary_color 
                  }}
                >
                  {awayTeam?.city.substring(0, 3).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold text-xl">{awayTeam?.city}</p>
                  <p className="text-gray-400">{awayTeam?.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* MOTM Banner */}
          {motmPlayer && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-2xl">⭐</span>
                <div className="text-center">
                  <p className="text-yellow-400 text-sm font-medium">Man of the Match</p>
                  <p className="text-white font-bold text-lg">{motmPlayer.player_name}</p>
                  {result.motm_reason && (
                    <p className="text-yellow-400/80 text-sm">{result.motm_reason}</p>
                  )}
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Team Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'home'
                ? 'text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={activeTab === 'home' ? { backgroundColor: homeTeam?.primary_color } : {}}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ 
                backgroundColor: activeTab === 'home' ? homeTeam?.secondary_color : homeTeam?.primary_color,
                color: activeTab === 'home' ? homeTeam?.primary_color : homeTeam?.secondary_color
              }}
            >
              {homeTeam?.city.substring(0, 3).toUpperCase()}
            </div>
            {homeTeam?.city}
            <span className="text-sm opacity-70">({result.home_score})</span>
          </button>
          <button
            onClick={() => setActiveTab('away')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'away'
                ? 'text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={activeTab === 'away' ? { backgroundColor: awayTeam?.primary_color } : {}}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ 
                backgroundColor: activeTab === 'away' ? awayTeam?.secondary_color : awayTeam?.primary_color,
                color: activeTab === 'away' ? awayTeam?.primary_color : awayTeam?.secondary_color
              }}
            >
              {awayTeam?.city.substring(0, 3).toUpperCase()}
            </div>
            {awayTeam?.city}
            <span className="text-sm opacity-70">({result.away_score})</span>
          </button>
        </div>

        {/* Stats Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <SortHeader label="#" sortKeyName="jersey_number" className="w-12" />
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
                  <SortHeader label="Rtg" sortKeyName="rating" />
                  <SortHeader label="Pts" sortKeyName="points" />
                  <SortHeader label="Tries" sortKeyName="tries" />
                  <SortHeader label="Metres" sortKeyName="metres" />
                  <SortHeader label="Tackles" sortKeyName="tackles" />
                  <SortHeader label="Errors" sortKeyName="errors" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {activeStats.map((stat) => {
                  const isMotm = stat.player_id === result.motm_player_id;
                  
                  return (
                    <tr 
                      key={stat.id}
                      className={`${isMotm ? 'bg-yellow-500/10' : 'hover:bg-gray-700/50'} transition`}
                    >
                      <td className="px-2 py-3 text-gray-400 text-sm">{stat.jersey_number}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          {isMotm && <span className="text-yellow-400">⭐</span>}
                          <div>
                            <p className="text-white font-medium">{stat.player_name}</p>
                            <p className="text-gray-500 text-xs">{stat.minutes_played} mins</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-2 py-1 rounded font-bold text-sm ${getRatingColor(stat.rating)}`}>
                          {stat.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-white">{stat.points}</td>
                      <td className="px-2 py-3">
                        <span className={stat.tries > 0 ? 'text-green-400 font-bold' : 'text-gray-400'}>
                          {stat.tries}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <span className={stat.metres >= 150 ? 'text-green-400' : stat.metres >= 100 ? 'text-white' : 'text-gray-400'}>
                          {stat.metres}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <span className={stat.tackles >= 30 ? 'text-green-400' : 'text-white'}>
                            {stat.tackles}
                          </span>
                          {stat.missed_tackles > 0 && (
                            <span className="text-red-400 text-xs">({stat.missed_tackles})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className={stat.errors > 2 ? 'text-red-400' : stat.errors > 0 ? 'text-orange-400' : 'text-gray-500'}>
                          {stat.errors}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Totals */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Team Totals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Total Metres</p>
              <p className="text-white text-2xl font-bold">
                {activeStats.reduce((sum, s) => sum + s.metres, 0)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Total Tackles</p>
              <p className="text-white text-2xl font-bold">
                {activeStats.reduce((sum, s) => sum + s.tackles, 0)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Tries</p>
              <p className="text-white text-2xl font-bold">
                {activeStats.reduce((sum, s) => sum + s.tries, 0)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs">Errors</p>
              <p className="text-white text-2xl font-bold">
                {activeStats.reduce((sum, s) => sum + s.errors, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Goal Kicking */}
        {activeStats.some(s => s.goals_attempted > 0) && (
          <div className="mt-6 bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">Goal Kicking</h3>
            <div className="space-y-2">
              {activeStats
                .filter(s => s.goals_attempted > 0)
                .map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                    <span className="text-white">{s.player_name}</span>
                    <span className={`font-bold ${s.goals_made === s.goals_attempted ? 'text-green-400' : 'text-yellow-400'}`}>
                      {s.goals_made}/{s.goals_attempted}
                      <span className="text-gray-500 text-sm ml-2">
                        ({Math.round((s.goals_made / s.goals_attempted) * 100)}%)
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}