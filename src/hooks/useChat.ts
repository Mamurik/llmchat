import { LLMMessage, LLMStreamChunk } from '@types';
import { parseFile } from '@utils/parseFile';
import { useEffect, useRef, useState } from 'react';

const BASE_URL = 'http://127.0.0.1:1234/v1/';

export const useChat = (
  messages: LLMMessage[],
  setMessages: React.Dispatch<React.SetStateAction<LLMMessage[]>>,
  selectedModel: string
) => {
  /* ---------- state ---------- */
  const [inputMessage, setInputMessage] = useState('');

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [parsedFileText, setParsedFileText] = useState<string | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------- авто‑скролл вниз ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- удаляем <think></think> из ответа модели -------- */
  const stripThinkTags = (txt: string) =>
    txt.replace(/<think>.*?<\/think>/gs, '').trim();

  /* ---------- выбор файла ---------- */
  const handleFileSelect = async (file: File | null) => {
    setAttachedFile(file);
    setParsedFileText(null);

    if (!file) return;

    setIsFileParsing(true);
    try {
      const text = await parseFile(file);
      setParsedFileText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при разборе файла.');
      setAttachedFile(null);
    } finally {
      setIsFileParsing(false);
    }
  };

  /* ---------- отправка ---------- */
  const handleSendMessage = async () => {
    if (isFileParsing) return; // файл ещё парсится
    if (!inputMessage.trim() && !attachedFile) return; // нечего отправлять

    setIsLoading(true);
    setError(null);

    try {
      const ext = attachedFile
        ? attachedFile.name.split('.').pop()?.toLowerCase()
        : '';
      const humanAttachment = attachedFile
        ? `Файл: ${attachedFile.name} (${ext})`
        : '';

      const displayContent =
        inputMessage.trim() + (humanAttachment ? `\n${humanAttachment}` : '');

      let llmContent = inputMessage.trim();
      if (parsedFileText && attachedFile) {
        llmContent += `\n\n---\nСодержимое файла «${attachedFile.name}»:\n${parsedFileText}`;
      }

      const userMsg: LLMMessage = {
        role: 'user',
        content: llmContent,
        displayContent,
      };

      const history = [...messages];
      if (history.length === 0) {
        history.unshift({
          role: 'system',
          content:
            'Вы — полезный ассистент. Отвечайте в Markdown. Будьте кратким и понятным.',
        });
      }
      history.push(userMsg);

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');
      setAttachedFile(null);
      setParsedFileText(null);

      const resp = await fetch(`${BASE_URL}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: history,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Ошибка: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let fullResp = '';
      let assistantModel = 'assistant';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', model: assistantModel },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const json = line.slice(6);
          if (json.trim() === '[DONE]') continue;

          try {
            const part: LLMStreamChunk = JSON.parse(json);
            const delta = part.choices[0]?.delta?.content ?? '';
            const model = part.model ?? assistantModel;

            fullResp += delta;
            assistantModel = model;

            setMessages((prev) => {
              const upd = [...prev];
              const last = upd[upd.length - 1];

              if (last?.role === 'assistant') {
                upd[upd.length - 1] = {
                  ...last,
                  content: stripThinkTags(fullResp),
                  model: assistantModel,
                };
              }
              return upd;
            });
          } catch (e) {
            console.warn('Ошибка парсинга JSON‑чанка', e);
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Ошибка: ${msg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- наружу ---------- */
  return {
    messages,
    inputMessage,
    attachedFile,
    isFileParsing,
    isLoading,
    error,

    setInputMessage,
    handleFileSelect,
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
