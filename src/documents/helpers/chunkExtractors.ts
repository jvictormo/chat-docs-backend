export function chunkText(text: string, chunkSize = 1200, overlap = 200) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export function pickRelevantChunks(extractedText: string, question: string, topK = 5) {
  const chunks = chunkText(extractedText);
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= 4);

  const scored = chunks.map((c) => {
    const lc = c.toLowerCase();
    let score = 0;
    for (const t of terms) if (lc.includes(t)) score++;
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(x => x.c);
}
