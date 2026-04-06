export const chunkText = (text, maxTokens = 2500) => {
  // A simple approximation: 1 token ~= 4 characters in English text.
  // We target ~2500 tokens (approx 10,000 chars) to comfortably fit in the 2,000-3,000 range.
  const maxChars = maxTokens * 4;
  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let endIndex = currentIndex + maxChars;
    if (endIndex >= text.length) {
      chunks.push(text.slice(currentIndex));
      break;
    }
    
    // Try to find the nearest newline or period to break cleanly
    const lastNewline = text.lastIndexOf('\n', endIndex);
    const lastPeriod = text.lastIndexOf('. ', endIndex);

    if (lastNewline > currentIndex) {
      endIndex = lastNewline + 1;
    } else if (lastPeriod > currentIndex) {
      endIndex = lastPeriod + 1;
    }

    chunks.push(text.slice(currentIndex, endIndex).trim());
    currentIndex = endIndex;
  }
  
  return chunks;
};
