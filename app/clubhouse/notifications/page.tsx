'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createBrowserClient();

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

// Icon map for O(1) lookup
const TYPE_ICONS: Record<string, string> = {
  match_win: '🏆',
  match_loss: '😢',
  match_draw: '🤝',
  player_improvement: '⭐',
  position_learned: '🎉',
  new_signup: '🆕',
  motm: '⭐',
  motm_opponent: '⭐',
  free_agent_signed: '🎉',
  free_agent_announcement: '📋',
  player_released: '👋',
  new_free_agent: '🏪',
};

// Color map for O(1) lookup
const TYPE_COLORS: Record<string, string> = {
  match_win: 'border-green-500',
  match_loss: 'border-red-500',
  match_draw: 'border-yellow-500',
  player_improvement: 'border-blue-500',
  position_learned: 'border-purple-500',
  new_signup: 'border-purple-500',
  motm: 'border-yellow-400',
  motm_opponent: 'border-gray-500',
  free_agent_signed: 'border-green-500',
  free_agent_announcement: 'border-blue-500',
  player_released: 'border-orange-500',
  new_free_agent: 'border-cyan-500',
};

// Position colors for player modal
const POSITION_COLORS: Record<string, string> = {
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

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
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

      // Parallel fetch
      const [teamRes, notifsRes] = await Promise.all([
        supabase.from('teams').select('*').eq('id', coach.team_id).single(),
        supabase.from('notifications').select('*').eq('team_id', coach.team_id).order('created_at', { ascending: false }).limit(50)
      ]);

      setTeam(teamRes.data);
      setNotifications(notifsRes.data || []);

      // Mark unread as read (fire and forget)
      if (notifsRes.data?.some(n => !n.read)) {
        supabase
          .from('notifications')
          .update({ read: true })
          .eq('team_id', coach.team_id)
          .eq('read', false)
          .then();
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

  const formatTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
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
                className={`bg-gray-800 rounded-lg p-4 border-l-4 ${TYPE_COLORS[notif.type] || 'border-gray-500'} ${!notif.read ? 'bg-gray-750' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{TYPE_ICONS[notif.type] || '📢'}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{notif.title}</p>
                      <p className="text-gray-500 text-xs">{formatTime(notif.created_at)}</p>
                    </div>
                    <p className="text-gray-300 mt-1">{notif.message}</p>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {notif.player_id && (
  <Link
    href={`/player/${notif.player_id}`}
    className="text-sm bg-gray-700 hover:bg-gray-600 text-blue-400 px-3 py-1 rounded transition"
  >
    View Player
  </Link>
)}
                      {notif.fixture_id && (
                        <Link
                          href={`/clubhouse/match/${notif.fixture_id}`}
                          className="text-sm bg-gray-700 hover:bg-gray-600 text-green-400 px-3 py-1 rounded transition"
                        >
                          View Match
                        </Link>
                      )}
                      {notif.type === 'new_signup' && (
                        <Link
                          href="/admin"
                          className="text-sm bg-gray-700 hover:bg-gray-600 text-purple-400 px-3 py-1 rounded transition"
                        >
                          Review in Admin
                        </Link>
                      )}
                      {(notif.type === 'new_free_agent' || notif.type === 'free_agent_announcement') && (
                        <Link
                          href="/clubhouse/free-agents"
                          className="text-sm bg-gray-700 hover:bg-gray-600 text-cyan-400 px-3 py-1 rounded transition"
                        >
                          View Free Agents
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
              <span className={`px-3 py-1 rounded text-white text-sm font-bold ${POSITION_COLORS[selectedPlayer.position] || 'bg-gray-600'}`}>
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
              {[
                { label: 'SPD', value: selectedPlayer.speed },
                { label: 'STR', value: selectedPlayer.strength },
                { label: 'SKL', value: selectedPlayer.skill },
                { label: 'STA', value: selectedPlayer.stamina },
                { label: 'DEF', value: selectedPlayer.defense },
                { label: 'KCK', value: selectedPlayer.kicking },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-700 rounded p-3 text-center">
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <p className="text-white text-xl font-bold">{stat.value}</p>
                </div>
              ))}
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