// useChat.ts
import { LLMMessage, LLMStreamChunk } from '@types';
import { useEffect, useRef, useState } from 'react';

const BASE_URL = 'http://127.0.0.1:1234/v1/';

export const useChat = (
  messages: LLMMessage[],
  setMessages: React.Dispatch<React.SetStateAction<LLMMessage[]>>,
  selectedModel: string
) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filterAssistantResponse = (text: string) =>
    text.replace(/<think>.*?<\/think>/gs, '').trim();

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const userMessage: LLMMessage = {
      role: 'user',
      content: inputMessage.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const currentMessages = [...messages];
      if (currentMessages.length === 0) {
        currentMessages.unshift({
          role: 'system',
          content:
            'Вы — полезный ассистент. Отвечайте в Markdown. Будьте кратким и понятным.',
        });
      }

      currentMessages.push(userMessage);

      const response = await fetch(`${BASE_URL}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: currentMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ошибка: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';
      let assistantModel = 'Модель...';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', model: assistantModel },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split('\n')
          .filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const jsonString = line.substring(6);
          if (jsonString.trim() === '[DONE]') break;

          try {
            const parsed: LLMStreamChunk = JSON.parse(jsonString);
            const delta = parsed.choices[0]?.delta?.content || '';
            const model = parsed.model || assistantModel;

            fullResponse += delta;
            assistantModel = model;

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: filterAssistantResponse(fullResponse),
                  model: assistantModel,
                };
              }
              return updated;
            });
          } catch (err) {
            console.warn('JSON parse error:', err);
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Неизвестная ошибка при запросе.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Ошибка: ${msg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    error,
    handleSendMessage,
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setInputMessage(e.target.value),
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    messagesEndRef,
  };
};
