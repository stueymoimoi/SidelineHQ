'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  speed: number;
  strength: number;
  power: number;
  passing: number;
  stamina: number;
  tackling: number;
  kicking: number;
  fatigue: number;
  potential: number;
  nationality: string;
  state: string | null;
  current_training: string | null;
  training_progress: string | null;
  dominant_side: string | null;
  ovr_change: number | null;
  ovr_changed_at: string | null;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
}

const isRecentChange = (changedAt: string | null): boolean => {
  if (!changedAt) return false;
  const changed = new Date(changedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

interface ShieldProps {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
  teamAbbr: string;
  size?: number;
  customLogo?: string | null;
}

const Shield = ({ primaryColor, secondaryColor, tertiaryColor = '#FFFFFF', teamAbbr, size = 80, customLogo }: ShieldProps) => {
  if (customLogo) {
    return (
      <div 
        className="rounded-full overflow-hidden border-4"
        style={{ 
          width: size, 
          height: size, 
          borderColor: tertiaryColor 
        }}
      >
        <img src={customLogo} alt="Team Logo" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill={primaryColor} stroke={tertiaryColor} strokeWidth="4" />
      <circle cx="50" cy="50" r="38" fill={secondaryColor} />
      <circle cx="50" cy="50" r="28" fill={primaryColor} />
      <text 
        x="50" 
        y="50" 
        textAnchor="middle" 
        dominantBaseline="middle"
        fill={tertiaryColor}
        fontSize="22" 
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        {teamAbbr}
      </text>
    </svg>
  );
};

type JerseyPattern = 'solid' | 'hoops' | 'vstripes' | 'chevron' | 'diagonal';

interface JerseyProps {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
  pattern?: JerseyPattern;
  isAway?: boolean;
  size?: number;
  teamAbbr?: string;
}

const Jersey = ({ primaryColor, secondaryColor, tertiaryColor = '#FFFFFF', pattern = 'solid', isAway = false, size = 120, teamAbbr = '' }: JerseyProps) => {
  const mainColor = isAway ? secondaryColor : primaryColor;
  const trimColor = isAway ? primaryColor : secondaryColor;
  const accentColor = tertiaryColor;
  
  const patternId = `pattern-${isAway ? 'away' : 'home'}-${Math.random().toString(36).substr(2, 9)}`;
  
  const renderPattern = () => {
    switch (pattern) {
      case 'hoops':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="100" height="16">
            <rect width="100" height="8" fill={mainColor} />
            <rect y="8" width="100" height="8" fill={trimColor} />
          </pattern>
        );
      case 'vstripes':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="16" height="100">
            <rect width="8" height="100" fill={mainColor} />
            <rect x="8" width="8" height="100" fill={trimColor} />
          </pattern>
        );
      case 'chevron':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="100" height="50">
            <rect width="100" height="50" fill={mainColor} />
            <polygon points="50,0 100,25 50,50 0,25" fill={trimColor} />
          </pattern>
        );
      case 'diagonal':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
            <rect width="10" height="20" fill={mainColor} />
            <rect x="10" width="10" height="20" fill={trimColor} />
          </pattern>
        );
      default:
        return null;
    }
  };

  const jerseyFill = pattern === 'solid' ? mainColor : `url(#${patternId})`;

  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {renderPattern()}
      </defs>
      
      <ellipse cx="50" cy="18" rx="14" ry="15" fill="#F5D0B5" />
      <ellipse cx="35" cy="18" rx="3" ry="4" fill="#F5D0B5" />
      <ellipse cx="65" cy="18" rx="3" ry="4" fill="#F5D0B5" />
      <path d="M36 8 Q40 3 50 3 Q60 3 64 8 Q65 12 64 14 L62 10 Q55 6 50 6 Q45 6 38 10 L36 14 Q35 12 36 8Z" fill="#3D2314" />
      <path d="M42 13 L47 12" stroke="#3D2314" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M53 12 L58 13" stroke="#3D2314" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="45" cy="17" rx="2.5" ry="2" fill="#FFFFFF" />
      <ellipse cx="55" cy="17" rx="2.5" ry="2" fill="#FFFFFF" />
      <circle cx="45" cy="17" r="1.2" fill="#2C1810" />
      <circle cx="55" cy="17" r="1.2" fill="#2C1810" />
      <ellipse cx="50" cy="21" rx="2" ry="1.5" fill="#E8B89D" />
      <path d="M45 26 Q50 29 55 26" stroke="#2C1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="45" y="32" width="10" height="6" fill="#F5D0B5" />
      
      <path 
        d="M28 38 L15 44 L10 65 L20 68 L20 95 L80 95 L80 68 L90 65 L85 44 L72 38 L68 36 L60 40 L50 42 L40 40 L32 36 L28 38Z" 
        fill={jerseyFill}
        stroke={trimColor}
        strokeWidth="2"
      />
      
      <path 
        d="M40 38 L50 50 L60 38" 
        fill="none" 
        stroke={accentColor} 
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      <path d="M15 52 L20 54" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
      <path d="M85 52 L80 54" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
      
      {teamAbbr && (
        <>
          <text 
            x="50" 
            y="76" 
            textAnchor="middle" 
            fill={accentColor}
            stroke={accentColor}
            strokeWidth="3"
            fontSize="14" 
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            {teamAbbr}
          </text>
          <text 
            x="50" 
            y="76" 
            textAnchor="middle" 
            fill={trimColor} 
            fontSize="14" 
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            {teamAbbr}
          </text>
        </>
      )}
      
      <path 
        d="M10 65 Q2 72 8 85 L16 82 Q10 72 16 68" 
        fill="#F5D0B5"
      />
      <ellipse cx="12" cy="86" rx="5" ry="4" fill="#F5D0B5" />
      
      <path 
        d="M90 65 Q98 72 92 85 L84 82 Q90 72 84 68" 
        fill="#F5D0B5"
      />
      <ellipse cx="88" cy="86" rx="5" ry="4" fill="#F5D0B5" />
      
      <path 
        d="M24 95 L22 115 L40 115 L50 100 L60 115 L78 115 L76 95 Z" 
        fill={trimColor}
        stroke={mainColor}
        strokeWidth="1"
      />
      
      <path d="M24 100 L76 100" stroke={accentColor} strokeWidth="2" />
      
      <path d="M28 115 L30 125" stroke="#F5D0B5" strokeWidth="10" strokeLinecap="round" />
      <path d="M72 115 L70 125" stroke="#F5D0B5" strokeWidth="10" strokeLinecap="round" />
      
      <rect x="22" y="120" width="16" height="8" rx="2" fill={mainColor} />
      <rect x="62" y="120" width="16" height="8" rx="2" fill={mainColor} />
      
      <path d="M22 123 L38 123" stroke={accentColor} strokeWidth="1.5" />
      <path d="M62 123 L78 123" stroke={accentColor} strokeWidth="1.5" />
      
      <ellipse cx="30" cy="130" rx="10" ry="3" fill="#1a1a1a" />
      <ellipse cx="70" cy="130" rx="10" ry="3" fill="#1a1a1a" />
    </svg>
  );
};

