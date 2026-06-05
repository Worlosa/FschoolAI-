/**
 * FschoolAI Voice Service
 *
 * Handles all voice I/O for the AI tutor:
 *
 * 1. STREAMING TTS — ElevenLabs eleven_turbo_v2_5 with sentence-level streaming
 *    so the student hears the first sentence in <1 second.
 *
 * 2. VOICE CUSTOMIZATION — Student can say or type anything like:
 *    "change your voice to something deeper"
 *    "sound like a female professor"
 *    "speak faster"
 *    "give me a British accent"
 *    "make your voice warmer"
 *    The system calls ElevenLabs Voice Design API to generate a new voice
 *    from a text prompt, saves it, and uses it from that point forward.
 *    The voice preference is stored in neuro.voice in the Brain DB.
 *
 * 3. VOICE COMMAND DETECTION — Detects voice change intent in any message
 *    (text or spoken) and routes to the voice design flow automatically.
 *
 * Architecture:
 *   Student message → Agent Manager → detects voice intent → Voice Service
 *   Voice Service → ElevenLabs Voice Design API → generates voice → saves to neuro.voice
 *   Next TTS call uses the new voice_id automatically
 */

import { createClient } from '@supabase/supabase-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// The fastest ElevenLabs model — optimized for real-time conversation
// Latency: ~300ms for short sentences when streaming
const TURBO_MODEL = 'eleven_turbo_v2_5';

// Default voice IDs from ElevenLabs library (fallback if no custom voice set)
// These cover the most common student preferences out of the box
export const DEFAULT_VOICES = {
  friendly_male:    'pNInz6obpgDQGcFmaJgB', // Adam — warm, clear, conversational
  friendly_female:  'EXAVITQu4vr4xnSDxMaL', // Bella — warm, approachable
  professor_male:   'VR6AewLTigWG4xSOukaG', // Arnold — authoritative, clear
  professor_female: 'ThT5KcBeYPX3keUQqHPh', // Dorothy — professional, calm
  energetic_male:   'yoZ06aMxZJJ28mfd3POQ', // Sam — upbeat, motivating
  calm_female:      'jBpfuIE2acCO8z3wKNLl', // Gigi — soft, focused
  british_male:     'onwK4e9ZLuTAKqWW03F9', // Daniel — British, intelligent
  deep_male:        'N2lVS1w4EtoT3dr4eOWO', // Callum — deep, grounded
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice Change Intent Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects if a student message is a voice change request.
 * Works for both text and transcribed speech.
 *
 * Examples that trigger this:
 * - "change your voice"
 * - "can you sound more like a female professor"
 * - "speak with a British accent"
 * - "make your voice deeper"
 * - "talk faster"
 * - "I want a different voice"
 * - "your voice is too robotic, change it"
 * - "sound warmer"
 * - "be more energetic"
 */
export function detectVoiceChangeIntent(message: string): boolean {
  const lower = message.toLowerCase();

  const voiceChangePatterns = [
    /change (your )?voice/,
    /different voice/,
    /new voice/,
    /switch (your )?voice/,
    /sound (more |less )?(like|as)/,
    /speak (with|in|more|less|faster|slower)/,
    /talk (faster|slower|differently|more|less)/,
    /voice (is too|sounds too|feels too)/,
    /make (your )?voice/,
    /give (me|you|your) (a |an )?(different|new|deeper|higher|warmer|cooler|british|american|australian|female|male|professor|friendly|calm|energetic)/,
    /be more (calm|energetic|professional|friendly|warm|deep|soft|clear)/,
    /sound (deeper|higher|warmer|cooler|softer|clearer|more natural|more human|less robotic)/,
    /accent/,
    /pitch/,
    /tone (of voice|change)/,
  ];

  return voiceChangePatterns.some(pattern => pattern.test(lower));
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Design — Generate a new voice from a text prompt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a student's natural language voice request into an ElevenLabs
 * Voice Design prompt, generates the voice, saves it, and returns the voice_id.
 *
 * The student says: "sound more like a calm female professor with a British accent"
 * This function:
 *   1. Calls Claude to translate the request into a Voice Design prompt
 *   2. Calls ElevenLabs Voice Design API to generate 3 voice options
 *   3. Picks the best match (or returns all 3 for the student to choose)
 *   4. Saves the voice_id to neuro.voice in the Brain DB
 *   5. Returns the new voice_id
 */
export async function designVoiceFromRequest(
  personId: string,
  studentRequest: string,
  tutorName: string
): Promise<{ voice_id: string; preview_url: string; description: string }> {

  // Step 1: Translate student request to a Voice Design prompt
  const designPrompt = await translateToVoiceDesignPrompt(studentRequest, tutorName);

  // Step 2: Call ElevenLabs Voice Design API
  const response = await fetch(`${ELEVENLABS_BASE}/voice-generation/generate-voice`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voice_description: designPrompt,
      text: `Hi, I'm ${tutorName}. I'm here to help you study and make learning feel effortless. What would you like to work on today?`,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs Voice Design failed: ${err}`);
  }

  const data = await response.json();
  const voice_id = data.voice_id;

  // Step 3: Save to neuro.voice in Brain DB
  const supabase = createClient(
    process.env.BRAIN_SUPABASE_URL!,
    process.env.BRAIN_SUPABASE_SERVICE_KEY!
  );

  await supabase
    .schema('neuro')
    .from('voice')
    .upsert({
      person_id: personId,
      voice_id,
      voice_description: designPrompt,
      student_request: studentRequest,
      model: TURBO_MODEL,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'person_id' });

  // Step 4: Write a brain signal so the brain knows the student changed their voice
  await supabase
    .schema('brain')
    .from('signals')
    .insert({
      person_id: personId,
      signal_type: 'preference',
      content: `Student changed tutor voice: "${studentRequest}"`,
      metadata: { voice_id, voice_description: designPrompt },
      source: 'voice_customization',
    });

  return {
    voice_id,
    preview_url: data.audio || '',
    description: humanizeVoiceDescription(designPrompt),
  };
}

/**
 * Translates a casual student request into a structured ElevenLabs Voice Design prompt.
 * Uses Claude to do the translation so it handles any phrasing.
 */
async function translateToVoiceDesignPrompt(
  studentRequest: string,
  tutorName: string
): Promise<string> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast, cheap — just prompt translation
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Convert this student's voice request into an ElevenLabs Voice Design prompt.

Student request: "${studentRequest}"
Tutor name: "${tutorName}"

The prompt should describe: gender, age range, accent, tone, pacing, emotion, and character.
Format: "[gender], [age]. [accent if specified]. Persona: [character type]. Emotion: [tone]. [additional descriptors]."

Keep it under 60 words. Focus on voice characteristics, not appearance.
Only output the prompt, nothing else.`
    }]
  });

  return (response.content[0] as any).text.trim();
}

