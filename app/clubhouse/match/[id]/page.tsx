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
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      // Get fixture details
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

      // Get team details
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

      // Get player stats for this fixture
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
        
        // Calculate scores from player points
        setHomeScore(homePlayerStats.reduce((sum, p) => sum + (p.points || 0), 0));
        setAwayScore(awayPlayerStats.reduce((sum, p) => sum + (p.points || 0), 0));
      }

      setLoading(false);
    }

    fetchMatch();
  }, [fixtureId]);

  if (loading) {
    return <div className="p-6 text-center">Loading match...</div>;
  }

  if (!fixture) {
    return <div className="p-6 text-center">Match not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
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
          <div className="text-right">
            <p className="text-xl font-bold">{homeTeam?.name}</p>
          </div>
          <div className="text-center">
            <span className="text-4xl font-bold">
              {homeScore} - {awayScore}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold">{awayTeam?.name}</p>
          </div>
        </div>
      </div>

      {/* Stats Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Home Team Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{homeTeam?.name}</h3>
          <StatsTable stats={homeStats} />
        </div>

        {/* Away Team Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{awayTeam?.name}</h3>
          <StatsTable stats={awayStats} />
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
          <tr className="text-gray-400 text-left">
            <th className="pb-2">#</th>
            <th className="pb-2">Player</th>
            <th className="pb-2">M</th>
            <th className="pb-2">T</th>
            <th className="pb-2">MT</th>
            <th className="pb-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.id} className="border-t border-gray-700">
              <td className="py-2">{stat.jersey_number}</td>
              <td className="py-2">{stat.player_name}</td>
              <td className="py-2">{stat.metres}</td>
              <td className="py-2">{stat.tackles}</td>
              <td className="py-2">{stat.missed_tackles}</td>
              <td className="py-2">{stat.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">
        M = Metres, T = Tackles, MT = Missed Tackles
      </p>
    </div>
  );
}