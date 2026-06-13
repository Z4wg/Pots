import { DEMO } from './demo';

// Mocked open-banking providers shown on the connect screen.
export interface BankProvider {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  initials: string;
  primary?: boolean;
}

export const PROVIDERS: BankProvider[] = [
  { id: 'revolut', name: 'Revolut', subtitle: 'Recommended', accent: '#1F6FEB', initials: 'R', primary: true },
  { id: 'monzo', name: 'Monzo', subtitle: 'Open Banking', accent: '#FF4D6D', initials: 'M' },
  { id: 'starling', name: 'Starling', subtitle: 'Open Banking', accent: '#7A5CFF', initials: 'S' },
  { id: 'other', name: 'Other bank', subtitle: 'Open Banking', accent: '#5E5E6B', initials: 'OB' },
];

export function getProvider(id: string): BankProvider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

// Accounts shown in the fake OAuth account-picker (§4). The Savings account is
// the one POTS tracks for the bet. Integer pence.
export interface BankAccount {
  id: string;
  label: string;
  subtitle: string;
  balance_pence: number;
  kind: 'personal' | 'savings';
}

export const CONNECT_ACCOUNTS: BankAccount[] = [
  { id: 'personal', label: 'Personal', subtitle: 'Everyday spending', balance_pence: 124050, kind: 'personal' },
  { id: 'savings', label: 'Savings Vault', subtitle: 'POTS tracks this for the bet', balance_pence: 86000, kind: 'savings' },
];

// Seeded "recent transactions" shown after connecting (display-only). Negative
// = spend, positive = income. Integer pence.
export interface SeedTxn {
  id: string;
  merchant: string;
  category: string;
  amount_pence: number;
}

const MAYA_TXNS: Omit<SeedTxn, 'id'>[] = [
  { merchant: 'Salary — Acme Ltd', category: 'income', amount_pence: 210000 },
  { merchant: 'Transfer to Savings', category: 'savings', amount_pence: -10000 },
  { merchant: 'Tesco', category: 'grocery', amount_pence: -4230 },
  { merchant: 'Pret A Manger', category: 'cafe', amount_pence: -380 },
  { merchant: 'TfL', category: 'transport', amount_pence: -275 },
  { merchant: 'Spotify', category: 'going_out', amount_pence: -1199 },
];

const TOM_TXNS: Omit<SeedTxn, 'id'>[] = [
  { merchant: 'Salary — Beta Co', category: 'income', amount_pence: 198000 },
  { merchant: 'Dishoom', category: 'going_out', amount_pence: -6800 },
  { merchant: 'Wolt', category: 'cafe', amount_pence: -1400 },
  { merchant: 'ASOS', category: 'going_out', amount_pence: -5500 },
  { merchant: 'Black Sheep Coffee', category: 'cafe', amount_pence: -420 },
  { merchant: 'Uber', category: 'transport', amount_pence: -920 },
];

const DEFAULT_TXNS: Omit<SeedTxn, 'id'>[] = [
  { merchant: 'Salary', category: 'income', amount_pence: 200000 },
  { merchant: 'Tesco', category: 'grocery', amount_pence: -3850 },
  { merchant: 'Costa Coffee', category: 'cafe', amount_pence: -340 },
  { merchant: 'TfL', category: 'transport', amount_pence: -290 },
];

export function recentTransactions(userId: string): SeedTxn[] {
  const base =
    userId === DEMO.MAYA_ID ? MAYA_TXNS : userId === DEMO.TOM_ID ? TOM_TXNS : DEFAULT_TXNS;
  return base.map((t, i) => ({ ...t, id: `txn-${userId}-${i}` }));
}
