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
  division: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
  nationality: string;
  state: string | null;
}

interface Coach {
  id: string;
  team_id: string;
  last_academy_pull_round: number;
}

// ============================================================================
// CONSTANTS FOR PLAYER GENERATION
// ============================================================================

const NATIONALITIES = {
  AUS: { percentage: 55 },
  NZL: { percentage: 15 },
  TON: { percentage: 8 },
  SAM: { percentage: 7 },
  FIJ: { percentage: 6 },
  PNG: { percentage: 5 },
  ENG: { percentage: 4 }
};

const AUSTRALIAN_STATES = {
  NSW: { percentage: 45 },
  QLD: { percentage: 45 },
  ROA: { percentage: 10 }
};

const NAME_POOLS: Record<string, { firstNames: string[], lastNames: string[] }> = {
  ANGLO: {
    firstNames: ['Jack', 'Tom', 'James', 'William', 'Oliver', 'Harry', 'Charlie', 'Thomas', 'George', 'Oscar', 'Henry', 'Leo', 'Joshua', 'Ethan', 'Lucas', 'Mason', 'Logan', 'Jacob', 'Michael', 'Daniel', 'Matthew', 'Ryan', 'Nathan', 'Luke', 'Benjamin', 'Samuel', 'Dylan', 'Connor', 'Liam', 'Noah', 'Cooper', 'Riley', 'Harrison', 'Blake', 'Tyler', 'Jayden', 'Mitchell', 'Lachlan', 'Caleb', 'Max', 'Angus', 'Finn', 'Patrick', 'Sean', 'Declan', 'Aiden', 'Brody', 'Zach', 'Cody', 'Shane'],
    lastNames: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Walker', 'Harris', 'Lewis', 'Robinson', 'Clark', 'Young', 'Hall', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Moore', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Collins', 'Stewart', 'Murphy', 'Cook', 'Rogers', 'Morgan', "O'Brien", "O'Connor", 'Kennedy', 'Walsh', 'Quinn', 'Lynch', 'Brady']
  },
  MAORI: {
    firstNames: ['Tane', 'Nikau', 'Rawiri', 'Wiremu', 'Manaaki', 'Ihaia', 'Kauri', 'Tamati', 'Tipene', 'Hemi', 'Matiu', 'Pita', 'Rewi', 'Tama', 'Eru', 'Rangi', 'Hoani', 'Mikaere', 'Hone', 'Paora', 'Josh', 'Shaun', 'Benji', 'Manu', 'Kieran', 'Dallin', 'Joseph', 'Jordan', 'Jahrome', 'Nelson', 'Dylan', 'Charnze', 'Jared', 'Kodi', 'Issac', 'Tohu', 'Ruben', 'Brandon', 'Isaiah'],
    lastNames: ['Taukeiaho', 'Manu', 'Tuivasa-Sheck', 'Rapana', 'Nikora', 'Tapine', 'Taumalolo', 'Williams', 'Harris', 'Thompson', 'Hughes', 'Bromwich', 'Smith', 'Johnson', 'Marshall', 'Foran', 'Matulino', 'Blair', 'Henare', 'Mannering', 'Hurrell', 'Kata', 'Hiku', 'Lino', 'Nikorima', 'Kearney', 'Nightingale', 'Laulala', 'Sipley', 'Afoa', 'Pompey', 'Curran']
  },
  TONGAN: {
    firstNames: ['Jason', 'Manu', 'Tevita', 'Sione', 'Taniela', 'Siliva', 'Konrad', 'Addin', 'Daniel', 'David', 'Felise', 'Sitili', 'Kotoni', 'Haumole', 'Will', 'Moeaki', 'Junior', 'Ata', 'Sio', 'Fotu', 'Tui', 'Sika', 'Viliami', 'Malakai', 'Michael', 'Mosese'],
    lastNames: ['Taumalolo', 'Fifita', 'Havili', 'Kaufusi', 'Pangai', 'Fonua', 'Fainu', 'Katoa', 'Tatola', 'Tupou', 'Lolohea', 'Maumalo', 'Koloamatangi', 'Hopoate', 'Finau', 'Tonga', 'Folau', 'Fotuaika', 'Haas', 'Taupau', 'Fonua-Blake', 'Talakai', 'Moimoi', 'Vea', 'Langi']
  },
  SAMOAN: {
    firstNames: ['Jarome', 'Brian', 'Junior', 'Anthony', 'Martin', 'Tim', 'Ricky', 'Josh', 'Luciano', 'Spencer', 'Chanel', 'Jaydn', 'Isaiah', 'Kelma', 'Stephen', 'Francis', 'Joseph', 'Danny', 'Manu', 'Tino', 'Siua', 'Tyrone', 'Sebastian', 'Zane', 'Jerome', 'Penani', 'Leone'],
    lastNames: ['Luai', "To'o", 'Papalii', 'Aloiai', 'Milford', 'Afoa', 'Leilua', 'Lafai', 'Talagi', 'Tago', 'Crichton', 'Tagataese', 'Faamausili', 'Tuimavave', 'Paulo', 'Tuilagi', 'Sao', 'Sauiluma', 'Gavet', 'Peteru', 'Amone', 'Levi', 'Soliola', 'Vitale', 'Ioane', 'Leota']
  },
  FIJIAN: {
    firstNames: ['Maika', 'Suliasi', 'Marcelo', 'Viliame', 'Semi', 'Apisai', 'Kevin', 'Mikaele', 'Tariq', 'Henry', 'Brayden', 'Taane', 'Vunisei', 'Pio', 'Api', 'Sitiveni', 'Waisea', 'Joeli', 'Josefa', 'Nemani', 'Iowane', 'Setareki', 'Penioni', 'Kini'],
    lastNames: ['Sivo', 'Vunivalu', 'Naiqama', 'Koroibete', 'Tuqiri', 'Radradra', 'Koroisau', 'Waqaniburotu', 'Nakubuwai', 'Uluinayau', 'Bai', 'Mataka', 'Nawaqanitawase', 'Lovobalavu', 'Naivalu', 'Tuisova', 'Botia', 'Yato', 'Mata', 'Natogo', 'Qera', 'Delai']
  },
  PNG: {
    firstNames: ['David', 'James', 'Michael', 'John', 'Paul', 'William', 'Justin', 'Alex', 'Marcus', 'Nene', 'Wartovo', 'Kato', 'Enock', 'Thompson', 'Wellington', 'Edwin', 'Norman', 'Watson', 'Stargroth', 'Xavier', 'Lachlan', 'Terry', 'Roderick', 'Emmanuel', 'Nixon'],
    lastNames: ['Lam', 'Aiton', 'Segeyaro', 'Mead', 'Boas', 'Songoro', 'Ottio', 'Mundo', 'Kila', 'Ako', 'Mamando', 'Simon', 'Tep', 'Numbaru', 'Kahu', 'Namba', 'Gimai', 'Morea', 'Wangi', 'Ongogo', 'Minga', 'Olam', 'Silas', 'Albert']
  }
};

