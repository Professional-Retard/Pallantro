import { Pit, Seed, SeedType } from '../types';

export const generateInitialPits = (): Pit[] => {
    const pits: Pit[] = [];
    let seedId = 0;
    for (let i = 0; i < 14; i++) {
        const isKasi = (i === 3 || i === 10);
        const seeds: Seed[] = [];
        if (!isKasi) {
            for (let s = 0; s < 12; s++) {
                seeds.push({ id: `seed_${seedId++}`, type: 'normal' });
            }
        }
        pits.push({ id: i, seeds, isKasi, isRubbish: false, pasuActive: false });
    }
    return pits;
};

export const getNextValidPit = (curr: number, pits: Pit[]) => {
   let next = (curr + 1) % 14;
   while (pits[next].isRubbish) {
      next = (next + 1) % 14;
   }
   return next;
}

export const refillBoard = (currentPits: Pit[], stash: Seed[]): { pits: Pit[], newStash: Seed[] } => {
    let pool = [...stash];
    const newPits = currentPits.map(p => ({ ...p, isRubbish: false, pasuActive: false, seeds: [] as Seed[] }));
    
    for(let p of currentPits) {
        pool.push(...p.seeds);
    }
    
    for(let p of newPits) {
        if (p.isKasi) continue;
        
        while (p.seeds.length < 12 && pool.length > 0) {
            p.seeds.push(pool.pop()!);
        }
        
        if (p.seeds.length === 0) {
            p.isRubbish = true;
        }
    }

    return { pits: newPits, newStash: pool };
}

export const mutateRandomSeeds = (type: SeedType, amount: number, pits: Pit[], stash: Seed[]) => {
    const normalIds: string[] = [];
    pits.forEach(p => p.seeds.forEach(s => { if(s.type === 'normal') normalIds.push(s.id) }));
    stash.forEach(s => { if(s.type === 'normal') normalIds.push(s.id) });

    // deterministic shuffle
    normalIds.sort(() => Math.random() - 0.5);
    const idsToMutate = new Set(normalIds.slice(0, amount));

    const newPits = pits.map(p => ({
        ...p,
        seeds: p.seeds.map(s => idsToMutate.has(s.id) ? { ...s, type } : s)
    }));
    
    const newStash = stash.map(s => idsToMutate.has(s.id) ? { ...s, type } : s);

    return { pits: newPits, stash: newStash };
}
