'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from '@/lib/game-engine/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TYPES
// ============================================

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
  visible_trait: string | null;
  morale: number;
}

interface Team {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
}

// ============================================
// CONSTANTS
// ============================================

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
  1: 'text-red-500 bg-red-500/20',
  2: 'text-orange-600 bg-orange-600/20',
  3: 'text-orange-400 bg-orange-400/20',
  4: 'text-yellow-400 bg-yellow-400/20',
  5: 'text-lime-400 bg-lime-400/20',
  6: 'text-green-400 bg-green-400/20',
  7: 'text-cyan-400 bg-cyan-400/20',
  8: 'text-yellow-300 bg-yellow-500/30 border border-yellow-500/50'
};

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

const TRAIT_DISPLAY_NAMES: Record<string, string> = {
  fiery: 'Fiery',
  confident: 'Confident',
  showman: 'Showman',
  professional: 'Professional',
  clutch: 'Clutch',
  prodigy: 'Prodigy',
  leader: 'Leader',
  loyal: 'Loyal',
  composed: 'Composed',
};

const POSITION_FIELDS = [
  'pos_fullback', 'pos_winger_r', 'pos_centre_r', 'pos_centre_l', 'pos_winger_l',
  'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_hooker', 'pos_prop_r',
  'pos_second_row_l', 'pos_second_row_r', 'pos_lock',
  'bench_1', 'bench_2', 'bench_3', 'bench_4',
  'captain', 'goal_kicker'
] as const;