const getTeamAbbr = (teamName: string): string => {
  const abbrs: Record<string, string> = {
    'Frost': 'CBR',
    'Raptors': 'BRI',
    'Serpents': 'SYD',
    'Wolves': 'MEL',
    'Steelers': 'NEW',
    'Pelicans': 'GLD',
    'Quokkas': 'PER',
    'Coopers': 'ADL',
    'Cassowaries': 'TWN',
    'Ironmen': 'WOL',
  };
  return abbrs[teamName] || teamName.substring(0, 3).toUpperCase();
};

// ============================================================================
// NEW TIER SYSTEM
// ============================================================================

const TIER_LABELS: Record<number, string> = {
  1: 'NONE',
  2: 'POOR',
  3: 'OK',
  4: 'GOOD',
  5: 'GREAT',
  6: 'EXCELLENT',
  7: 'ELITE',
  8: 'LEGEND'
};

const TIER_COLORS: Record<number, string> = {
  1: 'text-gray-600 bg-gray-800',
  2: 'text-red-400 bg-red-900/30',
  3: 'text-orange-400 bg-orange-900/30',
  4: 'text-yellow-400 bg-yellow-900/30',
  5: 'text-green-400 bg-green-900/30',
  6: 'text-blue-400 bg-blue-900/30',
  7: 'text-purple-400 bg-purple-900/30',
  8: 'text-yellow-300 bg-yellow-900/40'
};

