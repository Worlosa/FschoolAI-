// ============================================================
// Brain Person Service
//
// Manages the mapping between FschoolAI users (Canvas accounts)
// and Brain DB persons (neuro.persons).
//
// KEY RULE:
//   FschoolAI owns the Canvas account (users table).
//   NeuroAGI Brain owns the person (neuro.persons).
//   This service is the bridge between the two.
//
// CUSTOM TUTOR NAME:
//   Every student names their own AI tutor on first login.
//   The name is stored in neuro.memory as key='tutor_name'.
//   The brain uses this name in all responses to that student.
// ============================================================

import { createClient } from '@supabase/supabase-js';

// FschoolAI Production DB — Canvas accounts and academic data
const fschoolSupabase = createClient(
  process.env.FSCHOOL_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.FSCHOOL_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
);

// NeuroAGI Brain DB — intelligence, memory, signals
const brainSupabase = createClient(
  process.env.BRAIN_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.BRAIN_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BrainPersonResult {
  personId: string;         // neuro.persons.id (UUID)
  isNewPerson: boolean;     // true if this is their first login
  tutorName: string | null; // null if not yet named (triggers onboarding)
  needsOnboarding: boolean; // true if tutor has not been named yet
}

export class BrainPersonService {
  // ── Get or create a Brain person for a Canvas user ────────────────────────
  // Call this after every successful Canvas OAuth login.
  async getOrCreatePerson(params: {
    canvasUserId: string;
    name: string;
    email: string;
    university?: string;
  }): Promise<BrainPersonResult> {
    // 1. Look up existing Brain person by canvas_user_id
    const { data: existing } = await brainSupabase
      .schema('neuro')
      .from('persons')
      .select('id, name, onboarded_at')
      .eq('canvas_user_id', params.canvasUserId)
      .maybeSingle();

    let personId: string;
    let isNewPerson = false;

    if (existing) {
      personId = existing.id;
    } else {
      // 2. First time this Canvas user logs in — create their Brain person
      const { data: newPerson, error } = await brainSupabase
        .schema('neuro')
        .from('persons')
        .insert({
          name: params.name,
          email: params.email,
          university: params.university || null,
          canvas_user_id: params.canvasUserId,
          is_founding: false,
          onboarded_at: null, // set after tutor is named
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !newPerson) {
        throw new Error(`Failed to create Brain person: ${error?.message}`);
      }

      personId = newPerson.id;
      isNewPerson = true;

      // 3. Create default preferences for new person
      await brainSupabase
        .schema('neuro')
        .from('preferences')
        .insert({
          person_id: personId,
          communication_style: 'conversational',
          response_length: 'medium',
          under_pressure_style: 'supportive',
          do_not_mention: [],
          notification_preference: 'in_app',
          updated_at: new Date().toISOString(),
        });

      // 4. Also update FschoolAI Production DB with the brain_person_id
      await fschoolSupabase
        .from('users')
        .update({ brain_person_id: personId })
        .eq('canvas_user_id', params.canvasUserId);
    }

    // 5. Get tutor name from neuro.memory
    const { data: tutorMemory } = await brainSupabase
      .schema('neuro')
      .from('memory')
      .select('value')
      .eq('person_id', personId)
      .eq('key', 'tutor_name')
      .maybeSingle();

    const tutorName = tutorMemory?.value || null;
    const needsOnboarding = !tutorName;

    return { personId, isNewPerson, tutorName, needsOnboarding };
  }

  // ── Set the student's custom tutor name ───────────────────────────────────
  // Called after the student names their tutor during onboarding.
  async setTutorName(personId: string, tutorName: string): Promise<void> {
    const trimmed = tutorName.trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
      throw new Error('Tutor name must be between 1 and 50 characters');
    }

    // Upsert into neuro.memory
    const { data: existing } = await brainSupabase
      .schema('neuro')
      .from('memory')
      .select('id')
      .eq('person_id', personId)
      .eq('key', 'tutor_name')
      .maybeSingle();

    if (existing) {
      await brainSupabase
        .schema('neuro')
        .from('memory')
        .update({
          value: trimmed,
          source: 'student_choice',
          confidence: 1.0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await brainSupabase
        .schema('neuro')
        .from('memory')
        .insert({
          person_id: personId,
          key: 'tutor_name',
          value: trimmed,
          source: 'student_choice',
          confidence: 1.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // Mark onboarding complete
    await brainSupabase
      .schema('neuro')
      .from('persons')
      .update({
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', personId);
  }

  // ── Get tutor name for a person (used in chat responses) ─────────────────
  async getTutorName(personId: string): Promise<string> {
    const { data } = await brainSupabase
      .schema('neuro')
      .from('memory')
      .select('value')
      .eq('person_id', personId)
      .eq('key', 'tutor_name')
      .maybeSingle();

    // Fallback to a generic name if not yet set
    return data?.value || 'your AI tutor';
  }

  // ── Look up Brain person ID from Canvas user ID ───────────────────────────
  async getPersonIdByCanvasUserId(canvasUserId: string): Promise<string | null> {
    const { data } = await brainSupabase
      .schema('neuro')
      .from('persons')
      .select('id')
      .eq('canvas_user_id', canvasUserId)
      .maybeSingle();

    return data?.id || null;
  }
}

export const brainPersonService = new BrainPersonService();