const TEAM_ABBRS: Record<string, string> = {
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

const MORALE_DISPLAY: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Angry', emoji: '🔴', color: 'text-red-500' },
  2: { label: 'Unhappy', emoji: '🟠', color: 'text-orange-400' },
  3: { label: 'Content', emoji: '⚪', color: 'text-gray-400' },
  4: { label: 'Happy', emoji: '💙', color: 'text-blue-400' },
  5: { label: 'Ecstatic', emoji: '💚', color: 'text-green-400' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const isRecentChange = (changedAt: string | null): boolean => {
  if (!changedAt) return false;
  const changed = new Date(changedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
};

const shouldShowSide = (position: string): boolean => {
  return ['Winger', 'Centre', 'Second Row'].includes(position);
};

const getSideBadge = (side: string | null) => {
  switch (side) {
    case 'left': return { text: 'L', bg: 'bg-orange-500', title: 'Left-sided specialist' };
    case 'right': return { text: 'R', bg: 'bg-blue-500', title: 'Right-sided specialist' };
    case 'both': return { text: 'L/R', bg: 'bg-gray-500', title: 'Versatile - plays both sides' };
    default: return { text: '?', bg: 'bg-yellow-500', title: 'Developing - side not yet determined' };
  }
};

const getTeamAbbr = (teamName: string): string => {
  return TEAM_ABBRS[teamName] || teamName.substring(0, 3).toUpperCase();
};

const formatNationality = (nationality: string, state: string | null): string => {
  return state ? `${nationality}, ${state}` : nationality;
};

const getTraitDisplay = (trait: string | null): string | null => {
  if (!trait) return null;
  return TRAIT_DISPLAY_NAMES[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
};

const getOvrColor = (ovr: number): string => {
  if (ovr >= 50) return 'bg-green-500';
  if (ovr >= 45) return 'bg-purple-500';
  if (ovr >= 40) return 'bg-blue-500';
  if (ovr >= 35) return 'bg-teal-500';
  if (ovr >= 30) return 'bg-yellow-500';
  if (ovr >= 25) return 'bg-orange-500';
  return 'bg-red-500';
};

const getFitnessColor = (fitness: number): string => {
  if (fitness >= 70) return 'text-green-500';
  if (fitness >= 40) return 'text-yellow-500';
  return 'text-red-500';
};

const getTierLabel = (value: number): string => TIER_LABELS[value] || 'NONE';
const getTierColorClass = (value: number): string => TIER_COLORS[value] || TIER_COLORS[1];

// ============================================
// COMPONENTS
// ============================================

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
        style={{ width: size, height: size, borderColor: tertiaryColor }}
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
        x="50" y="50" textAnchor="middle" dominantBaseline="middle"
        fill={tertiaryColor} fontSize="22" fontWeight="bold" fontFamily="Arial, sans-serif"
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
      <defs>{renderPattern()}</defs>
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
        fill={jerseyFill} stroke={trimColor} strokeWidth="2"
      />
      <path d="M40 38 L50 50 L60 38" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 52 L20 54" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
      <path d="M85 52 L80 54" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
      {teamAbbr && (
        <>
          <text x="50" y="76" textAnchor="middle" fill={accentColor} stroke={accentColor} strokeWidth="3" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
            {teamAbbr}
          </text>
          <text x="50" y="76" textAnchor="middle" fill={trimColor} fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
            {teamAbbr}
          </text>
        </>
      )}
      <path d="M10 65 Q2 72 8 85 L16 82 Q10 72 16 68" fill="#F5D0B5" />
      <ellipse cx="12" cy="86" rx="5" ry="4" fill="#F5D0B5" />
      <path d="M90 65 Q98 72 92 85 L84 82 Q90 72 84 68" fill="#F5D0B5" />
      <ellipse cx="88" cy="86" rx="5" ry="4" fill="#F5D0B5" />
      <path d="M24 95 L22 115 L40 115 L50 100 L60 115 L78 115 L76 95 Z" fill={trimColor} stroke={mainColor} strokeWidth="1" />
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function SquadPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [releasing, setReleasing] = useState(false);
  // Transfer listing state
  const [showListForSale, setShowListForSale] = useState(false);
  const [listingPrice, setListingPrice] = useState<string>('');
  const [listingType, setListingType] = useState<'buyNow' | 'offers'>('offers');
  const [listing, setListing] = useState(false);
  const [isAlreadyListed, setIsAlreadyListed] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
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

      setTeamId(coach.team_id);

      // Parallel fetch for performance
      const [teamResult, playersResult] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name, primary_color, secondary_color, tertiary_color')
          .eq('id', coach.team_id)
          .single(),
        supabase
          .from('players')
          .select(`
            id, first_name, last_name, position, age, overall,
            speed, strength, power, passing, stamina, tackling, kicking,
            fatigue, potential, nationality, state, current_training, training_progress,
            dominant_side, ovr_change, ovr_changed_at, visible_trait, morale
          `)
          .eq('team_id', coach.team_id)
          .order('overall', { ascending: false }),
      ]);

      setTeam(teamResult.data);
      setPlayers(playersResult.data || []);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if selected player is already listed
  useEffect(() => {
    const checkIfListed = async () => {
      if (!selectedPlayer) {
        setIsAlreadyListed(false);
        return;
      }
      
      const { data } = await supabase
        .from('transfer_listings')
        .select('id')
        .eq('player_id', selectedPlayer.id)
        .eq('status', 'active')
        .single();
      
      setIsAlreadyListed(!!data);
    };
    
    checkIfListed();
  }, [selectedPlayer]);

  const handleReleasePlayer = useCallback(async () => {
    if (!selectedPlayer || !teamId || players.length <= MIN_SQUAD_SIZE) return;
    
    setReleasing(true);
    
    try {
      // Re-verify team ownership (security)
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

      if (!coach?.team_id || coach.team_id !== teamId) {
        console.error('Team ID mismatch - security issue');
        return;
      }

      // Validate player belongs to team
      const playerBelongsToTeam = players.some(p => p.id === selectedPlayer.id);
      if (!playerBelongsToTeam) {
        console.error('Player does not belong to team');
        return;
      }

      // Get current round
      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('round')
        .eq('played', false)
        .order('round', { ascending: true })
        .limit(1);

      const currentRound = fixtures?.[0]?.round || 1;

      // 1. Add to free agents
      const { error: insertError } = await supabase.from('free_agents').insert({
        player_id: selectedPlayer.id,
        released_by_team_id: coach.team_id,
        available_round: currentRound,
        claimed: false
      });
      
      if (insertError) {
        console.error('Insert error:', insertError);
        return;
      }

      // 2. Remove player from any tactics positions (batch update)
      const updateObj: Record<string, null> = {};
      POSITION_FIELDS.forEach(field => { updateObj[field] = null; });
      
      // First get the tactics row, then update only if player is in any position
      const { data: currentTactics } = await supabase
        .from('team_tactics')
        .select('*')
        .eq('team_id', coach.team_id)
        .single();

      if (currentTactics) {
        const fieldsToUpdate: Record<string, null> = {};
        POSITION_FIELDS.forEach(field => {
          if (currentTactics[field] === selectedPlayer.id) {
            fieldsToUpdate[field] = null;
          }
        });

        if (Object.keys(fieldsToUpdate).length > 0) {
          await supabase
            .from('team_tactics')
            .update(fieldsToUpdate)
            .eq('team_id', coach.team_id);
        }
      }

      // 3. Remove player from team
      const { error: updateError } = await supabase
        .from('players')
        .update({ team_id: null })
        .eq('id', selectedPlayer.id)
        .eq('team_id', coach.team_id);
        
      if (updateError) {
        console.error('Update error:', updateError);
        return;
      }

      // 4. Notify ALL coaches in the league (batch insert)
      const { data: allCoaches } = await supabase
        .from('coaches')
        .select('team_id');

      if (allCoaches && allCoaches.length > 0) {
        const notifications = allCoaches.map(c => ({
          team_id: c.team_id,
          type: c.team_id === coach.team_id ? 'player_released' : 'new_free_agent',
          title: c.team_id === coach.team_id ? '👋 Player Released' : '🏪 New Free Agent',
          message: c.team_id === coach.team_id 
            ? `You released ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position}, ${selectedPlayer.overall} OVR) to free agency.`
            : `${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position}, ${selectedPlayer.overall} OVR) has been released and is now available!`,
          player_id: selectedPlayer.id
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // 5. Refresh data and close modal
      await loadData();
      setSelectedPlayer(null);
      setShowReleaseConfirm(false);
      
    } catch (err) {
      console.error('Error releasing player:', err);
    } finally {
      setReleasing(false);
    }
  }, [selectedPlayer, teamId, players, loadData, router]);

  const closeModal = useCallback(() => {
    setSelectedPlayer(null);
    setShowReleaseConfirm(false);
    setShowListForSale(false);
    setListingPrice('');
    setListingType('offers');
  }, []);

  const handleListForSale = useCallback(async () => {
    if (!selectedPlayer || !teamId) return;
    
    setListing(true);
    
    try {
      const askingPrice = listingType === 'buyNow' && listingPrice 
        ? parseInt(listingPrice) * 100 
        : null;

      const { error } = await supabase.from('transfer_listings').insert({
        player_id: selectedPlayer.id,
        team_id: teamId,
        asking_price: askingPrice,
        status: 'active',
      });

      if (error) {
        console.error('List error:', error);
        return;
      }

      // Notify the coach
      await supabase.from('notifications').insert({
        team_id: teamId,
        type: 'player_listed',
        title: '🏷️ Player Listed',
        message: `${selectedPlayer.first_name} ${selectedPlayer.last_name} has been listed for transfer${askingPrice ? ` at $${(askingPrice / 100).toLocaleString()}` : ' (taking offers)'}.`,
        player_id: selectedPlayer.id,
      });

      closeModal();
      
    } catch (err) {
      console.error('Error listing player:', err);
    } finally {
      setListing(false);
    }
  }, [selectedPlayer, teamId, listingType, listingPrice, closeModal]);

  const renderStatRow = useCallback((label: string, value: number) => {
    const tierLabel = getTierLabel(value);
    const tierColorClass = getTierColorClass(value);

    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
        <span className="text-gray-300">{label}</span>
        <span className={`px-3 py-1 rounded font-bold text-sm ${tierColorClass}`}>
          {tierLabel}
        </span>
      </div>
    );
  }, []);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading squad...</div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

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
              <p className="text-white/80 text-lg">
                👥 Squad • <span className={players.length >= MAX_SQUAD_SIZE ? 'text-red-300' : ''}>{players.length}/{MAX_SQUAD_SIZE}</span> Players
              </p>
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
        {/* All Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const showSide = shouldShowSide(player.position);
            const sideBadge = getSideBadge(player.dominant_side);
            const traitDisplay = getTraitDisplay(player.visible_trait);
            
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
                    <p className="text-gray-500 text-xs">{formatNationality(player.nationality, player.state)}</p>
                    <div className="mt-2 text-sm text-gray-300">
                      <p>Position: {player.position}{showSide && ` (${sideBadge.text})`}</p>
                      {traitDisplay && (
                        <p>Trait: {traitDisplay}</p>
                      )}
                      <p className={MORALE_DISPLAY[player.morale]?.color || 'text-gray-400'}>
                        {MORALE_DISPLAY[player.morale]?.emoji} {MORALE_DISPLAY[player.morale]?.label || 'Content'}
                      </p>
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
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-300 text-lg font-semibold">{selectedPlayer.first_name}</p>
                <h2 className="text-2xl font-bold text-white">{selectedPlayer.last_name}</h2>
                <p className="text-gray-500 text-sm">{formatNationality(selectedPlayer.nationality, selectedPlayer.state)}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`${POSITION_COLORS[selectedPlayer.position] || 'bg-gray-600'} text-white text-sm px-3 py-1 rounded`}>
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
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
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
{/* Morale */}
            <div className="bg-gray-700 rounded p-3 mb-4">
              <p className="text-gray-400 text-xs">Morale</p>
              <p className={`text-lg font-semibold ${MORALE_DISPLAY[selectedPlayer.morale]?.color || 'text-gray-400'}`}>
                {MORALE_DISPLAY[selectedPlayer.morale]?.emoji} {MORALE_DISPLAY[selectedPlayer.morale]?.label || 'Content'}
              </p>
            </div>
            {/* Trait */}
            {selectedPlayer.visible_trait && (
              <button 
                onClick={() => router.push('/guide?section=traits')}
                className="w-full text-left bg-gray-700 rounded p-3 mb-4 hover:bg-gray-600 transition cursor-pointer"
              >
                <p className="text-gray-400 text-xs">Trait <span className="text-gray-500 ml-1">ⓘ</span></p>
                <p className="text-white font-semibold">{getTraitDisplay(selectedPlayer.visible_trait)}</p>
              </button>
            )}

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

            {/* Stats */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              {renderStatRow('Speed', selectedPlayer.speed)}
              {renderStatRow('Strength', selectedPlayer.strength)}
              {renderStatRow('Power', selectedPlayer.power)}
              {renderStatRow('Passing', selectedPlayer.passing)}
              {renderStatRow('Stamina', selectedPlayer.stamina)}
              {renderStatRow('Tackling', selectedPlayer.tackling)}
              {renderStatRow('Kicking', selectedPlayer.kicking)}
              <p className="text-gray-500 text-[10px] text-center mt-3 pt-2 border-t border-gray-600">
                NONE → POOR → OK → GOOD → GREAT → EXCELLENT → ELITE → LEGEND
              </p>
            </div>

            {/* Training Status */}
            {selectedPlayer.current_training && (
              <div className="bg-gray-700 rounded p-3 mb-4">
                <p className="text-gray-400 text-sm">Current Training</p>
                <p className="text-white font-semibold">{selectedPlayer.current_training}</p>
                <p className="text-yellow-500 text-sm">{selectedPlayer.training_progress || 'None'}</p>
              </div>
            )}

            {/* List for Sale Button */}
            {!showListForSale && !showReleaseConfirm && (
              <button
                onClick={() => setShowListForSale(true)}
                disabled={isAlreadyListed}
                className={`w-full mb-2 font-bold py-3 rounded-lg transition ${
                  isAlreadyListed
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600'
                }`}
              >
                {isAlreadyListed ? '🏷️ Already Listed for Sale' : '🏷️ List for Sale'}
              </button>
            )}

            {showListForSale && (
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-2">
                <p className="text-blue-400 font-bold mb-3">🏷️ List for Transfer</p>
                
                <div className="mb-3">
                  <label className="text-gray-400 text-sm block mb-2">Listing Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setListingType('offers')}
                      className={`flex-1 py-2 rounded font-bold transition ${
                        listingType === 'offers' 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      Taking Offers
                    </button>
                    <button
                      onClick={() => setListingType('buyNow')}
                      className={`flex-1 py-2 rounded font-bold transition ${
                        listingType === 'buyNow' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      Buy Now Price
                    </button>
                  </div>
                </div>

                {listingType === 'buyNow' && (
                  <div className="mb-3">
                    <label className="text-gray-400 text-sm block mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                      placeholder="Enter price"
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowListForSale(false);
                      setListingPrice('');
                      setListingType('offers');
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleListForSale}
                    disabled={listing || (listingType === 'buyNow' && !listingPrice)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-2 rounded-lg transition"
                  >
                    {listing ? 'Listing...' : 'List Player'}
                  </button>
                </div>
              </div>
            )}

            {/* Release Player Button */}
            {!showReleaseConfirm && !showListForSale ? (
              <button
                onClick={() => setShowReleaseConfirm(true)}
                disabled={players.length <= MIN_SQUAD_SIZE}
                className={`w-full mb-2 font-bold py-3 rounded-lg transition ${
                  players.length <= MIN_SQUAD_SIZE
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600'
                }`}
              >
                {players.length <= MIN_SQUAD_SIZE ? `🔒 Cannot Release (Min ${MIN_SQUAD_SIZE} Players)` : '🚪 Release Player'}
              </button>
            ) : showReleaseConfirm ? (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-2">
                <p className="text-red-400 font-bold mb-2">⚠️ Are you sure?</p>
                <p className="text-gray-300 text-sm mb-4">
                  Release <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> ({selectedPlayer.overall} OVR)?
                  They will become a free agent visible to ALL teams.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReleaseConfirm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReleasePlayer}
                    disabled={releasing}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-2 rounded-lg transition"
                  >
                    {releasing ? 'Releasing...' : 'Confirm Release'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Close Button */}
            <button
              onClick={closeModal}
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
