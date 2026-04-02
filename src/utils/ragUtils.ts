// src/utils/ragUtils.ts

export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    page?: number;
  };
  embedding?: number[];
}

/**
 * Разбивает текст на смысловые куски (чанки) с перекрытием
 */
export function chunkText(
  text: string,
  source: string,
  size = 1000,
  overlap = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + size;
    const chunk = text.slice(start, end);
    chunks.push({
      text: chunk,
      metadata: { source },
    });
    start += size - overlap;
  }

  return chunks;
}

/**
 * Вычисляет косинусное сходство между двумя векторами
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  const similarity = dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
  return isNaN(similarity) ? 0 : similarity;
}
