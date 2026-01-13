'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MatchPage() {
  const params = useParams();
  const fixtureId = params.id as string;

  const [fixture, setFixture] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [homeStats, setHomeStats] = useState<any[]>([]);
  const [awayStats, setAwayStats] = useState<any[]>([]);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [motmPlayer, setMotmPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      const { data: fixtureData } = await supabase
        .from('fixtures')
        .select('*')
        .eq('id', fixtureId)
        .single();

      if (!fixtureData) {
        setLoading(false);
        return;
      }

      setFixture(fixtureData);

      const { data: home } = await supabase
        .from('teams')
        .select('*')
        .eq('id', fixtureData.home_team_id)
        .single();

      const { data: away } = await supabase
        .from('teams')
        .select('*')
        .eq('id', fixtureData.away_team_id)
        .single();

      setHomeTeam(home);
      setAwayTeam(away);

      // Get match result for official score and MOTM
      const { data: result } = await supabase
        .from('match_results')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single();

      if (result) {
        setMatchResult(result);
        
        // Get MOTM player details
        if (result.motm_player_id) {
          const { data: motm } = await supabase
            .from('players')
            .select('first_name, last_name, position, team_id')
            .eq('id', result.motm_player_id)
            .single();
          setMotmPlayer(motm);
        }
      }

      const { data: playerStats } = await supabase
        .from('player_match_stats')
        .select('*')
        .eq('fixture_id', fixtureId)
        .order('jersey_number', { ascending: true });

      if (playerStats) {
        const homePlayerStats = playerStats.filter((p) => p.team_id === fixtureData.home_team_id);
        const awayPlayerStats = playerStats.filter((p) => p.team_id === fixtureData.away_team_id);
        
        setHomeStats(homePlayerStats);
        setAwayStats(awayPlayerStats);
      }

      setLoading(false);
    }

    fetchMatch();
  }, [fixtureId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading match...</div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Match not found</div>
      </div>
    );
  }

  const homeScore = matchResult?.home_score || 0;
  const awayScore = matchResult?.away_score || 0;
  const motmTeamName = motmPlayer?.team_id === homeTeam?.id ? homeTeam?.name : awayTeam?.name;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto p-6">
        <Link
          href="/clubhouse"
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Back to Clubhouse
        </Link>

        {/* Score Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <p className="text-center text-gray-400 text-sm mb-2">
            Round {fixture.round}
          </p>
          <div className="flex items-center justify-center gap-8">
            <div className="text-right flex-1">
              <p className="text-xl font-bold">{homeTeam?.name}</p>
            </div>
            <div className="text-center">
              <span className="text-4xl font-bold">
                {homeScore} - {awayScore}
              </span>
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-bold">{awayTeam?.name}</p>
            </div>
          </div>
          
          {/* MOTM */}
          {motmPlayer && (
            <div className="text-center mt-4 pt-4 border-t border-gray-700">
              <span className="text-yellow-500">⭐ Man of the Match</span>
              <p className="text-white font-semibold">
                {motmPlayer.first_name} {motmPlayer.last_name} ({motmPlayer.position}) — {motmTeamName}
              </p>
            </div>
          )}
        </div>

        {/* Stats Tables */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-3 text-lg">{homeTeam?.name}</h3>
            <StatsTable stats={homeStats} />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-3 text-lg">{awayTeam?.name}</h3>
            <StatsTable stats={awayStats} />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 text-center text-xs text-gray-500">
          MIN = Minutes | MTR = Metres | TRY = Tries | GL = Goals | TKL = Tackles | MT = Missed Tackles | ERR = Errors | PTS = Points
        </div>
      </div>
    </div>
  );
}

function StatsTable({ stats }: { stats: any[] }) {
  if (!stats.length) {
    return <p className="text-gray-400 text-sm">No stats available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left text-xs">
            <th className="pb-2 pr-2">#</th>
            <th className="pb-2 pr-2">Player</th>
            <th className="pb-2 pr-1 text-center">MIN</th>
            <th className="pb-2 pr-1 text-center">MTR</th>
            <th className="pb-2 pr-1 text-center">TRY</th>
            <th className="pb-2 pr-1 text-center">GL</th>
            <th className="pb-2 pr-1 text-center">TKL</th>
            <th className="pb-2 pr-1 text-center">MT</th>
            <th className="pb-2 pr-1 text-center">ERR</th>
            <th className="pb-2 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.id} className="border-t border-gray-700">
              <td className="py-2 pr-2 text-gray-500">{stat.jersey_number}</td>
              <td className="py-2 pr-2 font-medium">{stat.player_name}</td>
              <td className="py-2 pr-1 text-center text-gray-400">{stat.minutes_played || 0}</td>
              <td className="py-2 pr-1 text-center">{stat.metres || 0}</td>
              <td className="py-2 pr-1 text-center text-green-400">{stat.tries || 0}</td>
              <td className="py-2 pr-1 text-center text-blue-400">{stat.goals_made || 0}</td>
              <td className="py-2 pr-1 text-center">{stat.tackles || 0}</td>
              <td className="py-2 pr-1 text-center text-red-400">{stat.missed_tackles || 0}</td>
              <td className="py-2 pr-1 text-center text-orange-400">{stat.errors || 0}</td>
              <td className="py-2 text-center font-bold text-yellow-400">{stat.points || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}