export function searchChunks(
  chunks: string[],
  query: string,
  topK = 3
): string[] {
  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = chunks.map((chunk) => {
    const lower = chunk.toLowerCase();

    let score = 0;
    queryWords.forEach((word) => {
      if (lower.includes(word)) score++;
    });

    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}
