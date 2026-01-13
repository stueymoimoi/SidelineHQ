'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'stats' | 'tactics' | 'training' | 'youth' | 'freeagents' | 'rep' | 'schedule' | 'filmroom' | 'matchstats' | 'tips';

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
    { id: 'youth', title: 'Youth Development', icon: '🎓' },
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

                  <h3 className="text-xl text-white mt-6">Season 0 Structure</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 1-5</span>
                      <span className="text-white">Jan 13 - Jan 22</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 1</span>
                      <span>Sun Jan 25</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 6-10</span>
                      <span className="text-white">Jan 27 - Feb 5</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 2</span>
                      <span>Sun Feb 8</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 11-15</span>
                      <span className="text-white">Feb 10 - Feb 19</span>
                    </div>
                    <div className="flex justify-between text-yellow-400 font-bold">
                      <span>🏆 STATE OF ORIGIN 3 (Decider)</span>
                      <span>Sun Feb 22</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Rounds 16-18</span>
                      <span className="text-white">Feb 24 - Mar 1</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Finals</h3>
                  <div className="bg-gray-700 rounded p-4 space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Semi Finals (1st v 4th, 2nd v 3rd)</span>
                      <span className="text-white">Tue Mar 3</span>
                    </div>
                    <div className="flex justify-between text-green-400 font-bold">
                      <span>🏆 GRAND FINAL</span>
                      <span>Thu Mar 5</span>
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

              {/* Player Stats - UPDATED WITH TIER LABELS */}
              {activeSection === 'stats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📊 Player Stats
                  </h2>

                  <p className="text-gray-300">
                    Every player has 7 core stats that determine their ability on the field. Stats are displayed as tier labels from NONE (lowest) to LEGEND (highest).
                  </p>

                  <h3 className="text-xl text-white mt-6">The Seven Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Speed</p>
                      <p className="text-gray-400 text-sm m-0">How fast the player moves. Essential for wingers, fullbacks, and outside backs. Affects metres gained and line breaks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Strength</p>
                      <p className="text-gray-400 text-sm m-0">Physical power for tackles and carries. Crucial for forwards. Helps with tackle breaks.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💥 Power</p>
                      <p className="text-gray-400 text-sm m-0">Ability to break tackles and bust the line. Key for try-scoring, making metres, and tackle breaks. Props and Centres need this!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Passing</p>
                      <p className="text-gray-400 text-sm m-0">Ball handling, passing accuracy, and technique. Low Passing = more errors! Important for halves and hookers. Affects try assists.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🫁 Stamina</p>
                      <p className="text-gray-400 text-sm m-0">Endurance and fitness. Affects performance over 80 minutes and tackle count.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackling</p>
                      <p className="text-gray-400 text-sm m-0">Defensive ability and technique. Low Tackling = more missed tackles! Key for middles and edges.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Kicking accuracy and distance. Vital for halves, fullbacks, and your goal kicker.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Tier Labels</h3>
                  <p className="text-gray-300">
                    Stats are shown as descriptive labels, not numbers. This helps you quickly understand a player's strengths and weaknesses:
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-red-500/30 rounded p-2 text-center">
                      <p className="text-red-400 font-bold m-0">NONE</p>
                      <p className="text-gray-400 text-xs m-0">Tier 1</p>
                    </div>
                    <div className="bg-orange-600/30 rounded p-2 text-center">
                      <p className="text-orange-400 font-bold m-0">POOR</p>
                      <p className="text-gray-400 text-xs m-0">Tier 2</p>
                    </div>
                    <div className="bg-orange-500/30 rounded p-2 text-center">
                      <p className="text-orange-300 font-bold m-0">OK</p>
                      <p className="text-gray-400 text-xs m-0">Tier 3</p>
                    </div>
                    <div className="bg-yellow-500/30 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold m-0">GOOD</p>
                      <p className="text-gray-400 text-xs m-0">Tier 4</p>
                    </div>
                    <div className="bg-lime-500/30 rounded p-2 text-center">
                      <p className="text-lime-400 font-bold m-0">GREAT</p>
                      <p className="text-gray-400 text-xs m-0">Tier 5</p>
                    </div>
                    <div className="bg-green-500/30 rounded p-2 text-center">
                      <p className="text-green-400 font-bold m-0">EXCELLENT</p>
                      <p className="text-gray-400 text-xs m-0">Tier 6</p>
                    </div>
                    <div className="bg-cyan-500/30 rounded p-2 text-center">
                      <p className="text-cyan-400 font-bold m-0">ELITE</p>
                      <p className="text-gray-400 text-xs m-0">Tier 7</p>
                    </div>
                    <div className="bg-yellow-500/30 border border-yellow-500/50 rounded p-2 text-center">
                      <p className="text-yellow-400 font-bold m-0">LEGEND</p>
                      <p className="text-gray-400 text-xs m-0">Tier 8</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Overall Rating (OVR)</h3>
                  <p className="text-gray-300">
                    A player's OVR is the sum of all 7 stat tiers (range: 7-56). Higher OVR = better player overall.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-gray-400 text-xs m-0">Developing</p>
                      <p className="text-white font-bold m-0">7-20</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-gray-400 text-xs m-0">First Grader</p>
                      <p className="text-white font-bold m-0">21-35</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-gray-400 text-xs m-0">Star / Elite</p>
                      <p className="text-white font-bold m-0">36-56</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Discovery:</strong> Part of the fun is experimenting! Find out which stats matter most for each position through trial and error. A Prop with LEGEND speed might surprise you...
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Dominant Side</h3>
                  <p className="text-gray-300">
                    Edge players (Wingers, Centres, Second Rows) have a dominant side preference:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-orange-500 text-white px-2 py-1 rounded font-bold">L</span>
                      <div>
                        <p className="text-white font-bold m-0">Left-Sided</p>
                        <p className="text-gray-400 text-sm m-0">Best on the left edge</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-blue-500 text-white px-2 py-1 rounded font-bold">R</span>
                      <div>
                        <p className="text-white font-bold m-0">Right-Sided</p>
                        <p className="text-gray-400 text-sm m-0">Best on the right edge</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-gray-500 text-white px-2 py-1 rounded font-bold">L/R</span>
                      <div>
                        <p className="text-white font-bold m-0">Versatile</p>
                        <p className="text-gray-400 text-sm m-0">Plays both sides equally</p>
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded font-bold">?</span>
                      <div>
                        <p className="text-white font-bold m-0">Developing</p>
                        <p className="text-gray-400 text-sm m-0">Side not yet determined</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW: Match Stats Section */}
              {activeSection === 'matchstats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏟️ Match Stats
                  </h2>

                  <p className="text-gray-300">
                    After each match, detailed statistics are recorded for every player. Click on any completed fixture to view the Match Centre with full stats.
                  </p>

                  <h3 className="text-xl text-white mt-6">Key Match Statistics</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏉 Tries (T)</p>
                      <p className="text-gray-400 text-sm m-0">Tries scored. 4 points each. The ultimate attacking stat!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-blue-400 font-bold m-0">🤝 Try Assists (TA)</p>
                      <p className="text-gray-400 text-sm m-0">Passes that led directly to tries. Shows playmaking ability. Halfbacks and hookers often lead this stat.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Metres (Mtrs)</p>
                      <p className="text-gray-400 text-sm m-0">Total metres gained. Backs should aim for 150+, forwards for 180+ to get good ratings.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Tackles (Tkls)</p>
                      <p className="text-gray-400 text-sm m-0">Successful tackles made. Missed tackles shown in red. Middle forwards make the most.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-purple-400 font-bold m-0">💥 Line Breaks (LB)</p>
                      <p className="text-gray-400 text-sm m-0">Breaking through the defensive line. Based on Speed + Power. Backs get more opportunities.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-orange-400 font-bold m-0">💪 Tackle Breaks (TB)</p>
                      <p className="text-gray-400 text-sm m-0">Busting out of tackles. Based on Power + Strength. Forwards excel at this.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-red-400 font-bold m-0">❌ Errors (Err)</p>
                      <p className="text-gray-400 text-sm m-0">Handling mistakes. Low Passing stat = more errors. Keep this number down!</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⭐ Rating (Rtg)</p>
                      <p className="text-gray-400 text-sm m-0">Overall match performance (1-10). Based on all stats combined. 8+ is excellent, 9+ is MOTM territory.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Man of the Match (MOTM)</h3>
                  <p className="text-gray-300">
                    Each match awards one player MOTM based on their influence on the game:
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>Tries and try assists carry the most weight</li>
                    <li>In low-scoring games, metres and tackles matter more</li>
                    <li>In high-scoring shootouts, tries dominate</li>
                    <li>Forwards get bonus credit for metres in tight games</li>
                    <li>Captains get a slight edge in close decisions</li>
                    <li>Clean games (0 errors) are rewarded</li>
                  </ul>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 MOTM Formula:</strong> The MOTM reason tells you WHY they won — "2 tries, 1 assist" or "194 metres" or "42 tackles". Use this to understand what wins games!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Leaderboards</h3>
                  <p className="text-gray-300">
                    Check the Leaderboards page to see who's leading your division in each stat category. Track your players' progress throughout the season!
                  </p>
                </div>
              )}

              {/* Tactics - UPDATED WITH CAPTAIN */}
              {activeSection === 'tactics' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Tactics & Lineup
                  </h2>

                  <p className="text-gray-300">
                    Your tactics page is where you set your starting 13, bench, captain, goal kicker, and game plan.
                  </p>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> All changes save automatically — no save button needed!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Captain</h3>
                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-white font-bold m-0">👑 Team Captain</p>
                    <p className="text-gray-400 text-sm m-0">Select your team's leader. Captains get a small boost to their match rating and a slight edge in MOTM voting. Choose someone who plays every week!</p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Attack Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📋 Structured</p>
                      <p className="text-gray-400 text-sm m-0">Balanced, safe approach. Run set plays.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⬅️ Raid Left</p>
                      <p className="text-gray-400 text-sm m-0">Target the left edge with your outside backs.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Up the Guts</p>
                      <p className="text-gray-400 text-sm m-0">Punch through the middle with your forwards. Best with strong Props & Lock.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">➡️ Raid Right</p>
                      <p className="text-gray-400 text-sm m-0">Target the right edge with your outside backs.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎲 Off the Cuff</p>
                      <p className="text-gray-400 text-sm m-0">High risk, high reward! Play on instinct. Can win big or backfire badly.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Defense Styles</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Line Speed</p>
                      <p className="text-gray-400 text-sm m-0">Rush up and pressure the ball carrier.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Shift Left</p>
                      <p className="text-gray-400 text-sm m-0">Overload left side coverage. Counters Raid Right.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🧱 Brick Wall</p>
                      <p className="text-gray-400 text-sm m-0">Stack the middle. Counters Up the Guts.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Shift Right</p>
                      <p className="text-gray-400 text-sm m-0">Overload right side coverage. Counters Raid Left.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Goal Kicker</h3>
                  <p className="text-gray-300">
                    Choosing the right goal kicker is crucial — conversions can win or lose tight games!
                  </p>
                  
                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Tip:</strong> Some players have hidden goal kicking talent! Try different players as kickers throughout the season — you might find a gem you didn't expect.
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
                    The Film Room lets you scout your next opponent before the match. Knowledge is power!
                  </p>

                  <h3 className="text-xl text-white mt-6">What You Can See</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">📈 Recent Form</p>
                      <p className="text-gray-400 text-sm m-0">Their last 5 match results with scores</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚔️ Attack Tendency</p>
                      <p className="text-gray-400 text-sm m-0">Where they like to attack — LEFT, RIGHT, or MIDDLE</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🤝 Head to Head</p>
                      <p className="text-gray-400 text-sm m-0">Previous meetings this season</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚠️ Key Threats</p>
                      <p className="text-gray-400 text-sm m-0">Their top 3 players by overall rating</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">👥 Their Squad</p>
                      <p className="text-gray-400 text-sm m-0">Top 17 players with positions, age, overall, and dominant side</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">What Stays Hidden</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>❌ Exact defense tactic selection</li>
                    <li>❌ Player fatigue levels</li>
                    <li>❌ Their training assignments</li>
                    <li>❌ Who their captain is</li>
                  </ul>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>💡 Pro Move:</strong> Check where their star players are positioned and their dominant sides. A left-sided centre on the left edge tells you where they'll attack!
                    </p>
                  </div>
                </div>
              )}

              {/* Training */}
              {activeSection === 'training' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💪 Training
                  </h2>

                  <p className="text-gray-300">
                    Training is how you develop and improve your players over time. Assign players to specific training programs to boost their stats.
                  </p>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💾 Auto-Save:</strong> Training assignments save automatically when you make changes!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">How Training Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Each player can be assigned to one training focus at a time</li>
                    <li>Training takes effect between matches</li>
                    <li>Players build up "training progress" over time — more progress = better chance of stat gains</li>
                    <li>Younger players and high-potential players develop faster</li>
                    <li>When a player improves, you'll get a notification!</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Training Programs</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">😴 Rest</span>
                      <span className="text-gray-400 text-sm">Reduces fatigue significantly</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">⚡ Speed</span>
                      <span className="text-gray-400 text-sm">More metres, line breaks</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💪 Strength</span>
                      <span className="text-gray-400 text-sm">Better tackles, tackle breaks</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💥 Power</span>
                      <span className="text-gray-400 text-sm">More metres, tackle breaks, tries</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🎯 Passing</span>
                      <span className="text-gray-400 text-sm">Fewer errors, more try assists</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🫁 Stamina</span>
                      <span className="text-gray-400 text-sm">More tackles, better late-game</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🛡️ Tackling</span>
                      <span className="text-gray-400 text-sm">Fewer missed tackles</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🦶 Kicking</span>
                      <span className="text-gray-400 text-sm">Better goal conversion rate</span>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Training Strategy</h3>
                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0 mb-2"><strong>💡 Use match stats to guide training:</strong></p>
                    <ul className="text-gray-300 text-sm space-y-1 m-0">
                      <li>• Player making lots of errors? → Train <strong>Passing</strong></li>
                      <li>• Player missing tackles? → Train <strong>Tackling</strong></li>
                      <li>• Player not making metres? → Train <strong>Speed</strong> or <strong>Power</strong></li>
                      <li>• Player not breaking tackles? → Train <strong>Power</strong> or <strong>Strength</strong></li>
                      <li>• Player fading in 2nd half? → Train <strong>Stamina</strong></li>
                      <li>• Player very fatigued? → Assign <strong>Rest</strong></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Youth Development */}
              {activeSection === 'youth' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🎓 Youth Development
                  </h2>

                  <p className="text-gray-300">
                    Your Development Squad is where future stars emerge. Promote youth players to your senior squad to build for the future.
                  </p>

                  <h3 className="text-xl text-white mt-6">How It Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Youth players are generated from your academy system</li>
                    <li>You can promote one player at a time from each position group</li>
                    <li>Youth players start at age 18</li>
                    <li>There's a cooldown period between promotions</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Position Groups</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏋️ Forwards</p>
                      <p className="text-gray-400 text-sm m-0">Props, Second Rows, Locks</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🏃 Backs</p>
                      <p className="text-gray-400 text-sm m-0">Fullbacks, Wingers, Centres</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🧠 Spine</p>
                      <p className="text-gray-400 text-sm m-0">Halfbacks, Five-Eighths, Hookers</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Patience Bonus</h3>
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>🍀 The longer you wait between promotions, the better your chances of finding a high-quality player!</strong>
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
                    Free Agents are players without a team. This is your chance to pick up bargains!
                  </p>

                  <h3 className="text-xl text-white mt-6">Finding Free Agents</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Browse available players on the Free Agents page</li>
                    <li>Filter by position to find what you need</li>
                    <li>Check their stats, age, and dominant side before signing</li>
                    <li>Experienced veterans can provide immediate impact</li>
                  </ul>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Tip:</strong> Free agents can be hidden gems. Just because a player was released doesn't mean they're bad — they might be exactly what another team needs!
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
                    The Rep Honours page shows which players have been selected for representative teams.
                  </p>

                  <h3 className="text-xl text-white mt-6">State of Origin</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-sky-500/30 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">NSW Blues</p>
                      <p className="text-gray-300 text-sm m-0">New South Wales</p>
                    </div>
                    <div className="bg-red-800/50 rounded p-3 text-center">
                      <p className="text-white font-bold m-0">QLD Maroons</p>
                      <p className="text-gray-300 text-sm m-0">Queensland</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>Origin Trade-off:</strong> Players selected for Origin earn prestige, but return to their clubs more fatigued. Players NOT selected get a rest week fitness boost!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Man of the Match</h3>
                  <p className="text-gray-300">
                    After each match, one player is awarded Man of the Match based on their performance. This is shown in match notifications and in the Match Centre with a ⭐ star next to their name.
                  </p>
                </div>
              )}

              {/* Pro Tips - UPDATED */}
              {activeSection === 'tips' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💡 Pro Tips
                  </h2>

                  <p className="text-gray-300">
                    Advanced strategies to help you get ahead...
                  </p>

                  <div className="space-y-4 mt-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📊 Read Your Match Stats</h4>
                      <p className="text-gray-400 m-0">
                        After each game, click on the fixture to see full stats. High missed tackles? Train Tackling. Lots of errors? Train Passing. Few line breaks? Train Speed & Power.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🤝 Try Assists Matter</h4>
                      <p className="text-gray-400 m-0">
                        A halfback with 3 try assists is as valuable as a winger with 2 tries. Train Passing for your playmakers to boost their assist numbers.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">💥 Power = Points</h4>
                      <p className="text-gray-400 m-0">
                        Power affects line breaks and tackle breaks — both lead to tries! Train Power for your centres and second rowers.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎬 Scout Before Every Match</h4>
                      <p className="text-gray-400 m-0">
                        Use the Film Room to learn your opponent's attack tendency. If they're strong on the LEFT, set your defense to Shift Left!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👑 Pick a Consistent Captain</h4>
                      <p className="text-gray-400 m-0">
                        Your captain gets a small MOTM boost and rating bonus. Choose someone who plays every week — like a lock or hooker.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">↔️ Consider Dominant Sides</h4>
                      <p className="text-gray-400 m-0">
                        Left-sided players generally perform best on the left edge, right-sided on the right. Versatile (L/R) players are rare and valuable.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎲 Off the Cuff — Use Sparingly</h4>
                      <p className="text-gray-400 m-0">
                        The Off the Cuff attack style is high risk/high reward. It can blow games open, but it can also backfire badly. Best used when you have nothing to lose!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👶 Invest in Youth</h4>
                      <p className="text-gray-400 m-0">
                        Young players (18-23) have more room to grow. A 25 OVR 18-year-old might become a 40 OVR star by age 26.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎯 Test Your Goal Kickers</h4>
                      <p className="text-gray-400 m-0">
                        You won't know who your best kicker is until you try them! Test different players throughout the season.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🏆 Origin Strategy</h4>
                      <p className="text-gray-400 m-0">
                        Having players make Origin is prestigious, but they return tired. Plan your lineup around Origin weekends — your non-Origin players will be extra fresh!
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📊 Check Leaderboards</h4>
                      <p className="text-gray-400 m-0">
                        The Leaderboards page shows who's dominating your division. See where your players rank and identify areas to improve!
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mt-6">
                    <p className="text-green-400 m-0">
                      <strong>Most importantly:</strong> Have fun! Experiment with different strategies, take risks on unknown players, and build your legacy. Good luck, Coach! 🏆
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