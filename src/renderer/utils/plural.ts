// "1 parameter", "1,234 parameters".
export const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
