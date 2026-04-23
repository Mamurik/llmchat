const BASE_URL = 'http://127.0.0.1:1234/v1/';

// Интерфейсы для типизации ответа API
interface EmbeddingItem {
  embedding: number[];
  index: number;
  object: string;
}

interface EmbeddingResponse {
  data: EmbeddingItem[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function getEmbeddings(textChunks: string[]): Promise<number[][]> {
  const response = await fetch(`${BASE_URL}embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'text-embedding-nomic-embed-text-v1.5',
      input: textChunks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ошибка API эмбеддингов: ${response.statusText}`);
  }

  const data: EmbeddingResponse = await response.json();
  // Теперь здесь нет any, всё строго типизировано
  return data.data.map((item) => item.embedding);
}

export async function getQueryEmbedding(query: string): Promise<number[]> {
  const res = await getEmbeddings([query]);
  return res[0];
}
