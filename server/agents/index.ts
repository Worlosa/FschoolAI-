/**
 * NeuroAGI Core Agents
 * 
 * 10 specialized agents that handle different aspects of student learning
 */

export { default as StudyAgent } from './study-agent';
export { default as FocusAgent } from './focus-agent';
export { default as MotivationAgent } from './motivation-agent';
export { default as PerformanceAgent } from './performance-agent';
export { default as ProblemSolverAgent } from './problem-solver-agent';
export { default as SynthesisAgent } from './synthesis-agent';
export { default as PersonalizationAgent } from './personalization-agent';
export { default as ReflectionAgent } from './reflection-agent';
export { default as RecommendationAgent } from './recommendation-agent';
export { default as EscalationAgent } from './escalation-agent';

// Agent registry for orchestrator
export const AGENT_REGISTRY = {
  study: {
    name: 'Study Buddy',
    description: 'Explains concepts and helps understand topics',
    triggers: ['explain', 'understand', 'what is', 'how does', 'teach me'],
  },
  focus: {
    name: 'Focus Guardian',
    description: 'Helps maintain concentration and manage distractions',
    triggers: ['focus', 'concentrate', 'distracted', 'procrastinating', 'focus mode'],
  },
  motivation: {
    name: 'Motivation Coach',
    description: 'Provides encouragement and maintains motivation',
    triggers: ['tired', 'unmotivated', 'give up', 'hard', 'encourage'],
  },
  performance: {
    name: 'Performance Tracker',
    description: 'Analyzes progress and identifies improvement areas',
    triggers: ['progress', 'performance', 'grades', 'score', 'how am i doing'],
  },
  problemSolver: {
    name: 'Problem Solver',
    description: 'Guides through problem-solving process',
    triggers: ['stuck', 'help', 'problem', 'solve', 'answer'],
  },
  synthesis: {
    name: 'Synthesis Expert',
    description: 'Connects concepts and shows relationships',
    triggers: ['connect', 'relate', 'relationship', 'how does this connect', 'synthesis'],
  },
  personalization: {
    name: 'Personalization Engine',
    description: 'Adapts learning to individual style',
    triggers: ['preference', 'style', 'adapt', 'personalize'],
  },
  reflection: {
    name: 'Reflection Guide',
    description: 'Helps consolidate learning through reflection',
    triggers: ['reflect', 'review', 'consolidate', 'what did i learn', 'summary'],
  },
  recommendation: {
    name: 'Recommendation Engine',
    description: 'Suggests next steps and resources',
    triggers: ['next', 'what should i', 'recommend', 'suggest', 'resources'],
  },
  escalation: {
    name: 'Escalation Handler',
    description: 'Knows when to escalate to human',
    triggers: ['urgent', 'emergency', 'help', 'serious', 'human'],
  },
};

export type AgentType = keyof typeof AGENT_REGISTRY;
