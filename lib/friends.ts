import type { ArchetypeKey } from './archetypes';

// Seeded squad — the friends "active in the app" (display-only, not bet refs).
// Shared by the Squad tab (§7c) and the invite "Joined" seeds (§3).
export interface Friend {
  id: string;
  name: string;
  emoji: string;
  archetype: ArchetypeKey;
  // What they're currently doing across shared pots (one-line standing).
  standing: string;
  streak: number;
}

export const FRIENDS: Friend[] = [
  { id: 'friend-priya', name: 'Priya', emoji: '🐿️', archetype: 'vault', standing: '1st in Cafe Cap', streak: 7 },
  { id: 'friend-leo', name: 'Leo', emoji: '🚀', archetype: 'hustler', standing: '2nd in Save Race', streak: 5 },
  { id: 'friend-zoe', name: 'Zoe', emoji: '💎', archetype: 'magpie', standing: 'Broke the No-Takeout pot', streak: 0 },
  { id: 'friend-sam', name: 'Sam', emoji: '🌱', archetype: 'free_spirit', standing: 'Holding in 2 pots', streak: 2 },
];

export function getFriend(id: string): Friend | undefined {
  return FRIENDS.find((f) => f.id === id);
}
