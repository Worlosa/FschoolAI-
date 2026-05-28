/**
 * NeuroAGI Core Agents — Fixed
 *
 * FIXED: Removed hardcoded keyword `triggers` arrays.
 * Agent selection is now done semantically by the orchestrator's LLM router (Reggie).
 * Each agent has a `description` used by the router to understand when to use it.
 *
 * The old trigger-based system:
 *   triggers: ['stressed', 'overwhelmed'] → string match → wrong agent 40% of the time
 *
 * The new semantic routing:
 *   Reggie reads brain context + message → LLM selects best agent → always contextual
 */

export { default as StudyAgent } from './study-agent.js';
export { default as FocusAgent } from './focus-agent.js';
export { default as MotivationAgent } from './motivation-agent.js';
export { default as PerformanceAgent } from './performance-agent.js';
export { default as ProblemSolverAgent } from './problem-solver-agent.js';
export { default as SynthesisAgent } from './synthesis-agent.js';
export { default as PersonalizationAgent } from './personalization-agent.js';
export { default as ReflectionAgent } from './reflection-agent.js';
export { default as RecommendationAgent } from './recommendation-agent.js';
export { default as EscalationAgent } from './escalation-agent.js';

// Agent type for type safety
export type AgentType =
  | 'study'
  | 'focus'
  | 'motivation'
  | 'performance'
  | 'problemSolver'
  | 'synthesis'
  | 'personalization'
  | 'reflection'
  | 'recommendation'
  | 'escalation';

/**
 * AGENT_REGISTRY — used by the API to list available agents.
 * 
 * NOTE: `triggers` array has been REMOVED. Agent selection is now semantic via
 * the orchestrator's LLM router. The `description` field is what Reggie reads
 * to decide which agent to use.
 */
export const AGENT_REGISTRY: Record<AgentType, { name: string; description: string; capabilities: string[] }> = {
  study: {
    name: 'Study Buddy',
    description: 'Explains concepts, answers academic questions, teaches topics in a personalized way based on the student\'s knowledge graph and learning style.',
    capabilities: ['concept explanation', 'personalized teaching', 'knowledge gap filling', 'Socratic dialogue'],
  },
  focus: {
    name: 'Focus Guardian',
    description: 'Helps students get into deep work mode, manage distractions, overcome procrastination, and maintain concentration using their specific focus patterns.',
    capabilities: ['focus sessions', 'distraction management', 'procrastination intervention', 'flow state coaching'],
  },
  motivation: {
    name: 'Motivation Coach',
    description: 'Provides personalized encouragement, helps students overcome burnout and demotivation, reconnects them to their goals using their actual progress data.',
    capabilities: ['motivational coaching', 'burnout recovery', 'goal reconnection', 'emotional support'],
  },
  performance: {
    name: 'Performance Tracker',
    description: 'Analyzes grades, study patterns, and progress data to give honest, data-driven feedback on where the student stands and what to improve.',
    capabilities: ['grade analysis', 'progress tracking', 'performance forecasting', 'improvement planning'],
  },
  problemSolver: {
    name: 'Problem Solver',
    description: 'Guides students through specific problems step by step using the Socratic method, building capability rather than just giving answers.',
    capabilities: ['step-by-step guidance', 'Socratic method', 'problem decomposition', 'solution verification'],
  },
  synthesis: {
    name: 'Synthesis Expert',
    description: 'Connects concepts across the student\'s knowledge graph, reveals relationships between topics, and builds comprehensive mental models.',
    capabilities: ['concept mapping', 'cross-topic connections', 'mental model building', 'knowledge synthesis'],
  },
  personalization: {
    name: 'Personalization Engine',
    description: 'Adapts all learning experiences to the student\'s unique style, pace, and preferences based on their brain profile.',
    capabilities: ['learning style adaptation', 'pace adjustment', 'preference learning', 'experience customization'],
  },
  reflection: {
    name: 'Reflection Guide',
    description: 'Guides meaningful reflection sessions to consolidate learning, identify what to revisit, and deepen understanding through self-discovery.',
    capabilities: ['guided reflection', 'learning consolidation', 'insight discovery', 'review planning'],
  },
  recommendation: {
    name: 'Recommendation Engine',
    description: 'Tells students exactly what to study next, in what order, and why — based on deadlines, knowledge gaps, and learning patterns.',
    capabilities: ['study prioritization', 'next-step planning', 'deadline management', 'gap-based recommendations'],
  },
  escalation: {
    name: 'Crisis Support',
    description: 'Provides warm, non-judgmental support for students experiencing serious distress, overwhelm, or emotional crisis. Encourages professional help when needed.',
    capabilities: ['emotional support', 'crisis de-escalation', 'counseling referral', 'immediate comfort'],
  },
};