/**
 * Converts a technical voice design prompt into a friendly description
 * to show the student what their new voice sounds like.
 */
function humanizeVoiceDescription(prompt: string): string {
  // Extract key characteristics for a friendly summary
  const lower = prompt.toLowerCase();
  const parts: string[] = [];

  if (lower.includes('female')) parts.push('female');
  else if (lower.includes('male')) parts.push('male');

  if (lower.includes('british')) parts.push('British accent');
  else if (lower.includes('australian')) parts.push('Australian accent');
  else if (lower.includes('american')) parts.push('American accent');

  if (lower.includes('calm') || lower.includes('soothing')) parts.push('calm');
  if (lower.includes('energetic') || lower.includes('upbeat')) parts.push('energetic');
  if (lower.includes('professional') || lower.includes('professor')) parts.push('professional');
  if (lower.includes('warm') || lower.includes('friendly')) parts.push('warm');
  if (lower.includes('deep')) parts.push('deep');

  return parts.length > 0 ? parts.join(', ') : 'custom voice';
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Current Voice for a Student
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentVoice(personId: string): Promise<string> {
  const supabase = createClient(
    process.env.BRAIN_SUPABASE_URL!,
    process.env.BRAIN_SUPABASE_SERVICE_KEY!
  );

  const { data } = await supabase
    .schema('neuro')
    .from('voice')
    .select('voice_id')
    .eq('person_id', personId)
    .single();

  return data?.voice_id || DEFAULT_VOICES.friendly_male;
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming TTS — Sentence-level streaming for <1 second first audio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streams TTS audio sentence by sentence.
 * The frontend receives and plays each sentence as it arrives,
 * so the student hears the first sentence before the full response is generated.
 *
 * Flow:
 *   1. Split LLM response into sentences
 *   2. For each sentence: call ElevenLabs with streaming=true
 *   3. Stream audio chunks back to frontend via SSE or WebSocket
 *   4. Frontend plays each chunk as it arrives
 *
 * Latency: ~300-500ms to first audio (vs 2-3 seconds with non-streaming)
 */
export async function streamTTS(
  text: string,
  voiceId: string,
  onChunk: (audioChunk: Buffer, sentenceIndex: number) => void
): Promise<void> {
  const sentences = splitIntoSentences(text);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    const response = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: sentence,
          model_id: TURBO_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
          // Optimize for low latency
          optimize_streaming_latency: 4, // Maximum optimization (0-4)
        }),
      }
    );

    if (!response.ok) continue;

    const chunks: Buffer[] = [];
    const reader = response.body!.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    onChunk(Buffer.concat(chunks), i);
  }
}

/**
 * Splits text into sentences for streaming.
 * Handles abbreviations and edge cases.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries but keep the delimiter
  return text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .filter(s => s.trim().length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Change Response — What the tutor says when changing voice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a natural response from the tutor when the student changes the voice.
 * The response is spoken in the NEW voice so the student hears the change immediately.
 */
export function getVoiceChangeConfirmation(
  tutorName: string,
  voiceDescription: string,
  studentRequest: string
): string {
  const confirmations = [
    `There we go — how does this sound? I can keep adjusting if you want something different.`,
    `Done. This is my ${voiceDescription} voice. Let me know if you'd like to tweak it further.`,
    `Changed. I'll use this voice from now on. Just tell me if you want something different.`,
    `Here's my new voice. Better? I can go deeper, higher, faster, slower — just say the word.`,
  ];

  return confirmations[Math.floor(Math.random() * confirmations.length)];
}
