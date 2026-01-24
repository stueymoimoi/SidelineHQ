'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlayerSnapshotPopup } from '@/components';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PlayerStats {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  games: number;
  tries: number;
  assists: number;
  goals: number;
  tackles: number;
  metres: number;
  avg_rating: number;
}

type SortKey = keyof PlayerStats;

export default function SquadStatsPage() {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('avg_rating');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const positions = ['All', 'Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback', 'Hooker', 'Prop', 'Second Row', 'Lock'];

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    let filtered = [...stats];
    
    // Position filter
    if (positionFilter !== 'All') {
      filtered = filtered.filter(p => p.position === positionFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    
    setFilteredStats(filtered);
  }, [stats, positionFilter, sortKey, sortAsc]);

  async function loadStats() {
    setLoading(true);
    
    // Get current user's team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('current_manager_id', user.id)
      .single();

    if (!team) return;

    // Get all players on the team
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, position, age, overall')
      .eq('team_id', team.id);

    if (!players) return;

    // Get aggregated stats for each player
    const { data: matchStats } = await supabase
      .from('player_match_stats')
      .select('player_id, tries, try_assists, goals_made, tackles, metres, rating')
      .eq('team_id', team.id);

    // Aggregate stats per player
    const statsMap = new Map<string, {
      games: number;
      tries: number;
      assists: number;
      goals: number;
      tackles: number;
      metres: number;
      totalRating: number;
    }>();

    matchStats?.forEach((ms: { player_id: string; tries: number | null; try_assists: number | null; goals_made: number | null; tackles: number | null; metres: number | null; rating: number | null }) => {
      const existing = statsMap.get(ms.player_id) || {
        games: 0,
        tries: 0,
        assists: 0,
        goals: 0,
        tackles: 0,
        metres: 0,
        totalRating: 0,
      };
      
      statsMap.set(ms.player_id, {
        games: existing.games + 1,
        tries: existing.tries + (ms.tries || 0),
        assists: existing.assists + (ms.try_assists || 0),
        goals: existing.goals + (ms.goals_made || 0),
        tackles: existing.tackles + (ms.tackles || 0),
        metres: existing.metres + (ms.metres || 0),
        totalRating: existing.totalRating + (ms.rating || 0),
      });
    });

    // Combine player info with stats
    const combined: PlayerStats[] = players.map((p: { id: string; first_name: string; last_name: string; position: string; age: number; overall: number }) => {
      const s = statsMap.get(p.id);
      return {
        player_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position,
        age: p.age,
        overall: p.overall,
        games: s?.games || 0,
        tries: s?.tries || 0,
        assists: s?.assists || 0,
        goals: s?.goals || 0,
        tackles: s?.tackles || 0,
        metres: s?.metres || 0,
        avg_rating: s && s.games > 0 ? Number((s.totalRating / s.games).toFixed(1)) : 0,
      };
    });

    setStats(combined);
    setLoading(false);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIndicator({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>;
  }

  const headerClass = "px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors";
  const cellClass = "px-3 py-2 whitespace-nowrap text-sm";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Squad Stats</h1>
        
        {/* Filters */}
        <div className="mb-4 flex gap-4 items-center">
          <label className="text-sm text-gray-400">Position:</label>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-cyan-500"
          >
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        {/* Stats Table */}
        {loading ? (
          <div className="text-gray-400">Loading stats...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className={headerClass} onClick={() => handleSort('last_name')}>
                    Player<SortIndicator column="last_name" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('position')}>
                    Pos<SortIndicator column="position" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('age')}>
                    Age<SortIndicator column="age" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('overall')}>
                    OVR<SortIndicator column="overall" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('games')}>
                    Games<SortIndicator column="games" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('tries')}>
                    Tries<SortIndicator column="tries" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('assists')}>
                    Assists<SortIndicator column="assists" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('goals')}>
                    Goals<SortIndicator column="goals" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('tackles')}>
                    Tackles<SortIndicator column="tackles" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('metres')}>
                    Metres<SortIndicator column="metres" />
                  </th>
                  <th className={headerClass} onClick={() => handleSort('avg_rating')}>
                    Avg Rating<SortIndicator column="avg_rating" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {filteredStats.map((player) => (
                  <tr
                    key={player.player_id}
                    onClick={() => setSelectedPlayerId(player.player_id)}
                    className="hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <td className={`${cellClass} font-medium`}>
                      {player.first_name} {player.last_name}
                    </td>
                    <td className={`${cellClass} text-gray-400`}>{player.position}</td>
                    <td className={`${cellClass} text-gray-400`}>{player.age}</td>
                    <td className={cellClass}>
                      <span className="px-2 py-1 bg-cyan-900/50 text-cyan-400 rounded text-xs font-bold">
                        {player.overall}
                      </span>
                    </td>
                    <td className={cellClass}>{player.games}</td>
                    <td className={cellClass}>{player.tries}</td>
                    <td className={cellClass}>{player.assists}</td>
                    <td className={cellClass}>{player.goals}</td>
                    <td className={cellClass}>{player.tackles}</td>
                    <td className={cellClass}>{player.metres.toLocaleString()}</td>
                    <td className={cellClass}>
                      {player.avg_rating > 0 ? (
                        <span className={`font-medium ${
                          player.avg_rating >= 7 ? 'text-green-400' :
                          player.avg_rating >= 5 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {player.avg_rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredStats.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            No players found for the selected filter.
          </div>
        )}
      </div>

      {/* Player Popup */}
      <PlayerSnapshotPopup
        playerId={selectedPlayerId || ''}
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
