export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  displayContent?: string;
  model?: string;
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
export interface ChatSession {
  id: string;
  title: string;
  messages: LLMMessage[];
  model: string;
}
