/**
 * LLM Integration - Claude API
 * 
 * This module provides a unified interface for AI completions using Claude API.
 * It maintains compatibility with the original Manus LLM interface while using Anthropic's Claude.
 */

import { invokeClaude, invokeClaudeJSON, ClaudeMessage } from './claude';

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type OutputSchema = {
  type: "json_schema";
  json_schema: JsonSchema;
};

export type ResponseFormat = {
  type: "json_object" | "json_schema";
  json_schema?: JsonSchema;
};

/**
 * Convert Message[] to Claude format
 */
function convertToClaudeMessages(messages: Message[]): { system?: string; messages: ClaudeMessage[] } {
  const systemMessages: string[] = [];
  const claudeMessages: ClaudeMessage[] = [];

  for (const msg of messages) {
    // Extract text content
    let textContent: string;
    if (typeof msg.content === 'string') {
      textContent = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Find text content in array
      const textItem = msg.content.find(item => 
        typeof item === 'object' && 'type' in item && item.type === 'text'
      ) as TextContent | undefined;
      textContent = textItem?.text || '';
    } else if ('type' in msg.content && msg.content.type === 'text') {
      textContent = msg.content.text;
    } else {
      textContent = '';
    }

    // Separate system messages
    if (msg.role === 'system') {
      systemMessages.push(textContent);
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      claudeMessages.push({
        role: msg.role,
        content: textContent,
      });
    }
  }

  return {
    system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
    messages: claudeMessages,
  };
}

/**
 * Main LLM invocation function using Claude API
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    maxTokens,
    max_tokens,
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  } = params;

  // Convert messages to Claude format
  const { system, messages: claudeMessages } = convertToClaudeMessages(messages);

  // Determine max tokens
  const maxTokensValue = maxTokens || max_tokens || 4096;

  // Check if JSON output is requested
  const jsonFormat = responseFormat || response_format || outputSchema || output_schema;

  try {
    let content: string;

    if (jsonFormat) {
      // Use JSON mode
      const jsonResult = await invokeClaudeJSON({
        messages: claudeMessages,
        systemPrompt: system,
        maxTokens: maxTokensValue,
      });
      content = JSON.stringify(jsonResult);
    } else {
      // Regular text completion
      content = await invokeClaude({
        messages: claudeMessages,
        systemPrompt: system,
        maxTokens: maxTokensValue,
      });
    }

    // Return in OpenAI-compatible format
    return {
      id: `claude-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: 'claude-3-5-sonnet-20241022',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: estimateTokens(claudeMessages.map(m => m.content).join(' ')),
        completion_tokens: estimateTokens(content),
        total_tokens: estimateTokens(claudeMessages.map(m => m.content).join(' ') + content),
      },
    };
  } catch (error) {
    console.error('[LLM] Error:', error);
    throw error;
  }
}

/**
 * Estimate token count (approximate)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate API key
 */
function assertApiKey(): void {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable is required');
  }
}

// Validate on module load in production
if (process.env.NODE_ENV === 'production') {
  assertApiKey();
}
