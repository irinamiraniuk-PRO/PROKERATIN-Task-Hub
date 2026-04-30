import type { User } from '../types';

/** Parse @Name mentions from comment text. Returns array of matched user IDs. */
export function parseMentions(text: string, users: User[], excludeId?: string): string[] {
  const mentionedIds: string[] = [];
  for (const match of text.matchAll(/@([А-Яа-яЁёA-Za-z0-9]+)/g)) {
    const word = match[1];
    const user = users.find(u => {
      const parts = u.name.split(' ');
      return parts[0] === word || u.name === word;
    });
    if (user && user.id !== excludeId && !mentionedIds.includes(user.id)) {
      mentionedIds.push(user.id);
    }
  }
  return mentionedIds;
}