const POSITION_STATS: Record<string, { primary: string[], secondary: string[], minor: string[], negligible: string[] }> = {
  'Prop': {
    primary: ['strength', 'power'],
    secondary: ['tackling', 'stamina'],
    minor: ['passing'],
    negligible: ['speed', 'kicking']
  },
  'Hooker': {
    primary: ['passing', 'stamina'],
    secondary: ['tackling', 'speed'],
    minor: ['strength'],
    negligible: ['power', 'kicking']
  },
  'Second Row': {
    primary: ['strength', 'power'],
    secondary: ['tackling', 'stamina'],
    minor: ['passing'],
    negligible: ['speed', 'kicking']
  },
  'Lock': {
    primary: ['tackling', 'stamina'],
    secondary: ['strength', 'passing'],
    minor: ['power'],
    negligible: ['speed', 'kicking']
  },
  'Halfback': {
    primary: ['passing', 'kicking'],
    secondary: ['speed', 'stamina'],
    minor: ['tackling'],
    negligible: ['strength', 'power']
  },
  'Five-Eighth': {
    primary: ['passing', 'kicking'],
    secondary: ['speed', 'power'],
    minor: ['tackling'],
    negligible: ['strength', 'stamina']
  },
  'Centre': {
    primary: ['power', 'tackling'],
    secondary: ['passing', 'speed'],
    minor: ['stamina'],
    negligible: ['strength', 'kicking']
  },
  'Winger': {
    primary: ['speed', 'power'],
    secondary: ['stamina', 'tackling'],
    minor: ['passing'],
    negligible: ['strength', 'kicking']
  },
  'Fullback': {
    primary: ['speed', 'power'],
    secondary: ['passing', 'stamina'],
    minor: ['tackling'],
    negligible: ['strength', 'kicking']
  }
};

const shouldShowSide = (position: string) => {
  return ['Winger', 'Centre', 'Second Row'].includes(position);
};

const getSideBadge = (side: string | null) => {
  switch (side) {
    case 'left':
      return { text: 'L', bg: 'bg-orange-500', title: 'Left-sided specialist' };
    case 'right':
      return { text: 'R', bg: 'bg-blue-500', title: 'Right-sided specialist' };
    case 'both':
      return { text: 'L/R', bg: 'bg-gray-500', title: 'Versatile - plays both sides' };
    case 'none':
    default:
      return { text: '?', bg: 'bg-yellow-500', title: 'Developing - side not yet determined' };
  }
};

const OvrChangeArrow = ({ change, changedAt }: { change: number | null, changedAt: string | null }) => {
  if (!change || !isRecentChange(changedAt)) return null;
  
  if (change > 0) {
    return (
      <span className="text-green-400 text-sm ml-1 animate-pulse" title={`+${change} OVR recently`}>
        ▲+{change}
      </span>
    );
  }
  
  if (change < 0) {
    return (
      <span className="text-yellow-400 text-sm ml-1" title={`${change} OVR recently`}>
        ▼{change}
      </span>
    );
  }
  
  return null;
};

