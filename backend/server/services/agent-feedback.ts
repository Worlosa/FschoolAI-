// ============================================================
// Agent Feedback Loop
//
// Records thumbs up/down on any agent response.
// Writes to brain.signals (Brain DB) so the brain learns
// which agent responses actually help each student.
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Brain DB — all intelligence lives here
const brainSupabase = createClient(
  process.env.BRAIN_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.BRAIN_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type FeedbackRating = 'helpful' | 'not_helpful' | 'partially_helpful';

export interface AgentFeedback {
  personId: string;          // Brain DB person UUID (neuro.persons.id)
  sessionId?: string;        // agents.sessions.id
  agentType: string;         // e.g. 'study', 'motivation', 'focus'
  rating: FeedbackRating;
  comment?: string;          // Optional free-text from student
  courseId?: string;
  assignmentId?: string;
}

export class AgentFeedbackService {
  // ── Submit feedback on an agent response ──────────────────────────────────
  async submitFeedback(feedback: AgentFeedback): Promise<{ success: boolean }> {
    try {
      const score =
        feedback.rating === 'helpful' ? 1.0
        : feedback.rating === 'partially_helpful' ? 0.5
        : 0.0;

      // Write to brain.signals — canonical signal store in Brain DB
      await brainSupabase
        .schema('brain')
        .from('signals')
        .insert({
          person_id: feedback.personId,
          session_id: feedback.sessionId || null,
          signal_type: 'behavioral',
          source: 'fschoolai_feedback',
          payload: {
            agent_type: feedback.agentType,
            rating: feedback.rating,
            score,
            comment: feedback.comment || null,
            course_id: feedback.courseId || null,
            assignment_id: feedback.assignmentId || null,
          },
          intensity: score,
          occurred_at: new Date().toISOString(),
        });

      return { success: true };
    } catch (err) {
      console.error('[AgentFeedback] Failed to record feedback:', err);
      return { success: false };
    }
  }

  // ── Get agent performance stats for a person ──────────────────────────────
  // Used by the brain to prefer agents that have historically helped this student
  async getAgentPerformance(personId: string): Promise<Record<string, number>> {
    try {
      const { data } = await brainSupabase
        .schema('brain')
        .from('signals')
        .select('payload, intensity')
        .eq('person_id', personId)
        .eq('source', 'fschoolai_feedback')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return {};

      // Aggregate average score per agent type
      const agentScores: Record<string, { total: number; count: number }> = {};
      for (const row of data) {
        const agent = (row.payload as Record<string, unknown>)?.agent_type as string;
        const score = (row.intensity as number) ?? 0.5;
        if (!agent) continue;
        if (!agentScores[agent]) agentScores[agent] = { total: 0, count: 0 };
        agentScores[agent].total += score;
        agentScores[agent].count += 1;
      }

      return Object.fromEntries(
        Object.entries(agentScores).map(([agent, { total, count }]) => [
          agent,
          total / count,
        ])
      );
    } catch {
      return {};
    }
  }
}

export const agentFeedback = new AgentFeedbackService();
