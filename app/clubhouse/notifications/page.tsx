'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
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

interface Notification {
  id: string;
  team_id: string;
  type: string;
  title: string;
  message: string;
  player_id: string | null;
  fixture_id: string | null;
  read: boolean;
  created_at: string;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  speed: number;
  strength: number;
  skill: number;
  stamina: number;
  defense: number;
  kicking: number;
  age: number;
  fatigue: number;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
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

      if (!coach?.team_id) {
        router.push('/choose-team');
        return;
      }

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      setTeam(teamData);

      // Get notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('team_id', coach.team_id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(notifs || []);

      // Mark all as read
      if (notifs && notifs.some(n => !n.read)) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('team_id', coach.team_id)
          .eq('read', false);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayer = async (playerId: string) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    
    if (data) setSelectedPlayer(data);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match_win': return '🏆';
      case 'match_loss': return '😢';
      case 'match_draw': return '🤝';
      case 'player_improvement': return '⭐';
      case 'position_learned': return '🎉';
      default: return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'match_win': return 'border-green-500';
      case 'match_loss': return 'border-red-500';
      case 'match_draw': return 'border-yellow-500';
      case 'player_improvement': return 'border-blue-500';
      case 'position_learned': return 'border-purple-500';
      default: return 'border-gray-500';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color} 0%, ${team?.secondary_color} 100%)`
        }}
      >
        <div className="max-w-2xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🔔 Notifications</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {notifications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔕</div>
            <p className="text-gray-400">No notifications yet</p>
            <p className="text-gray-500 text-sm mt-2">You'll see match results and player updates here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`bg-gray-800 rounded-lg p-4 border-l-4 ${getTypeColor(notif.type)} ${!notif.read ? 'bg-gray-750' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{notif.title}</p>
                      <p className="text-gray-500 text-xs">{formatTime(notif.created_at)}</p>
                    </div>
                    <p className="text-gray-300 mt-1">{notif.message}</p>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {notif.player_id && (
                        <button
                          onClick={() => loadPlayer(notif.player_id!)}
                          className="text-sm bg-gray-700 hover:bg-gray-600 text-blue-400 px-3 py-1 rounded transition"
                        >
                          View Player
                        </button>
                      )}
                      {notif.fixture_id && (
                        <Link
                          href={`/clubhouse/match/${notif.fixture_id}`}
                          className="text-sm bg-gray-700 hover:bg-gray-600 text-green-400 px-3 py-1 rounded transition"
                        >
                          View Match
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm">{selectedPlayer.first_name}</p>
                <h3 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h3>
              </div>
              <span className={`px-3 py-1 rounded text-white text-sm font-bold ${getPositionColor(selectedPlayer.position)}`}>
                {selectedPlayer.position}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-600 text-white text-2xl font-bold px-4 py-2 rounded">
                {selectedPlayer.overall}
              </div>
              <div className="text-gray-400">
                <p>Age {selectedPlayer.age}</p>
                <p className={selectedPlayer.fatigue >= 50 ? 'text-red-400' : 'text-green-400'}>
                  {selectedPlayer.fatigue}% fatigue
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">SPD</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.speed}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">STR</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.strength}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">SKL</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.skill}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">STA</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.stamina}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">DEF</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.defense}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">KCK</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.kicking}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
