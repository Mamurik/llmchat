/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LLMMessage, LLMSettings, LLMStreamChunk } from '@types';
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
  selectedModel: string,
  settings: LLMSettings
) => {
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragStrategy, setRagStrategy] = useState<RAGStrategy>('rag');

  // Карта: [имя_файла] -> { [id_чанка]: данные_чанка с вектором }
  const [filesChunksMap, setFilesChunksMap] = useState<
    Record<string, Record<string, TextChunk & { embeddings: number[] }>>
  >({});
  const [chunksMetadata, setChunksMetadata] = useState<
    Record<string, TextChunk>
  >({});
  const [voyIndex, setVoyIndex] = useState<Voy | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const resp = await fetch(`${BASE_URL}embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
    });
    if (!resp.ok)
      throw new Error(
        'Ошибка Batch Embedding. Убедитесь, что LM Studio запущена.'
      );
    const json = await resp.json();
    return json.data.map((item: any) => item.embedding);
  }

  const stripThink = (txt: string) =>
    txt.replace(/<think>.*?<\/think>/gs, '').trim();

  /* --- Исправленная логика пересборки индекса --- */
  const rebuildIndex = (currentMap: Record<string, Record<string, any>>) => {
    const allItems: any[] = [];
    const newGlobalMetadata: Record<string, TextChunk> = {};

    Object.values(currentMap).forEach((fileChunks) => {
      Object.entries(fileChunks).forEach(([id, chunk]) => {
        if (chunk.embeddings) {
          // Проверка на наличие вектора
          allItems.push({
            id,
            embeddings: chunk.embeddings, // Voy требует именно это имя поля
            title: chunk.metadata.source,
            url: id,
          });
          newGlobalMetadata[id] = chunk;
        }
      });
    });

    if (allItems.length > 0) {
      try {
        setVoyIndex(new Voy({ embeddings: allItems }));
        setChunksMetadata(newGlobalMetadata);
      } catch (e) {
        console.error('Voy Init Error:', e);
        setError('Ошибка инициализации векторного поиска.');
      }
    } else {
      setVoyIndex(null);
      setChunksMetadata({});
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setFilesChunksMap((prev) => {
      const newMap = { ...prev };
      delete newMap[fileName];
      rebuildIndex(newMap);
      return newMap;
    });
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || attachedFiles.find((f) => f.name === file.name)) return;

    setIsFileParsing(true);
    setIndexingProgress(0);
    setError(null);

    try {
      let fileMetadataMap: Record<
        string,
        TextChunk & { embeddings: number[] }
      > = {};

      const cached = await getFromCache(file.name);
      if (cached && cached.metadataMap) {
        // Если в кэше старый формат (поле embedding вместо embeddings), Voy упадет.
        // Поэтому проверяем первый чанк.
        const firstKey = Object.keys(cached.metadataMap)[0];
        if (cached.metadataMap[firstKey].embeddings) {
          fileMetadataMap = cached.metadataMap;
        } else {
          throw new Error('Устаревший формат кэша. Очистите IndexedDB.');
        }
      } else {
        const text = await parseFile(file);
        const chunks = chunkText(text, file.name);
        const batchSize = 10;

        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize);
          const embeddings = await getEmbeddingsBatch(batch.map((c) => c.text));

          batch.forEach((chunk, index) => {
            const id = `${file.name}-${i + index}`;
            fileMetadataMap[id] = { ...chunk, embeddings: embeddings[index] };
          });
          setIndexingProgress(
            Math.round(((i + batch.length) / chunks.length) * 100)
          );
        }
        // Сохраняем в кэш. Поле resource.embeddings нужно для совместимости.
        const resourceItems = Object.entries(fileMetadataMap).map(
          ([id, c]) => ({
            id,
            embeddings: c.embeddings,
            title: file.name,
            url: id,
          })
        );
        await saveToCache(file.name, {
          resource: { embeddings: resourceItems },
          metadataMap: fileMetadataMap,
        });
      }

      setFilesChunksMap((prev) => {
        const updatedMap = { ...prev, [file.name]: fileMetadataMap };
        rebuildIndex(updatedMap);
        return updatedMap;
      });
      setAttachedFiles((prev) => [...prev, file]);
    } catch (err: any) {
      setError(err.message || 'Ошибка обработки файла');
      setAttachedFiles((prev) => prev.filter((f) => f.name !== file.name));
    } finally {
      setIsFileParsing(false);
    }
  };

  const clearAllFiles = () => {
    setAttachedFiles([]);
    setFilesChunksMap({});
    setChunksMetadata({});
    setVoyIndex(null);
  };

  /* --- Логика отправки сообщений (без изменений, но с фиксом queryEmb) --- */
  const handleSendMessage = async (compareModel?: string) => {
    if (isFileParsing || isLoading) return;
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      let retrievedContext = '';
      const sourceTexts: string[] = [];

      if (attachedFiles.length > 0 && ragStrategy === 'rag' && voyIndex) {
        const [queryEmb] = await getEmbeddingsBatch([inputMessage]);
        const results = voyIndex.search(new Float32Array(queryEmb), 5);
        results.neighbors.forEach((neighbor) => {
          const chunk = chunksMetadata[neighbor?.id];

          if (chunk) {
            sourceTexts.push(`[${chunk.metadata.source}]: ${chunk.text}`);
            retrievedContext += `ИСТОЧНИК: ${chunk.metadata.source}\nСОДЕРЖИМОЕ: ${chunk.text}\n---\n`;
          }
        });
      }

      const recentMessages = messages.slice(-10);
      const historyBase = recentMessages.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.displayContent || m.content : m.content,
      }));

      const finalHistory = [
        { role: 'system', content: settings.systemPrompt },
        ...historyBase,
        {
          role: 'user',
          content: retrievedContext
            ? `КОНТЕКСТ:\n${retrievedContext}\n\nВОПРОС: ${inputMessage.trim()}`
            : inputMessage.trim(),
        },
      ];

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: inputMessage.trim(),
          displayContent:
            inputMessage.trim() +
            (attachedFiles.length > 0
              ? `\n\n📎 [${ragStrategy === 'rag' ? 'RAG' : 'Full'}]`
              : ''),
        },
      ]);
      setInputMessage('');

      const modelsToCall = compareModel
        ? [selectedModel, compareModel]
        : [selectedModel];
      await Promise.all(
        modelsToCall.map((mId) => callLLM(mId, finalHistory, sourceTexts))
      );
    } catch (e: any) {
      setError(e.message || 'Ошибка при отправке');
    } finally {
      setIsLoading(false);
    }
  };

  // callLLM остается практически таким же, как был (убедитесь, что стриминг работает)
  const callLLM = async (
    modelId: string,
    history: any[],
    sources: string[]
  ) => {
    // ... ваш код callLLM ...
    // Оставил без изменений, так как ошибка была в индексации
    const resp = await fetch(`${BASE_URL}chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: history,
        temperature: settings.temperature,
        top_p: settings.topP,
        top_k: settings.topK,
        stream: true,
      }),
    });

    if (!resp.ok) throw new Error(`Ошибка модели ${modelId}: ${resp.status}`);
    const reader = resp.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '...', model: modelId, sources },
    ]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed: LLMStreamChunk = JSON.parse(jsonStr);
            fullContent += parsed.choices[0]?.delta?.content || '';
            setMessages((prev) => {
              const upd = [...prev];
              for (let i = upd.length - 1; i >= 0; i--) {
                if (upd[i].role === 'assistant' && upd[i].model === modelId) {
                  upd[i] = { ...upd[i], content: stripThink(fullContent) };
                  break;
                }
              }
              return upd;
            });
          } catch (e) {
            /* empty */
          }
        }
      }
    } finally {
      reader.releaseLock();
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
    handleRemoveFile,
    clearAllFiles,
    ragStrategy,
    setRagStrategy,
    setInputMessage,
    handleFileSelect,
    handleSendMessage,
    handleInputChange: (e: any) => setInputMessage(e.target.value),
    handleKeyPress: (e: any) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    messagesEndRef,
  };
};
