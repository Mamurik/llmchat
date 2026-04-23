export function splitText(
  text: string,
  chunkSize: number = 800,
  overlap: number = 100
): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }

  return chunks;
}
