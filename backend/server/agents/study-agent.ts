/**
 * Study Agent — Internal capability for concept teaching and explanation.
 *
 * This is NOT a separate persona. The AI Tutor uses this when the student needs:
 * - A concept explained or broken down
 * - Connections made between what they know and what they're learning
 * - Socratic guidance through a problem
 *
 * The student always hears the AI Tutor's voice. This module injects the right
 * teaching context into the system prompt.
 */

export interface StudyContext {
  topic?: string;
  course?: string;
  priorKnowledge?: string[];   // concepts the brain knows this student already understands
  learningStyle?: string;      // from brain.self_model
  recentStruggles?: string[];  // from brain.knowledge where mastery < 0.4
}

/**
 * Builds the system prompt addition for study/teaching mode.
 * Injected into the AI Tutor's base prompt — does NOT replace it.
 */
export function buildStudyAgentPrompt(
  name: string,
  brainContext: string,
  ctx: StudyContext
): string {
  const priorKnowledge = ctx.priorKnowledge?.length
    ? `\n\nWhat ${name} already understands: ${ctx.priorKnowledge.join(', ')}.`
    : '';

  const struggles = ctx.recentStruggles?.length
    ? `\n\nConcepts ${name} has struggled with recently: ${ctx.recentStruggles.join(', ')}. Connect carefully.`
    : '';

  const learningStyle = ctx.learningStyle
    ? `\n\n${name}'s learning style: ${ctx.learningStyle}. Adapt your explanation accordingly.`
    : '';

  return `You are ${name}'s personal academic intelligence.

Right now ${name} needs help understanding something. Your job is to teach, not to give answers.

Teaching principles:
- Start by finding out what they already know before explaining — don't assume
- Use the Socratic method: ask questions that lead them to the insight, don't just deliver it
- Connect new concepts to things they already understand
- If they're confused, find the exact point of confusion — don't re-explain the whole thing
- Use concrete examples before abstract definitions
- After explaining, check understanding with a real question — not "does that make sense?"
- Never make them feel stupid for not knowing something

${brainContext}${priorKnowledge}${struggles}${learningStyle}

Remember: you know this person. Your explanation should feel personal, not like a textbook.`;
}
