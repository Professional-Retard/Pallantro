import { Ante, Talisman } from './types';

export const TALISMANS: Talisman[] = [
  { id: 't_aayar', name: 'Aayar (The Herder)', tier: 'common', description: '+4 Mult when tapping a Pasu.', cost: 10 },
  { id: 't_kalasam', name: 'Kalasam (Brass Pot)', tier: 'common', description: '+50 Chips on initial Sow from odd-numbered pit.', cost: 10 },
  { id: 't_pannaiyar', name: 'Pannaiyar (Landlord)', tier: 'uncommon', description: 'x1.2 Mult per Rubbish Hole on board.', cost: 15 },
  { id: 't_charal', name: 'Charal (The Drizzle)', tier: 'uncommon', description: 'Top row drops grant +25 Chips instead of +10.', cost: 15 },
  { id: 't_viyabari', name: 'Viyabari (Merchant)', tier: 'rare', description: 'x2 Mult when unlocking Kasi bank.', cost: 25 },
  { id: 't_sitharal', name: 'Sitharal (The Scatter)', tier: 'rare', description: 'Chain leaps over an empty pit once per turn.', cost: 25 }
];

export const ANTES: Ante[] = [
  { ante: 1, blinds: [{ name: 'Small Blind', target: 500, reward: 5 }, { name: 'Big Blind', target: 1500, reward: 7 }, { name: 'Boss Blind', target: 3000, reward: 10, isBoss: true }] },
  { ante: 2, blinds: [{ name: 'Small Blind', target: 4000, reward: 6 }, { name: 'Big Blind', target: 8000, reward: 8 }, { name: 'Boss Blind', target: 15000, reward: 12, isBoss: true }] },
  { ante: 3, blinds: [{ name: 'Small Blind', target: 20000, reward: 7 }, { name: 'Big Blind', target: 40000, reward: 9 }, { name: 'Boss Blind', target: 70000, reward: 15, isBoss: true }] },
  { ante: 4, blinds: [{ name: 'Small Blind', target: 100000, reward: 8 }, { name: 'Big Blind', target: 180000, reward: 10 }, { name: 'Boss Blind', target: 350000, reward: 18, isBoss: true }] },
  { ante: 5, blinds: [{ name: 'Small Blind', target: 500000, reward: 10 }, { name: 'Big Blind', target: 800000, reward: 12 }, { name: 'Boss Blind', target: 1500000, reward: 20, isBoss: true }] },
  { ante: 6, blinds: [{ name: 'Small Blind', target: 2000000, reward: 15 }, { name: 'Big Blind', target: 4000000, reward: 20 }, { name: 'Boss Blind', target: 8000000, reward: 30, isBoss: true }] },
  { ante: 7, blinds: [{ name: 'Small Blind', target: 15000000, reward: 20 }, { name: 'Big Blind', target: 30000000, reward: 25 }, { name: 'Boss Blind', target: 60000000, reward: 40, isBoss: true }] },
  { ante: 8, blinds: [{ name: 'Small Blind', target: 100000000, reward: 30 }, { name: 'Big Blind', target: 250000000, reward: 40 }, { name: 'Boss Blind', target: 800000000, reward: 50, isBoss: true }] }
];
