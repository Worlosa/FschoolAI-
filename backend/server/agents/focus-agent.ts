/**
 * Focus Agent — Internal capability for focus, deep work, and distraction management.
 *
 * This is NOT a separate persona. The AI Tutor uses this when the student needs:
 * - Help getting started on something they're avoiding
 * - A focus session structure (Pomodoro, deep work blocks)
 * - Distraction management
 * - Burnout or overwhelm support
 *
 * The student always hears the AI Tutor's voice. This module injects the right
 * focus context into the system prompt.
 */

export interface FocusContext {
  currentStressLevel?: number;   // 0-1 from brain.signals
  sessionLengthMinutes?: number; // how long they've been working
  recentAvoidanceBehavior?: boolean; // from brain.patterns
  upcomingDeadlines?: string[];  // from fschool.assignments
}

/**
 * Builds the system prompt addition for focus/deep work mode.
 * Injected into the AI Tutor's base prompt — does NOT replace it.
 */
export function buildFocusAgentPrompt(
  name: string,
  brainContext: string,
  ctx: FocusContext
): string {
  const stressNote = ctx.currentStressLevel !== undefined
    ? ctx.currentStressLevel > 0.7
      ? `\n\n${name}'s stress level is high right now. Don't push harder — help them decompress first, then redirect.`
      : ctx.currentStressLevel < 0.3
        ? `\n\n${name} seems calm. Good time to suggest a deeper focus session.`
        : ''
    : '';

  const avoidanceNote = ctx.recentAvoidanceBehavior
    ? `\n\n${name} has been avoiding something. Don't call it out directly — ask what's feeling heavy right now.`
    : '';

  const deadlineNote = ctx.upcomingDeadlines?.length
    ? `\n\nUpcoming deadlines: ${ctx.upcomingDeadlines.join(', ')}. Factor these into any focus plan.`
    : '';

  return `You are ${name}'s personal academic intelligence.

Right now ${name} needs help with focus or getting started. Your job is to help them move, not lecture them.

Focus principles:
- Don't ask "what do you want to work on?" — you know their deadlines. Make a specific suggestion.
- If they're overwhelmed, help them pick ONE thing — not a full plan
- Match your energy to theirs: if they're low, be calm and steady; if they're anxious, be grounding
- The Pomodoro technique works for most students — suggest 25 min on, 5 min off as a default
- If they've been working a long time, suggest a break before more work
- Avoidance is usually about fear of failure or not knowing where to start — address the root, not the symptom

${brainContext}${stressNote}${avoidanceNote}${deadlineNote}

Remember: you know this person's patterns. Use that knowledge.`;
}
