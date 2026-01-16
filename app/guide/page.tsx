'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'stats' | 'tactics' | 'training' | 'youth' | 'freeagents' | 'rep' | 'schedule' | 'filmroom' | 'matchstats' | 'careers' | 'tips';

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'overview', title: 'Getting Started', icon: '🏉' },
    { id: 'schedule', title: 'Season Schedule', icon: '📅' },
    { id: 'stats', title: 'Player Stats', icon: '📊' },
    { id: 'matchstats', title: 'Match Stats', icon: '🏟️' },
    { id: 'tactics', title: 'Tactics & Lineup', icon: '📋' },
    { id: 'filmroom', title: 'Film Room', icon: '🎬' },
    { id: 'training', title: 'Training', icon: '💪' },
    { id: 'careers', title: 'Player Careers', icon: '📈' },
    { id: 'youth', title: 'Youth Academy', icon: '🎓' },
    { id: 'freeagents', title: 'Free Agents', icon: '🏪' },
    { id: 'rep', title: 'Rep Honours', icon: '🏅' },
    { id: 'tips', title: 'Pro Tips', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/clubhouse" className="text-white/70 hover:text-white mb-2 inline-block">
            ← Back to Clubhouse
          </Link>
          <h1 className="text-3xl font-bold text-white">📖 Coach Guide</h1>
          <p className="text-white/80">Everything you need to know about managing your team</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Sidebar Navigation */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-6">
              <h3 className="text-gray-400 text-sm font-bold mb-3">SECTIONS</h3>
              <div className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      activeSection === section.id
                        ? 'bg-green-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-gray-800 rounded-lg p-6">
              
              {/* Getting Started */}
              {activeSection === 'overview' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏉 Getting Started
                  </h2>
                  
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>Welcome to SidelineHQ!</strong> You're now the head coach of a professional rugby league team. Your job is to manage your squad, set tactics, develop players, and lead your team to glory.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">How the Season Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>18 Rounds</strong> of regular season matches</li>
                    <li><strong>3 State of Origin</strong> weekends (rest weeks for clubs)</li>
                    <li><strong>Matches simulate</strong> on Tuesdays, Thursdays, and Sundays at 6pm AEST</li>
                    <li><strong>Top 4 teams</strong> make the finals at the end of the season</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Your Weekly Routine</h3>
                  <ol className="text-gray-300 space-y-2">
                    <li><strong>Check Fixtures</strong> — See who you're playing next</li>
                    <li><strong>Scout Opponent</strong> — Use the Film Room to study them</li>
                    <li><strong>Set Tactics</strong> — Pick your starting 13, bench, captain, and game plan</li>
                    <li><strong>Assign Training</strong> — Develop your players between matches</li>
                    <li><strong>Watch Results</strong> — See how your team performs</li>
                  </ol>

                  <h3 className="text-xl text-white mt-6">Key Pages</h3>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">👥 Squad</p>
                      <p className="text-gray-400 text-sm m-0">View all your players</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Tactics</p>
                      <p className="text-gray-400 text-sm m-0">Set lineup, captain & game plan</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎬 Film Room</p>
                      <p className="text-gray-400 text-sm m-0">Scout your opponent</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Training</p>
                      <p className="text-gray-400 text-sm m-0">Develop player stats</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📊 Leaderboards</p>
                      <p className="text-gray-400 text-sm m-0">Top performers in your division</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📅 Fixtures</p>
                      <p className="text-gray-400 text-sm m-0">Match schedule & results</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> All your changes to Tactics and Training are saved automatically — no need to click a save button!
                    </p>
                  </div>
                </div>
              )}

              {/* Season Schedule */}
              {activeSection === 'schedule' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📅 Season Schedule
                  </h2>

                  <p className="text-gray-300">
                    Each season consists of 18 regular season rounds, 3 State of Origin weekends, and finals for the top 4 teams.
                  </p>

                  <h3 className="text-xl text-white mt-6">Match Days</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Tuesday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Thursday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">Sunday</p>
                      <p className="text-gray-400 text-sm m-0">6pm AEST</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Season Structure</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 1-5</span>
                      <span className="text-white">Regular Season</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 1</span>
                      <span>Rest Week</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 6-10</span>
                      <span className="text-white">Regular Season</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 2</span>
                      <span>Rest Week</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 11-15</span>
                      <span className="text-white">Regular Season</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 3 (Decider)</span>
                      <span>Rest Week</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 16-18</span>
                      <span className="text-white">Regular Season</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Finals</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Semi Finals</span>
                      <span className="text-white">1st v 4th, 2nd v 3rd</span>
                    </div>
                    <div className="flex justify-between text-green-400 font-bold">
                      <span>🏆 GRAND FINAL</span>
                      <span>Winners play off</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">State of Origin Weekends</h3>
                  <p className="text-gray-300">
                    On Origin weekends, there are no club matches. Instead:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>Players NOT in Origin</strong> — Get a fitness boost (rest week benefit)</li>
                    <li><strong>Players IN Origin</strong> — Return more fatigued (but earn rep honours!)</li>
                  </ul>
                </div>
              )}

              {/* Player Stats */}
              {activeSection === 'stats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📊 Player Stats
                  </h2>

                  <p className="text-gray-300">
                    Every player has 7 core stats that determine their ability on the field. Stats range from <span className="text-red-400">None</span> (lowest) to <span className="text-yellow-400">Elite</span> (highest).
                  </p>

                  <h3 className="text-xl text-white mt-6">The Seven Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Speed</p>
                      <p className="text-gray-400 text-sm m-0">How fast the player moves. Essential for wingers, fullbacks, and outside backs. Affects metres gained and line breaks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Strength</p>
                      <p className="text-gray-400 text-sm m-0">Physical power for tackles and carries. Crucial for forwards. Helps with tackle breaks and holding your ground.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💥 Power</p>
                      <p className="text-gray-400 text-sm m-0">Explosive ability to break tackles and bust the line. Key for try-scoring and making hard metres. Props and Centres need this!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Passing</p>
                      <p className="text-gray-400 text-sm m-0">Ball handling and accuracy. Low Passing = more errors! Critical for halves and hookers. Affects try assists.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🫁 Stamina</p>
                      <p className="text-gray-400 text-sm m-0">Endurance and work rate. Affects performance over 80 minutes, tackle counts, and involvement.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackling</p>
                      <p className="text-gray-400 text-sm m-0">Defensive technique and reliability. Low Tackling = more missed tackles! Essential for middles and edges.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Kicking accuracy and distance. Vital for halves, fullbacks, and especially your goal kicker.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Tiers</h3>
                  <p className="text-gray-300">
                    Stats are displayed as tier labels to give you a sense of ability:
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-red-500/30 rounded p-2 text-center">
                      <p className="text-red-400 font-bold m-0 text-sm">None</p>
                    </div>
                    <div className="bg-orange-600/30 rounded p-2 text-center">
                      <p className="text-orange-400 font-bold m-0 text-sm">Poor</p>
                    </div>
                    <div className="bg-orange-500/30 rounded p-2 text-center">
                      <p className="text-orange-300 font-bold m-0 text-sm">Fair</p>
                    </div>
                    <div className="bg-yellow-500/30 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold m-0 text-sm">OK</p>
                    </div>
                    <div className="bg-lime-500/30 rounded p-2 text-center">
                      <p className="text-lime-400 font-bold m-0 text-sm">Good</p>
                    </div>
                    <div className="bg-green-500/30 rounded p-2 text-center">
                      <p className="text-green-400 font-bold m-0 text-sm">Very Good</p>
                    </div>
                    <div className="bg-cyan-500/30 rounded p-2 text-center">
                      <p className="text-cyan-400 font-bold m-0 text-sm">Excellent</p>
                    </div>
                    <div className="bg-yellow-500/30 border border-yellow-500/50 rounded p-2 text-center">
                      <p className="text-yellow-300 font-bold m-0 text-sm">Elite</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Overall Rating (OVR)</h3>
                  <p className="text-gray-300">
                    A player's OVR is the sum of all 7 stats. Higher OVR generally means a better player, but don't ignore specialists — a winger with Elite Speed but Poor Tackling can still be deadly!
                  </p>

                  <h3 className="text-xl text-white mt-6">Position Strengths</h3>
                  <p className="text-gray-300">
                    Different positions prioritize different stats:
                  </p>
                  <div className="bg-gray-700 rounded p-4 space-y-2 mt-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Fullback</span>
                      <span className="text-cyan-400">Speed, Passing, Kicking</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Winger</span>
                      <span className="text-cyan-400">Speed, Power</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Centre</span>
                      <span className="text-cyan-400">Speed, Strength, Passing</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Five-Eighth / Halfback</span>
                      <span className="text-cyan-400">Passing, Kicking</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Prop</span>
                      <span className="text-cyan-400">Strength, Power, Tackling</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Hooker</span>
                      <span className="text-cyan-400">Passing, Tackling, Stamina</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Second Row / Lock</span>
                      <span className="text-cyan-400">Strength, Tackling, Stamina</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Stats */}
              {activeSection === 'matchstats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏟️ Match Stats
                  </h2>

                  <p className="text-gray-300">
                    After each match, detailed statistics are recorded for every player. Click on any completed fixture to view the Match Centre.
                  </p>

                  <h3 className="text-xl text-white mt-6">Key Match Statistics</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏉 Tries (T)</p>
                      <p className="text-gray-400 text-sm m-0">Tries scored. Worth 4 points each.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-blue-400 font-bold m-0">🤝 Try Assists (TA)</p>
                      <p className="text-gray-400 text-sm m-0">Passes that led directly to tries. Shows playmaking ability.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-green-400 font-bold m-0">🥅 Goals (G)</p>
                      <p className="text-gray-400 text-sm m-0">Conversions and penalties by your goal kicker. Worth 2 points each.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-purple-400 font-bold m-0">💥 Line Breaks (LB)</p>
                      <p className="text-gray-400 text-sm m-0">Breaking through the defensive line. Based on Speed + Power.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-orange-400 font-bold m-0">💪 Tackle Breaks (TB)</p>
                      <p className="text-gray-400 text-sm m-0">Busting out of tackles. Based on Power + Strength.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Metres (Mtrs)</p>
                      <p className="text-gray-400 text-sm m-0">Total metres gained. Backs aim for 150+, forwards 180+.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackles (Tkls)</p>
                      <p className="text-gray-400 text-sm m-0">Successful tackles made. Hookers and locks often lead here.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-red-400 font-bold m-0">❌ Missed Tackles (MT)</p>
                      <p className="text-gray-400 text-sm m-0">Failed tackle attempts. High numbers hurt your team's defense!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-red-400 font-bold m-0">🫳 Errors (Err)</p>
                      <p className="text-gray-400 text-sm m-0">Knock-ons, forward passes, fumbles. Giving the ball away cheaply.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Match Rating</h3>
                  <p className="text-gray-300">
                    Each player receives a rating out of 10 based on their performance. Ratings consider tries, assists, metres, tackles, and negative actions like errors and missed tackles.
                  </p>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>⭐ Man of the Match:</strong> The best performer in each game earns MOTM honours. Being named captain gives a small boost to MOTM chances!
                    </p>
                  </div>
                </div>
              )}

              {/* Tactics */}
              {activeSection === 'tactics' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Tactics & Lineup
                  </h2>

                  <p className="text-gray-300">
                    Your tactics page is where you set your starting 13, bench, captain, goal kicker, and game plan.
                  </p>

                  <h3 className="text-xl text-white mt-6">Setting Your Lineup</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>Starting 13:</strong> Your best players who'll play the full 80 minutes</li>
                    <li><strong>Bench (4 players):</strong> Impact players who'll get limited minutes</li>
                    <li><strong>Goal Kicker:</strong> Choose your most accurate kicker</li>
                    <li><strong>Captain:</strong> Gets a small rating boost and MOTM edge</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Captain</h3>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-white font-bold m-0">👑 Team Captain</p>
                    <p className="text-gray-400 text-sm m-0">Your captain gets a small boost to their match rating and has a better chance of winning Man of the Match. Pick a consistent performer!</p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Attack Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Structured</p>
                      <p className="text-gray-400 text-sm m-0">Balanced, safe approach. No bonuses or penalties — just solid footy.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🔄 Expansive</p>
                      <p className="text-gray-400 text-sm m-0">Spread the ball wide, use the full width of the field.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Direct</p>
                      <p className="text-gray-400 text-sm m-0">Punch through the middle with your forwards. Favors strong props.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Territory-based game. Best with quality kickers in the halves.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Defense Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">↔️ Slide</p>
                      <p className="text-gray-400 text-sm m-0">Traditional sliding defense. Covers the edges but can be beaten through the middle.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Rush</p>
                      <p className="text-gray-400 text-sm m-0">Aggressive, push up fast. Pressures playmakers but leaves gaps if beaten.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">☂️ Umbrella</p>
                      <p className="text-gray-400 text-sm m-0">Bend but don't break. Gives metres but protects the try line.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Zone</p>
                      <p className="text-gray-400 text-sm m-0">Hold your position, trust your teammates. Balanced approach.</p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>💡 Tactical Edge:</strong> Use the Film Room to scout your opponent's attack style, then pick a defense that counters it!
                    </p>
                  </div>
                </div>
              )}

              {/* Film Room */}
              {activeSection === 'filmroom' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🎬 Film Room
                  </h2>

                  <p className="text-gray-300">
                    The Film Room lets you scout your next opponent. Study their recent form, attack tendency, key players, and defensive weaknesses.
                  </p>

                  <h3 className="text-xl text-white mt-6">What You Can Learn</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li><strong>Recent Form:</strong> Their last 5 results (W/L/D)</li>
                    <li><strong>Attack Tendency:</strong> How they like to play offense</li>
                    <li><strong>Key Threats:</strong> Their best performers this season</li>
                    <li><strong>Squad Overview:</strong> Their full roster and OVR</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Tactical Counter-Play</h3>
                  <p className="text-gray-300">
                    Match your defense to their attack:
                  </p>
                  <div className="bg-gray-700 rounded p-4 space-y-2 mt-3">
                    <div className="flex justify-between text-gray-300">
                      <span>They play <strong>Expansive</strong></span>
                      <span className="text-green-400">→ Use Slide defense</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>They play <strong>Direct</strong></span>
                      <span className="text-green-400">→ Use Rush defense</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>They play <strong>Kicking</strong></span>
                      <span className="text-green-400">→ Use Umbrella defense</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>🎬 Pro Move:</strong> Check the Film Room before every match. A well-prepared team has the edge!
                    </p>
                  </div>
                </div>
              )}

              {/* Training - MAJOR UPDATE */}
              {activeSection === 'training' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💪 Training
                  </h2>

                  <p className="text-gray-300">
                    Training develops your players over time. Assign each player to train a specific stat, or Rest to recover fitness.
                  </p>

                  <h3 className="text-xl text-white mt-6">How Training Works</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-3">
                    <p className="text-gray-300 m-0">
                      Each round, players make <strong>training progress</strong> toward improving their assigned stat. Progress builds through stages:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="bg-gray-600 px-2 py-1 rounded text-gray-400 text-sm">None</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-600 px-2 py-1 rounded text-orange-400 text-sm">Poor</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-600 px-2 py-1 rounded text-yellow-400 text-sm">Fair</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-600 px-2 py-1 rounded text-lime-400 text-sm">Good</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-600 px-2 py-1 rounded text-green-400 text-sm">Very Good</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-600 px-2 py-1 rounded text-cyan-400 text-sm">Excellent</span>
                    </div>
                    <p className="text-gray-300 m-0">
                      At each stage, there's a chance the stat improves. Higher progress = better odds!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Training Options</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">😴 Rest</span>
                      <span className="text-green-400 text-sm">Recovers fitness significantly</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">⚡ Speed</span>
                      <span className="text-gray-400 text-sm">Pace and acceleration</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💪 Strength</span>
                      <span className="text-gray-400 text-sm">Physical power</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💥 Power</span>
                      <span className="text-gray-400 text-sm">Explosive ability</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🎯 Passing</span>
                      <span className="text-gray-400 text-sm">Ball skills</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🫁 Stamina</span>
                      <span className="text-gray-400 text-sm">Endurance</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🛡️ Tackling</span>
                      <span className="text-gray-400 text-sm">Defensive technique</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🦶 Kicking</span>
                      <span className="text-gray-400 text-sm">Kicking accuracy</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Fitness & Fatigue</h3>
                  <p className="text-gray-300">
                    Players gain fatigue from matches and training, and recover it through rest. Fatigued players perform worse!
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-red-500/20 rounded p-3 text-center">
                      <p className="text-red-400 font-bold m-0">Exhausted</p>
                      <p className="text-gray-400 text-sm m-0">Needs rest urgently</p>
                    </div>
                    <div className="bg-orange-500/20 rounded p-3 text-center">
                      <p className="text-orange-400 font-bold m-0">Tired</p>
                      <p className="text-gray-400 text-sm m-0">Consider resting</p>
                    </div>
                    <div className="bg-yellow-500/20 rounded p-3 text-center">
                      <p className="text-yellow-400 font-bold m-0">OK</p>
                      <p className="text-gray-400 text-sm m-0">Can train or play</p>
                    </div>
                    <div className="bg-green-500/20 rounded p-3 text-center">
                      <p className="text-green-400 font-bold m-0">Fresh / Peak</p>
                      <p className="text-gray-400 text-sm m-0">Ready to go!</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Development Factors</h3>
                  <div className="bg-purple-500/20 border border-purple-500 rounded-lg p-4 my-4">
                    <p className="text-purple-400 m-0">
                      <strong>🔮 Hidden Potential:</strong> Every player has hidden traits that affect how quickly they develop certain stats. You won't know what these are — you'll have to <strong>discover</strong> them through trial and error!
                    </p>
                  </div>

                  <p className="text-gray-300">
                    Pay attention to which players improve quickly in certain areas. Some players might surprise you — a Prop who develops Passing quickly, or a Halfback who bulks up in Strength. These "hidden gems" can become unique assets!
                  </p>

                  <div className="bg-gray-700 rounded p-4 space-y-2 mt-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Young players (18-21)</span>
                      <span className="text-green-400">Develop faster</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Prime players (22-27)</span>
                      <span className="text-yellow-400">Steady development</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Veterans (28-31)</span>
                      <span className="text-orange-400">Slower development</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Old players (32+)</span>
                      <span className="text-red-400">Very slow / may decline</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Coaching Tip:</strong> If a player isn't improving in a stat after several rounds, try something different! They might have hidden talent elsewhere.
                    </p>
                  </div>
                </div>
              )}

              {/* Player Careers - NEW SECTION */}
              {activeSection === 'careers' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📈 Player Careers
                  </h2>

                  <p className="text-gray-300">
                    Players have realistic career arcs — they develop when young, peak in their mid-to-late 20s, and eventually decline and retire.
                  </p>

                  <h3 className="text-xl text-white mt-6">Career Phases</h3>
                  <div className="space-y-3">
                    <div className="bg-green-500/20 border border-green-500 rounded p-4">
                      <p className="text-green-400 font-bold m-0">🌱 Young (18-21)</p>
                      <p className="text-gray-300 text-sm m-0 mt-1">Rapid development potential. Lower stats now, but room to grow into stars. Worth investing training time!</p>
                    </div>
                    <div className="bg-cyan-500/20 border border-cyan-500 rounded p-4">
                      <p className="text-cyan-400 font-bold m-0">💪 Prime (22-27)</p>
                      <p className="text-gray-300 text-sm m-0 mt-1">Peak performance years. Still developing but at their physical best. Your core squad.</p>
                    </div>
                    <div className="bg-orange-500/20 border border-orange-500 rounded p-4">
                      <p className="text-orange-400 font-bold m-0">🧠 Veteran (28-31)</p>
                      <p className="text-gray-300 text-sm m-0 mt-1">Experience matters, but development slows. Physical stats may start to slip. Manage their workload!</p>
                    </div>
                    <div className="bg-red-500/20 border border-red-500 rounded p-4">
                      <p className="text-red-400 font-bold m-0">⏳ Twilight (32+)</p>
                      <p className="text-gray-300 text-sm m-0 mt-1">Living on borrowed time. Stats will decline, especially physical ones. Retirement is coming.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Decline</h3>
                  <p className="text-gray-300">
                    As players age past their prime, their stats may decline — especially physical attributes like Speed, Stamina, and Power. Mental stats like Passing, Tackling, and Kicking decline more slowly.
                  </p>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Training Protects:</strong> Actively training a stat helps protect it from age-related decline. Keep your veterans working on key skills!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Retirement</h3>
                  <p className="text-gray-300">
                    Players will eventually retire, usually in their mid-30s. Some positions last longer than others:
                  </p>
                  <div className="bg-gray-700 rounded p-4 space-y-2 mt-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Hookers & Halfbacks</span>
                      <span className="text-green-400">Play longest (brain over brawn)</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Props & Five-Eighths</span>
                      <span className="text-yellow-400">Average career length</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Wingers, Centres & Back Row</span>
                      <span className="text-orange-400">Retire earlier (speed-dependent)</span>
                    </div>
                  </div>

                  <div className="bg-purple-500/20 border border-purple-500 rounded-lg p-4 my-4">
                    <p className="text-purple-400 m-0">
                      <strong>🔮 Durability:</strong> Some players are more durable than others — they'll play longer before retiring. Others are more fragile and may hang up the boots earlier. You won't know until it happens!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Retirement Warnings</h3>
                  <p className="text-gray-300">
                    You'll receive a notification when a player is "considering retirement" — usually 1-2 seasons before they actually retire. Use this time to find a replacement!
                  </p>
                </div>
              )}

              {/* Youth Development */}
              {activeSection === 'youth' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🎓 Youth Academy
                  </h2>

                  <p className="text-gray-300">
                    Your Development Academy produces young talent. Promote youth players to your senior squad to build for the future.
                  </p>

                  <h3 className="text-xl text-white mt-6">Promotion Rules</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>You can promote <strong>once every 6 matchdays</strong></li>
                    <li>Youth players are always <strong>18-21 years old</strong></li>
                    <li>Position and stats are <strong>randomly generated</strong></li>
                    <li>The longer you wait, the better your chances of quality</li>
                  </ul>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>🍀 Patience Bonus:</strong> The longer you wait between promotions, the better your chances of finding a high-quality prospect!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Why Youth Matters</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <p className="text-gray-300 m-0">Young players:</p>
                    <ul className="text-gray-300 m-0 space-y-1">
                      <li>✅ Develop faster than older players</li>
                      <li>✅ Have more seasons before decline</li>
                      <li>✅ May have hidden training talents</li>
                      <li>✅ Keep your squad age balanced</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>⚠️ Squad Limit:</strong> You cannot promote from the Academy if your squad is at 25 players. Release someone first!
                    </p>
                  </div>
                </div>
              )}

              {/* Free Agents */}
              {activeSection === 'freeagents' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏪 Free Agents
                  </h2>

                  <p className="text-gray-300">
                    The Free Agent market lets you release players from your squad and sign players released by other teams. All 100 teams across 10 divisions share the same free agent pool!
                  </p>

                  <h3 className="text-xl text-white mt-6">Releasing Players</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Go to <strong>Squad</strong> → Click on a player → <strong>"Release Player"</strong></li>
                    <li>You cannot release if your squad would drop below <strong>17 players</strong></li>
                    <li>Released players become available to ALL teams the following round</li>
                    <li>You'll receive a notification when your former player signs elsewhere</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Claiming Free Agents</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Browse available players on the <strong>Free Agents</strong> page</li>
                    <li>You can have up to <strong>3 pending claims</strong> at a time</li>
                    <li>You cannot claim if your squad is at <strong>25 players</strong> (unless you nominate someone to release)</li>
                    <li>Claims are processed during game updates (Tue/Thu/Sun 6pm AEST)</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">How Players Choose Teams</h3>
                  <p className="text-gray-300">
                    When multiple teams claim the same player, the player "chooses" based on their personality:
                  </p>
                  
                  <div className="space-y-3 mt-3">
                    <div className="bg-purple-500/20 border border-purple-500 rounded p-3">
                      <p className="text-purple-400 font-bold m-0">⭐ Ambitious Stars (43+ OVR)</p>
                      <p className="text-gray-400 text-sm m-0">Prefer higher divisions and winning teams.</p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500 rounded p-3">
                      <p className="text-green-400 font-bold m-0">👶 Young Prospects (Age ≤21)</p>
                      <p className="text-gray-400 text-sm m-0">Want game time and development. Prefer smaller squads.</p>
                    </div>
                    <div className="bg-orange-500/20 border border-orange-500 rounded p-3">
                      <p className="text-orange-400 font-bold m-0">🧳 Journeymen (Age 22-29)</p>
                      <p className="text-gray-400 text-sm m-0">Happy for any opportunity. Balanced consideration.</p>
                    </div>
                    <div className="bg-gray-500/20 border border-gray-500 rounded p-3">
                      <p className="text-gray-400 font-bold m-0">👴 Veterans (Age 30+)</p>
                      <p className="text-gray-400 text-sm m-0">Grateful for any interest. Just want to keep playing.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">What Affects Your Chances</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Higher Division</span>
                      <span className="text-green-400">More attractive</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Better Ladder Position</span>
                      <span className="text-green-400">More attractive</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Smaller Squad Size</span>
                      <span className="text-green-400">More game time</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Need Their Position</span>
                      <span className="text-green-400">Higher priority</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Tip:</strong> Lower division teams can still attract young prospects who want game time! A Division 8 team with a small squad might beat a Division 2 team for a 20-year-old talent.
                    </p>
                  </div>
                </div>
              )}

              {/* Rep Honours */}
              {activeSection === 'rep' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏅 Rep Honours
                  </h2>

                  <p className="text-gray-300">
                    The Rep Honours page shows which players have been selected for representative teams like State of Origin.
                  </p>

                  <h3 className="text-xl text-white mt-6">State of Origin</h3>
                  <p className="text-gray-300">
                    Three times per season, the best players are selected for State of Origin. Selection is based on OVR and recent form.
                  </p>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>Origin Trade-off:</strong> Players selected for Origin earn prestige and rep honours, but return to their clubs more fatigued than those who rested.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Benefits of Origin Selection</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>🏅 <strong>Rep Honours</strong> — Permanent record of achievement</li>
                    <li>⭐ <strong>Prestige</strong> — Best players in the game</li>
                    <li>📈 <strong>Morale Boost</strong> — Players love being selected</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Rest Week Advantage</h3>
                  <p className="text-gray-300">
                    Players NOT selected for Origin get a rest week — they'll return fresher than their Origin-selected teammates. Sometimes it pays to have good (but not great) players!
                  </p>
                </div>
              )}

              {/* Pro Tips */}
              {activeSection === 'tips' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💡 Pro Tips
                  </h2>

                  <div className="space-y-4 mt-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🔬 Experiment with Training</h4>
                      <p className="text-gray-400 m-0">
                        Every player has hidden training talents. If someone isn't improving in one area, try a different stat — you might discover they're a natural!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📊 Read Your Match Stats</h4>
                      <p className="text-gray-400 m-0">
                        High missed tackles? Train Tackling. Lots of errors? Train Passing. Let the data guide your training decisions.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👶 Invest in Youth</h4>
                      <p className="text-gray-400 m-0">
                        Young players (18-21) develop faster and have more seasons before decline. A 25 OVR 18-year-old might become a 45 OVR star by age 26!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">⏳ Plan for Retirement</h4>
                      <p className="text-gray-400 m-0">
                        When you get a "considering retirement" warning, start preparing! Promote a youth player or sign a free agent to fill the gap.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🏪 Work the Free Agent Market</h4>
                      <p className="text-gray-400 m-0">
                        Lower division teams can attract young players who want game time. Don't compete with Div 1 teams for stars — target prospects!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📋 Manage Squad Size</h4>
                      <p className="text-gray-400 m-0">
                        Keep your squad between 20-23 players. Too small = no depth for injuries/fatigue. Too big = can't sign free agents or promote youth.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎬 Scout Before Every Match</h4>
                      <p className="text-gray-400 m-0">
                        Use the Film Room to learn your opponent's attack tendency and counter it with the right defense.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">😴 Manage Fatigue</h4>
                      <p className="text-gray-400 m-0">
                        Rotate tired players to the bench or rest them. A fresh Good player often outperforms an exhausted Excellent one!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👴 Protect Your Veterans</h4>
                      <p className="text-gray-400 m-0">
                        Keep training your older players in key stats — it helps slow their decline. Focus on their most important skills.
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
                    <p className="text-green-400 m-0">
                      <strong>Most importantly:</strong> Have fun! Experiment with different strategies, discover your players' hidden talents, and build your legacy. Good luck, Coach! 🏆
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
