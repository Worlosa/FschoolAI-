/**
 * Voice Routes
 *
 * POST /api/voice/tts-stream   — Streaming TTS (sentence by sentence, <1s first audio)
 * POST /api/voice/change       — Change tutor voice from natural language request
 * GET  /api/voice/current      — Get current voice for a student
 * GET  /api/voice/presets      — Get list of preset voices to show as quick options
 */

import { Router, Request, Response } from 'express';
import {
  streamTTS,
  designVoiceFromRequest,
  getStudentVoice,
  DEFAULT_VOICES,
  detectVoiceChangeIntent,
  getVoiceChangeConfirmation,
} from '../services/voice-service';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/voice/tts-stream
// Streams TTS audio sentence by sentence via SSE
// Frontend plays each chunk as it arrives — first audio in <1 second
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tts-stream', async (req: Request, res: Response) => {
  const { text, person_id } = req.body;

  if (!text || !person_id) {
    return res.status(400).json({ error: 'text and person_id required' });
  }

  // Get the student's current voice
  const voiceId = await getStudentVoice(person_id);

  // Set up SSE for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let sentenceCount = 0;

  try {
    await streamTTS(text, voiceId, (audioChunk, sentenceIndex) => {
      // Send each sentence's audio as a base64-encoded SSE event
      const base64Audio = audioChunk.toString('base64');
      res.write(`data: ${JSON.stringify({
        type: 'audio_chunk',
        sentence_index: sentenceIndex,
        audio: base64Audio,
        is_first: sentenceIndex === 0,
      })}\n\n`);
      sentenceCount++;
    });

    // Signal completion
    res.write(`data: ${JSON.stringify({ type: 'done', total_sentences: sentenceCount })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/voice/change
// Change the tutor's voice from a natural language request
// Called by the Agent Manager when it detects voice change intent
// ─────────────────────────────────────────────────────────────────────────────
router.post('/change', async (req: Request, res: Response) => {
  const { person_id, request, tutor_name } = req.body;

  if (!person_id || !request) {
    return res.status(400).json({ error: 'person_id and request required' });
  }

  try {
    const result = await designVoiceFromRequest(
      person_id,
      request,
      tutor_name || 'your tutor'
    );

    // Generate the confirmation message the tutor will speak in the NEW voice
    const confirmationText = getVoiceChangeConfirmation(
      tutor_name || 'your tutor',
      result.description,
      request
    );

    res.json({
      success: true,
      voice_id: result.voice_id,
      description: result.description,
      confirmation_text: confirmationText,
      // Frontend should play this confirmation using the new voice_id
      // so the student immediately hears the change
    });
  } catch (error: any) {
    // If Voice Design API fails, fall back to a preset voice
    const fallbackVoiceId = selectFallbackVoice(request);
    res.json({
      success: true,
      voice_id: fallbackVoiceId,
      description: 'preset voice',
      confirmation_text: "Here's a new voice. How does this sound?",
      fallback: true,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/voice/current
// Returns the student's current voice_id and description
// ─────────────────────────────────────────────────────────────────────────────
router.get('/current', async (req: Request, res: Response) => {
  const { person_id } = req.query;

  if (!person_id) {
    return res.status(400).json({ error: 'person_id required' });
  }

  const voiceId = await getStudentVoice(person_id as string);
  res.json({ voice_id: voiceId });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/voice/presets
// Returns preset voices the student can choose from
// These appear as quick-tap options in the chat panel when voice is mentioned
// ─────────────────────────────────────────────────────────────────────────────
router.get('/presets', (_req: Request, res: Response) => {
  res.json({
    presets: [
      { id: DEFAULT_VOICES.friendly_male,    label: 'Friendly Male',     emoji: '😊' },
      { id: DEFAULT_VOICES.friendly_female,  label: 'Friendly Female',   emoji: '😊' },
      { id: DEFAULT_VOICES.professor_male,   label: 'Professor (Male)',   emoji: '🎓' },
      { id: DEFAULT_VOICES.professor_female, label: 'Professor (Female)', emoji: '🎓' },
      { id: DEFAULT_VOICES.energetic_male,   label: 'Energetic',          emoji: '⚡' },
      { id: DEFAULT_VOICES.calm_female,      label: 'Calm & Focused',     emoji: '🧘' },
      { id: DEFAULT_VOICES.british_male,     label: 'British',            emoji: '🇬🇧' },
      { id: DEFAULT_VOICES.deep_male,        label: 'Deep & Grounded',    emoji: '🎙️' },
    ]
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Select a fallback preset voice based on the student's request
// Used when Voice Design API fails or is unavailable
// ─────────────────────────────────────────────────────────────────────────────
function selectFallbackVoice(request: string): string {
  const lower = request.toLowerCase();

  if (lower.includes('female') || lower.includes('woman') || lower.includes('girl')) {
    if (lower.includes('professor') || lower.includes('professional')) return DEFAULT_VOICES.professor_female;
    if (lower.includes('calm') || lower.includes('soft')) return DEFAULT_VOICES.calm_female;
    return DEFAULT_VOICES.friendly_female;
  }

  if (lower.includes('british') || lower.includes('uk') || lower.includes('england')) return DEFAULT_VOICES.british_male;
  if (lower.includes('deep') || lower.includes('low') || lower.includes('bass')) return DEFAULT_VOICES.deep_male;
  if (lower.includes('professor') || lower.includes('professional') || lower.includes('academic')) return DEFAULT_VOICES.professor_male;
  if (lower.includes('energetic') || lower.includes('upbeat') || lower.includes('excited')) return DEFAULT_VOICES.energetic_male;
  if (lower.includes('calm') || lower.includes('slow') || lower.includes('relax')) return DEFAULT_VOICES.calm_female;

  return DEFAULT_VOICES.friendly_male;
}

export default router;
