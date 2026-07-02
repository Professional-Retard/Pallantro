export type SeedType = 'normal' | 'palingu' | 'irumbu' | 'thangam';

export interface Seed {
  id: string;
  type: SeedType;
}

export interface Pit {
  id: number;
  seeds: Seed[];
  isKasi: boolean;
  isRubbish: boolean;
  pasuActive: boolean;
  claimedBy?: 'player' | 'enemy' | 'both';
}

export interface Talisman {
  id: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'mystery';
  description: string;
  cost: number;
}

export interface Blind {
  name: string;
  target: number;
  reward: number;
  isBoss?: boolean;
}

export interface Ante {
  ante: number;
  blinds: Blind[];
}
