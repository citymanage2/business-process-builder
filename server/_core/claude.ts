/**
 * Claude API Integration
 * 
 * This module provides integration with Anthropic's Claude API
 * for AI-powered features in the Business Process Builder.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeOptions {
  messages: ClaudeMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Invoke Claude API for chat completion
 * 
 * @param options - Configuration for the Claude API call
 * @returns The assistant's response text
 */
export async function invokeClaude(options: ClaudeOptions): Promise<string> {
  const {
    messages,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = 'claude-3-5-sonnet-20241022', // Latest Claude 3.5 Sonnet
  } = options;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Extract text content from response
    const textContent = response.content.find((block: any) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    return textContent.text;
  } catch (error) {
    console.error('[Claude API] Error:', error);
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Invoke Claude API with streaming support
 * 
 * @param options - Configuration for the Claude API call
 * @param onChunk - Callback for each streamed chunk
 */
export async function invokeClaudeStream(
  options: ClaudeOptions,
  onChunk: (text: string) => void
): Promise<void> {
  const {
    messages,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = 'claude-3-5-sonnet-20241022',
  } = options;

  try {
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        onChunk(chunk.delta.text);
      }
    }
  } catch (error) {
    console.error('[Claude API] Streaming error:', error);
    throw new Error(`Claude API streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate structured JSON response using Claude
 * 
 * @param options - Configuration for the Claude API call
 * @returns Parsed JSON object
 */
export async function invokeClaudeJSON<T = any>(options: ClaudeOptions): Promise<T> {
  const response = await invokeClaude({
    ...options,
    systemPrompt: `${options.systemPrompt || ''}\n\nYou must respond with valid JSON only. Do not include any markdown formatting or explanations.`,
  });

  try {
    // Remove markdown code blocks if present
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('[Claude API] JSON parsing error:', error);
    console.error('[Claude API] Response:', response);
    throw new Error('Failed to parse Claude response as JSON');
  }
}

/**
 * Count tokens in a message (approximate)
 * Claude uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate Claude API key
 */
export function validateClaudeAPIKey(): boolean {
  if (!process.env.CLAUDE_API_KEY) {
    console.error('[Claude API] CLAUDE_API_KEY environment variable is not set');
    return false;
  }
  
  if (!process.env.CLAUDE_API_KEY.startsWith('sk-ant-')) {
    console.error('[Claude API] Invalid CLAUDE_API_KEY format');
    return false;
  }

  return true;
}

// Validate on module load
if (process.env.NODE_ENV === 'production') {
  validateClaudeAPIKey();
}
