const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials - UPDATE THE KEY!
const supabaseUrl = 'https://souktfzlcdpzwebwfeqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWt0ZnpsY2RwendlYndmZXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODM0MTUsImV4cCI6MjA4MzY1OTQxNX0.-gXuE4CGRG_TsAw4oMlqGV55-B6-jar5vaBFIAj193A';

const supabase = createClient(supabaseUrl, supabaseKey);

// Training options
const TRAINING_OPTIONS = [
  'Speed Drills',
  'Gym',
  'Ball Skills', 
  'Conditioning',
  'Defense Drills',
  'Position Training',
  'Rest'
];

async function assignTrainingToTeam(teamName, trainingAssignments) {
  console.log(`\n💪 Assigning training for ${teamName}`);
  console.log('─'.repeat(40));
  
  // Get team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('name', teamName)
    .single();
  
  if (teamError || !team) {
    console.error(`Team "${teamName}" not found`);
    return;
  }
  
  // Get players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', team.id)
    .order('overall', { ascending: false });
  
  if (playersError) {
    console.error('Error fetching players:', playersError);
    return;
  }
  
  console.log(`\nPlayers on ${team.name}:\n`);
  
  players.forEach((p, i) => {
    const secPos = p.secondary_position ? ` / ${p.secondary_position}` : '';
    const currentTraining = p.current_training || 'None';
    const progress = p.training_progress || 'NONE';
    console.log(`${i + 1}. ${p.first_name} ${p.last_name} (${p.position}${secPos}) - ${p.overall} OVR`);
    console.log(`   Current: ${currentTraining} [${progress}] | Fatigue: ${p.fatigue || 0}%`);
  });
  
  console.log('\n─'.repeat(40));
  console.log('Training Options:');
  TRAINING_OPTIONS.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  
  // Apply assignments if provided
  if (trainingAssignments && Object.keys(trainingAssignments).length > 0) {
    console.log('\nApplying training assignments...\n');
    
    for (const [playerIndex, trainingIndex] of Object.entries(trainingAssignments)) {
      const player = players[parseInt(playerIndex) - 1];
      const training = TRAINING_OPTIONS[parseInt(trainingIndex) - 1];
      
      if (player && training) {
        await supabase
          .from('players')
          .update({ 
            current_training: training,
            training_progress: player.current_training === training ? player.training_progress : 'POOR'
          })
          .eq('id', player.id);
        
        console.log(`✅ ${player.first_name} ${player.last_name} → ${training}`);
      }
    }
  }
}

async function showTeamTraining(teamName) {
  // Get team
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('name', teamName)
    .single();
  
  if (!team) {
    console.error(`Team "${teamName}" not found`);
    return;
  }
  
  // Get players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', team.id)
    .order('overall', { ascending: false });
  
  console.log(`\n💪 ${team.name} Training Status`);
  console.log('═'.repeat(50));
  
  players.forEach((p, i) => {
    const secPos = p.secondary_position ? ` / ${p.secondary_position}` : '';
    const training = p.current_training || 'None';
    const progress = p.training_progress || 'NONE';
    const fatigue = p.fatigue || 0;
    
    let progressBar = '';
    if (progress === 'POOR') progressBar = '▓░░░░';
    else if (progress === 'FAIR') progressBar = '▓▓░░░';
    else if (progress === 'GOOD') progressBar = '▓▓▓░░';
    else if (progress === 'VERY GOOD') progressBar = '▓▓▓▓░';
    else if (progress === 'EXCELLENT') progressBar = '▓▓▓▓▓';
    else progressBar = '░░░░░';
    
    console.log(`${(i + 1).toString().padStart(2)}. ${p.first_name.padEnd(10)} ${p.last_name.padEnd(12)} ${p.position.padEnd(11)} ${p.overall} OVR`);
    console.log(`    Training: ${training.padEnd(17)} ${progressBar} ${progress.padEnd(9)} Fatigue: ${fatigue}%`);
  });
}

async function autoAssignTraining(teamName) {
  console.log(`\n🤖 Auto-assigning training for ${teamName}`);
  
  // Get team
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('name', teamName)
    .single();
  
  if (!team) {
    console.error(`Team "${teamName}" not found`);
    return;
  }
  
  // Get players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', team.id);
  
  for (const player of players) {
    let training;
    
    // If fatigued, rest
    if (player.fatigue >= 60) {
      training = 'Rest';
    }
    // If has secondary position with room to improve, train position
    else if (player.secondary_position && player.position_ratings) {
      const secRating = player.position_ratings[player.secondary_position] || 70;
      if (secRating < 95 && Math.random() < 0.3) {
        training = 'Position Training';
      }
    }
    
    // Otherwise, train weakest stat or position-appropriate
    if (!training) {
      const pos = player.position;
      
      if (['Fullback', 'Winger'].includes(pos)) {
        training = Math.random() < 0.5 ? 'Speed Drills' : 'Ball Skills';
      } else if (['Prop', 'Lock', 'Second Row'].includes(pos)) {
        training = Math.random() < 0.5 ? 'Gym' : 'Defense Drills';
      } else if (['Halfback', 'Five-Eighth', 'Hooker'].includes(pos)) {
        training = Math.random() < 0.5 ? 'Ball Skills' : 'Conditioning';
      } else if (pos === 'Centre') {
        training = Math.random() < 0.5 ? 'Speed Drills' : 'Defense Drills';
      } else {
        training = 'Conditioning';
      }
    }
    
    await supabase
      .from('players')
      .update({ 
        current_training: training,
        training_progress: player.current_training === training ? player.training_progress : 'POOR'
      })
      .eq('id', player.id);
  }
  
  console.log('✅ Training auto-assigned based on positions!\n');
  await showTeamTraining(teamName);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const teamName = args.slice(1).join(' ');
  
  console.log('💪 SidelineHQ Training Manager');
  console.log('==============================\n');
  
  if (command === 'show' && teamName) {
    await showTeamTraining(teamName);
  } else if (command === 'auto' && teamName) {
    await autoAssignTraining(teamName);
  } else {
    console.log('Usage:');
    console.log('  node assign-training.js show "Team Name"  - View team training status');
    console.log('  node assign-training.js auto "Team Name"  - Auto-assign training');
    console.log('\nExample:');
    console.log('  node assign-training.js show "Canberra Frost"');
    console.log('  node assign-training.js auto "Canberra Frost"');
  }
}

main();
