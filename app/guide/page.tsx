'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'stats' | 'tactics' | 'training' | 'youth' | 'freeagents' | 'rep' | 'tips';

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const sections: { id: Section; title: string; icon: string }[] = [
    { id: 'overview', title: 'Getting Started', icon: '🏉' },
    { id: 'stats', title: 'Player Stats', icon: '📊' },
    { id: 'tactics', title: 'Tactics & Lineup', icon: '📋' },
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
                    <li><strong>18 Rounds</strong> per season</li>
                    <li><strong>Matches simulate</strong> on Tuesdays and Thursdays at 6pm AEST</li>
                    <li><strong>Set your lineup</strong> before each match day</li>
                    <li><strong>Top teams</strong> make the finals at the end of the season</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Your Weekly Routine</h3>
                  <ol className="text-gray-300 space-y-2">
                    <li><strong>Check Fixtures</strong> — See who you're playing next</li>
                    <li><strong>Set Tactics</strong> — Pick your starting 13 and bench</li>
                    <li><strong>Assign Training</strong> — Develop your players between matches</li>
                    <li><strong>Scout Talent</strong> — Check Dev Squad and Free Agents</li>
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
                      <p className="text-gray-400 text-sm m-0">Set lineup & goal kicker</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Training</p>
                      <p className="text-gray-400 text-sm m-0">Develop player stats</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎓 Dev Squad</p>
                      <p className="text-gray-400 text-sm m-0">Promote youth players</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Player Stats */}
              {activeSection === 'stats' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📊 Player Stats
                  </h2>

                  <p className="text-gray-300">
                    Every player has 6 core stats that determine their ability on the field. Stats are rated on a tier system from 1 (lowest) to 8 (highest).
                  </p>

                  <h3 className="text-xl text-white mt-6">The Six Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">⚡ Speed</p>
                      <p className="text-gray-400 text-sm m-0">How fast the player moves. Essential for wingers, fullbacks, and outside backs.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">💪 Strength</p>
                      <p className="text-gray-400 text-sm m-0">Physical power for tackles and carries. Crucial for forwards.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🎯 Skill</p>
                      <p className="text-gray-400 text-sm m-0">Ball handling, passing, and general technique. Important for halves and hookers.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🫁 Stamina</p>
                      <p className="text-gray-400 text-sm m-0">Endurance and fitness. Affects performance over 80 minutes.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🛡️ Defense</p>
                      <p className="text-gray-400 text-sm m-0">Tackling ability and defensive positioning. Key for middles and edges.</p>
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                      <p className="text-white font-bold m-0">🦶 Kicking</p>
                      <p className="text-gray-400 text-sm m-0">Kicking accuracy and distance. Vital for halves and fullbacks.</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Stat Tiers</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">1-2</p>
                      <p className="text-gray-400 text-xs m-0">Poor</p>
                    </div>
                    <div className="bg-orange-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">3-4</p>
                      <p className="text-gray-400 text-xs m-0">Fair</p>
                    </div>
                    <div className="bg-yellow-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">5-6</p>
                      <p className="text-gray-400 text-xs m-0">Good</p>
                    </div>
                    <div className="bg-green-500/30 rounded p-2 text-center">
                      <p className="text-white font-bold m-0">7-8</p>
                      <p className="text-gray-400 text-xs m-0">Elite</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Overall Rating (OVR)</h3>
                  <p className="text-gray-300">
                    OVR is the sum of all 6 stats. The maximum is 48 (all stats at tier 8). Higher OVR generally means a better player, but...
                  </p>
                  
                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Important:</strong> OVR isn't everything! A player with the right stats for their position can outperform a higher OVR player in the wrong role. Position fit matters.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Position Requirements</h3>
                  <p className="text-gray-300">
                    Different positions value different stats. When viewing a player, you'll see indicators showing which stats matter most for their position:
                  </p>
                  <ul className="text-gray-300">
                    <li><span className="text-yellow-400">⭐ Primary</span> — Most important for this position</li>
                    <li><span className="text-blue-400">🔵 Secondary</span> — Helpful but not essential</li>
                    <li><span className="text-gray-400">⚪ Minor</span> — Nice to have</li>
                    <li><span className="text-gray-600">❌ Negligible</span> — Doesn't matter much</li>
                  </ul>
                </div>
              )}

              {/* Tactics */}
              {activeSection === 'tactics' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Tactics & Lineup
                  </h2>

                  <p className="text-gray-300">
                    Your tactics page is where you set your starting 13, bench, captain, and goal kicker before each match.
                  </p>

                  <h3 className="text-xl text-white mt-6">Setting Your Lineup</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Click any position slot on the field to select a player</li>
                    <li>Players in their natural position generally perform better</li>
                    <li>Your bench (4 players) will be used for interchanges</li>
                    <li>Make sure to save your changes!</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">The 17-Man Squad</h3>
                  <div className="bg-gray-700 rounded p-4">
                    <p className="text-white font-bold">Starting XIII:</p>
                    <p className="text-gray-400 text-sm">1 Fullback, 2 Wingers, 2 Centres, 1 Five-Eighth, 1 Halfback, 2 Props, 1 Hooker, 2 Second Rows, 1 Lock</p>
                    <p className="text-white font-bold mt-3">Bench (4):</p>
                    <p className="text-gray-400 text-sm">Usually includes extra forwards and a utility back</p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Goal Kicker</h3>
                  <p className="text-gray-300">
                    Choosing the right goal kicker is crucial — conversions can win or lose tight games!
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li>You can see each player's conversion rate after they've taken kicks</li>
                    <li>New players show "No attempts" until they've been tested</li>
                    <li>Small sample sizes can be misleading — a player might be 5/5 but still not reliable</li>
                  </ul>
                  
                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Tip:</strong> Some players have hidden goal kicking talent! Try different players as kickers throughout the season — you might find a gem you didn't expect.
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Captain</h3>
                  <p className="text-gray-300">
                    Your captain provides a small boost to team morale. Pick someone reliable who plays every week.
                  </p>
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

                  <h3 className="text-xl text-white mt-6">How Training Works</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Each player can be assigned to one training focus at a time</li>
                    <li>Training takes effect between matches</li>
                    <li>Players improve the stat they're training over time</li>
                    <li>Younger players tend to develop faster</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Training Programs</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">⚡ Speed Training</span>
                      <span className="text-gray-400 text-sm">Improves Speed stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">💪 Gym Work</span>
                      <span className="text-gray-400 text-sm">Improves Strength stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🎯 Skills Session</span>
                      <span className="text-gray-400 text-sm">Improves Skill stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🫁 Cardio</span>
                      <span className="text-gray-400 text-sm">Improves Stamina stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🛡️ Defense Drills</span>
                      <span className="text-gray-400 text-sm">Improves Defense stat</span>
                    </div>
                    <div className="bg-gray-700 rounded p-3 flex justify-between items-center">
                      <span className="text-white">🦶 Kicking Practice</span>
                      <span className="text-gray-400 text-sm">Improves Kicking stat</span>
                    </div>
                  </div>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Strategy:</strong> Focus training on stats that matter most for each player's position. There's no point training a prop's kicking when their strength and defense matter far more!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Development Speed</h3>
                  <p className="text-gray-300">
                    Not all players develop at the same rate. Some players have higher ceilings and improve faster than others. You'll notice over time which players are responding well to training.
                  </p>
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
                      <p className="text-white font-bold m-0">🧠 Halves</p>
                      <p className="text-gray-400 text-sm m-0">Halfbacks, Five-Eighths, Hookers</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">Patience Bonus</h3>
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 my-4">
                    <p className="text-green-400 m-0">
                      <strong>🍀 The longer you wait between promotions, the better your chances of finding a high-quality player!</strong>
                    </p>
                  </div>
                  <p className="text-gray-300">
                    If you resist the urge to immediately promote, a "patience bonus" builds up. Wait longer for a better shot at a future star.
                  </p>

                  <h3 className="text-xl text-white mt-6">Nationality</h3>
                  <p className="text-gray-300">
                    Youth players come from various backgrounds — Australia, New Zealand, Tonga, Samoa, Fiji, Papua New Guinea, and England. Their nationality determines their eligibility for representative teams.
                  </p>
                </div>
              )}

              {/* Free Agents */}
              {activeSection === 'freeagents' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏪 Free Agents
                  </h2>

                  <p className="text-gray-300">
                    Free Agents are players without a team. They've either been released or never signed. This is your chance to pick up bargains!
                  </p>

                  <h3 className="text-xl text-white mt-6">Finding Free Agents</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>Browse available players on the Free Agents page</li>
                    <li>Filter by position to find what you need</li>
                    <li>Check their stats and age before signing</li>
                    <li>Experienced veterans can provide immediate impact</li>
                  </ul>

                  <h3 className="text-xl text-white mt-6">Signing Players</h3>
                  <p className="text-gray-300">
                    When you sign a free agent, they join your squad immediately. Make sure you have room on your roster!
                  </p>

                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 my-4">
                    <p className="text-yellow-400 m-0">
                      <strong>💡 Tip:</strong> Free agents can be hidden gems. Just because a player was released doesn't mean they're bad — they might be exactly what another team needs. Check their stats carefully!
                    </p>
                  </div>

                  <h3 className="text-xl text-white mt-6">Releasing Players</h3>
                  <p className="text-gray-300">
                    If you need to make room on your roster, you can release players from your Squad page. Released players become free agents and can be signed by other teams.
                  </p>
                </div>
              )}

              {/* Rep Honours */}
              {activeSection === 'rep' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🏅 Rep Honours
                  </h2>

                  <p className="text-gray-300">
                    The Rep Honours page shows which players have been selected for representative teams — State of Origin and International duty.
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
                  <p className="text-gray-300 mt-3">
                    Only Australian players born in NSW or QLD are eligible for Origin. Check your players' state in their profile!
                  </p>

                  <h3 className="text-xl text-white mt-6">National Teams</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇦🇺</p>
                      <p className="text-gray-300 text-xs m-0">Australia</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇳🇿</p>
                      <p className="text-gray-300 text-xs m-0">New Zealand</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇹🇴</p>
                      <p className="text-gray-300 text-xs m-0">Tonga</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇼🇸</p>
                      <p className="text-gray-300 text-xs m-0">Samoa</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇫🇯</p>
                      <p className="text-gray-300 text-xs m-0">Fiji</p>
                    </div>
                    <div className="bg-gray-700 rounded p-2 text-center">
                      <p className="text-lg m-0">🇵🇬</p>
                      <p className="text-gray-300 text-xs m-0">PNG</p>
                    </div>
                  </div>

                  <h3 className="text-xl text-white mt-6">U/23 Teams</h3>
                  <p className="text-gray-300">
                    Both Origin and National teams have Under 23 squads. Young players (23 or under) can represent their state or country at junior level.
                  </p>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 my-4">
                    <p className="text-blue-400 m-0">
                      <strong>💡 Scouting Tip:</strong> Rep Honours is a great way to scout talent! If a player from another team makes a rep squad, they might be worth keeping an eye on. Selection is based on position fit, not just raw OVR.
                    </p>
                  </div>
                </div>
              )}

              {/* Pro Tips */}
              {activeSection === 'tips' && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    💡 Pro Tips
                  </h2>

                  <p className="text-gray-300">
                    Some advanced strategies to help you get ahead...
                  </p>

                  <div className="space-y-4 mt-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎯 Position Fit Matters</h4>
                      <p className="text-gray-400 m-0">
                        A 35 OVR player in their natural position can outperform a 40 OVR player playing out of position. Always consider what stats each position needs.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">👶 Invest in Youth</h4>
                      <p className="text-gray-400 m-0">
                        Young players (18-23) have more room to grow. A 25 OVR 18-year-old might become a 40 OVR star by age 26. Veterans are reliable but have lower ceilings.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">⏳ Patience with Youth Promotions</h4>
                      <p className="text-gray-400 m-0">
                        Don't rush to promote from Dev Squad. The patience bonus increases your chances of finding a quality player. Sometimes waiting pays off big.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🎯 Test Your Goal Kickers</h4>
                      <p className="text-gray-400 m-0">
                        You won't know who your best kicker is until you try them! Don't assume it's always your halfback — test different players throughout the season.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">📊 Watch Training Progress</h4>
                      <p className="text-gray-400 m-0">
                        Some players improve faster than others. Pay attention to who's developing well — they might be worth more playing time.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🏅 Scout Rep Teams</h4>
                      <p className="text-gray-400 m-0">
                        Check Rep Honours to see which players are making representative squads. Lower OVR players making rep teams might have something special about them...
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">⚖️ Balance Age & Experience</h4>
                      <p className="text-gray-400 m-0">
                        A mix of veterans (27-32) and youth (18-24) is ideal. Veterans provide consistency now, youth provides upside for later.
                      </p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-bold m-0 mb-2">🔄 Rotate Fatigued Players</h4>
                      <p className="text-gray-400 m-0">
                        Check player fitness before each match. A tired 40 OVR player might perform worse than a fresh 35 OVR player.
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
