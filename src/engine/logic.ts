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

export const collectBoard = (currentPits: Pit[], playerStash: Seed[], enemyStash: Seed[]) => {
    let pPool = [...playerStash];
    let ePool = [...enemyStash];
    
    // Split Kasi
    for(let p of currentPits) {
        if (p.isKasi) {
            let claimedBy = p.claimedBy;
            if (!claimedBy) {
                // Unclaimed goes to row owner
                claimedBy = p.id === 3 ? 'player' : 'enemy';
            }
            if (claimedBy === 'both') {
                const half = Math.floor(p.seeds.length / 2);
                const remainder = p.seeds.length % 2;
                pPool.push(...p.seeds.slice(0, half + remainder));
                ePool.push(...p.seeds.slice(half + remainder));
            } else if (claimedBy === 'player') {
                pPool.push(...p.seeds);
            } else {
                ePool.push(...p.seeds);
            }
        } else {
            // Normal pits return to their row owner
            if (p.id <= 6) {
                pPool.push(...p.seeds);
            } else {
                ePool.push(...p.seeds);
            }
        }
    }

    const newPits = currentPits.map(p => ({ ...p, isRubbish: false, pasuActive: false, seeds: [] as Seed[], claimedBy: undefined }));
    return { collectedPits: newPits, newPlayerStash: pPool, newEnemyStash: ePool };
};

export const refillPitsFromStash = (currentPits: Pit[], playerStash: Seed[], enemyStash: Seed[]) => {
    let pPool = [...playerStash];
    let ePool = [...enemyStash];
    const newPits = currentPits.map(p => ({ ...p, seeds: [...p.seeds] }));
    
    // Fill player side (0-6 except 3)
    for (let i = 0; i <= 6; i++) {
        const p = newPits[i];
        if (p.isKasi) continue;
        if (pPool.length >= 12) {
            for(let k = 0; k < 12; k++) p.seeds.push(pPool.pop()!);
        } else if (pPool.length > 0) {
            const remainder = pPool.length;
            for(let k = 0; k < remainder; k++) p.seeds.push(pPool.pop()!);
        } else {
            p.isRubbish = true;
        }
    }

    // Fill enemy side (7-13 except 10)
    for (let i = 7; i <= 13; i++) {
        const p = newPits[i];
        if (p.isKasi) continue;
        if (ePool.length >= 12) {
            for(let k = 0; k < 12; k++) p.seeds.push(ePool.pop()!);
        } else if (ePool.length > 0) {
            const remainder = ePool.length;
            for(let k = 0; k < remainder; k++) p.seeds.push(ePool.pop()!);
        } else {
            p.isRubbish = true;
        }
    }

    return { filledPits: newPits, finalPlayerStash: pPool, finalEnemyStash: ePool };
}

export const simulateMove = (startIndex: number, initialPits: Pit[], isEnemy: boolean): { score: number, resultingPits: Pit[] } => {
    let pits = initialPits.map(p => ({ ...p, seeds: [...p.seeds] }));
    let currIdx = startIndex;
    let hand = [...pits[currIdx].seeds];
    pits[currIdx].seeds = [];
    let score = 0;

    while (hand.length > 0) {
        currIdx = getNextValidPit(currIdx, pits);
        pits[currIdx].seeds.push(hand.pop()!);
        
        if (isEnemy && currIdx === 10) score += 10;
        if (!isEnemy && currIdx === 3) score += 10;

        if (hand.length === 0) {
            let nextPit = getNextValidPit(currIdx, pits);
            if (pits[nextPit].seeds.length === 0) {
                let capturePit = getNextValidPit(nextPit, pits);
                if (pits[capturePit].isKasi) {
                    score += 500;
                } else {
                    score += pits[capturePit].seeds.length * 100;
                    pits[capturePit].seeds = [];
                }
                break;
            } else if (pits[nextPit].isKasi) {
                break;
            } else {
                hand = [...pits[nextPit].seeds];
                pits[nextPit].seeds = [];
                score += 5;
            }
        }
    }
    return { score, resultingPits: pits };
};

export const getBestAIMove = (pits: Pit[], ante: number): number => {
    const validPits = pits.filter(p => p.id >= 7 && p.id <= 13 && p.id !== 10 && !p.isRubbish && p.seeds.length > 0);
    if (validPits.length === 0) return -1;

    let bestId = validPits[0].id;
    let maxScore = -Infinity;

    for (let p of validPits) {
        const { score: aiScore, resultingPits } = simulateMove(p.id, pits, true);
        
        let finalScore = aiScore;

        if (true) {
            // Ruthless: simulate player's best response and subtract it
            const validPlayerPits = resultingPits.filter(sp => sp.id >= 0 && sp.id <= 6 && sp.id !== 3 && !sp.isRubbish && sp.seeds.length > 0);
            let maxPlayerScore = 0;
            for (let pp of validPlayerPits) {
                const { score: playerScore } = simulateMove(pp.id, resultingPits, false);
                if (playerScore > maxPlayerScore) {
                    maxPlayerScore = playerScore;
                }
            }
            finalScore -= maxPlayerScore;
        }

        // To make AI even more ruthless, we can check its own SECOND move if it gets another turn (which it doesn't usually unless kasi or something, but we just stick to depth 1 for now, it's enough)
        if (finalScore > maxScore) {
            maxScore = finalScore;
            bestId = p.id;
        } else if (finalScore === maxScore) {
            // tie breaker: prefer moves that maximize the number of seeds on the AI's side
            const aiSeedsPrevious = pits.filter(p => p.id >= 7 && p.id <= 13 && !p.isKasi).reduce((sum, p) => sum + p.seeds.length, 0);
            const aiSeedsResulting = resultingPits.filter(p => p.id >= 7 && p.id <= 13 && !p.isKasi).reduce((sum, p) => sum + p.seeds.length, 0);
            const prevBestResult = simulateMove(bestId, pits, true).resultingPits;
            const prevBestSeedsResulting = prevBestResult.filter(p => p.id >= 7 && p.id <= 13 && !p.isKasi).reduce((sum, p) => sum + p.seeds.length, 0);

            if (aiSeedsResulting > prevBestSeedsResulting) {
                bestId = p.id;
            }
        }
    }

    return bestId;
};

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
