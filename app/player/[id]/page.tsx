'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
  potential: number;
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  fatigue: number;
  team_id: string | null;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  division: number;
}

interface MatchStat {
  id: string;
  fixture_id: string;
  jersey_number: number;
  rating: number;
  minutes_played: number;
  metres: number;
  tries: number;
  try_assists: number;
  goals_made: number;
  tackles: number;
  missed_tackles: number;
  errors: number;
  line_breaks: number;
  tackle_breaks: number;
  points: number;
  fixtures?: {
    round: number;
    season: number;
    home_team_id: string;
    away_team_id: string;
  };
}

interface SeasonTotals {
  games: number;
  points: number;
  tries: number;
  tryAssists: number;
  goals: number;
  metres: number;
  tackles: number;
  missedTackles: number;
  errors: number;
  lineBreaks: number;
  tackleBreaks: number;
  avgRating: number;
  motmAwards: number;
}

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchStat[]>([]);
  const [seasonTotals, setSeasonTotals] = useState<SeasonTotals | null>(null);
  const [teamsMap, setTeamsMap] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayer() {
      // Get current user's team
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: coach } = await supabase
          .from('coaches')
          .select('team_id')
          .eq('user_id', user.id)
          .single();
        if (coach) {
          setMyTeamId(coach.team_id);
        }
      }

      // Get player
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (!playerData) {
        setLoading(false);
        return;
      }

      setPlayer(playerData);

      // Get team if player has one
      if (playerData.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', playerData.team_id)
          .single();
        setTeam(teamData);
      }

      // Get all teams for match history display
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name, primary_color, division');
      
      const tMap: Record<string, Team> = {};
      allTeams?.forEach(t => { tMap[t.id] = t; });
      setTeamsMap(tMap);

      // Get match history with fixture info
      const { data: stats } = await supabase
        .from('player_match_stats')
        .select('*, fixtures(round, season, home_team_id, away_team_id)')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(10);

      setMatchHistory(stats || []);

      // Calculate season totals
      if (stats && stats.length > 0) {
        const totals: SeasonTotals = {
          games: stats.length,
          points: 0,
          tries: 0,
          tryAssists: 0,
          goals: 0,
          metres: 0,
          tackles: 0,
          missedTackles: 0,
          errors: 0,
          lineBreaks: 0,
          tackleBreaks: 0,
          avgRating: 0,
          motmAwards: 0
        };

        let totalRating = 0;
        for (const stat of stats) {
          totals.points += stat.points || 0;
          totals.tries += stat.tries || 0;
          totals.tryAssists += stat.try_assists || 0;
          totals.goals += stat.goals_made || 0;
          totals.metres += stat.metres || 0;
          totals.tackles += stat.tackles || 0;
          totals.missedTackles += stat.missed_tackles || 0;
          totals.errors += stat.errors || 0;
          totals.lineBreaks += stat.line_breaks || 0;
          totals.tackleBreaks += stat.tackle_breaks || 0;
          totalRating += stat.rating || 6;
        }
        totals.avgRating = Math.round((totalRating / stats.length) * 10) / 10;

        // Get MOTM count
        const { count } = await supabase
          .from('match_results')
          .select('*', { count: 'exact', head: true })
          .eq('motm_player_id', playerId);
        
        totals.motmAwards = count || 0;

        setSeasonTotals(totals);
      }

      setLoading(false);
    }

    fetchPlayer();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading player...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Player not found</div>
      </div>
    );
  }

  // Check if this is the current user's player
  const isMyPlayer = player.team_id === myTeamId;
  const isFreeAgent = !player.team_id;

  // Calculate form trend from last 3 matches
  const recentRatings = matchHistory.slice(0, 3).map(m => m.rating || 6);
  const formTrend = getFormTrend(recentRatings);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Back
        </button>

        {/* Player Header Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {player.first_name} {player.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-400">{player.position}</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">Age {player.age}</span>
                {team && (
                  <>
                    <span className="text-gray-600">•</span>
                    {isMyPlayer ? (
                      <Link 
                        href="/clubhouse/squad"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {team.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">{team.name}</span>
                    )}
                    <span className="text-gray-500 text-sm">Div {team.division}</span>
                  </>
                )}
                {isFreeAgent && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-orange-400">Free Agent</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-yellow-400">{player.overall}</div>
              <div className="text-gray-400 text-sm">OVR</div>
            </div>
          </div>

          {/* Fatigue Bar - Only show for your players */}
          {isMyPlayer && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Fatigue</span>
                <span className={player.fatigue > 70 ? 'text-red-400' : player.fatigue > 40 ? 'text-yellow-400' : 'text-green-400'}>
                  {player.fatigue || 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    player.fatigue > 70 ? 'bg-red-500' : player.fatigue > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${player.fatigue || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid - Show for your players OR free agents */}
{(isMyPlayer || isFreeAgent) ? (
  <div className="bg-gray-800 rounded-lg p-6 mb-6">
    <h2 className="text-lg font-bold mb-4">Player Attributes</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatBar label="Speed" value={player.speed} icon="⚡" />
      <StatBar label="Strength" value={player.strength} icon="💪" />
      <StatBar label="Power" value={player.power} icon="💥" />
      <StatBar label="Passing" value={player.passing} icon="🎯" />
      <StatBar label="Stamina" value={player.stamina} icon="🫁" />
      <StatBar label="Tackling" value={player.tackling} icon="🛡️" />
      <StatBar label="Kicking" value={player.kicking} icon="🦶" />
    </div>
  </div>
) : (
  <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center gap-3">
    <span className="text-2xl">🔒</span>
    <p className="text-gray-400 text-sm">Player attributes are private</p>
  </div>
)}

        {/* Season Stats - Public info (match stats are public) */}
        {seasonTotals && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Season Stats</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Form:</span>
                <span className={`text-lg ${
                  formTrend === '↑' ? 'text-green-400' : 
                  formTrend === '↓' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {formTrend}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <SeasonStat label="Games" value={seasonTotals.games} />
              <SeasonStat label="Avg Rating" value={seasonTotals.avgRating.toFixed(1)} highlight />
              <SeasonStat label="MOTM" value={seasonTotals.motmAwards} icon="⭐" />
              <SeasonStat label="Points" value={seasonTotals.points} />
              <SeasonStat label="Tries" value={seasonTotals.tries} />
              <SeasonStat label="Try Assists" value={seasonTotals.tryAssists} />
              <SeasonStat label="Metres" value={seasonTotals.metres} />
              <SeasonStat label="Line Breaks" value={seasonTotals.lineBreaks} />
              <SeasonStat label="Tackle Breaks" value={seasonTotals.tackleBreaks} />
              <SeasonStat label="Tackles" value={seasonTotals.tackles} />
              <SeasonStat label="Missed Tkl" value={seasonTotals.missedTackles} negative />
              <SeasonStat label="Errors" value={seasonTotals.errors} negative />
            </div>
          </div>
        )}

        {/* Match History - Public info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Recent Matches</h2>
          
          {matchHistory.length === 0 ? (
            <p className="text-gray-500">No matches played yet</p>
          ) : (
            <div className="space-y-3">
              {matchHistory.map((match) => {
                const fixture = match.fixtures;
                if (!fixture) return null;

                const homeTeam = teamsMap[fixture.home_team_id];
                const awayTeam = teamsMap[fixture.away_team_id];
                const rating = Math.round(match.rating || 6);

                return (
                  <Link
                    key={match.id}
                    href={`/clubhouse/match/${match.fixture_id}`}
                    className="block bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">
                          Round {fixture.round}
                        </div>
                        <div className="font-medium">
                          {homeTeam?.name || 'Unknown'} vs {awayTeam?.name || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRatingColor(rating)}`}>
                          {rating}
                        </div>
                        <div className="text-xs text-gray-400">rating</div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-gray-400">
                      <span>{match.metres}m</span>
                      <span>{match.tackles} tkl</span>
                      {match.tries > 0 && <span className="text-green-400">{match.tries} try</span>}
                      {match.try_assists > 0 && <span className="text-teal-400">{match.try_assists} ast</span>}
                      {match.goals_made > 0 && <span className="text-blue-400">{match.goals_made} gl</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, icon }: { label: string; value: number; icon: string }) {
  const tier = getStatTier(value);
  const tierLabel = getTierLabel(tier);
  const barWidth = (value / 99) * 100;
  
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{icon} {label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${getTierColor(tier)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className={`text-xs mt-1 ${getTierTextColor(tier)}`}>{tierLabel}</div>
    </div>
  );
}

function SeasonStat({ 
  label, 
  value, 
  icon, 
  highlight = false,
  negative = false 
}: { 
  label: string; 
  value: number | string; 
  icon?: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${
        highlight ? 'text-yellow-400' : 
        negative ? 'text-red-400' : 'text-white'
      }`}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function getStatTier(value: number): number {
  if (value >= 88) return 8;
  if (value >= 75) return 7;
  if (value >= 63) return 6;
  if (value >= 50) return 5;
  if (value >= 38) return 4;
  if (value >= 25) return 3;
  if (value >= 13) return 2;
  return 1;
}

function getTierLabel(tier: number): string {
  const labels = ['', 'NONE', 'POOR', 'OK', 'GOOD', 'GREAT', 'EXCELLENT', 'ELITE', 'LEGEND'];
  return labels[tier] || '';
}

function getTierColor(tier: number): string {
  const colors = [
    '', 
    'bg-gray-500',      // 1 - NONE
    'bg-red-500',       // 2 - POOR
    'bg-orange-500',    // 3 - OK
    'bg-yellow-500',    // 4 - GOOD
    'bg-lime-500',      // 5 - GREAT
    'bg-green-500',     // 6 - EXCELLENT
    'bg-blue-500',      // 7 - ELITE
    'bg-purple-500'     // 8 - LEGEND
  ];
  return colors[tier] || 'bg-gray-500';
}

function getTierTextColor(tier: number): string {
  const colors = [
    '', 
    'text-gray-500',    // 1 - NONE
    'text-red-400',     // 2 - POOR
    'text-orange-400',  // 3 - OK
    'text-yellow-400',  // 4 - GOOD
    'text-lime-400',    // 5 - GREAT
    'text-green-400',   // 6 - EXCELLENT
    'text-blue-400',    // 7 - ELITE
    'text-purple-400'   // 8 - LEGEND
  ];
  return colors[tier] || 'text-gray-500';
}

function getRatingColor(rating: number): string {
  if (rating >= 9) return 'text-purple-400';
  if (rating >= 8) return 'text-green-400';
  if (rating >= 7) return 'text-lime-400';
  if (rating >= 6) return 'text-yellow-400';
  if (rating >= 5) return 'text-orange-400';
  return 'text-red-400';
}

function getFormTrend(ratings: number[]): string {
  if (ratings.length < 2) return '→';
  
  const recent = ratings[0];
  const previous = ratings.slice(1).reduce((a, b) => a + b, 0) / (ratings.length - 1);
  
  if (recent > previous + 0.5) return '↑';
  if (recent < previous - 0.5) return '↓';
  return '→';
}
