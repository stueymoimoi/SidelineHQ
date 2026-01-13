import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function MatchPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Get match details
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .single();

  if (matchError || !match) {
    notFound();
  }

  // Get team details
  const { data: homeTeam } = await supabase
    .from("teams")
    .select("*")
    .eq("id", match.home_team_id)
    .single();

  const { data: awayTeam } = await supabase
    .from("teams")
    .select("*")
    .eq("id", match.away_team_id)
    .single();

  // Get player stats for this match
  const { data: playerStats } = await supabase
    .from("player_match_stats")
    .select("*, players(first_name, last_name, position, team_id)")
    .eq("match_id", params.id)
    .order("jersey_number", { ascending: true });

  const homeStats = playerStats?.filter(
    (p) => p.players?.team_id === match.home_team_id
  );
  const awayStats = playerStats?.filter(
    (p) => p.players?.team_id === match.away_team_id
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/clubhouse"
        className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
      >
        ← Back to Clubhouse
      </Link>

      {/* Score Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <p className="text-center text-gray-400 text-sm mb-2">
          Round {match.round}
        </p>
        <div className="flex items-center justify-center gap-8">
          <div className="text-right">
            <p className="text-xl font-bold">{homeTeam?.name}</p>
          </div>
          <div className="text-center">
            <span className="text-4xl font-bold">
              {match.home_score} - {match.away_score}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xl font-bold">{awayTeam?.name}</p>
          </div>
        </div>
      </div>

      {/* Stats Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Home Team Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{homeTeam?.name}</h3>
          <StatsTable stats={homeStats || []} />
        </div>

        {/* Away Team Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">{awayTeam?.name}</h3>
          <StatsTable stats={awayStats || []} />
        </div>
      </div>
    </div>
  );
}

function StatsTable({ stats }: { stats: any[] }) {
  if (!stats.length) {
    return <p className="text-gray-400 text-sm">No stats available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left">
            <th className="pb-2">#</th>
            <th className="pb-2">Player</th>
            <th className="pb-2">M</th>
            <th className="pb-2">T</th>
            <th className="pb-2">MT</th>
            <th className="pb-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.player_id} className="border-t border-gray-700">
              <td className="py-2">{stat.jersey_number}</td>
              <td className="py-2">
                {stat.players?.first_name} {stat.players?.last_name}
              </td>
              <td className="py-2">{stat.metres}</td>
              <td className="py-2">{stat.tackles}</td>
              <td className="py-2">{stat.missed_tackles}</td>
              <td className="py-2">{stat.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">
        M = Metres, T = Tackles, MT = Missed Tackles
      </p>
    </div>
  );
}