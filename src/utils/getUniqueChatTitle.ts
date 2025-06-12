export function getUniqueChatTitle(chats: { title: string }[]) {
  const base = 'Чат';
  const usedNumbers = new Set<number>();

  chats.forEach(({ title }) => {
    const match = title.match(/^Чат\s*(\d+)$/);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  });

  let newNumber = 1;
  while (usedNumbers.has(newNumber)) {
    newNumber++;
  }

  return `${base} ${newNumber}`;
}
