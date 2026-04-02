import { LLMMessage, LLMStreamChunk } from '@types';
import { parseFile } from '@utils/parseFile';
import { chunkText, TextChunk } from '@utils/ragUtils';
import { useEffect, useRef, useState } from 'react';
import { Voy } from 'voy-search'; // Импортируем Voy

const BASE_URL = 'http://127.0.0.1:1234/v1/';
const EMBEDDING_MODEL = 'text-embedding-nomic-embed-text-v1.5';

export const useChat = (
  messages: LLMMessage[],
  setMessages: React.Dispatch<React.SetStateAction<LLMMessage[]>>,
  selectedModel: string
) => {
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Храним чанки для быстрого доступа по ID из Voy
  const [chunksMetadata, setChunksMetadata] = useState<
    Record<string, TextChunk>
  >({});
  // Состояние векторного индекса Voy
  const [voyIndex, setVoyIndex] = useState<Voy | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Очистка при смене чата или удалении файла
  useEffect(() => {
    if (!attachedFile) {
      setVoyIndex(null);
      setChunksMetadata({});
    }
  }, [attachedFile]);

  const stripThinkTags = (txt: string) =>
    txt.replace(/<think>.*?<\/think>/gs, '').trim();

  // Получение эмбеддинга (оставляем как было)
  async function getEmbedding(text: string): Promise<number[]> {
    const resp = await fetch(`${BASE_URL}embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, model: EMBEDDING_MODEL }),
    });
    if (!resp.ok) throw new Error('Ошибка модели эмбеддингов в LM Studio');
    const json = await resp.json();
    return json.data[0].embedding;
  }

  const handleFileSelect = async (file: File | null) => {
    setAttachedFile(file);
    if (!file) return;

    setIsFileParsing(true);
    setError(null);

    try {
      const text = await parseFile(file);
      const chunks = chunkText(text, file.name);

      const items = [];
      const metadataMap: Record<string, TextChunk> = {};

      // Индексируем чанки
      for (let i = 0; i < chunks.length; i++) {
        const emb = await getEmbedding(chunks[i].text);
        const id = String(i);

        // Формируем объект для Voy
        items.push({
          id,
          embeddings: emb,
          title: chunks[i].text.slice(0, 50), // Voy требует заголовок
          url: file.name, // Можно использовать как доп. метаданные
        });

        metadataMap[id] = chunks[i];
      }

      // Создаем ресурс Voy и индекс
      const resource = { embeddings: items };
      const index = new Voy(resource);

      setVoyIndex(index);
      setChunksMetadata(metadataMap);

      console.log(
        `Voy RAG: Проиндексировано ${items.length} векторов в WASM-хранилище`
      );
    } catch (err) {
      setError(
        'Ошибка индексации через Voy: ' +
          (err instanceof Error ? err.message : '')
      );
      setAttachedFile(null);
    } finally {
      setIsFileParsing(false);
    }
  };

  const handleSendMessage = async () => {
    if (isFileParsing || isLoading) return;
    if (!inputMessage.trim() && !attachedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      let retrievedContext = '';
      let sourceTexts: string[] = [];

      // --- 1. ПОИСК ЧЕРЕЗ VOY ---
      if (voyIndex && inputMessage.trim()) {
        // Улучшенный Query Expansion:
        // Берем только последнее сообщение пользователя (displayContent), чтобы не тащить старый контекст RAG
        const lastUserMsg = [...messages]
          .reverse()
          .find((m) => m.role === 'user');
        const searchString = lastUserMsg
          ? `${lastUserMsg.displayContent || lastUserMsg.content} ${inputMessage}`
          : inputMessage;

        const queryEmbedding = await getEmbedding(searchString);

        // Voy возвращает соседей, уже отсортированных по релевантности
        const results = voyIndex.search(new Float32Array(queryEmbedding), 3);

        // Сохраняем тексты для отображения в UI (источники)
        sourceTexts = results.neighbors
          .map((neighbor) => chunksMetadata[neighbor.id]?.text)
          .filter(Boolean);

        // Формируем контекст для отправки в LLM
        retrievedContext = results.neighbors
          .map((neighbor) => {
            const chunk = chunksMetadata[neighbor.id];
            return chunk
              ? `[Фрагмент из файла ${chunk.metadata.source}]:\n${chunk.text}`
              : '';
          })
          .filter(Boolean)
          .join('\n\n---\n\n');
      }

      // --- 2. ФОРМИРОВАНИЕ ПРОМПТА ---
      let llmContent = inputMessage.trim();
      if (retrievedContext) {
        // Инструкция для маленьких моделей (Gemma/Qwen) должна быть максимально жесткой
        llmContent = `ИНСТРУКЦИЯ: Отвечай на ВОПРОС ПОЛЬЗОВАТЕЛЯ, используя только предоставленный ниже КОНТЕКСТ. 
  Если в ВОПРОС не по контексту ищи в интернете или делай вид что контекста нет.
  Не выдумывай факты.
  
  КОНТЕКСТ ИЗ ДОКУМЕНТА:
  ${retrievedContext}
  
  ВОПРОС ПОЛЬЗОВАТЕЛЯ:
  ${inputMessage.trim()}`;
      }

      const userMsg: LLMMessage = {
        role: 'user',
        content: llmContent,
        displayContent:
          inputMessage.trim() +
          (attachedFile ? `\n\n📎 [Поиск по файлу активен]` : ''),
      };

      // Формируем историю для отправки (без гигантских системных промптов, если они не нужны)
      const history = [...messages];
      if (history.length === 0) {
        history.push({
          role: 'system',
          content:
            'Ты — точный ассистент-аналитик. Твоя задача — отвечать строго по предоставленному тексту.',
        });
      }
      history.push(userMsg);

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');

      // --- 3. ОТПРАВКА В LLM ---
      const resp = await fetch(`${BASE_URL}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: history,
          temperature: 0.1, // Уменьшаем до 0.1, чтобы модель не "фантазировала"
          stream: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Ошибка LLM: ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResp = '';

      // Создаем сообщение ассистента с уже найденными источниками
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          model: selectedModel,
          sources: sourceTexts,
        },
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
            fullResp += delta;

            setMessages((prev) => {
              const upd = [...prev];
              const last = upd[upd.length - 1];
              if (last?.role === 'assistant') {
                upd[upd.length - 1] = {
                  ...last,
                  content: stripThinkTags(fullResp),
                };
              }
              return upd;
            });
          } catch (e) {
            console.warn(e);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

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