const NATIONALITY_NAME_POOL: Record<string, string> = {
  AUS: 'ANGLO',
  ENG: 'ANGLO',
  NZL: 'MAORI',
  TON: 'TONGAN',
  SAM: 'SAMOAN',
  FIJ: 'FIJIAN',
  PNG: 'PNG'
};

const POSITION_STATS: Record<string, { primary: string[], secondary: string[], minor: string[], negligible: string[] }> = {
  'Prop': { primary: ['strength', 'defense'], secondary: ['stamina', 'skill'], minor: ['speed'], negligible: ['kicking'] },
  'Hooker': { primary: ['skill', 'stamina'], secondary: ['defense', 'speed'], minor: ['strength'], negligible: ['kicking'] },
  'Second Row': { primary: ['strength', 'defense'], secondary: ['stamina', 'skill'], minor: ['speed'], negligible: ['kicking'] },
  'Lock': { primary: ['defense', 'stamina'], secondary: ['strength', 'skill'], minor: ['speed'], negligible: ['kicking'] },
  'Halfback': { primary: ['skill', 'kicking'], secondary: ['speed', 'stamina'], minor: ['defense'], negligible: ['strength'] },
  'Five-Eighth': { primary: ['skill', 'kicking'], secondary: ['speed', 'defense'], minor: ['stamina'], negligible: ['strength'] },
  'Centre': { primary: ['defense', 'skill'], secondary: ['speed', 'strength'], minor: ['stamina'], negligible: ['kicking'] },
  'Winger': { primary: ['speed', 'skill'], secondary: ['stamina', 'defense'], minor: ['strength'], negligible: ['kicking'] },
  'Fullback': { primary: ['speed', 'skill'], secondary: ['kicking', 'defense'], minor: ['stamina'], negligible: ['strength'] }
};

const GOAL_KICKING_BY_POSITION: Record<string, { avg: number, min: number, max: number }> = {
  'Halfback': { avg: 72, min: 50, max: 95 },
  'Five-Eighth': { avg: 68, min: 45, max: 92 },
  'Fullback': { avg: 65, min: 40, max: 90 },
  'Centre': { avg: 45, min: 20, max: 75 },
  'Hooker': { avg: 40, min: 15, max: 70 },
  'Winger': { avg: 38, min: 15, max: 72 },
  'Lock': { avg: 25, min: 5, max: 50 },
  'Second Row': { avg: 22, min: 5, max: 45 },
  'Prop': { avg: 18, min: 5, max: 40 }
};

