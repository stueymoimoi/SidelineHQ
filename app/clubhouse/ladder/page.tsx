'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamWithCoach {
  id: string;
  name: string;
  city: string;
  primary_color: string;
  secondary_color: string;
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
  coach_name: string | null;
}

export default function LadderPage() {
  const [teams, setTeams] = useState<TeamWithCoach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('division', 1)
        .order('wins', { ascending: false });

      const { data: coaches } = await supabase
        .from('coaches')
        .select('team_id, coach_name');

      const teamsWithCoaches = (teamsData || []).map(team => {
        const coach = coaches?.find(c => c.team_id === team.id);
        return {
          ...team,
          coach_name: coach?.coach_name || null
        };
      });

      // Sort by Pts (W*2 + D), then +/- as tiebreaker
      teamsWithCoaches.sort((a, b) => {
        const ptsA = (a.wins * 2) + a.draws;
        const ptsB = (b.wins * 2) + b.draws;
        if (ptsB !== ptsA) return ptsB - ptsA;
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        return diffB - diffA;
      });

      setTeams(teamsWithCoaches);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const takenCount = teams.filter(t => t.coach_name).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading ladder...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🏆 Division 1 Ladder</h1>
          <p className="text-white/80">{takenCount}/10 teams have coaches</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Ladder Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-gray-700 text-gray-300 text-sm font-bold">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">Team</div>
            <div className="col-span-3">Coach</div>
            <div className="col-span-1 text-center">W</div>
            <div className="col-span-1 text-center">D</div>
            <div className="col-span-1 text-center">L</div>
            <div className="col-span-1 text-center">Pts</div>
            <div className="col-span-1 text-center">+/-</div>
          </div>

          {/* Team Rows */}
          {teams.map((team, index) => {
            const pts = (team.wins * 2) + team.draws;
            const pointDiff = team.points_for - team.points_against;
            
            return (
              <div 
                key={team.id}
                className={`grid grid-cols-12 gap-2 p-4 items-center border-t border-gray-700 ${
                  index < 4 ? 'bg-green-900/20' : ''
                }`}
              >
                {/* Position */}
                <div className="col-span-1 text-center">
                  <span className={`font-bold ${
                    index < 4 ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                </div>

                {/* Team */}
                <div className="col-span-3 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: team.primary_color }}
                  ></div>
                  <span className="text-white font-semibold truncate">{team.name}</span>
                </div>

                {/* Coach */}
                <div className="col-span-3">
                  {team.coach_name ? (
                    <span className="text-yellow-400 truncate">👤 {team.coach_name}</span>
                  ) : (
                    <span className="text-gray-500 italic">Available</span>
                  )}
                </div>

                {/* W */}
                <div className="col-span-1 text-center text-white">{team.wins}</div>
                
                {/* D */}
                <div className="col-span-1 text-center text-white">{team.draws}</div>
                
                {/* L */}
                <div className="col-span-1 text-center text-white">{team.losses}</div>
                
                {/* Pts */}
                <div className="col-span-1 text-center text-green-400 font-bold">{pts}</div>
                
                {/* +/- */}
                <div className={`col-span-1 text-center font-bold ${
                  pointDiff > 0 ? 'text-green-400' : pointDiff < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {pointDiff > 0 ? '+' : ''}{pointDiff}
                </div>
              </div>
            );
          })}
        </div>

        {/* Finals Zone Legend */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 bg-green-900/40 rounded"></div>
          <span>Finals Zone (Top 4)</span>
        </div>

        {/* Waiting Message */}
        {takenCount < 10 && (
          <div className="mt-6 bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-4 rounded-lg text-center">
            ⏳ Waiting for {10 - takenCount} more coaches to join before Season 0 begins!
          </div>
        )}

        {takenCount === 10 && (
          <div className="mt-6 bg-green-500/20 border border-green-500 text-green-400 p-4 rounded-lg text-center">
            🏉 All teams have coaches! Ready to start Season 0!
          </div>
        )}
      </div>
    </div>
  );
}