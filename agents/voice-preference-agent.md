# Voice Preference Agent

## Where It Lives

**Inside the Agent Manager** — not a standalone service.

The Voice Preference Agent is a sub-capability of the Agent Manager. When the Agent Manager receives any student message, it first checks for voice change intent before routing to any other agent. If voice change is detected, the Agent Manager handles it directly and returns the new voice confirmation — it never reaches the Assignment Agent, Study Agent, or any other domain agent.

```
Student message
      │
      ▼
Agent Manager
      │
      ├─ detectVoiceChangeIntent(message)?
      │         YES → Voice Preference Agent (handles here, returns confirmation)
      │         NO  → route to domain agent (Assignment, Study, etc.)
      ▼
```

This is the correct design. Voice is a cross-cutting concern — it applies to every page, every interaction. It belongs in the Agent Manager, not in any page-specific agent.

---

## What It Does

The Voice Preference Agent handles all voice customization through natural language — no settings page, no dropdowns. The student says it or types it:

> "sound more like a calm female professor"
> "make your voice deeper"
> "speak with a British accent"
> "you sound too robotic, change it"
> "be more energetic"
> "I want a male voice"
> "can you sound warmer"

---

## Trigger Patterns (detectVoiceChangeIntent)

The Agent Manager checks every message for these patterns before routing:

- `change your voice` / `change the voice`
- `sound more like` / `sound less like`
- `make your voice` / `make the voice`
- `speak with a` / `speak like a`
- `different voice` / `new voice` / `another voice`
- `more [adjective]` (deeper, warmer, calmer, energetic, professional)
- `female voice` / `male voice` / `woman's voice` / `man's voice`
- `British` / `Australian` / `American` / `accent`
- `you sound too [adjective]` (robotic, fast, slow, monotone)
- `I prefer` / `I want` / `I like` + voice-related words

---

## Logic Flow

```
1. Detect voice change intent in message
2. Extract the preference description
   e.g. "calm female professor with British accent"

3. Claude translates to ElevenLabs Voice Design prompt:
   "Female, 35-45. British RP accent. Persona: university professor.
    Emotion: warm, authoritative, encouraging. Clear articulation,
    measured pace, forward presence."

4. ElevenLabs Voice Design API generates new voice_id
   (or fall back to preset voice if API unavailable)

5. Save to neuro.voice in Brain DB:
   { person_id, voice_id, voice_description, student_request, updated_at }

6. Generate confirmation text the tutor will speak IN THE NEW VOICE:
   "There we go — how does this sound? I can keep adjusting."

7. Return to frontend:
   { voice_id, confirmation_text, description }

8. Frontend plays confirmation_text using the new voice_id
   (student immediately hears the change)

9. Write brain signal:
   { signal_type: 'preference', content: 'voice_changed', metadata: { request, voice_id } }
```

---

## Reads From

| Source | What |
|---|---|
| `neuro.voice` (Brain DB) | Current voice_id for the student |
| `neuro.memory` (Brain DB) | `key='tutor_name'` — used in confirmation message |

## Writes To

| Destination | What |
|---|---|
| `neuro.voice` (Brain DB) | New voice_id + description + student request |
| `brain.signals` (Brain DB) | `signal_type='preference'`, `content='voice_changed'` |

---

## Preset Voices (Quick Options)

When voice is mentioned, the chat panel shows 8 quick-tap presets alongside the custom input:

| Preset | Label | Best For |
|---|---|---|
| 😊 Friendly Male | Adam | Default, approachable |
| 😊 Friendly Female | Bella | Warm, conversational |
| 🎓 Professor (Male) | Arnold | Authoritative, academic |
| 🎓 Professor (Female) | Dorothy | Professional, calm |
| ⚡ Energetic | Sam | Motivation, study sessions |
| 🧘 Calm & Focused | Gigi | Late night studying |
| 🇬🇧 British | Daniel | Intelligent, clear |
| 🎙️ Deep & Grounded | Callum | Grounding, focused |

Tapping a preset is equivalent to saying "use the [label] voice" — same flow, instant change.

---

## How It Compounds

The brain records every voice change as a preference signal. Over time:

- **Week 1:** Student tries different voices
- **Week 2:** Pattern detected: student uses calm voice during late-night sessions, energetic voice in the morning
- **Week 4:** Situation Synthesizer reads the pattern → proactively suggests: *"It's 11pm — want me to switch to your calm voice?"*
- **Week 8:** Voice preference becomes part of the student's cognitive profile — the brain knows how they learn best

---

## Files

| File | Purpose |
|---|---|
| `backend/server/services/voice-service.ts` | Core logic: streaming TTS, voice design API, intent detection |
| `backend/server/routes/voice.ts` | HTTP routes: `/api/voice/tts-stream`, `/api/voice/change`, `/api/voice/presets` |
| `agents/voice-preference-agent.md` | This spec |
| `design/VOICE_ARCHITECTURE.md` | Frontend implementation guide |

---

## Build Priority

**Sprint 1** — Build this alongside the Situation Synthesizer and Token Engine.

Voice is the most differentiating feature. Students who can talk to their tutor and customize its voice will use the app 3-5x more than students who only type. The streaming pipeline (under 1 second to first audio) is what makes it feel like a real conversation, not a chatbot.

---

## Environment Variable Required

```
ELEVENLABS_API_KEY=your_key_here
```

Get from: ElevenLabs → Profile → API Keys
