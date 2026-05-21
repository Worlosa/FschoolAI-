/**
 * Agent Orchestrator
 * 
 * The core system that:
 * - Routes user requests to specialized agents
 * - Manages agent selection based on intent and context
 * - Synthesizes responses from multiple agents
 * - Tracks agent performance and feedback
 * - Optimizes agent selection over time
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface UserContext {
  userId: string;
  courseId?: string;
  assignmentId?: string;
  recentGrades?: number[];
  learningStyle?: string;
  timezone?: string;
  currentMood?: string;
}

interface AgentRequest {
  userId: string;
  intent: string;
  message: string;
  context: UserContext;
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  type: 'study' | 'focus' | 'motivation' | 'performance' | 'personalization' | 'synthesis' | 'escalation';
  description: string;
  keywords: string[];
  priority: number;
  enabled: boolean;
}

interface AgentResponse {
  agentId: string;
  agentName: string;
  type: string;
  content: string;
  confidence: number;
  metadata: Record<string, any>;
}

interface OrchestratorResult {
  requestId: string;
  userId: string;
  intent: string;
  selectedAgents: Agent[];
  responses: AgentResponse[];
  synthesizedResponse: string;
  confidence: number;
  timestamp: Date;
}

export class AgentOrchestrator {
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  private agents: Map<string, Agent> = new Map();
  private agentRegistry: Agent[] = [];

  constructor() {
    this.initializeAgentRegistry();
  }

  /**
   * Initialize the agent registry with all available agents
   */
  private initializeAgentRegistry(): void {
    this.agentRegistry = [
      {
        id: 'study-agent-1',
        name: 'Study Buddy',
        type: 'study',
        description: 'Helps understand concepts and explains topics',
        keywords: ['explain', 'understand', 'concept', 'what is', 'how does', 'definition'],
        priority: 1,
        enabled: true,
      },
      {
        id: 'focus-agent-1',
        name: 'Focus Guardian',
        type: 'focus',
        description: 'Detects distractions and maintains concentration',
        keywords: ['focus', 'distracted', 'concentrate', 'help me focus', 'stay focused'],
        priority: 2,
        enabled: true,
      },
      {
        id: 'motivation-agent-1',
        name: 'Motivation Coach',
        type: 'motivation',
        description: 'Provides encouragement and motivation',
        keywords: ['motivation', 'tired', 'give up', 'cant do it', 'help me', 'encourage'],
        priority: 3,
        enabled: true,
      },
      {
        id: 'performance-agent-1',
        name: 'Performance Tracker',
        type: 'performance',
        description: 'Analyzes performance and identifies gaps',
        keywords: ['grade', 'score', 'performance', 'progress', 'improve', 'better'],
        priority: 4,
        enabled: true,
      },
      {
        id: 'problem-solving-agent-1',
        name: 'Problem Solver',
        type: 'study',
        description: 'Guides through problem-solving process',
        keywords: ['solve', 'problem', 'answer', 'how to', 'step by step', 'help me solve'],
        priority: 5,
        enabled: true,
      },
      {
        id: 'synthesis-agent-1',
        name: 'Synthesis Expert',
        type: 'synthesis',
        description: 'Connects concepts and creates big picture',
        keywords: ['connect', 'relate', 'similar', 'difference', 'summary', 'overview'],
        priority: 6,
        enabled: true,
      },
      {
        id: 'personalization-agent-1',
        name: 'Personalization Engine',
        type: 'personalization',
        description: 'Adapts content to learning style',
        keywords: ['prefer', 'style', 'visual', 'audio', 'example', 'practice'],
        priority: 7,
        enabled: true,
      },
      {
        id: 'reflection-agent-1',
        name: 'Reflection Guide',
        type: 'study',
        description: 'Helps consolidate learning through reflection',
        keywords: ['reflect', 'review', 'remember', 'consolidate', 'summary', 'what did'],
        priority: 8,
        enabled: true,
      },
      {
        id: 'recommendation-agent-1',
        name: 'Recommendation Engine',
        type: 'personalization',
        description: 'Suggests next steps and resources',
        keywords: ['next', 'recommend', 'suggest', 'what should', 'resource', 'practice'],
        priority: 9,
        enabled: true,
      },
      {
        id: 'escalation-agent-1',
        name: 'Escalation Handler',
        type: 'escalation',
        description: 'Knows when to escalate to human',
        keywords: ['confused', 'stuck', 'help', 'need human', 'not working', 'error'],
        priority: 10,
        enabled: true,
      },
    ];

    // Build agent map for quick lookup
    this.agentRegistry.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Main orchestration function
   */
  async orchestrate(request: AgentRequest): Promise<OrchestratorResult> {
    const requestId = uuidv4();
    
    try {
      // 1. Detect intent
      const intent = await this.detectIntent(request.message);
      
      // 2. Select appropriate agents
      const selectedAgents = this.selectAgents(intent, request.message);
      
      // 3. Execute agents in parallel
      const responses = await Promise.all(
        selectedAgents.map(agent => this.executeAgent(agent, request))
      );
      
      // 4. Synthesize responses
      const synthesizedResponse = await this.synthesizeResponses(
        responses,
        request.context
      );
      
      // 5. Calculate confidence
      const confidence = this.calculateConfidence(responses);
      
      // 6. Log the orchestration
      await this.logOrchestration({
        requestId,
        userId: request.userId,
        intent,
        selectedAgents,
        responses,
        synthesizedResponse,
        confidence,
        timestamp: new Date(),
      });
      
      return {
        requestId,
        userId: request.userId,
        intent,
        selectedAgents,
        responses,
        synthesizedResponse,
        confidence,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error in agent orchestration:', error);
      throw error;
    }
  }

  /**
   * Detect user intent from message
   */
  private async detectIntent(message: string): Promise<string> {
    // Simple intent detection based on keywords
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('explain') || lowerMessage.includes('understand')) {
      return 'explain';
    } else if (lowerMessage.includes('focus') || lowerMessage.includes('distracted')) {
      return 'focus';
    } else if (lowerMessage.includes('motivation') || lowerMessage.includes('tired')) {
      return 'motivation';
    } else if (lowerMessage.includes('grade') || lowerMessage.includes('performance')) {
      return 'performance';
    } else if (lowerMessage.includes('solve') || lowerMessage.includes('problem')) {
      return 'problem_solving';
    } else if (lowerMessage.includes('connect') || lowerMessage.includes('relate')) {
      return 'synthesis';
    } else if (lowerMessage.includes('next') || lowerMessage.includes('recommend')) {
      return 'recommendation';
    } else {
      return 'general';
    }
  }

  /**
   * Select agents based on intent and message
   */
  private selectAgents(intent: string, message: string): Agent[] {
    const selected: Agent[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Find agents that match the intent
    for (const agent of this.agentRegistry) {
      if (!agent.enabled) continue;
      
      // Check if any keywords match
      const keywordMatch = agent.keywords.some(keyword =>
        lowerMessage.includes(keyword)
      );
      
      if (keywordMatch) {
        selected.push(agent);
      }
    }
    
    // If no agents matched, add a default agent
    if (selected.length === 0) {
      const defaultAgent = this.agentRegistry.find(a => a.id === 'study-agent-1');
      if (defaultAgent) {
        selected.push(defaultAgent);
      }
    }
    
    // Sort by priority and return top 3
    return selected
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agent: Agent,
    request: AgentRequest
  ): Promise<AgentResponse> {
    try {
      // In a real implementation, this would call the actual agent service
      // For now, return a mock response
      
      return {
        agentId: agent.id,
        agentName: agent.name,
        type: agent.type,
        content: `Response from ${agent.name}: ${request.message}`,
        confidence: 0.85,
        metadata: {
          executionTime: Math.random() * 1000,
          tokensUsed: Math.random() * 100,
        },
      };
    } catch (error) {
      console.error(`Error executing agent ${agent.id}:`, error);
      throw error;
    }
  }

  /**
   * Synthesize responses from multiple agents
   */
  private async synthesizeResponses(
    responses: AgentResponse[],
    context: UserContext
  ): Promise<string> {
    if (responses.length === 0) {
      return 'No response available';
    }
    
    if (responses.length === 1) {
      return responses[0].content;
    }
    
    // Combine responses in order of confidence
    const sorted = responses.sort((a, b) => b.confidence - a.confidence);
    const combined = sorted
      .map(r => `${r.agentName}: ${r.content}`)
      .join('\n\n');
    
    return combined;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(responses: AgentResponse[]): number {
    if (responses.length === 0) return 0;
    
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    return Math.min(avgConfidence, 1);
  }

  /**
   * Log orchestration event
   */
  private async logOrchestration(result: OrchestratorResult): Promise<void> {
    try {
      await this.supabase.from('agent_orchestration_logs').insert({
        request_id: result.requestId,
        user_id: result.userId,
        intent: result.intent,
        selected_agents: result.selectedAgents.map(a => a.id),
        confidence: result.confidence,
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('Error logging orchestration:', error);
    }
  }

  /**
   * Get all available agents
   */
  getAgents(): Agent[] {
    return this.agentRegistry;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Enable/disable an agent
   */
  setAgentEnabled(agentId: string, enabled: boolean): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enabled = enabled;
    }
  }
}

export default AgentOrchestrator;
