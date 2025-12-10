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
  jsonSchema?: any; // JSON schema for structured outputs
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
    model = 'claude-sonnet-4-5', // Claude 4.5 Sonnet (latest)
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

    // Log usage statistics
    console.log('[Claude API] Usage:', JSON.stringify(response.usage));
    console.log('[Claude API] Stop reason:', response.stop_reason);
    
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
    model = 'claude-sonnet-4-5',
  } = options;

  try {
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
  } catch (error) {
    console.error('[Claude API] Streaming error:', error);
    throw new Error(`Claude streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate structured JSON response using Claude with guaranteed schema compliance
 * Uses Claude's structured outputs feature (beta) for 100% valid JSON
 * 
 * @param options - Configuration for the Claude API call with optional JSON schema
 * @returns Parsed JSON object matching the schema
 */
export async function invokeClaudeJSON<T = any>(options: ClaudeOptions): Promise<T> {
  const {
    messages,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = 'claude-sonnet-4-5',
    jsonSchema,
  } = options;

  try {
    // Use structured outputs if schema is provided
    if (jsonSchema) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        // @ts-ignore - structured outputs beta feature
        betas: ['structured-outputs-2025-11-13'],
        // @ts-ignore
        output_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            schema: jsonSchema,
          },
        },
      });

      // Extract text content from response
      const textContent = response.content.find((block: any) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      // With structured outputs, the response is guaranteed to be valid JSON
      return JSON.parse(textContent.text);
    }
    
    // Fallback: use streaming for long operations (>10 min)
    // Use streaming for long operations (>10 min)
    let response = '';
    
    await invokeClaudeStream({
      ...options,
      systemPrompt: `${systemPrompt || ''}

IMPORTANT: You must respond with ONLY valid JSON. Do not include:
- Markdown code blocks (no \`\`\`json or \`\`\`)
- Any explanatory text before or after the JSON
- Any comments or notes

Respond with pure JSON starting with { or [`,
    }, (chunk) => {
      response += chunk;
    });
    
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Find JSON object or array in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('[Claude API] JSON parsing error:', error);
      console.error('[Claude API] Raw response:', response);
      console.error('[Claude API] Response length:', response.length);
      console.error('[Claude API] First 500 chars:', response.substring(0, 500));
      
      // Save response to file for debugging
      const fs = await import('fs/promises');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `/tmp/claude-response-${timestamp}.json`;
      await fs.writeFile(filename, response, 'utf-8');
      console.error(`[Claude API] Full response saved to: ${filename}`);
      
      throw new Error(`Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[Claude API] Error:', error);
    throw error;
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
  return !!process.env.CLAUDE_API_KEY;
}
