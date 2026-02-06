'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PlayerLink from '@/components/PlayerLink';

const supabase = createBrowserClient();

export default function OriginMatchPage() {
  const params = useParams();
  const fixtureId = params.id as string;

  const [originFixture, setOriginFixture] = useState<any>(null);
  const [nswStats, setNswStats] = useState<any[]>([]);
  const [qldStats, setQldStats] = useState<any[]>([]);
  const [motmPlayer, setMotmPlayer] = useState<any>(null);
  const [seriesStatus, setSeriesStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      // Fetch Origin fixture
      const { data: fixture } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('id', fixtureId)
        .single();

      if (!fixture) {
        setLoading(false);
        return;
      }

      setOriginFixture(fixture);

      // Fetch MOTM player
      if (fixture.motm_player_id) {
        const { data: motm } = await supabase
          .from('players')
          .select('id, first_name, last_name, position, team_id')
          .eq('id', fixture.motm_player_id)
          .single();
        setMotmPlayer(motm);
      }

      // Fetch player stats
      const { data: playerStats } = await supabase
        .from('origin_player_stats')
        .select('*')
        .eq('origin_fixture_id', fixtureId)
        .order('jersey_number', { ascending: true });

      if (playerStats) {
        const nsw = playerStats.filter((p) => p.team === 'NSW');
        const qld = playerStats.filter((p) => p.team === 'QLD');
        setNswStats(nsw);
        setQldStats(qld);
      }

      // Fetch series status
      const { data: series } = await supabase
        .from('origin_series')
        .select('*')
        .eq('season', fixture.season)
        .single();

      if (series) {
        setSeriesStatus(series);
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

  if (!originFixture) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Origin match not found</div>
      </div>
    );
  }

  const nswScore = originFixture.home_team === 'NSW' ? originFixture.home_score : originFixture.away_score;
  const qldScore = originFixture.home_team === 'QLD' ? originFixture.home_score : originFixture.away_score;
  const winner = nswScore > qldScore ? 'NSW' : qldScore > nswScore ? 'QLD' : null;

  const nswAvgRating = nswStats.length > 0
    ? (nswStats.reduce((sum, p) => sum + (p.rating || 6), 0) / nswStats.length).toFixed(1)
    : '0';
  const qldAvgRating = qldStats.length > 0
    ? (qldStats.reduce((sum, p) => sum + (p.rating || 6), 0) / qldStats.length).toFixed(1)
    : '0';

  const motmTeam = motmPlayer ? (nswStats.find(p => p.player_id === motmPlayer.id) ? 'NSW' : 'QLD') : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <Link
          href="/clubhouse/fixtures"
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Back to Fixtures
        </Link>

        {/* Score Header */}
        <div className="bg-gradient-to-r from-blue-900 via-gray-800 to-red-900 rounded-lg p-6 mb-6">
          <p className="text-center text-gray-300 text-sm mb-2">
            🏉 State of Origin — Game {originFixture.game_number}
          </p>
          <p className="text-center text-gray-400 text-xs mb-4">
            {originFixture.venue}
          </p>
          
          <div className="flex items-center justify-center gap-4 md:gap-12">
            {/* NSW */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-white">NSW</span>
              </div>
              <p className="text-blue-400 font-bold text-lg">Blues</p>
              <p className="text-gray-400 text-sm">Avg Rating: {nswAvgRating}</p>
            </div>

            {/* Score */}
            <div className="text-center">
              <span className={`text-5xl md:text-6xl font-bold ${winner === 'NSW' ? 'text-blue-400' : 'text-gray-400'}`}>
                {nswScore}
              </span>
              <span className="text-3xl md:text-4xl text-gray-500 mx-2">-</span>
              <span className={`text-5xl md:text-6xl font-bold ${winner === 'QLD' ? 'text-red-400' : 'text-gray-400'}`}>
                {qldScore}
              </span>
              {winner && (
                <p className={`text-sm mt-2 ${winner === 'NSW' ? 'text-blue-400' : 'text-red-400'}`}>
                  {winner} wins!
                </p>
              )}
            </div>

            {/* QLD */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto bg-red-700 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-white">QLD</span>
              </div>
              <p className="text-red-400 font-bold text-lg">Maroons</p>
              <p className="text-gray-400 text-sm">Avg Rating: {qldAvgRating}</p>
            </div>
          </div>

          {/* MOTM */}
          {motmPlayer && (
            <div className="text-center mt-6 pt-4 border-t border-gray-700">
              <span className="text-yellow-500">⭐ Man of the Match</span>
              <p className="text-white font-semibold mt-1">
                <PlayerLink
                  playerId={motmPlayer.id}
                  playerName={`${motmPlayer.first_name} ${motmPlayer.last_name}`}
                />
                <span className="text-gray-400"> ({motmPlayer.position}) — {motmTeam}</span>
              </p>
              {originFixture.motm_reason && (
                <p className="text-gray-400 text-sm mt-1">{originFixture.motm_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Series Status */}
        {seriesStatus && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-center text-gray-400 text-sm mb-3">Series Status</h3>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-blue-400 font-bold text-2xl">{seriesStatus.nsw_wins}</p>
                <p className="text-gray-400 text-sm">NSW</p>
              </div>
              <div className="text-gray-600">-</div>
              <div className="text-center">
                <p className="text-red-400 font-bold text-2xl">{seriesStatus.qld_wins}</p>
                <p className="text-gray-400 text-sm">QLD</p>
              </div>
            </div>
            {seriesStatus.series_winner && (
              <p className={`text-center mt-3 font-bold ${seriesStatus.series_winner === 'NSW' ? 'text-blue-400' : 'text-red-400'}`}>
                🏆 {seriesStatus.series_winner} wins the series!
              </p>
            )}
          </div>
        )}

        {/* Stats Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* NSW Stats */}
          <div className="bg-gray-800 rounded-lg p-4 border-t-4 border-blue-600">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">NSW</span>
              </div>
              <h3 className="font-bold text-lg text-blue-400">NSW Blues</h3>
            </div>
            <StatsTable stats={nswStats} motmId={originFixture.motm_player_id} />
          </div>

          {/* QLD Stats */}
          <div className="bg-gray-800 rounded-lg p-4 border-t-4 border-red-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">QLD</span>
              </div>
              <h3 className="font-bold text-lg text-red-400">QLD Maroons</h3>
            </div>
            <StatsTable stats={qldStats} motmId={originFixture.motm_player_id} />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 text-center text-xs text-gray-500">
          RTG = Rating | MIN = Minutes | MTR = Metres | TRY = Tries | TA = Try Assists | GL = Goals | LB = Line Breaks | TB = Tackle Breaks | TKL = Tackles | MT = Missed Tackles | ERR = Errors | PTS = Points
        </div>
      </div>
    </div>
  );
}

function getRatingColor(rating: number): string {
  if (rating >= 9) return 'text-purple-400';
  if (rating >= 8) return 'text-green-400';
  if (rating >= 7) return 'text-lime-400';
  if (rating >= 6) return 'text-yellow-400';
  if (rating >= 5) return 'text-orange-400';
  return 'text-red-400';
}

function StatsTable({ stats, motmId }: { stats: any[], motmId?: string }) {
  if (!stats.length) {
    return <p className="text-gray-400 text-sm">No stats available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left text-xs">
            <th className="pb-2 pr-1">#</th>
            <th className="pb-2 pr-1">Player</th>
            <th className="pb-2 pr-1 text-center">RTG</th>
            <th className="pb-2 pr-1 text-center">MIN</th>
            <th className="pb-2 pr-1 text-center">MTR</th>
            <th className="pb-2 pr-1 text-center">TRY</th>
            <th className="pb-2 pr-1 text-center">TA</th>
            <th className="pb-2 pr-1 text-center">GL</th>
            <th className="pb-2 pr-1 text-center">LB</th>
            <th className="pb-2 pr-1 text-center">TB</th>
            <th className="pb-2 pr-1 text-center">TKL</th>
            <th className="pb-2 pr-1 text-center">MT</th>
            <th className="pb-2 pr-1 text-center">ERR</th>
            <th className="pb-2 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => {
            const isMotm = stat.player_id === motmId;
            const rating = Math.round(stat.rating || 6);
            return (
              <tr key={stat.id} className={`border-t border-gray-700 ${isMotm ? 'bg-yellow-900/20' : ''}`}>
                <td className="py-2 pr-1 text-gray-500">{stat.jersey_number}</td>
                <td className="py-2 pr-1 font-medium whitespace-nowrap">
                  <PlayerLink
                    playerId={stat.player_id}
                    playerName={stat.player_name}
                  />
                  {isMotm && <span className="ml-1 text-yellow-500">⭐</span>}
                </td>
                <td className={`py-2 pr-1 text-center font-bold ${getRatingColor(rating)}`}>
                  {rating}
                </td>
                <td className="py-2 pr-1 text-center text-gray-400">{stat.minutes_played || 0}</td>
                <td className="py-2 pr-1 text-center">{stat.metres || 0}</td>
                <td className="py-2 pr-1 text-center text-green-400">{stat.tries || 0}</td>
                <td className="py-2 pr-1 text-center text-teal-400">{stat.try_assists || 0}</td>
                <td className="py-2 pr-1 text-center text-blue-400">{stat.goals_made || 0}</td>
                <td className="py-2 pr-1 text-center text-sky-400">{stat.line_breaks || 0}</td>
                <td className="py-2 pr-1 text-center text-indigo-400">{stat.tackle_breaks || 0}</td>
                <td className="py-2 pr-1 text-center">{stat.tackles || 0}</td>
                <td className="py-2 pr-1 text-center text-red-400">{stat.missed_tackles || 0}</td>
                <td className="py-2 pr-1 text-center text-orange-400">{stat.errors || 0}</td>
                <td className="py-2 text-center font-bold text-yellow-400">{stat.points || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
