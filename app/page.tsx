'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient();

interface Sport {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  available: boolean;
}

const sports: Sport[] = [
  {
    id: 'rugby-league',
    name: 'Rugby League',
    icon: '🏉',
    description: 'Manage your NRL club to glory. Build your squad, train players, dominate the ladder.',
    color: 'from-green-600 to-green-800',
    available: true,
  },
  {
    id: 'aussie-rules',
    name: 'Aussie Rules',
    icon: '🦘',
    description: 'Take charge of an AFL franchise. Draft stars, develop talent, chase the premiership.',
    color: 'from-yellow-600 to-orange-700',
    available: false,
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '🏏',
    description: 'Lead your cricket club through the seasons. Manage test matches, ODIs, and T20s.',
    color: 'from-blue-600 to-blue-800',
    available: false,
  },
  {
    id: 'american-football',
    name: 'American Football',
    icon: '🏈',
    description: 'Build an NFL dynasty. Draft, trade, and coach your way to the championship.',
    color: 'from-red-600 to-red-800',
    available: false,
  },
];

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSport, setHoveredSport] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
    // Don't redirect - let everyone see this page
  };

  const handleSelectSport = async (sport: Sport) => {
    if (!sport.available) return;

    // Not logged in? Send to auth
    if (!user) {
      router.push('/auth');
      return;
    }

    // Check if user has a coach record with a team
    const { data: coach } = await supabase
      .from('coaches')
      .select('team_id, approved')
      .eq('user_id', user.id)
      .single();

    if (!coach) {
      router.push('/choose-team');
    } else if (!coach.team_id) {
      router.push('/choose-team');
    } else if (!coach.approved) {
      router.push('/pending');
    } else {
      router.push('/clubhouse');
    }
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 text-[200px]">🏆</div>
          <div className="absolute bottom-20 right-20 text-[150px]">⭐</div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4">
            Sideline<span className="text-green-500">HQ</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-2">
            Your Sports Management Empire Starts Here
          </p>
          <p className="text-gray-500">
            Choose your sport. Build your legacy.
          </p>
        </div>
      </div>

      {/* Sport Selection */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sports.map((sport) => (
            <div
              key={sport.id}
              onClick={() => handleSelectSport(sport)}
              onMouseEnter={() => setHoveredSport(sport.id)}
              onMouseLeave={() => setHoveredSport(null)}
              className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                sport.available
                  ? 'cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl'
                  : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${sport.color} opacity-90`} />
              
              <div className="relative z-10 p-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-6xl">{sport.icon}</div>
                  {sport.available ? (
                    <span className="bg-white/20 backdrop-blur text-white text-sm font-bold px-3 py-1 rounded-full">
                      PLAY NOW
                    </span>
                  ) : (
                    <span className="bg-black/30 backdrop-blur text-gray-300 text-sm font-bold px-3 py-1 rounded-full">
                      COMING SOON
                    </span>
                  )}
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2">{sport.name}</h2>
                <p className="text-white/80 text-sm leading-relaxed">{sport.description}</p>
                
                {sport.available && (
                  <div className="mt-6 flex items-center gap-2 text-white font-bold">
                    <span>Enter the Game</span>
                    <span className={`transition-transform duration-300 ${hoveredSport === sport.id ? 'translate-x-2' : ''}`}>
                      →
                    </span>
                  </div>
                )}
                
                {!sport.available && (
                  <div className="mt-6 text-white/50 text-sm">
                    🔒 Stay tuned for updates
                  </div>
                )}
              </div>
              
              {sport.available && hoveredSport === sport.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse" />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 text-sm">
            More sports coming in 2026 • Built with ❤️ for sports fans
          </p>
        </div>
      </div>
    </div>
  );
}