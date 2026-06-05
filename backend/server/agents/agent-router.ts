/**
 * Agent Router — Internal Intent Detector
 *
 * This is NOT exposed to the student. It runs silently before every Claude call
 * to detect what kind of help the student needs, then injects the right
 * capability context into the AI Tutor's system prompt.
 *
 * The student always talks to their AI Tutor. The router just decides which
 * capability to activate internally.
 *
 * Detection is keyword-first (fast, free) with a Claude fallback for ambiguous cases.
 *
 * Capabilities:
 *   - canvas     → grades, deadlines, assignments, courses
 *   - assignment → writing, structuring, drafting, reviewing essays/papers
 *   - citation   → sources, references, bibliography, fact-checking
 *   - study      → concept explanation, tutoring, understanding
 *   - focus      → concentration, deep work, procrastination
 *   - motivation → encouragement, burnout, staying on track
 *   - reflection → consolidating learning, reviewing what was studied
 *   - crisis     → distress, overwhelm, mental health
 *   - general    → everything else — AI Tutor handles it directly
 */

export type AgentCapability =
  | 'canvas'
  | 'assignment'
  | 'citation'
  | 'study'
  | 'focus'
  | 'motivation'
  | 'reflection'
  | 'crisis'
  | 'general';

interface RoutingResult {
  capability: AgentCapability;
  confidence: 'high' | 'medium';
}

// ─── Keyword Detection Maps ───────────────────────────────────────────────────

const KEYWORD_MAP: Record<AgentCapability, string[]> = {
  canvas: [
    'due', 'deadline', 'assignment', 'grade', 'gpa', 'course', 'class',
    'exam', 'quiz', 'test', 'submit', 'submission', 'canvas', 'mark',
    'score', 'percent', 'pass', 'fail', 'credit', 'module', 'lecture',
    "what's due", 'what do i have', 'upcoming', 'overdue', 'missed',
    'late submission', 'professor', 'instructor', 'syllabus', 'semester',
    'how am i doing', 'my grades', 'my courses',
  ],
  assignment: [
    'essay', 'paper', 'write', 'writing', 'draft', 'outline', 'thesis',
    'introduction', 'conclusion', 'paragraph', 'argument', 'structure',
    'word count', 'rubric', 'feedback', 'review my', 'check my',
    'proofread', 'edit my', 'improve my', 'assignment help',
    'how do i start', 'stuck on', 'research paper', 'report',
  ],
  citation: [
    'citation', 'cite', 'reference', 'bibliography', 'source', 'apa',
    'mla', 'chicago', 'harvard', 'footnote', 'endnote', 'in-text',
    'plagiarism', 'fact check', 'is this true', 'verify', 'find a source',
    'where can i find', 'credible source', 'academic source',
  ],
  study: [
    'explain', 'understand', 'confused', "don't get", "don't understand",
    'what is', 'what are', 'how does', 'why does', 'concept', 'topic',
    'help me learn', 'teach me', 'tutor', 'study', 'review', 'practice',
    'example', 'walk me through', 'break it down', 'simplify',
  ],
  focus: [
    'focus', 'concentrate', 'distracted', 'procrastinat', 'can\'t start',
    'keep getting distracted', 'phone', 'social media', 'deep work',
    'pomodoro', 'study session', 'can\'t focus', 'attention',
  ],
  motivation: [
    'motivat', 'give up', 'tired', 'burnt out', 'burnout', 'exhausted',
    'hate this', 'pointless', 'why bother', 'don\'t care', 'demotivated',
    'lost', 'struggling', 'feel like quitting', 'not worth it',
  ],
  reflection: [
    'reflect', 'what did i learn', 'review what', 'consolidate',
    'how far have i come', 'progress', 'look back', 'what have i done',
    'summarize my learning', 'what do i know now',
  ],
  crisis: [
    'overwhelmed', 'panic', 'anxiety', 'anxious', 'depressed', 'depression',
    'can\'t cope', 'breaking down', 'mental health', 'suicid', 'self harm',
    'hopeless', 'worthless', 'crisis', 'emergency', 'help me please',
    'i can\'t do this anymore', 'falling apart',
  ],
  general: [], // fallback — no keywords needed
};

// ─── Main Router ──────────────────────────────────────────────────────────────

/**
 * Detects the most appropriate agent capability for a student message.
 * Uses keyword matching first (fast), then returns 'general' as fallback.
 * Crisis detection always takes priority over everything else.
 */
export function detectCapability(message: string): RoutingResult {
  const lower = message.toLowerCase();

  // Crisis always takes priority — check first
  if (KEYWORD_MAP.crisis.some(kw => lower.includes(kw))) {
    return { capability: 'crisis', confidence: 'high' };
  }

  // Score each capability by keyword matches
  const scores: Record<AgentCapability, number> = {
    canvas: 0,
    assignment: 0,
    citation: 0,
    study: 0,
    focus: 0,
    motivation: 0,
    reflection: 0,
    crisis: 0,
    general: 0,
  };

  for (const [capability, keywords] of Object.entries(KEYWORD_MAP) as [AgentCapability, string[]][]) {
    if (capability === 'general' || capability === 'crisis') continue;
    scores[capability] = keywords.filter(kw => lower.includes(kw)).length;
  }

  // Find the highest scoring capability
  const topCapability = (Object.entries(scores) as [AgentCapability, number][])
    .filter(([cap]) => cap !== 'general' && cap !== 'crisis')
    .sort(([, a], [, b]) => b - a)[0];

  if (topCapability && topCapability[1] > 0) {
    return {
      capability: topCapability[0],
      confidence: topCapability[1] >= 2 ? 'high' : 'medium',
    };
  }

  // No keywords matched — AI Tutor handles it directly
  return { capability: 'general', confidence: 'high' };
}

/**
 * Returns a capability-specific system prompt addition for the AI Tutor.
 * Used when no specialized agent context is available (study, focus, motivation, etc.)
 */
export function getCapabilityPromptAddition(capability: AgentCapability, studentName: string): string {
  const additions: Record<AgentCapability, string> = {
    study: `\nRIGHT NOW you are in tutor mode for ${studentName}. Use the Socratic method when appropriate — ask questions that lead them to the answer rather than just giving it. Connect new concepts to what their brain already knows. Be patient but don't over-explain.`,
    focus: `\nRIGHT NOW ${studentName} needs help getting focused. Use what you know about their focus patterns and peak hours from the brain context. Give them one concrete action to take right now, not a list of generic tips.`,
    motivation: `\nRIGHT NOW ${studentName} needs motivation. Reference their actual progress and wins from the brain context. Be real — not cheerleader-fake. Acknowledge the difficulty, then redirect to what's possible.`,
    reflection: `\nRIGHT NOW you are guiding ${studentName} through a reflection. Ask questions that help them discover their own insights. Don't summarize for them — help them articulate it themselves.`,
    crisis: `\nRIGHT NOW ${studentName} may be in distress. Be warm, human, and present. Listen first. Don't rush to problem-solve. If they express serious distress, gently encourage them to speak with a counselor or trusted person. Never minimize what they're feeling.`,
    canvas: '', // Canvas gets its own full prompt injection
    assignment: '', // Assignment gets its own full prompt injection
    citation: '', // Citation gets its own full prompt injection
    general: '', // No addition needed — AI Tutor handles it directly
  };
  return additions[capability] || '';
}
