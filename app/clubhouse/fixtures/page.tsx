'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeamLink from '@/components/TeamLink';
import TeamBadge from '@/components/TeamBadge';

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
  division: number;
}

interface Coach {
  team_id: string;
  coach_name: string;
}

interface Fixture {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  season: number;
  played: boolean;
  division: number;
}

interface MatchResult {
  id: string;
  fixture_id: string;
  home_score: number;
  away_score: number;
  home_team_id: string;
  away_team_id: string;
}

interface FixtureWithTeams extends Fixture {
  home_team: Team;
  away_team: Team;
  home_coach?: string | null;
  away_coach?: string | null;
  result?: MatchResult;
}

// Season 0 schedule: Tues, Thurs, Sun at 6pm AEST
const SEASON_0_START = new Date('2026-01-13T07:00:00Z');

function getRoundDates(): Date[] {
  const dates: Date[] = [];
  const start = new Date(SEASON_0_START);
  let current = new Date(start);
  
  for (let round = 1; round <= 18; round++) {
    dates.push(new Date(current));
    
    const day = current.getDay();
    if (day === 2) current.setDate(current.getDate() + 2);
    else if (day === 4) current.setDate(current.getDate() + 3);
    else current.setDate(current.getDate() + 2);
  }
  
  return dates;
}

const ROUND_DATES = getRoundDates();

function getCurrentRoundFromSchedule(): number {
  const now = new Date();
  
  for (let i = ROUND_DATES.length - 1; i >= 0; i--) {
    if (now >= ROUND_DATES[i]) {
      return i + 1;
    }
  }
  
  return 0;
}

function getNextUpdateTime(): { date: Date; round: number } {
  const now = new Date();
  
  for (let i = 0; i < ROUND_DATES.length; i++) {
    if (now < ROUND_DATES[i]) {
      return { date: ROUND_DATES[i], round: i + 1 };
    }
  }
  
  return { date: ROUND_DATES[ROUND_DATES.length - 1], round: 18 };
}

function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Update pending...';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Sydney' });
}

