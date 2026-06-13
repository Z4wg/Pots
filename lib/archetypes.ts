import type { Category, Comparator } from './types';

// The 6 POTS money personalities (v2 spec). Highest tally wins the quiz;
// ties resolve by PRIORITY order below.
export type ArchetypeKey =
  | 'vault'
  | 'baller'
  | 'hustler'
  | 'magpie'
  | 'strategist'
  | 'free_spirit';

export interface BucketSplit {
  // 50/30/20-anchored split. Percentages sum to 100.
  essentials: number;
  goingOut: number;
  travel: number;
  savings: number;
}

export interface Archetype {
  key: ArchetypeKey;
  title: string; // "The Vault"
  emoji: string;
  blurb: string; // short one-liner (kept for legacy callers)
  // Shareable result-card content.
  tagline: string;
  youAre: string;
  signatureMove: string;
  kryptonite: string;
  inAPot: string; // "…the one who quietly wins…"
  pctStat: string; // hardcoded shareability stat
  // Bucket split + default bet derived from the archetype.
  split: BucketSplit;
  betCategory: Category;
  betComparator: Comparator;
  betThresholdPence: number;
  betGoalLabel: string;
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  vault: {
    key: 'vault',
    title: 'The Vault',
    emoji: '🏦',
    blurb: 'Disciplined, future-proof, sleeps fine at night.',
    tagline: "You don't spend it, you guard it.",
    youAre: 'Disciplined, future-proof, sleeps fine at night.',
    signatureMove: 'Auto-saving before you feel it.',
    kryptonite: 'Never treating yourself.',
    inAPot: 'quietly wins while everyone forgets you’re playing.',
    pctStat: 'Only 8% are Vaults.',
    split: { essentials: 50, goingOut: 12, travel: 8, savings: 30 },
    betCategory: 'savings',
    betComparator: 'atleast',
    betThresholdPence: 3000,
    betGoalLabel: 'Save at least £30 this week',
  },
  baller: {
    key: 'baller',
    title: 'The Baller',
    emoji: '💸',
    blurb: 'Generous, fun, lives in the now.',
    tagline: "Life's short, the card's contactless.",
    youAre: 'Generous, fun, lives in the now.',
    signatureMove: 'Making the night legendary.',
    kryptonite: '“Wait, where did it all go?”',
    inAPot: 'makes the bet fun but is first to slip.',
    pctStat: '21% are Ballers.',
    split: { essentials: 50, goingOut: 30, travel: 12, savings: 8 },
    betCategory: 'going_out',
    betComparator: 'under',
    betThresholdPence: 15000,
    betGoalLabel: 'Stay under your £150 going-out cap',
  },
  hustler: {
    key: 'hustler',
    title: 'The Hustler',
    emoji: '📈',
    blurb: 'Always earning, investing, growing.',
    tagline: "Money's a tool, not a trophy.",
    youAre: 'Always earning, investing, growing.',
    signatureMove: 'Turning £1 into £2.',
    kryptonite: 'Can’t switch off.',
    inAPot: 'treats the pot like a portfolio.',
    pctStat: '14% are Hustlers.',
    split: { essentials: 45, goingOut: 15, travel: 10, savings: 30 },
    betCategory: 'savings',
    betComparator: 'atleast',
    betThresholdPence: 5000,
    betGoalLabel: 'Reinvest at least £50 this week',
  },
  magpie: {
    key: 'magpie',
    title: 'The Magpie',
    emoji: '✨',
    blurb: 'Impulse-led, trend-driven, joyful.',
    tagline: 'Ooh, shiny.',
    youAre: 'Impulse-led, trend-driven, joyful.',
    signatureMove: 'The 2am checkout.',
    kryptonite: 'The 14-day return window.',
    inAPot: 'needs the pot to stop the impulse buys.',
    pctStat: '19% are Magpies.',
    split: { essentials: 50, goingOut: 27, travel: 10, savings: 13 },
    betCategory: 'going_out',
    betComparator: 'under',
    betThresholdPence: 12000,
    betGoalLabel: 'Cap impulse spend under £120',
  },
  strategist: {
    key: 'strategist',
    title: 'The Strategist',
    emoji: '🧠',
    blurb: 'Planner, optimizer, spreadsheet-calm.',
    tagline: 'Every pound has a job.',
    youAre: 'Planner, optimizer, spreadsheet-calm.',
    signatureMove: 'The perfectly balanced budget.',
    kryptonite: 'Spontaneity.',
    inAPot: 'reads the rules twice and games them.',
    pctStat: 'Only 11% are Strategists.',
    split: { essentials: 50, goingOut: 20, travel: 12, savings: 18 },
    betCategory: 'cafe',
    betComparator: 'under',
    betThresholdPence: 8000,
    betGoalLabel: 'Spend under £80 on cafes this month',
  },
  free_spirit: {
    key: 'free_spirit',
    title: 'The Free Spirit',
    emoji: '🌊',
    blurb: 'Relaxed, present, allergic to tracking.',
    tagline: 'Money comes, money goes.',
    youAre: 'Relaxed, present, allergic to tracking.',
    signatureMove: 'Vibes-based finance.',
    kryptonite: 'The surprise low balance.',
    inAPot: 'joins for the friends, not the money.',
    pctStat: '27% are Free Spirits.',
    split: { essentials: 55, goingOut: 22, travel: 10, savings: 13 },
    betCategory: 'cafe',
    betComparator: 'nospend',
    betThresholdPence: 0,
    betGoalLabel: 'Hold one no-spend day this week',
  },
};

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

