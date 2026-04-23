export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  displayContent?: string;
  model?: string;
  sources?: string[];
}

export interface LLMStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: 'assistant';
    };
    finish_reason: string | null;
  }>;
}
export interface LLMSettings {
  temperature: number;
  topP: number;
  topK: number;
  systemPrompt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: LLMMessage[];
  model: string;
  settings: LLMSettings;
}
export interface ParsedPage {
  text: string;
  pageNumber: number;
}