export default function SquadPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    loadData();
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

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coach.team_id)
        .order('overall', { ascending: false });

      setPlayers(playersData || []);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOvrColor = (ovr: number) => {
    if (ovr >= 41) return 'bg-purple-500';
    if (ovr >= 35) return 'bg-green-500';
    if (ovr >= 29) return 'bg-green-600';
    if (ovr >= 23) return 'bg-yellow-500';
    if (ovr >= 17) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getOvrStars = (ovr: number) => {
    if (ovr >= 39) return '⭐⭐⭐⭐⭐';
    if (ovr >= 33) return '⭐⭐⭐⭐';
    if (ovr >= 27) return '⭐⭐⭐';
    if (ovr >= 21) return '⭐⭐';
    return '⭐';
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

  const getFitnessColor = (fitness: number) => {
    if (fitness >= 70) return 'text-green-500';
    if (fitness >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTierLabel = (value: number) => {
    return TIER_LABELS[value] || 'NONE';
  };

  const getTierColorClass = (value: number) => {
    return TIER_COLORS[value] || TIER_COLORS[1];
  };

  const getStatImportance = (position: string, stat: string): 'primary' | 'secondary' | 'minor' | 'negligible' => {
    const posStats = POSITION_STATS[position];
    if (!posStats) return 'secondary';
    
    if (posStats.primary.includes(stat)) return 'primary';
    if (posStats.secondary.includes(stat)) return 'secondary';
    if (posStats.minor.includes(stat)) return 'minor';
    return 'negligible';
  };

  const getImportanceIndicator = (importance: 'primary' | 'secondary' | 'minor' | 'negligible') => {
    switch (importance) {
      case 'primary': return { icon: '⭐', opacity: 'opacity-100' };
      case 'secondary': return { icon: '🔵', opacity: 'opacity-100' };
      case 'minor': return { icon: '⚪', opacity: 'opacity-70' };
      case 'negligible': return { icon: '❌', opacity: 'opacity-50' };
    }
  };

  const renderStatRow = (
    label: string, 
    statKey: string, 
    value: number, 
    position: string
  ) => {
    const importance = getStatImportance(position, statKey);
    const indicator = getImportanceIndicator(importance);
    const tierLabel = getTierLabel(value);
    const tierColorClass = getTierColorClass(value);

    return (
      <div className={`flex items-center justify-between py-2 border-b border-gray-700 ${indicator.opacity}`}>
        <span className="text-gray-400 flex items-center gap-2">
          <span className="text-xs">{indicator.icon}</span>
          {label}
        </span>
        <span className={`px-3 py-1 rounded font-bold text-sm ${tierColorClass}`}>
          {tierLabel}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading squad...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with Jerseys */}
      <div 
        className="p-6 pb-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color}dd 0%, ${team?.secondary_color}dd 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto relative z-10">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          
          <div className="flex items-center gap-8">
            {team && (
              <Shield
                primaryColor={team.primary_color}
                secondaryColor={team.secondary_color}
                tertiaryColor={team.tertiary_color || '#FFFFFF'}
                teamAbbr={getTeamAbbr(team.name)}
                size={85}
              />
            )}
            
            <div>
              <h1 className="text-4xl font-bold text-white">{team?.name}</h1>
              <p className="text-white/80 text-lg">👥 Squad • {players.length} Players</p>
            </div>
            
            {team && (
              <div className="flex items-end gap-2">
                <div className="text-center">
                  <Jersey 
                    primaryColor={team.primary_color} 
                    secondaryColor={team.secondary_color}
                    tertiaryColor={team.tertiary_color || '#FFFFFF'}
                    pattern="solid"
                    isAway={false}
                    size={90}
                    teamAbbr={getTeamAbbr(team.name)}
                  />
                  <p className="text-white/60 text-xs">Home</p>
                </div>
                <div className="text-center">
                  <Jersey 
                    primaryColor={team.primary_color} 
                    secondaryColor={team.secondary_color}
                    tertiaryColor={team.tertiary_color || '#FFFFFF'}
                    pattern="solid"
                    isAway={true}
                    size={90}
                    teamAbbr={getTeamAbbr(team.name)}
                  />
                  <p className="text-white/60 text-xs">Away</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Side Badge Legend */}
        {players.some(p => shouldShowSide(p.position)) && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-400">Dominant Side</span>
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1">
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded font-bold">L</span>
                <span className="text-gray-400">Left</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-bold">R</span>
                <span className="text-gray-400">Right</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded font-bold">L/R</span>
                <span className="text-gray-400">Versatile</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded font-bold">?</span>
                <span className="text-gray-400">Developing</span>
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-2">Applies to edge positions: Wingers, Centres, Second Rows</p>
          </div>
        )}

        {/* All Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const showSide = shouldShowSide(player.position);
            const sideBadge = getSideBadge(player.dominant_side);
            
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition border-2 border-transparent hover:border-green-500"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-gray-300 text-base font-semibold">{player.first_name}</p>
                    <p className="text-white font-bold text-xl">{player.last_name}</p>
                    <p className="text-gray-500 text-xs">
                      {player.nationality === 'AUS' && player.state 
                        ? `${player.nationality}, ${player.state}` 
                        : player.nationality}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`${getPositionColor(player.position)} text-white text-xs px-2 py-1 rounded`}>
                        {player.position}
                      </span>
                      {showSide && (
                        <span 
                          className={`${sideBadge.bg} text-white text-xs px-2 py-1 rounded font-bold`}
                          title={sideBadge.title}
                        >
                          {sideBadge.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs mb-1">OVR</p>
                    <div className="flex items-center justify-end">
                      <span className={`${getOvrColor(player.overall)} text-white px-3 py-1 rounded-lg font-bold text-lg inline-block`}>
                        {player.overall}
                      </span>
                      <OvrChangeArrow change={player.ovr_change} changedAt={player.ovr_changed_at} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-400 mt-3 pt-2 border-t border-gray-700">
                  <span>Age: {player.age}</span>
                  <span className={getFitnessColor(100 - (player.fatigue || 0))}>
                    {100 - (player.fatigue || 0)}% Fit
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-300 text-lg font-semibold">{selectedPlayer.first_name}</p>
                <h2 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h2>
                <p className="text-gray-500 text-sm">
                  {selectedPlayer.nationality === 'AUS' && selectedPlayer.state 
                    ? `${selectedPlayer.nationality}, ${selectedPlayer.state}` 
                    : selectedPlayer.nationality}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className={`${getPositionColor(selectedPlayer.position)} text-white text-sm px-3 py-1 rounded`}>
                    {selectedPlayer.position}
                  </span>
                  {shouldShowSide(selectedPlayer.position) && (
                    <span 
                      className={`${getSideBadge(selectedPlayer.dominant_side).bg} text-white text-sm px-3 py-1 rounded font-bold`}
                      title={getSideBadge(selectedPlayer.dominant_side).title}
                    >
                      {getSideBadge(selectedPlayer.dominant_side).text}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">OVR</p>
                <div className="flex items-center justify-end">
                  <span className={`${getOvrColor(selectedPlayer.overall)} text-white px-4 py-2 rounded-lg font-bold text-2xl inline-block`}>
                    {selectedPlayer.overall}
                  </span>
                  <OvrChangeArrow change={selectedPlayer.ovr_change} changedAt={selectedPlayer.ovr_changed_at} />
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">Age</p>
                <p className="text-white text-xl font-bold">{selectedPlayer.age}</p>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <p className="text-gray-400 text-xs">Fitness</p>
                <p className={`text-xl font-bold ${getFitnessColor(100 - (selectedPlayer.fatigue || 0))}`}>
                  {100 - (selectedPlayer.fatigue || 0)}%
                </p>
              </div>
            </div>

            {/* Side explanation for edge positions */}
            {shouldShowSide(selectedPlayer.position) && (
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-xs">Dominant Side</p>
                <p className="text-white font-semibold flex items-center gap-2">
                  <span className={`${getSideBadge(selectedPlayer.dominant_side).bg} text-white text-xs px-2 py-1 rounded font-bold`}>
                    {getSideBadge(selectedPlayer.dominant_side).text}
                  </span>
                  {getSideBadge(selectedPlayer.dominant_side).title}
                </p>
              </div>
            )}

            {/* Stats Legend */}
            <div className="flex gap-4 text-xs text-gray-500 mb-2 justify-center">
              <span>⭐ Primary</span>
              <span>🔵 Secondary</span>
              <span>⚪ Minor</span>
              <span>❌ Negligible</span>
            </div>

            {/* Stats - Tier Labels Only */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              {renderStatRow('Speed', 'speed', selectedPlayer.speed, selectedPlayer.position)}
              {renderStatRow('Strength', 'strength', selectedPlayer.strength, selectedPlayer.position)}
              {renderStatRow('Power', 'power', selectedPlayer.power, selectedPlayer.position)}
              {renderStatRow('Passing', 'passing', selectedPlayer.passing, selectedPlayer.position)}
              {renderStatRow('Stamina', 'stamina', selectedPlayer.stamina, selectedPlayer.position)}
              {renderStatRow('Tackling', 'tackling', selectedPlayer.tackling, selectedPlayer.position)}
              {renderStatRow('Kicking', 'kicking', selectedPlayer.kicking, selectedPlayer.position)}
            </div>

            {/* Training Status */}
            {selectedPlayer.current_training && (
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-sm">Current Training</p>
                <p className="text-white font-semibold">{selectedPlayer.current_training}</p>
                <p className="text-yellow-500 text-sm">{selectedPlayer.training_progress || 'None'}</p>
              </div>
            )}

            {/* Close Button */}
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