// Tie-break priority: highest wins ties.
export const ARCHETYPE_PRIORITY: ArchetypeKey[] = [
  'strategist',
  'vault',
  'hustler',
  'magpie',
  'baller',
  'free_spirit',
];

export function getArchetype(key: string | undefined | null): Archetype {
  if (key && key in ARCHETYPES) return ARCHETYPES[key as ArchetypeKey];
  return ARCHETYPES.strategist;
}

// ---- The 5-question single-select quiz ----
// Each option scores +1 for exactly one archetype (its `tag`). Don't show tags.

export interface QuizOption {
  label: string;
  tag: ArchetypeKey;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'It’s payday. What happens to the money in the first 24 hours?',
    options: [
      { label: 'Straight to savings before I can touch it.', tag: 'vault' },
      { label: 'Into investments / fuelling my side hustle.', tag: 'hustler' },
      { label: 'Every pound already has a job — it goes where the budget says.', tag: 'strategist' },
      { label: 'Treat myself first. Details later.', tag: 'baller' },
      { label: 'No plan — it just kind of flows.', tag: 'free_spirit' },
    ],
  },
  {
    id: 'q2',
    prompt: 'A friend texts: spontaneous trip, leaves Friday. You—',
    options: [
      { label: 'Covered — I’ve got a “fun” fund for exactly this.', tag: 'strategist' },
      { label: 'I’m in. Money worries are for Monday.', tag: 'baller' },
      { label: 'Let me flip something to fund it — let’s go.', tag: 'hustler' },
      { label: 'Yes! …and I’m buying a whole new trip outfit.', tag: 'magpie' },
      { label: 'Pass. Not in this month’s plan.', tag: 'vault' },
    ],
  },
  {
    id: 'q3',
    prompt: 'Your recent purchases are mostly—',
    options: [
      { label: 'Barely anything — I don’t spend much.', tag: 'vault' },
      { label: 'Random things I saw and had to have.', tag: 'magpie' },
      { label: 'Tools, courses, stuff that pays me back.', tag: 'hustler' },
      { label: 'Dinners, nights out, experiences.', tag: 'baller' },
      { label: 'Honestly couldn’t tell you.', tag: 'free_spirit' },
    ],
  },
  {
    id: 'q4',
    prompt: '£500 lands in your account by surprise. Be honest:',
    options: [
      { label: 'Invest it — make it work.', tag: 'hustler' },
      { label: 'Split it by my rules: some saved, some fun.', tag: 'strategist' },
      { label: 'Something shiny is already in my cart.', tag: 'magpie' },
      { label: 'Straight to savings, untouched.', tag: 'vault' },
      { label: 'Gone by the weekend, zero regrets.', tag: 'baller' },
    ],
  },
  {
    id: 'q5',
    prompt: 'Checking your bank balance feels like—',
    options: [
      { label: 'Calm — I know the number before I look.', tag: 'strategist' },
      { label: 'A thrill — I love watching it grow.', tag: 'vault' },
      { label: 'Mild dread, so I avoid it.', tag: 'free_spirit' },
      { label: 'Depends what I just bought…', tag: 'magpie' },
      { label: 'Fine — I’m focused on growing it, not guarding it.', tag: 'hustler' },
    ],
  },
];

// Tally the selected tags; on a tie, the earliest in ARCHETYPE_PRIORITY wins.
export function scoreQuiz(answers: ArchetypeKey[]): ArchetypeKey {
  const tally = {} as Record<ArchetypeKey, number>;
  for (const a of answers) tally[a] = (tally[a] ?? 0) + 1;
  let best: ArchetypeKey = ARCHETYPE_PRIORITY[0];
  let bestScore = -1;
  for (const k of ARCHETYPE_PRIORITY) {
    const s = tally[k] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = k;
    }
  }
  return best;
}

export const BUCKET_LABELS: { key: keyof BucketSplit; label: string; category: Category }[] = [
  { key: 'essentials', label: 'Essentials', category: 'grocery' },
  { key: 'goingOut', label: 'Going Out', category: 'going_out' },
  { key: 'travel', label: 'Travel', category: 'transport' },
  { key: 'savings', label: 'Savings', category: 'savings' },
];
