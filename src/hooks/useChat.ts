/* eslint-disable @typescript-eslint/no-explicit-any */
import { LLMMessage, LLMStreamChunk } from '@types';
import { getFromCache, saveToCache } from '@utils/db';
import { parseFile } from '@utils/parseFile';
import { chunkText, TextChunk } from '@utils/ragUtils';
import { useEffect, useRef, useState } from 'react';
import { Voy } from 'voy-search';

const BASE_URL = 'http://127.0.0.1:1234/v1/';
const EMBEDDING_MODEL = 'text-embedding-nomic-embed-text-v1.5';

export type RAGStrategy = 'rag' | 'full' | 'none';

export const useChat = (
  messages: LLMMessage[],
  setMessages: React.Dispatch<React.SetStateAction<LLMMessage[]>>,
  selectedModel: string
) => {
  /* ---------- Состояния ---------- */
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragStrategy, setRagStrategy] = useState<RAGStrategy>('rag');

  const [chunksMetadata, setChunksMetadata] = useState<
    Record<string, TextChunk>
  >({});
  const [voyIndex, setVoyIndex] = useState<Voy | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------- Скролл ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- Вспомогательные функции ---------- */

  async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const resp = await fetch(`${BASE_URL}embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
    });
    if (!resp.ok) throw new Error('Ошибка Batch Embedding');
    const json = await resp.json();
    return json.data.map((item: any) => item.embedding);
  }

  const stripThink = (txt: string) =>
    txt.replace(/<think>.*?<\/think>/gs, '').trim();

  /* ---------- Обработка файлов (Multi-document) ---------- */
  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setAttachedFiles([]);
      setVoyIndex(null);
      setChunksMetadata({});
      return;
    }

    if (attachedFiles.find((f) => f.name === file.name)) return;

    setAttachedFiles((prev) => [...prev, file]);
    setIsFileParsing(true);
    setIndexingProgress(0);
    setError(null);

    try {
      let resourceItems: any[] = [];
      let metadataMap: Record<string, TextChunk> = {};

      const cached = await getFromCache(file.name);
      if (cached) {
        console.log(`RAG: ${file.name} загружен из кэша`);
        resourceItems = cached.resource.embeddings;
        metadataMap = cached.metadataMap;
      } else {
        const text = await parseFile(file);
        const chunks = chunkText(text, file.name);
        const batchSize = 10;

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const embeddings = await getEmbeddingsBatch(batch.map((c) => c.text));

          batch.forEach((chunk, index) => {
            const id = `${file.name}-${i + index}`;
            resourceItems.push({
              id,
              embeddings: embeddings[index],
              title: file.name,
              url: id,
            });
            metadataMap[id] = chunk;
          });
          setIndexingProgress(
            Math.round(((i + batch.length) / chunks.length) * 100)
          );
        }
        await saveToCache(file.name, {
          resource: { embeddings: resourceItems },
          metadataMap,
        });
      }

      setChunksMetadata((prev) => ({ ...prev, ...metadataMap }));

      setVoyIndex((prevIndex) => {
        const oldItems = prevIndex
          ? (prevIndex as any).resource.embeddings
          : [];
        return new Voy({ embeddings: [...oldItems, ...resourceItems] });
      });
    } catch (err) {
      setError(
        'Ошибка индексации: ' + (err instanceof Error ? err.message : '')
      );
    } finally {
      setIsFileParsing(false);
    }
  };

  /* ---------- Логика вызова API (для одной модели) ---------- */
  const callLLM = async (
    modelId: string,
    history: any[],
    sources: string[]
  ) => {
    const resp = await fetch(`${BASE_URL}chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: history,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!resp.ok) throw new Error(`Ошибка модели ${modelId}: ${resp.status}`);
    const reader = resp.body?.getReader();
    const decoder = new TextDecoder();
    let fullResp = '';

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', model: modelId, sources },
    ]);

    while (reader) {
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
            // Заменяем findLastIndex на обычный цикл для совместимости с любым TS Target
            for (let i = upd.length - 1; i >= 0; i--) {
              if (upd[i].role === 'assistant' && upd[i].model === modelId) {
                upd[i] = { ...upd[i], content: stripThink(fullResp) };
                break;
              }
            }
            return upd;
          });
        } catch (e) {
          console.error('Ошибка парсинга чанка:', e);
        }
      }
    }
  };

  /* ---------- Основная функция отправки ---------- */
  const handleSendMessage = async (compareModel?: string) => {
    if (isFileParsing || isLoading) return;
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      let retrievedContext = '';
      const sourceTexts: string[] = [];

      if (attachedFiles.length > 0) {
        if (ragStrategy === 'rag' && voyIndex) {
          const [queryEmb] = await getEmbeddingsBatch([inputMessage]);
          const results = voyIndex.search(new Float32Array(queryEmb), 5);
          results.neighbors.forEach((neighbor) => {
            const chunk = chunksMetadata[neighbor.id];
            if (chunk) {
              sourceTexts.push(`[${chunk.metadata.source}]: ${chunk.text}`);
              retrievedContext += `${chunk.text}\n\n`;
            }
          });
        } else if (ragStrategy === 'full') {
          retrievedContext = Object.values(chunksMetadata)
            .map((c) => c.text)
            .join('\n')
            .slice(0, 12000);
        }
      }

      const historyBase = messages.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.displayContent || m.content : m.content,
      }));

      if (historyBase.length === 0) {
        historyBase.push({
          role: 'system',
          content:
            'Ты — полезный ассистент. Отвечай кратко, используя предоставленный контекст документов.',
        });
      }

      const promptWithRAG = retrievedContext
        ? `КОНТЕКСТ ИЗ ДОКУМЕНТОВ:\n${retrievedContext}\n\nВОПРОС: ${inputMessage.trim()}`
        : inputMessage.trim();

      const finalHistory = [
        ...historyBase,
        { role: 'user', content: promptWithRAG },
      ];

      const strategyLabel = ragStrategy === 'rag' ? 'RAG' : 'Full-Text';
      const compareLabel = compareModel
        ? ` | ⚖️ Сравнение с ${compareModel}`
        : '';

      const userMsg: LLMMessage = {
        role: 'user',
        content: promptWithRAG,
        displayContent:
          inputMessage.trim() +
          (attachedFiles.length > 0
            ? `\n\n📎 [${strategyLabel}${compareLabel}]`
            : ''),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');

      const modelsToCall = compareModel
        ? [selectedModel, compareModel]
        : [selectedModel];

      await Promise.all(
        modelsToCall.map((mId) => callLLM(mId, finalHistory, sourceTexts))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    inputMessage,
    attachedFiles,
    isFileParsing,
    indexingProgress,
    isLoading,
    error,
    ragStrategy,
    setRagStrategy,
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
