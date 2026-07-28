import { v4 as uuid } from 'uuid';

// ─── Types ───────────────────────────────────────────────
export interface AgentInput {
  [key: string]: any;
}

export interface AgentOutput {
  data: any;
  score: number;
  feedback: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface AgentNode {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  execute: (input: AgentInput, context: GraphContext) => Promise<AgentOutput>;
  dependencies: string[];
  maxRetries: number;
  qualityThreshold: number;
}

export interface GraphContext {
  sharedMemory: Map<string, any>;
  executionLog: ExecutionLogEntry[];
  startTime: number;
}

export interface ExecutionLogEntry {
  agentId: string;
  agentName: string;
  attempt: number;
  score: number;
  status: 'PASS' | 'FAIL' | 'ERROR';
  feedback: string[];
  timestamp: number;
  duration: number;
}

export interface GraphResult {
  outputs: Map<string, AgentOutput>;
  logs: ExecutionLogEntry[];
  totalDuration: number;
  overallScore: number;
  passed: boolean;
}

// ─── Graph Engine ────────────────────────────────────────
export class AgenticEngine {
  private agents: Map<string, AgentNode> = new Map();
  private reviewerAgents: Map<string, AgentNode> = new Map();

  registerAgent(agent: AgentNode): void {
    this.agents.set(agent.id, agent);
  }

  registerReviewer(targetAgentId: string, reviewer: AgentNode): void {
    this.reviewerAgents.set(targetAgentId, reviewer);
  }

  async executeGraph(entryPoint: string): Promise<GraphResult> {
    const context: GraphContext = {
      sharedMemory: new Map(),
      executionLog: [],
      startTime: Date.now(),
    };

    const outputs = new Map<string, AgentOutput>();
    const executionOrder = this.topologicalSort(entryPoint);

    for (const agentId of executionOrder) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      const input = this.buildInput(agent, outputs, context);
      const result = await this.executeWithReviewLoop(agent, input, context);
      outputs.set(agentId, result);
      context.sharedMemory.set(agentId, result.data);
    }

    const totalDuration = Date.now() - context.startTime;
    const scores = Array.from(outputs.values()).map(o => o.score);
    const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passed = overallScore >= 85;

    return { outputs, logs: context.executionLog, totalDuration, overallScore, passed };
  }

  private async executeWithReviewLoop(
    agent: AgentNode,
    input: AgentInput,
    context: GraphContext
  ): Promise<AgentOutput> {
    let attempt = 0;
    let currentInput = input;
    let bestOutput: AgentOutput | null = null;

    while (attempt < agent.maxRetries) {
      attempt++;
      const agentStart = Date.now();

      try {
        const output = await agent.execute(currentInput, context);
        let finalOutput = output;

        // Run reviewer if one exists for this agent
        const reviewer = this.reviewerAgents.get(agent.id);
        if (reviewer) {
          const reviewInput = { artifact: output.data, originalInput: input, previousFeedback: [] };
          const review = await reviewer.execute(reviewInput, context);

          if (review.score < agent.qualityThreshold && attempt < agent.maxRetries) {
            // Feed review back as improved input
            currentInput = {
              ...input,
              previousOutput: output.data,
              reviewFeedback: review.feedback,
              reviewImprovements: review.improvements,
              reviewWeaknesses: review.weaknesses,
              attempt,
            };

            context.executionLog.push({
              agentId: agent.id,
              agentName: agent.name,
              attempt,
              score: review.score,
              status: 'FAIL',
              feedback: review.feedback,
              timestamp: Date.now(),
              duration: Date.now() - agentStart,
            });

            bestOutput = output;
            continue;
          }

          // Merge review strengths into output
          finalOutput = {
            ...output,
            score: Math.max(output.score, review.score),
            strengths: [...output.strengths, ...review.strengths],
            feedback: [...output.feedback, ...review.feedback],
          };
        }

        context.executionLog.push({
          agentId: agent.id,
          agentName: agent.name,
          attempt,
          score: finalOutput.score,
          status: finalOutput.score >= agent.qualityThreshold ? 'PASS' : 'FAIL',
          feedback: finalOutput.feedback,
          timestamp: Date.now(),
          duration: Date.now() - agentStart,
        });

        if (finalOutput.score >= agent.qualityThreshold) {
          return finalOutput;
        }

        bestOutput = finalOutput;
        currentInput = {
          ...input,
          previousOutput: finalOutput.data,
          reviewFeedback: finalOutput.feedback,
          reviewImprovements: finalOutput.improvements,
          attempt,
        };
      } catch (error: any) {
        context.executionLog.push({
          agentId: agent.id,
          agentName: agent.name,
          attempt,
          score: 0,
          status: 'ERROR',
          feedback: [error.message],
          timestamp: Date.now(),
          duration: Date.now() - agentStart,
        });
      }
    }

    return bestOutput || { data: null, score: 0, feedback: ['Max retries exceeded'], strengths: [], weaknesses: [], improvements: [] };
  }

  private buildInput(agent: AgentNode, outputs: Map<string, AgentOutput>, context: GraphContext): AgentInput {
    const input: AgentInput = {};
    for (const depId of agent.dependencies) {
      const depOutput = outputs.get(depId);
      if (depOutput) {
        input[depId] = depOutput.data;
      }
    }
    input._context = {
      memory: Object.fromEntries(context.sharedMemory),
      executionLog: context.executionLog,
    };
    return input;
  }

  private topologicalSort(entryPoint: string): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (agentId: string) => {
      if (visited.has(agentId)) return;
      visited.add(agentId);

      const agent = this.agents.get(agentId);
      if (agent) {
        for (const dep of agent.dependencies) {
          visit(dep);
        }
      }
      order.push(agentId);
    };

    // Visit all reachable from entry point
    visit(entryPoint);

    // Visit any remaining unvisited agents
    for (const agentId of this.agents.keys()) {
      if (!visited.has(agentId)) {
        visit(agentId);
      }
    }

    return order;
  }
}

export default AgenticEngine;
