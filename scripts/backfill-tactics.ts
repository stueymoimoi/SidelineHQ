import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POSITION_TO_FIELDS: Record<string, string[]> = {
  'Fullback': ['pos_fullback'],
  'Winger': ['pos_winger_l', 'pos_winger_r'],
  'Centre': ['pos_centre_l', 'pos_centre_r'],
  'Five-Eighth': ['pos_five_eighth'],
  'Halfback': ['pos_halfback'],
  'Prop': ['pos_prop_l', 'pos_prop_r'],
  'Hooker': ['pos_hooker'],
  'Second Row': ['pos_second_row_l', 'pos_second_row_r'],
  'Lock': ['pos_lock'],
};

const BENCH_PRIORITY = ['Prop', 'Second Row', 'Hooker', 'Lock', 'Centre', 'Halfback', 'Five-Eighth', 'Winger', 'Fullback'];

interface Player {
  id: string;
  position: string;
  overall: number;
  fatigue: number;
}

function generateLineup(players: Player[]) {
  const available = players.sort((a, b) => {
    if (b.overall !== a.overall) return b.overall - a.overall;
    return (a.fatigue || 0) - (b.fatigue || 0);
  });

  const tactics: Record<string, string> = {};
  const usedPlayerIds = new Set<string>();

  const positionOrder = [
    'Fullback', 'Winger', 'Centre', 'Five-Eighth', 'Halfback',
    'Prop', 'Hooker', 'Second Row', 'Lock'
  ];

  for (const position of positionOrder) {
    const fields = POSITION_TO_FIELDS[position];
    const positionPlayers = available.filter(
      p => p.position === position && !usedPlayerIds.has(p.id)
    );

    for (const field of fields) {
      const player = positionPlayers.shift();
      if (player) {
        tactics[field] = player.id;
        usedPlayerIds.add(player.id);
      }
    }
  }

  const benchFields = ['bench_1', 'bench_2', 'bench_3', 'bench_4'];
  const remainingPlayers = available.filter(p => !usedPlayerIds.has(p.id));
  
  remainingPlayers.sort((a, b) => {
    const aPriority = BENCH_PRIORITY.indexOf(a.position);
    const bPriority = BENCH_PRIORITY.indexOf(b.position);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.overall - a.overall;
  });

  for (let i = 0; i < benchFields.length && i < remainingPlayers.length; i++) {
    tactics[benchFields[i]] = remainingPlayers[i].id;
    usedPlayerIds.add(remainingPlayers[i].id);
  }

  const starters = available.filter(p => usedPlayerIds.has(p.id)).slice(0, 13);
  if (starters.length > 0) {
    tactics.captain = starters[0].id;
  }

  const kickerPriority = ['Fullback', 'Halfback', 'Five-Eighth'];
  for (const pos of kickerPriority) {
    const kicker = available.find(p => p.position === pos && usedPlayerIds.has(p.id));
    if (kicker) {
      tactics.goal_kicker = kicker.id;
      break;
    }
  }

  return tactics;
}

async function main() {
  console.log('Backfilling team tactics...\n');

  const { data: teams } = await supabase.from('teams').select('id, name');
  if (!teams) {
    console.log('No teams found');
    return;
  }

  let updated = 0;
  let errors: string[] = [];

  for (const team of teams) {
    const { data: tactics } = await supabase
      .from('team_tactics')
      .select('*')
      .eq('team_id', team.id)
      .single();

    const startingFields = [
      'pos_fullback', 'pos_winger_l', 'pos_winger_r', 'pos_centre_l', 'pos_centre_r',
      'pos_five_eighth', 'pos_halfback', 'pos_prop_l', 'pos_prop_r', 'pos_hooker',
      'pos_second_row_l', 'pos_second_row_r', 'pos_lock'
    ];

    const isIncomplete = !tactics || startingFields.some(f => !tactics[f]);

    if (!isIncomplete) continue;

    const { data: players } = await supabase
      .from('players')
      .select('id, position, overall, fatigue')
      .eq('team_id', team.id);

    if (!players || players.length < 17) {
      errors.push(`${team.name}: Not enough players (${players?.length || 0})`);
      continue;
    }

    const newTactics = generateLineup(players);

    if (tactics) {
      const mergedTactics = { ...newTactics };
      for (const field of [...startingFields, 'bench_1', 'bench_2', 'bench_3', 'bench_4', 'captain', 'goal_kicker']) {
        if (tactics[field]) {
          mergedTactics[field] = tactics[field];
        }
      }

      const { error } = await supabase
        .from('team_tactics')
        .update(mergedTactics)
        .eq('team_id', team.id);

      if (error) {
        errors.push(`${team.name}: ${error.message}`);
      } else {
        console.log(`✓ ${team.name}`);
        updated++;
      }
    } else {
      const { error } = await supabase
        .from('team_tactics')
        .insert({ team_id: team.id, ...newTactics });

      if (error) {
        errors.push(`${team.name}: ${error.message}`);
      } else {
        console.log(`✓ ${team.name} (new)`);
        updated++;
      }
    }
  }

  console.log(`\n✅ Updated: ${updated} teams`);
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main();