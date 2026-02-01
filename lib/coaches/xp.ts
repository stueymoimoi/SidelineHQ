/**
 * Coach XP System
 * Handles XP awards, level calculations, and level-up notifications
 */

import { createClient } from '@supabase/supabase-js';
import { COACH_XP_REWARDS, getCoachLevel } from '@/lib/game-engine/constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type XPEventType = keyof typeof COACH_XP_REWARDS;

interface XPAwardResult {
  success: boolean;
  xpAwarded: number;
  newTotal: number;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle?: string;
}

/**
 * Award XP to a coach and check for level-up
 */
export async function awardCoachXP(
  coachId: string,
  eventType: XPEventType,
  multiplier: number = 1
): Promise<XPAwardResult> {
  const xpAmount = COACH_XP_REWARDS[eventType] * multiplier;
  
  // Get current XP and level
  const { data: coach, error: fetchError } = await supabase
    .from('coaches')
    .select('xp, level, coach_name, team_id')
    .eq('id', coachId)
    .single();
  
  if (fetchError || !coach) {
    console.error('Failed to fetch coach:', fetchError);
    return { success: false, xpAwarded: 0, newTotal: 0, leveledUp: false, oldLevel: 1, newLevel: 1 };
  }
  
  const oldXP = coach.xp || 0;
  const oldLevel = coach.level || 1;
  const newTotal = oldXP + xpAmount;
  
  // Calculate new level
  const { level: newLevel, title: newTitle } = getCoachLevel(newTotal);
  const leveledUp = newLevel > oldLevel;
  
  // Update coach XP and level
  const { error: updateError } = await supabase
    .from('coaches')
    .update({ xp: newTotal, level: newLevel })
    .eq('id', coachId);
  
  if (updateError) {
    console.error('Failed to update coach XP:', updateError);
    return { success: false, xpAwarded: 0, newTotal: oldXP, leveledUp: false, oldLevel, newLevel: oldLevel };
  }
  
  // If leveled up, create news item
  if (leveledUp && coach.team_id) {
    await createLevelUpNews(coach.team_id, coach.coach_name || 'Coach', newLevel, newTitle);
  }
  
  return {
    success: true,
    xpAwarded: xpAmount,
    newTotal,
    leveledUp,
    oldLevel,
    newLevel,
    newTitle: leveledUp ? newTitle : undefined,
  };
}

/**
 * Award XP to multiple coaches (batch operation)
 */
export async function awardBatchXP(
  awards: Array<{ coachId: string; eventType: XPEventType; multiplier?: number }>
): Promise<Map<string, XPAwardResult>> {
  const results = new Map<string, XPAwardResult>();
  
  for (const award of awards) {
    const result = await awardCoachXP(award.coachId, award.eventType, award.multiplier || 1);
    results.set(award.coachId, result);
  }
  
  return results;
}

/**
 * Create a news item for level-up
 */
async function createLevelUpNews(
  teamId: string,
  coachName: string,
  newLevel: number,
  title: string
): Promise<void> {
  const headlines = [
    `${coachName} promoted to ${title}!`,
    `${coachName} reaches Level ${newLevel}!`,
    `${coachName} earns ${title} status!`,
  ];
  
  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  
  const { error } = await supabase.from('news').insert({
    team_id: teamId,
    headline,
    content: `Congratulations! Your coaching career has progressed to Level ${newLevel}: ${title}. Keep building your legacy!`,
    category: 'achievement',
    is_read: false,
  });
  
  if (error) {
    console.error('Failed to create level-up news:', error);
  }
}

/**
 * Get coach XP summary
 */
export async function getCoachXPSummary(coachId: string): Promise<{
  xp: number;
  level: number;
  title: string;
  progress: number;
  xpForNext: number | null;
} | null> {
  const { data: coach, error } = await supabase
    .from('coaches')
    .select('xp, level')
    .eq('id', coachId)
    .single();
  
  if (error || !coach) return null;
  
  const levelInfo = getCoachLevel(coach.xp || 0);
  
  return {
    xp: coach.xp || 0,
    level: levelInfo.level,
    title: levelInfo.title,
    progress: levelInfo.progress,
    xpForNext: levelInfo.xpForNext,
  };
}