const TIER_NAMES: Record<number, string> = {
  1: 'None', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Very Good', 6: 'Excellent', 7: 'Elite', 8: 'World Class'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateNationality(): string {
  const nats = Object.entries(NATIONALITIES);
  return weightedRandomChoice(nats.map(n => n[0]), nats.map(n => n[1].percentage));
}

function generateState(nationality: string): string | null {
  if (nationality !== 'AUS') return null;
  const states = Object.entries(AUSTRALIAN_STATES);
  return weightedRandomChoice(states.map(s => s[0]), states.map(s => s[1].percentage));
}

function generateName(nationality: string): { firstName: string, lastName: string } {
  const poolKey = NATIONALITY_NAME_POOL[nationality] || 'ANGLO';
  const pool = NAME_POOLS[poolKey];
  return {
    firstName: randomChoice(pool.firstNames),
    lastName: randomChoice(pool.lastNames)
  };
}

function generateGoalKicking(position: string): number {
  // 5% chance of hidden gem
  if (Math.random() < 0.05) {
    return randomInt(85, 95);
  }
  const config = GOAL_KICKING_BY_POSITION[position] || { avg: 30, min: 5, max: 50 };
  const variance = (config.max - config.min) / 4;
  let value = config.avg + (Math.random() - 0.5) * variance * 2;
  return Math.max(config.min, Math.min(config.max, Math.round(value)));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DevelopmentSquadPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPositionType, setSelectedPositionType] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [newPlayer, setNewPlayer] = useState<any | null>(null);
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

      const { data: coachData } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!coachData?.team_id) {
        router.push('/choose-team');
        return;
      }

      setCoach(coachData);

      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coachData.team_id)
        .single();

      setTeam(teamData);

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', coachData.team_id)
        .order('overall', { ascending: true });

      setPlayers(playersData || []);

      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('round')
        .eq('played', false)
        .order('round', { ascending: true })
        .limit(1);

      const round = fixtures && fixtures.length > 0 ? fixtures[0].round : 1;
      setCurrentRound(round);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (positionType: string) => {
    setSelectedPositionType(positionType);
    if (players.length >= 22) {
      setShowReleaseModal(true);
    } else {
      generateAndAddPlayer(positionType, null);
    }
  };

  const generateAndAddPlayer = async (positionType: string, releasePlayerId: string | null) => {
    if (!team || !coach) return;
    setProcessing(true);

    try {
      // Release player if needed
      if (releasePlayerId) {
        await supabase.from('free_agents').insert({
          player_id: releasePlayerId,
          released_by_team_id: team.id,
          available_round: currentRound + 1
        });
        await supabase.from('players').delete().eq('id', releasePlayerId);
      }

      // Position groups
      const positions: Record<string, string[]> = {
        forward: ['Prop', 'Second Row', 'Lock'],
        back: ['Fullback', 'Winger', 'Centre'],
        half: ['Halfback', 'Five-Eighth', 'Hooker']
      };

      const posOptions = positions[positionType];
      const position = randomChoice(posOptions);

      // Generate nationality and name
      const nationality = generateNationality();
      const state = generateState(nationality);
      const { firstName, lastName } = generateName(nationality);

      // Calculate patience bonus (rounds waited)
      const roundsWaited = coach.last_academy_pull_round > 0 
        ? currentRound - coach.last_academy_pull_round 
        : 0;
      const patienceBonus = Math.min(20, Math.floor(roundsWaited / 6) * 5); // +5% per cooldown, max 20%

      // Generate potential (1-5 stars) with patience bonus
      // Youth players have higher chance of good potential
      let potentialWeights = [15, 25, 35, 20, 5]; // Base weights for 1-5 stars
      // Apply patience bonus to higher potentials
      if (patienceBonus > 0) {
        potentialWeights[3] += patienceBonus / 2; // +HIGH
        potentialWeights[4] += patienceBonus / 2; // +ELITE
      }
      const potential = weightedRandomChoice([1, 2, 3, 4, 5], potentialWeights);

      // Generate stats based on position and potential
      const posStats = POSITION_STATS[position];
      const stats: Record<string, number> = {};

      // Base tier range for youth (age 18)
      // Higher potential = slightly better starting stats
      const baseMin = 2;
      const baseMax = 3 + potential;

      ['speed', 'strength', 'skill', 'stamina', 'defense', 'kicking'].forEach(stat => {
        let min = baseMin;
        let max = baseMax;

        if (posStats.primary.includes(stat)) {
          min += 1; max += 1;
        } else if (posStats.secondary.includes(stat)) {
          // normal
        } else if (posStats.minor.includes(stat)) {
          max -= 1;
        } else {
          min = 1; max -= 1;
        }

        // Clamp and generate with bell curve
        min = Math.max(1, min);
        max = Math.min(8, Math.max(min, max));
        const r1 = randomInt(min, max);
        const r2 = randomInt(min, max);
        stats[stat] = Math.round((r1 + r2) / 2);
      });

      // Calculate OVR
      let overall = stats.speed + stats.strength + stats.skill + stats.stamina + stats.defense + stats.kicking;
      
      // Enforce minimum OVR of 12
      if (overall < 12) {
        const statKeys = ['speed', 'strength', 'skill', 'stamina', 'defense', 'kicking'];
        while (overall < 12) {
          const lowest = statKeys.reduce((a, b) => stats[a] <= stats[b] ? a : b);
          stats[lowest] = Math.min(8, stats[lowest] + 1);
          overall = stats.speed + stats.strength + stats.skill + stats.stamina + stats.defense + stats.kicking;
        }
      }

      // Calculate match power (hidden)
      let matchPower = 0;
      ['speed', 'strength', 'skill', 'stamina', 'defense', 'kicking'].forEach(stat => {
        if (posStats.primary.includes(stat)) {
          matchPower += stats[stat] * 4;
        } else if (posStats.secondary.includes(stat)) {
          matchPower += stats[stat] * 2;
        } else if (posStats.minor.includes(stat)) {
          matchPower += stats[stat] * 1;
        }
      });

      // Generate hidden goal kicking
      const goalKicking = generateGoalKicking(position);

      // Insert new player
      const { data: newPlayerData, error } = await supabase
        .from('players')
        .insert({
          team_id: team.id,
          first_name: firstName,
          last_name: lastName,
          position: position,
          age: 18,
          nationality: nationality,
          state: state,
          speed: stats.speed,
          strength: stats.strength,
          skill: stats.skill,
          stamina: stats.stamina,
          defense: stats.defense,
          kicking: stats.kicking,
          overall: overall,
          match_power: matchPower,
          goal_kicking: goalKicking,
          goal_kick_attempts: 0,
          goal_kick_successes: 0,
          potential: potential,
          fatigue: 0,
          training_progress: 0,
          retiring_end_of_season: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update coach last pull round
      await supabase
        .from('coaches')
        .update({ last_academy_pull_round: currentRound })
        .eq('id', coach.id);

      // Notify ALL teams in the division about the new player
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('division', team.division);

      for (const t of allTeams || []) {
        await supabase.from('notifications').insert({
          team_id: t.id,
          type: 'league_news',
          title: '📰 Development Squad Promotion',
          message: `${team.name} promoted ${firstName} ${lastName} (${position}, ${overall} OVR, Age 18) from their development squad.`
        });
      }

      // If a player was released, notify everyone
      if (releasePlayerId && selectedPlayer) {
        for (const t of allTeams || []) {
          await supabase.from('notifications').insert({
            team_id: t.id,
            type: 'league_news',
            title: '🏪 Player Released to Free Agents',
            message: `${team.name} released ${selectedPlayer.first_name} ${selectedPlayer.last_name} (${selectedPlayer.position}, ${selectedPlayer.overall} OVR, Age ${(selectedPlayer as any).age}). Available next round.`
          });
        }
      }

      // Show the new player
      setNewPlayer({ ...newPlayerData, potential });

      // Reload data
      await loadData();

    } catch (err) {
      console.error('Error promoting player:', err);
    } finally {
      setProcessing(false);
      setShowReleaseModal(false);
      setSelectedPlayer(null);
      setSelectedPositionType(null);
    }
  };

  const hasPromotedBefore = coach && coach.last_academy_pull_round > 0;
  const canPromote = coach && (!hasPromotedBefore || (currentRound - coach.last_academy_pull_round) >= 6);
  const roundsUntilPromote = hasPromotedBefore ? Math.max(0, 6 - (currentRound - (coach?.last_academy_pull_round || 0))) : 0;
  const roundsWaited = coach && coach.last_academy_pull_round > 0 ? currentRound - coach.last_academy_pull_round : 0;
  const patienceLevel = Math.floor(roundsWaited / 6);

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
        <div className="max-w-4xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🎓 Development Squad</h1>
          <p className="text-white/70 mt-1">Promote youth talent to your senior squad</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* Promote Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">Promote a Youth Player</h2>
          <p className="text-gray-400 mb-4">
            Select a position group to promote a random youth player to your senior squad.
            Quality varies - you might get a future star or a squad filler!
          </p>

          {!canPromote && hasPromotedBefore && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 p-3 rounded mb-4">
              ⏳ You can promote again in <strong>{roundsUntilPromote}</strong> round{roundsUntilPromote !== 1 ? 's' : ''}
            </div>
          )}

          {canPromote && patienceLevel > 0 && (
            <div className="bg-green-500/20 border border-green-500 text-green-400 p-3 rounded mb-4">
              🍀 Patience bonus active! +{Math.min(20, patienceLevel * 5)}% chance of HIGH/ELITE potential
            </div>
          )}

          {players.length >= 22 && canPromote && (
            <div className="bg-blue-500/20 border border-blue-500 text-blue-400 p-3 rounded mb-4">
              📋 Squad full (22 players). You'll need to release someone to make room.
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handlePromote('forward')}
              disabled={!canPromote || processing}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">💪</div>
              <div className="text-lg">Forward</div>
              <div className="text-xs text-white/70 mt-1">Prop, 2nd Row, Lock</div>
            </button>
            <button
              onClick={() => handlePromote('back')}
              disabled={!canPromote || processing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-lg">Back</div>
              <div className="text-xs text-white/70 mt-1">Fullback, Winger, Centre</div>
            </button>
            <button
              onClick={() => handlePromote('half')}
              disabled={!canPromote || processing}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 px-4 rounded-lg transition"
            >
              <div className="text-3xl mb-2">🧠</div>
              <div className="text-lg">Half</div>
              <div className="text-xs text-white/70 mt-1">Halfback, Five-Eighth, Hooker</div>
            </button>
          </div>

          <div className="mt-4 text-gray-500 text-sm">
            💡 Youth quality is random. Waiting longer between promotions increases your chances of finding a gem!
          </div>
        </div>

        {/* Squad Count */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Current Squad Size</span>
            <span className={`text-xl font-bold ${players.length >= 22 ? 'text-red-400' : 'text-green-400'}`}>
              {players.length}/22
            </span>
          </div>
        </div>
      </div>

      {/* Release Modal */}
      {showReleaseModal && selectedPositionType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-2">Release a Player</h3>
            <p className="text-gray-400 mb-4">
              Squad is full. Select a player to release to make room:
            </p>

            <div className="space-y-2 mb-4">
              {players.map(player => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    selectedPlayer?.id === player.id 
                      ? 'bg-red-600/30 border-2 border-red-500' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${getOvrColor(player.overall)} text-white text-sm font-bold px-2 py-1 rounded`}>
                        {player.overall}
                      </div>
                      <div>
                        <p className="text-white">{player.first_name} {player.last_name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded text-white ${getPositionColor(player.position)}`}>
                            {player.position}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {player.nationality}{player.state ? `, ${player.state}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">Age {player.age}</div>
                  </div>
                </div>
              ))}
            </div>

            {selectedPlayer && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4">
                ⚠️ <strong>{selectedPlayer.first_name} {selectedPlayer.last_name}</strong> will be released to free agents.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setSelectedPlayer(null);
                  setSelectedPositionType(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => generateAndAddPlayer(selectedPositionType, selectedPlayer?.id || null)}
                disabled={!selectedPlayer || processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Player Reveal Modal */}
      {newPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">New Player!</h3>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="flex justify-center items-center gap-3 mb-2">
                <span className={`${getOvrColor(newPlayer.overall)} text-white text-2xl font-bold px-3 py-1 rounded`}>
                  {newPlayer.overall}
                </span>
              </div>
              <p className="text-yellow-500 text-sm mb-2">{getOvrStars(newPlayer.overall)}</p>
              <p className="text-gray-300 text-lg font-semibold">{newPlayer.first_name}</p>
              <p className="text-white text-2xl font-bold">{newPlayer.last_name}</p>
              <p className="text-gray-500 text-sm">
                {newPlayer.nationality}{newPlayer.state ? `, ${newPlayer.state}` : ''}
              </p>
              <span className={`inline-block text-sm px-3 py-1 rounded text-white mt-2 ${getPositionColor(newPlayer.position)}`}>
                {newPlayer.position}
              </span>
              <p className="text-gray-400 mt-2">Age {newPlayer.age}</p>
            </div>

            {newPlayer.overall >= 30 && (
              <div className="bg-green-500/20 border border-green-500 text-green-400 p-2 rounded mb-4">
                ⭐ Great find! This one could be special!
              </div>
            )}

            <button
              onClick={() => setNewPlayer(null)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