export default function FixturesPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Record<string, Team>>({});
  const [coaches, setCoaches] = useState<Record<string, string>>({});
  const [fixtures, setFixtures] = useState<FixtureWithTeams[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [nextUpdate, setNextUpdate] = useState<{ date: Date; round: number } | null>(null);
  const [seasonStarted, setSeasonStarted] = useState(false);
  const [userDivision, setUserDivision] = useState(1);
  const [originFixtures, setOriginFixtures] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const scheduleRound = getCurrentRoundFromSchedule();
      setSeasonStarted(scheduleRound > 0);
      
      const next = getNextUpdateTime();
      setNextUpdate(next);
      setCountdown(formatCountdown(next.date));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    
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

      const { data: myTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', coach.team_id)
        .single();

      if (!myTeam) return;

      setTeam(myTeam);
      setUserDivision(myTeam.division);

      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('division', myTeam.division);

      if (!teams) return;

      const teamsMap: Record<string, Team> = {};
      teams.forEach(t => { teamsMap[t.id] = t; });
      setAllTeams(teamsMap);

      // Fetch coaches
      const { data: coachesData } = await supabase
        .from('coaches')
        .select('team_id, coach_name');
      
      const coachesMap: Record<string, string> = {};
      (coachesData || []).forEach((c: Coach) => { coachesMap[c.team_id] = c.coach_name; });
      setCoaches(coachesMap);

      const { data: fixturesData } = await supabase
        .from('fixtures')
        .select('*')
        .eq('season', 0)
        .eq('division', myTeam.division)
        .order('round', { ascending: true });

      // Fetch Origin fixtures
      const { data: originFixturesData } = await supabase
        .from('origin_fixtures')
        .select('*')
        .eq('season', 0);

      const fixtureIds = (fixturesData || []).map(f => f.id);
      let resultsMap: Record<string, MatchResult> = {};
      
      if (fixtureIds.length > 0) {
        const { data: results } = await supabase
          .from('match_results')
          .select('*')
          .in('fixture_id', fixtureIds);

        results?.forEach(r => { resultsMap[r.fixture_id] = r; });
      }

      setOriginFixtures(originFixturesData || []);

      const fixturesWithTeams: FixtureWithTeams[] = (fixturesData || [])
        .filter(f => teamsMap[f.home_team_id] && teamsMap[f.away_team_id])
        .map(f => ({
          ...f,
          home_team: teamsMap[f.home_team_id],
          away_team: teamsMap[f.away_team_id],
          home_coach: coachesMap[f.home_team_id] || null,
          away_coach: coachesMap[f.away_team_id] || null,
          result: resultsMap[f.id],
        }));

      setFixtures(fixturesWithTeams);

      // Set current round - if schedule round is complete, show next round
      const scheduleRound = getCurrentRoundFromSchedule();
      let displayRound = scheduleRound > 0 ? scheduleRound : 1;

      // If all matches in this round are played, show next round as current
      const scheduleRoundFixtures = fixturesWithTeams.filter(f => f.round === displayRound);
      const allPlayed = scheduleRoundFixtures.length > 0 && scheduleRoundFixtures.every(f => f.played);
      if (allPlayed && displayRound < 18) {
        displayRound = displayRound + 1;
      }

      setCurrentRound(displayRound);
      setSelectedRound(displayRound);
      setSeasonStarted(scheduleRound > 0);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMyNextMatch = (): FixtureWithTeams | null => {
    if (!team) return null;
    return fixtures.find(f => 
      !f.played && 
      (f.home_team_id === team.id || f.away_team_id === team.id)
    ) || null;
  };

  const getFixturesForRound = (round: number): FixtureWithTeams[] => {
    return fixtures.filter(f => f.round === round);
  };

  const getMyResults = (): FixtureWithTeams[] => {
    if (!team) return [];
    return fixtures.filter(f => 
      f.played && 
      (f.home_team_id === team.id || f.away_team_id === team.id)
    );
  };

  const myNextMatch = getMyNextMatch();
  const roundFixtures = selectedRound ? getFixturesForRound(selectedRound) : [];
  const myResults = getMyResults();

  const getLadder = () => {
    const teamsArray = Object.values(allTeams);
    return teamsArray.sort((a, b) => {
      const aPoints = (a.wins * 2) + a.draws;
      const bPoints = (b.wins * 2) + b.draws;
      if (bPoints !== aPoints) return bPoints - aPoints;
      
      const aDiff = a.points_for - a.points_against;
      const bDiff = b.points_for - b.points_against;
      if (bDiff !== aDiff) return bDiff - aDiff;
      
      return b.points_for - a.points_for;
    });
  };

  const ladder = getLadder();
  
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  const getLadderPosition = (teamId: string): string => {
    const pos = ladder.findIndex(t => t.id === teamId) + 1;
    return getOrdinal(pos);
  };

  const getResultBadge = (fixture: FixtureWithTeams): { text: string; color: string } => {
    if (!fixture.result || !team) return { text: '', color: '' };
    
    const isHome = fixture.home_team_id === team.id;
    const myScore = isHome ? fixture.result.home_score : fixture.result.away_score;
    const theirScore = isHome ? fixture.result.away_score : fixture.result.home_score;
    
    if (myScore > theirScore) return { text: 'W', color: 'bg-green-500' };
    if (myScore < theirScore) return { text: 'L', color: 'bg-red-500' };
    return { text: 'D', color: 'bg-yellow-500' };
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
      <div 
        className="p-6"
        style={{
          background: `linear-gradient(135deg, ${team?.primary_color || '#1f2937'} 0%, ${team?.secondary_color || '#111827'} 100%)`
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">📅 Fixtures</h1>
          <p className="text-white/80 mt-1">
            Season 0 • Division {userDivision} • {seasonStarted ? `Round ${currentRound} of 18` : 'Pre-Season'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">
                {seasonStarted ? `Round ${nextUpdate?.round} Simulates` : 'Season Kicks Off'}
              </p>
              <p className="text-white font-bold text-lg">
                {nextUpdate && getDayName(nextUpdate.date)} 6:00 PM AEST
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Countdown</p>
              <p className="text-green-400 font-bold text-2xl">{countdown}</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Season 0 Schedule: Tuesday, Thursday & Sunday at 6pm
          </p>
        </div>

        {myNextMatch && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-gray-400 text-sm mb-3">YOUR NEXT MATCH • Round {myNextMatch.round}</h2>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <TeamBadge 
                  teamName={myNextMatch.home_team.name}
                  primaryColor={myNextMatch.home_team.primary_color}
                  size="lg"
                  showAbbr
                />
                <div className="mt-2">
                  <TeamLink
                    teamId={myNextMatch.home_team.id}
                    teamName={myNextMatch.home_team.name}
                    primaryColor={myNextMatch.home_team.primary_color}
                  />
                </div>
                <p className="text-gray-500 text-sm">({getLadderPosition(myNextMatch.home_team_id)})</p>
                <p className="text-gray-400 text-xs mt-1">
                  {myNextMatch.home_coach ? `👤 ${myNextMatch.home_coach}` : 'Unmanaged'}
                </p>
                {myNextMatch.home_team_id === team?.id && (
                  <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded mt-1">
                    YOUR TEAM
                  </span>
                )}
              </div>

              <div className="px-6">
                <div className="text-gray-500 text-2xl font-bold">VS</div>
                <div className="text-gray-600 text-sm mt-1">
                  {myNextMatch.home_team_id === team?.id ? 'HOME' : 'AWAY'}
                </div>
              </div>

              <div className="flex-1 text-center">
                <TeamBadge 
                  teamName={myNextMatch.away_team.name}
                  primaryColor={myNextMatch.away_team.primary_color}
                  size="lg"
                  showAbbr
                />
                <div className="mt-2">
                  <TeamLink
                    teamId={myNextMatch.away_team.id}
                    teamName={myNextMatch.away_team.name}
                    primaryColor={myNextMatch.away_team.primary_color}
                  />
                </div>
                <p className="text-gray-500 text-sm">({getLadderPosition(myNextMatch.away_team_id)})</p>
                <p className="text-gray-400 text-xs mt-1">
                  {myNextMatch.away_coach ? `👤 ${myNextMatch.away_coach}` : 'Unmanaged'}
                </p>
                {myNextMatch.away_team_id === team?.id && (
                  <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded mt-1">
                    YOUR TEAM
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Browse Rounds</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 21 }, (_, i) => i + 1).map(round => {
              const isOriginRound = [9, 12, 15].includes(round);
              const roundGames = getFixturesForRound(round);
              const allPlayed = roundGames.length > 0 && roundGames.every(f => f.played);
              const isCurrentRound = round === currentRound;
              
              return (
                <button
                  key={round}
                  onClick={() => setSelectedRound(round)}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    selectedRound === round
                      ? isOriginRound ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                      : isOriginRound
                        ? 'bg-blue-900/50 text-blue-400 border border-blue-500 hover:bg-blue-800/50'
                        : allPlayed
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : isCurrentRound
                            ? 'bg-gray-700 text-green-400 border border-green-500 hover:bg-gray-600'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {round}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-600 rounded"></span> Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-700 border border-green-500 rounded"></span> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-700 rounded"></span> Upcoming
            </span>
          </div>
        </div>

        {selectedRound && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-white font-bold mb-4">
              Round {selectedRound} {selectedRound === currentRound && <span className="text-green-400 text-sm font-normal">(Current)</span>}
            </h2>
            <div className="space-y-3">
              {roundFixtures.length === 0 ? (
                [9, 12, 15].includes(selectedRound) ? (
                  <div className="text-center py-8">
                    <p className="text-blue-400 text-xl font-bold mb-2">🏉 State of Origin</p>
                    {(() => {
                      const originMatch = originFixtures.find(o => o.round === selectedRound);
                      if (originMatch?.played) {
                        const nswScore = originMatch.home_team === 'NSW' ? originMatch.home_score : originMatch.away_score;
                        const qldScore = originMatch.home_team === 'QLD' ? originMatch.home_score : originMatch.away_score;
                        const winner = nswScore > qldScore ? 'NSW' : qldScore > nswScore ? 'QLD' : null;
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-center gap-8">
                              <div className={`text-center ${winner === 'NSW' ? 'text-blue-400' : 'text-gray-400'}`}>
                                <p className="text-2xl font-bold">NSW</p>
                                <p className="text-4xl font-bold">{nswScore}</p>
                              </div>
                              <div className="text-gray-500 text-xl">-</div>
                              <div className={`text-center ${winner === 'QLD' ? 'text-red-400' : 'text-gray-400'}`}>
                                <p className="text-2xl font-bold">QLD</p>
                                <p className="text-4xl font-bold">{qldScore}</p>
                              </div>
                            </div>
                            <p className="text-gray-400 mt-4">Game {originMatch.game_number} @ {originMatch.venue}</p>
                            {winner && <p className="text-green-400 mt-2">{winner} wins!</p>}
                          </div>
                        );
                      }
                      return (
                        <>
                          <p className="text-gray-400">No club games this round</p>
                          <p className="text-gray-500 text-sm mt-2">Your players may be representing NSW or QLD!</p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No fixtures found for this round</p>
                )
              ) : (
                roundFixtures.map(fixture => {
                  const isMyGame = fixture.home_team_id === team?.id || fixture.away_team_id === team?.id;
                  const isClickable = fixture.played && fixture.result;
                  
                  const content = (
                    <div 
                      className={`p-4 rounded-lg transition ${
                        isMyGame ? 'bg-gray-700 border border-green-500/50' : 'bg-gray-700/50'
                      } ${isClickable ? 'hover:bg-gray-600 cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Home Team */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <TeamBadge 
                              teamName={fixture.home_team.name}
                              primaryColor={fixture.home_team.primary_color}
                              size="sm"
                              showAbbr
                            />
                            <div>
                              <TeamLink
                                teamId={fixture.home_team.id}
                                teamName={fixture.home_team.name}
                                primaryColor={fixture.home_team.primary_color}
                                className={isMyGame && fixture.home_team_id === team?.id ? 'text-green-400' : ''}
                              />
                              <p className="text-gray-500 text-xs">
                                {fixture.home_coach ? `👤 ${fixture.home_coach}` : 'Unmanaged'} • {getLadderPosition(fixture.home_team_id)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Score / VS */}
                        <div className="px-4 text-center min-w-[100px]">
                          {fixture.played && fixture.result ? (
                            <div>
                              <span className="text-white font-bold text-lg">
                                {fixture.result.home_score} - {fixture.result.away_score}
                              </span>
                              <p className="text-green-400 text-xs">View Stats →</p>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-lg">vs</span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div>
                              <TeamLink
                                teamId={fixture.away_team.id}
                                teamName={fixture.away_team.name}
                                primaryColor={fixture.away_team.primary_color}
                                className={isMyGame && fixture.away_team_id === team?.id ? 'text-green-400' : ''}
                              />
                              <p className="text-gray-500 text-xs">
                                {getLadderPosition(fixture.away_team_id)} • {fixture.away_coach ? `👤 ${fixture.away_coach}` : 'Unmanaged'}
                              </p>
                            </div>
                            <TeamBadge 
                              teamName={fixture.away_team.name}
                              primaryColor={fixture.away_team.primary_color}
                              size="sm"
                              showAbbr
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  
                  return isClickable ? (
                    <Link key={fixture.id} href={`/clubhouse/match/${fixture.id}`}>
                      {content}
                    </Link>
                  ) : (
                    <div key={fixture.id}>{content}</div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {myResults.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-white font-bold mb-4">Your Results</h2>
            <div className="space-y-2">
              {myResults.map(fixture => {
                const isHome = fixture.home_team_id === team?.id;
                const opponent = isHome ? fixture.away_team : fixture.home_team;
                const opponentCoach = isHome ? fixture.away_coach : fixture.home_coach;
                const result = getResultBadge(fixture);
                
                return (
                  <Link 
                    key={fixture.id}
                    href={`/clubhouse/match/${fixture.id}`}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${result.color}`}>
                        {result.text}
                      </span>
                      <TeamBadge 
                        teamName={opponent.name}
                        primaryColor={opponent.primary_color}
                        size="sm"
                        showAbbr
                      />
                      <div>
                        <p className="text-white">
                          {isHome ? 'vs' : '@'} {opponent.name}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Round {fixture.round} • {opponentCoach ? `👤 ${opponentCoach}` : 'Unmanaged'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-white font-bold">
                          {fixture.result && (
                            isHome 
                              ? `${fixture.result.home_score} - ${fixture.result.away_score}`
                              : `${fixture.result.away_score} - ${fixture.result.home_score}`
                          )}
                        </p>
                        <p className="text-gray-500 text-sm">{isHome ? 'Home' : 'Away'}</p>
                      </div>
                      <span className="text-green-400">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-white font-bold mb-3">Season Progress</h2>
          {(() => {
            const completedRounds = new Set<number>();
            const roundCounts: Record<number, { total: number; played: number }> = {};
            
            fixtures.forEach(f => {
              if (!roundCounts[f.round]) roundCounts[f.round] = { total: 0, played: 0 };
              roundCounts[f.round].total++;
              if (f.played) roundCounts[f.round].played++;
            });
            
            Object.entries(roundCounts).forEach(([round, counts]) => {
              if (counts.played === counts.total && counts.total > 0) {
                completedRounds.add(Number(round));
              }
            });
            
            const completed = completedRounds.size;
            
            return (
              <>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${(completed / 18) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Round 1</span>
                  <span>{completed} of 18 rounds completed</span>
                  <span>Finals</span>
                </div>
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
}