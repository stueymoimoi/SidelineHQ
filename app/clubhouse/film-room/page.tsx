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
  wins: number;
  draws: number;
  losses: number;
  points_for: number;
  points_against: number;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  overall: number;
  age: number;
  dominant_side?: string;
}

interface Fixture {
  id: string;
  round: number;
  home_team_id: string;
  away_team_id: string;
  played: boolean;
}

interface ScoutReport {
  team: Team;
  players: Player[];
  recentForm: { result: 'W' | 'L' | 'D'; score: string; opponent: string }[];
  attackTendency: string;
  keyThreats: Player[];
  headToHead: { result: 'W' | 'L' | 'D'; score: string; round: number }[];
}

const getAttackHint = (attackFocus: string | null): string => {
  switch (attackFocus) {
    case 'raid_left':
      return 'Likes to attack down the left edge';
    case 'raid_right':
      return 'Favours the right side attack';
    case 'up_the_guts':
      return 'Runs hard through the middle';
    case 'off_the_cuff':
      return 'Unpredictable — plays off the cuff';
    case 'structured':
    default:
      return 'Plays a structured, balanced game';
  }
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

const shouldShowSide = (position: string) => {
  return ['Winger', 'Centre', 'Second Row'].includes(position);
};

const getSideBadge = (side: string | undefined) => {
  switch (side) {
    case 'left':
      return { text: 'L', bg: 'bg-orange-500', title: 'Left-sided' };
    case 'right':
      return { text: 'R', bg: 'bg-blue-500', title: 'Right-sided' };
    case 'both':
      return { text: 'L/R', bg: 'bg-gray-500', title: 'Versatile' };
    case 'none':
    default:
      return { text: '?', bg: 'bg-yellow-500', title: 'Developing' };
  }
};

export default function FilmRoomPage() {
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [nextFixture, setNextFixture] = useState<Fixture | null>(null);
  const [scoutReport, setScoutReport] = useState<ScoutReport | null>(null);
  const [allTeams, setAllTeams] = useState<Record<string, Team>>({});
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

      setMyTeam(teamData);

      const { data: teamsData } = await supabase.from('teams').select('*');
      const teamsMap: Record<string, Team> = {};
      teamsData?.forEach(t => { teamsMap[t.id] = t; });
      setAllTeams(teamsMap);

      const { data: fixtures } = await supabase
        .from('fixtures')
        .select('*')
        .eq('played', false)
        .or(`home_team_id.eq.${coach.team_id},away_team_id.eq.${coach.team_id}`)
        .order('round', { ascending: true })
        .limit(1);

      if (fixtures && fixtures.length > 0) {
        const fixture = fixtures[0];
        setNextFixture(fixture);

        const opponentId = fixture.home_team_id === coach.team_id 
          ? fixture.away_team_id 
          : fixture.home_team_id;

        await scoutOpponent(opponentId, coach.team_id, teamsMap);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const scoutOpponent = async (opponentId: string, myTeamId: string, teamsMap: Record<string, Team>) => {
    const opponent = teamsMap[opponentId];
    if (!opponent) return;

    const { data: playersData } = await supabase
      .from('players')
      .select('id, first_name, last_name, position, overall, age, dominant_side')
      .eq('team_id', opponentId)
      .order('overall', { ascending: false })
      .limit(17);

    const { data: tactics } = await supabase
      .from('team_tactics')
      .select('attack_focus')
      .eq('team_id', opponentId)
      .single();

    const { data: recentResults } = await supabase
      .from('match_results')
      .select('*, fixtures(*)')
      .or(`home_team_id.eq.${opponentId},away_team_id.eq.${opponentId}`)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentForm: { result: 'W' | 'L' | 'D'; score: string; opponent: string }[] = [];
    recentResults?.forEach(match => {
      const isHome = match.home_team_id === opponentId;
      const theirScore = isHome ? match.home_score : match.away_score;
      const oppScore = isHome ? match.away_score : match.home_score;
      const oppTeamId = isHome ? match.away_team_id : match.home_team_id;
      
      let result: 'W' | 'L' | 'D' = 'D';
      if (theirScore > oppScore) result = 'W';
      else if (theirScore < oppScore) result = 'L';

      recentForm.push({
        result,
        score: `${theirScore}-${oppScore}`,
        opponent: teamsMap[oppTeamId]?.name || 'Unknown'
      });
    });

    const { data: h2hResults } = await supabase
      .from('match_results')
      .select('*, fixtures(*)')
      .or(`and(home_team_id.eq.${opponentId},away_team_id.eq.${myTeamId}),and(home_team_id.eq.${myTeamId},away_team_id.eq.${opponentId})`)
      .order('created_at', { ascending: false });

    const headToHead: { result: 'W' | 'L' | 'D'; score: string; round: number }[] = [];
    h2hResults?.forEach(match => {
      const myTeamIsHome = match.home_team_id === myTeamId;
      const myScore = myTeamIsHome ? match.home_score : match.away_score;
      const theirScore = myTeamIsHome ? match.away_score : match.home_score;
      
      let result: 'W' | 'L' | 'D' = 'D';
      if (myScore > theirScore) result = 'W';
      else if (myScore < theirScore) result = 'L';

      headToHead.push({
        result,
        score: `${myScore}-${theirScore}`,
        round: match.fixtures?.round || 0
      });
    });

    const keyThreats = (playersData || []).slice(0, 3);

    setScoutReport({
      team: opponent,
      players: playersData || [],
      recentForm,
      attackTendency: getAttackHint(tactics?.attack_focus),
      keyThreats,
      headToHead
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading film room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${myTeam?.primary_color} 0%, ${myTeam?.secondary_color} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">🎬 Film Room</h1>
          <p className="text-white/80">Scout your next opponent</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        
        {!nextFixture ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">No upcoming fixtures</p>
            <p className="text-gray-500 mt-2">Check back when the next round is scheduled</p>
          </div>
        ) : !scoutReport ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-xl">Loading scout report...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Opponent Header */}
            <div 
              className="rounded-xl p-6"
              style={{
                background: `linear-gradient(135deg, ${scoutReport.team.primary_color}40 0%, ${scoutReport.team.secondary_color}40 100%)`,
                border: `2px solid ${scoutReport.team.primary_color}`
              }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-400 text-sm">ROUND {nextFixture.round} OPPONENT</p>
                  <h2 className="text-3xl font-bold text-white">{scoutReport.team.name}</h2>
                  <p className="text-gray-300">
                    {scoutReport.team.wins}W - {scoutReport.team.draws}D - {scoutReport.team.losses}L
                    <span className="text-gray-500 ml-2">
                      (PD: {scoutReport.team.points_for - scoutReport.team.points_against > 0 ? '+' : ''}
                      {scoutReport.team.points_for - scoutReport.team.points_against})
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    {nextFixture.home_team_id === myTeam?.id ? '🏠 HOME' : '✈️ AWAY'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Recent Form */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-bold mb-3">📈 Recent Form</h3>
                {scoutReport.recentForm.length === 0 ? (
                  <p className="text-gray-500 text-sm">No matches played yet</p>
                ) : (
                  <div className="space-y-2">
                    {scoutReport.recentForm.map((match, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                          match.result === 'W' ? 'bg-green-600 text-white' :
                          match.result === 'L' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {match.result}
                        </span>
                        <span className="text-gray-400 flex-1 mx-2 truncate">{match.opponent}</span>
                        <span className="text-white font-mono">{match.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attack Tendency */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-bold mb-3">⚔️ Attack Tendency</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-yellow-400 text-lg font-medium">
                    "{scoutReport.attackTendency}"
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Based on scouting reports
                  </p>
                </div>
              </div>

              {/* Head to Head */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-bold mb-3">🤝 Head to Head</h3>
                {scoutReport.headToHead.length === 0 ? (
                  <p className="text-gray-500 text-sm">First meeting this season</p>
                ) : (
                  <div className="space-y-2">
                    {scoutReport.headToHead.map((match, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Round {match.round}</span>
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                          match.result === 'W' ? 'bg-green-600 text-white' :
                          match.result === 'L' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {match.result}
                        </span>
                        <span className="text-white font-mono">{match.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Key Threats */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">⚠️ Key Threats</h3>
              <p className="text-gray-500 text-sm mb-4">Watch out for these players</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scoutReport.keyThreats.map((player, i) => {
                  const showSide = shouldShowSide(player.position);
                  const sideBadge = getSideBadge(player.dominant_side);
                  
                  return (
                    <div 
                      key={player.id} 
                      className="bg-gray-700 rounded-lg p-4 border-l-4"
                      style={{ borderColor: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#eab308' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-400 text-xs">{player.first_name}</p>
                          <p className="text-white font-bold text-lg">{player.last_name}</p>
                        </div>
                        <span className="text-2xl font-bold text-green-400">{player.overall}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getPositionColor(player.position)}`}>
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
                        <span className="text-gray-500 text-xs">Age {player.age}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Squad */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">👥 Their Squad</h3>
              <p className="text-gray-500 text-sm mb-4">Top 17 players by overall rating</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {scoutReport.players.map((player, i) => {
                  const showSide = shouldShowSide(player.position);
                  const sideBadge = getSideBadge(player.dominant_side);
                  
                  return (
                    <div 
                      key={player.id} 
                      className="bg-gray-700 rounded p-3 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                        <div>
                          <p className="text-white font-medium">
                            {player.first_name} {player.last_name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-500 text-xs">{player.position}</span>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-gray-500 text-xs">{player.age}yo</span>
                            {showSide && (
                              <>
                                <span className="text-gray-600 text-xs">•</span>
                                <span 
                                  className={`${sideBadge.bg} text-white text-xs px-1.5 py-0.5 rounded font-bold`}
                                  title={sideBadge.title}
                                >
                                  {sideBadge.text}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`font-bold ${
                        player.overall >= 45 ? 'text-green-400' :
                        player.overall >= 35 ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {player.overall}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactical Advice */}
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2">💡 Scout's Advice</h3>
              <div className="text-gray-300 text-sm space-y-2">
                {scoutReport.attackTendency.includes('left') && (
                  <p>• They like the left edge — consider <strong>Shift Left</strong> defense to shut it down</p>
                )}
                {scoutReport.attackTendency.includes('right') && (
                  <p>• They favour the right side — consider <strong>Shift Right</strong> defense to counter</p>
                )}
                {scoutReport.attackTendency.includes('middle') && (
                  <p>• They run hard through the middle — a <strong>Brick Wall</strong> defense could frustrate them</p>
                )}
                {scoutReport.attackTendency.includes('Unpredictable') && (
                  <p>• They play off the cuff — <strong>Line Speed</strong> pressure might force errors</p>
                )}
                {scoutReport.attackTendency.includes('structured') && (
                  <p>• They play structured football — be patient and wait for your opportunity</p>
                )}
                {scoutReport.keyThreats[0] && (
                  <p>• Keep an eye on <strong>{scoutReport.keyThreats[0].last_name}</strong> — they're the danger player</p>
                )}
              </div>
            </div>

            {/* Link to Tactics */}
            <div className="text-center">
              <Link 
                href="/clubhouse/tactics"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                📋 Set Your Tactics
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}