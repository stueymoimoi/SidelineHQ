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
  skill: number;
  stamina: number;
  defense: number;
  kicking: number;
  fatigue: number;
  potential: number;
  nationality: string;
  state: string | null;
  current_training: string | null;
  training_progress: string | null;
  dominant_side: string | null;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
}

// ============================================================================
// TEAM SHIELD COMPONENT
// ============================================================================

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

// ============================================================================
// JERSEY COMPONENT
// ============================================================================

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
// CONSTANTS
// ============================================================================

const TIER_NAMES: Record<number, string> = {
  1: 'None',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Very Good',
  6: 'Excellent',
  7: 'Elite',
  8: 'World Class'
};

const POSITION_STATS: Record<string, { primary: string[], secondary: string[], minor: string[], negligible: string[] }> = {
  'Prop': {
    primary: ['strength', 'defense'],
    secondary: ['stamina', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Hooker': {
    primary: ['skill', 'stamina'],
    secondary: ['defense', 'speed'],
    minor: ['strength'],
    negligible: ['kicking']
  },
  'Second Row': {
    primary: ['strength', 'defense'],
    secondary: ['stamina', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Lock': {
    primary: ['defense', 'stamina'],
    secondary: ['strength', 'skill'],
    minor: ['speed'],
    negligible: ['kicking']
  },
  'Halfback': {
    primary: ['skill', 'kicking'],
    secondary: ['speed', 'stamina'],
    minor: ['defense'],
    negligible: ['strength']
  },
  'Five-Eighth': {
    primary: ['skill', 'kicking'],
    secondary: ['speed', 'defense'],
    minor: ['stamina'],
    negligible: ['strength']
  },
  'Centre': {
    primary: ['defense', 'skill'],
    secondary: ['speed', 'strength'],
    minor: ['stamina'],
    negligible: ['kicking']
  },
  'Winger': {
    primary: ['speed', 'skill'],
    secondary: ['stamina', 'defense'],
    minor: ['strength'],
    negligible: ['kicking']
  },
  'Fullback': {
    primary: ['speed', 'skill'],
    secondary: ['kicking', 'defense'],
    minor: ['stamina'],
    negligible: ['strength']
  }
};

// ============================================================================
// DOMINANT SIDE HELPERS
// ============================================================================

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

  const getTierName = (value: number) => {
    return TIER_NAMES[value] || 'None';
  };

  const getTierColor = (value: number) => {
    if (value >= 8) return 'text-purple-400';
    if (value >= 7) return 'text-yellow-400';
    if (value >= 6) return 'text-green-400';
    if (value >= 5) return 'text-blue-400';
    if (value >= 4) return 'text-white';
    if (value >= 3) return 'text-gray-400';
    if (value >= 2) return 'text-orange-400';
    return 'text-red-400';
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
      case 'primary': return { icon: '⭐', color: 'text-yellow-400', opacity: 'opacity-100' };
      case 'secondary': return { icon: '🔵', color: 'text-blue-400', opacity: 'opacity-100' };
      case 'minor': return { icon: '⚪', color: 'text-gray-400', opacity: 'opacity-70' };
      case 'negligible': return { icon: '❌', color: 'text-gray-600', opacity: 'opacity-50' };
    }
  };

  const renderStatBar = (
    label: string, 
    statKey: string, 
    value: number, 
    position: string
  ) => {
    const importance = getStatImportance(position, statKey);
    const indicator = getImportanceIndicator(importance);
    const tierName = getTierName(value);
    const tierColor = getTierColor(value);
    const barWidth = (value / 8) * 100;
    
    const barColors: Record<string, string> = {
      speed: 'bg-blue-500',
      strength: 'bg-red-500',
      skill: 'bg-yellow-500',
      stamina: 'bg-green-500',
      defense: 'bg-purple-500',
      kicking: 'bg-orange-500'
    };

    return (
      <div className={indicator.opacity}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400 flex items-center gap-1">
            <span className="text-xs">{indicator.icon}</span>
            {label}
          </span>
          <span className={tierColor}>{tierName}</span>
        </div>
        <div className="bg-gray-700 rounded-full h-2">
          <div 
            className={`${barColors[statKey]} h-2 rounded-full transition-all`} 
            style={{ width: `${barWidth}%` }}
          ></div>
        </div>
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
        {/* Side Badge Legend - Only show if team has edge players */}
        {players.some(p => shouldShowSide(p.position)) && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-400">Side:</span>
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
                    <span className={`${getOvrColor(player.overall)} text-white px-3 py-1 rounded-lg font-bold text-lg inline-block`}>
                      {player.overall}
                    </span>
                    <p className="text-yellow-500 text-sm mt-1">{getOvrStars(player.overall)}</p>
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
                <span className={`${getOvrColor(selectedPlayer.overall)} text-white px-4 py-2 rounded-lg font-bold text-2xl inline-block`}>
                  {selectedPlayer.overall}
                </span>
                <p className="text-yellow-500 text-sm mt-1">{getOvrStars(selectedPlayer.overall)}</p>
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

            {/* Stats */}
            <div className="space-y-3 mb-4">
              {renderStatBar('Speed', 'speed', selectedPlayer.speed, selectedPlayer.position)}
              {renderStatBar('Strength', 'strength', selectedPlayer.strength, selectedPlayer.position)}
              {renderStatBar('Skill', 'skill', selectedPlayer.skill, selectedPlayer.position)}
              {renderStatBar('Stamina', 'stamina', selectedPlayer.stamina, selectedPlayer.position)}
              {renderStatBar('Defense', 'defense', selectedPlayer.defense, selectedPlayer.position)}
              {renderStatBar('Kicking', 'kicking', selectedPlayer.kicking, selectedPlayer.position)}
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