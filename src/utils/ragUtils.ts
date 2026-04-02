export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    startIndex: number;
  };
}

export function chunkText(
  text: string,
  source: string,
  size = 1000,
  overlap = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let cur = 0;

  while (cur < text.length) {
    const end = Math.min(cur + size, text.length);
    chunks.push({
      text: text.slice(cur, end),
      metadata: { source, startIndex: cur },
    });
    // Сдвигаемся на , чтобы следующий чанк захватил часть предыдущего
    cur += size - overlap;
    if (end === text.length) break;
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
