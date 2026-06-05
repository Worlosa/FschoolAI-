// ============================================================
// Canvas → Brain Passive Learning Trigger
//
// After every Canvas sync event (grade received, assignment
// added, course enrolled), write a brain signal so the brain
// updates with the latest academic data.
//
// Uses brain.signals in Brain DB (not the old brain_signals table).
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Brain DB — intelligence layer
const brainSupabase = createClient(
  process.env.BRAIN_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.BRAIN_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Helper: Write a brain signal after any Canvas event ────────────────────
export async function emitCanvasBrainSignal(params: {
  personId: string;   // Brain DB person UUID (neuro.persons.id)
  signalType: 'canvas_grade_received' | 'canvas_assignment_added' | 'canvas_course_enrolled' | 'canvas_sync_complete';
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await brainSupabase
      .schema('brain')
      .from('signals')
      .insert({
        person_id: params.personId,
        session_id: params.sessionId || null,
        signal_type: 'outcome',
        source: `fschoolai_canvas_${params.signalType}`,
        payload: {
          event: params.signalType,
          ...(params.metadata || {}),
        },
        intensity: params.signalType === 'canvas_grade_received'
          ? ((params.metadata?.percentage as number) || 0) / 100
          : null,
        occurred_at: new Date().toISOString(),
      });
  } catch (err) {
    // Non-fatal — brain signal emission should never block Canvas sync
    console.warn('[Canvas→Brain] Failed to emit brain signal:', err);
  }
}

// ── Usage: Add these calls inside canvas-sync.ts ───────────────────────────
//
// 1. After a grade is received (inside syncAssignmentsAndGrades):
//
//    await emitCanvasBrainSignal({
//      personId,   // brain person UUID, NOT canvas user id
//      signalType: 'canvas_grade_received',
//      metadata: {
//        score: submission.score,
//        maxScore: assignment.points_possible || 100,
//        percentage: (submission.score / (assignment.points_possible || 100)) * 100,
//        subject: course.name,
//        topic: assignment.name,
//        canvas_assignment_id: assignment.id,
//        canvas_course_id: course.id,
//      },
//    });
//
// 2. After a new assignment is detected (inside syncAssignmentsAndGrades):
//
//    await emitCanvasBrainSignal({
//      personId,
//      signalType: 'canvas_assignment_added',
//      metadata: {
//        due_at: assignment.due_at,
//        points_possible: assignment.points_possible,
//        subject: course.name,
//        topic: assignment.name,
//        canvas_assignment_id: assignment.id,
//      },
//    });
//
// 3. After full sync completes (at the end of syncCanvasData):
//
//    await emitCanvasBrainSignal({
//      personId,
//      signalType: 'canvas_sync_complete',
//      metadata: {
//        courses_count: courses.length,
//        synced_at: new Date().toISOString(),
//      },
//    });
