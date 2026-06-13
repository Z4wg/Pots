import type { Category, Comparator } from './types';

export type ArchetypeKey =
  | 'saver'
  | 'traveller'
  | 'socialiser'
  | 'investor'
  | 'soft_saver'
  | 'hustler'
  | 'avoider'
  | 'status_spender';

export interface BucketSplit {
  // 50/30/20-anchored split. Percentages sum to 100.
  essentials: number;
  goingOut: number;
  travel: number;
  savings: number;
}

export interface Archetype {
  key: ArchetypeKey;
  title: string; // "The Traveller"
  emoji: string;
  blurb: string;
  split: BucketSplit;
  // Default bet derived from the archetype.
  betCategory: Category;
  betComparator: Comparator;
  betThresholdPence: number;
  betGoalLabel: string;
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  saver: {
    key: 'saver',
    title: 'The Saver',
    emoji: '🐿️',
    blurb: 'Future-you always gets paid first.',
    split: { essentials: 50, goingOut: 15, travel: 10, savings: 25 },
    betCategory: 'savings',
    betComparator: 'atleast',
    betThresholdPence: 2000,
    betGoalLabel: 'Save at least £20 this week',
  },
  traveller: {
    key: 'traveller',
    title: 'The Traveller',
    emoji: '🦊',
    blurb: 'Cut the lattes, protect the plane tickets.',
    split: { essentials: 50, goingOut: 12, travel: 23, savings: 15 },
    betCategory: 'cafe',
    betComparator: 'under',
    betThresholdPence: 10000,
    betGoalLabel: 'Spend under £100 on cafes this month',
  },
  socialiser: {
    key: 'socialiser',
    title: 'The Socialiser',
    emoji: '🐢',
    blurb: 'Big nights, but capped.',
    split: { essentials: 50, goingOut: 30, travel: 8, savings: 12 },
    betCategory: 'going_out',
    betComparator: 'under',
    betThresholdPence: 15000,
    betGoalLabel: 'Stay under your £150 going-out cap',
  },
  investor: {
    key: 'investor',
    title: 'The Investor',
    emoji: '📈',
    blurb: 'Every spare pound compounds.',
    split: { essentials: 50, goingOut: 13, travel: 7, savings: 30 },
    betCategory: 'savings',
    betComparator: 'atleast',
    betThresholdPence: 3000,
    betGoalLabel: 'Invest at least £30 this week',
  },
  soft_saver: {
    key: 'soft_saver',
    title: 'The Soft-Saver',
    emoji: '🌱',
    blurb: 'Small wins, gentle habits.',
    split: { essentials: 50, goingOut: 28, travel: 12, savings: 10 },
    betCategory: 'cafe',
    betComparator: 'nospend',
    betThresholdPence: 0,
    betGoalLabel: 'Hold one no-spend day this week',
  },
  hustler: {
    key: 'hustler',
    title: 'The Hustler',
    emoji: '🚀',
    blurb: 'Reinvest in the grind.',
    split: { essentials: 45, goingOut: 15, travel: 10, savings: 30 },
    betCategory: 'savings',
    betComparator: 'atleast',
    betThresholdPence: 5000,
    betGoalLabel: 'Reinvest at least £50 this week',
  },
  avoider: {
    key: 'avoider',
    title: 'The Avoider',
    emoji: '🙈',
    blurb: 'Just show up. Daily.',
    split: { essentials: 55, goingOut: 20, travel: 8, savings: 17 },
    betCategory: 'cafe',
    betComparator: 'under',
    betThresholdPence: 8000,
    betGoalLabel: 'Check in daily and stay under £80 on cafes',
  },
  status_spender: {
    key: 'status_spender',
    title: 'The Status Spender',
    emoji: '💎',
    blurb: 'Cap the impulse buys.',
    split: { essentials: 50, goingOut: 27, travel: 10, savings: 13 },
    betCategory: 'going_out',
    betComparator: 'under',
    betThresholdPence: 12000,
    betGoalLabel: 'Cap impulse spend under £120',
  },
};

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

export function getArchetype(key: string | undefined | null): Archetype {
  if (key && key in ARCHETYPES) return ARCHETYPES[key as ArchetypeKey];
  return ARCHETYPES.traveller;
}

// ---- The 5-card either/or quiz ----
// Each option nudges a set of archetypes. We tally and pick the winner.

export interface QuizOption {
  label: string;
  weights: Partial<Record<ArchetypeKey, number>>;
}

export interface QuizCard {
  id: string;
  prompt: string;
  left: QuizOption;
  right: QuizOption;
}

export const QUIZ: QuizCard[] = [
  {
    id: 'q1',
    prompt: 'Surprise trip or money in savings?',
    left: { label: 'Surprise trip ✈️', weights: { traveller: 2, socialiser: 1 } },
    right: { label: 'Money in savings 💰', weights: { saver: 2, investor: 1 } },
  },
  {
    id: 'q2',
    prompt: 'Split evenly or pay your share?',
    left: { label: 'Split evenly 🤝', weights: { socialiser: 2, avoider: 1 } },
    right: { label: 'Pay your share 🧾', weights: { hustler: 1, status_spender: 1, saver: 1 } },
  },
  {
    id: 'q3',
    prompt: 'Save first or spend first?',
    left: { label: 'Save first 🪙', weights: { saver: 2, soft_saver: 1, investor: 1 } },
    right: { label: 'Spend first 🛍️', weights: { status_spender: 2, socialiser: 1 } },
  },
  {
    id: 'q4',
    prompt: 'Big night out or quiet night in?',
    left: { label: 'Big night out 🎉', weights: { socialiser: 2, status_spender: 1 } },
    right: { label: 'Quiet night in 🛋️', weights: { soft_saver: 2, avoider: 1, saver: 1 } },
  },
  {
    id: 'q5',
    prompt: 'Invest it or stash it?',
    left: { label: 'Invest it 📈', weights: { investor: 2, hustler: 2 } },
    right: { label: 'Stash it 🏦', weights: { saver: 2, soft_saver: 1 } },
  },
];

export function scoreQuiz(answers: ('left' | 'right')[]): ArchetypeKey {
  const tally: Record<string, number> = {};
  answers.forEach((side, i) => {
    const card = QUIZ[i];
    if (!card) return;
    const opt = side === 'left' ? card.left : card.right;
    Object.entries(opt.weights).forEach(([k, v]) => {
      tally[k] = (tally[k] ?? 0) + (v ?? 0);
    });
  });
  let best: ArchetypeKey = 'traveller';
  let bestScore = -1;
  (Object.keys(ARCHETYPES) as ArchetypeKey[]).forEach((k) => {
    const s = tally[k] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = k;
    }
  });
  return best;
}

export const BUCKET_LABELS: { key: keyof BucketSplit; label: string; category: Category }[] = [
  { key: 'essentials', label: 'Essentials', category: 'grocery' },
  { key: 'goingOut', label: 'Going Out', category: 'going_out' },
  { key: 'travel', label: 'Travel', category: 'transport' },
  { key: 'savings', label: 'Savings', category: 'savings' },
];
