import React, { useState, useEffect } from 'react';
import { generateInitialPits, refillBoard, mutateRandomSeeds } from './engine/logic';
import { useSowEngine } from './engine/useSowEngine';
import { Board } from './components/Board';
import { ShopUI } from './components/Shop';
import { Pit, Seed, Talisman, SeedType } from './types';
import { ANTES } from './data';
import { motion, AnimatePresence } from 'motion/react';
import { initAudio } from './engine/audio';

export default function App() {
  const [route, setRoute] = useState<'menu'|'game'|'shop'|'gameover'>('menu');
  
  const [pits, setPits] = useState<Pit[]>([]);
  const [stash, setStash] = useState<Seed[]>([]);
  const [talismans, setTalismans] = useState<Talisman[]>([]);
  const [permanentMult, setPermanentMult] = useState(0);
  const [gold, setGold] = useState(0);

  const [anteIdx, setAnteIdx] = useState(0);
  const [blindIdx, setBlindIdx] = useState(0);
  const [score, setScore] = useState(0); // overall score for leaderboard/fun
  const [blindScore, setBlindScore] = useState(0); // score for current blind
  const [sowsLeft, setSowsLeft] = useState(4);

  const currentAnte = ANTES[anteIdx];
  const currentBlind = currentAnte?.blinds[blindIdx];

  const startGame = () => {
    initAudio();
    setPits(generateInitialPits());
    setStash([]);
    setTalismans([]);
    setPermanentMult(0);
    setGold(0);
    setAnteIdx(0);
    setBlindIdx(0);
    setScore(0);
    setBlindScore(0);
    setSowsLeft(4);
    setRoute('game');
  };

  const handleSowComplete = (gainedScore: number) => {
     const newBlindScore = blindScore + gainedScore;
     setBlindScore(newBlindScore);
     setScore(s => s + gainedScore);
     
     const newSowsLeft = sowsLeft - 1;
     setSowsLeft(newSowsLeft);

     if (newBlindScore >= currentBlind.target) {
        // Blind Beaten!
        setTimeout(() => {
           setGold(g => g + currentBlind.reward + (newSowsLeft * 5));
           setRoute('shop');
        }, 1500);
     } else if (newSowsLeft <= 0) {
        // Game Over!
        setTimeout(() => setRoute('gameover'), 1000);
     }
  };

  const { runSow, isSowing, turnChips, turnMult, handSize, handlePasuTap } = useSowEngine(
      pits, setPits, 
      stash, setStash,
      talismans, permanentMult, setPermanentMult, 
      (g) => setGold(prev => prev + g),
      handleSowComplete
  );

  const nextBlind = () => {
     let nextBlindIdx = blindIdx + 1;
     let nextAnteIdx = anteIdx;
     if (nextBlindIdx >= currentAnte.blinds.length) {
         nextBlindIdx = 0;
         nextAnteIdx++;
     }
     
     if (nextAnteIdx >= ANTES.length) {
         // YOU WIN
         setRoute('gameover');
         return;
     }

     const { pits: newPits, newStash } = refillBoard(pits, stash);
     setPits(newPits);
     setStash(newStash);
     
     setAnteIdx(nextAnteIdx);
     setBlindIdx(nextBlindIdx);
     setBlindScore(0);
     setSowsLeft(4);
     setRoute('game');
  };

  const buyTalisman = (t: Talisman) => {
      if (gold >= t.cost && talismans.length < 5) {
          setGold(g => g - t.cost);
          setTalismans([...talismans, t]);
      }
  };

  const buyBlessing = (type: SeedType, amount: number, cost: number) => {
      if (gold >= cost) {
          setGold(g => g - cost);
          const { pits: p, stash: s } = mutateRandomSeeds(type, amount, pits, stash);
          setPits(p);
          setStash(s);
      }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-amber-900 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {route === 'menu' && (
          <motion.div key="menu" exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center relative p-8">
             <div className="absolute inset-0 bg-[#050505] z-0">
               {/* Background decors */}
             </div>
             <div className="z-10 flex flex-col items-center gap-6">
                <h1 className="text-6xl md:text-[8rem] font-display text-white mb-2 tracking-[-0.02em]">PALLANTRO</h1>
                <p className="text-xl text-white/50 font-mono mb-8 text-center max-w-md">
                   A rogue-lite math-engine based on the ancient game of Pallanguzhi.
                </p>
                <button onClick={startGame} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded font-display uppercase tracking-wider text-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-1">
                   BEGIN_SOWING
                </button>
             </div>
          </motion.div>
        )}

        {route === 'game' && currentBlind && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col py-6 px-4 md:px-8 max-w-[1024px] mx-auto w-full">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
               <div className="flex flex-col">
                  <span className="font-mono text-blue-500 text-sm tracking-widest uppercase">RUNNING_BLIND // ANTE_{currentAnte.ante < 10 ? `0${currentAnte.ante}` : currentAnte.ante}</span>
                  <h1 className={`text-5xl md:text-8xl font-display leading-none uppercase ${currentBlind.isBoss ? 'text-rose-500' : 'text-white'}`}>{currentBlind.name}</h1>
               </div>
               
               <div className="text-left md:text-right flex flex-col items-start md:items-end">
                  <div className="flex gap-4 mb-2">
                    <div className="bg-[#1a1a1a] px-4 py-1 rounded border border-white/10 flex flex-col items-start md:items-end">
                      <span className="font-mono text-[10px] block opacity-50 uppercase">Target Score</span>
                      <span className="font-display text-2xl text-yellow-500">{currentBlind.target.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs opacity-50">SOWS REMAINING:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                         <div key={i} className={`w-3 h-6 ${i < sowsLeft ? 'bg-blue-500' : 'bg-white/20'}`}></div>
                      ))}
                    </div>
                  </div>
               </div>
            </header>

            {talismans.length > 0 && (
              <div className="flex gap-2 mb-4 justify-start overflow-x-auto">
                 {talismans.map(t => (
                    <div key={t.id} className="text-xs bg-[#111] border border-white/10 px-3 py-1 rounded-sm text-white/70 font-mono uppercase">
                       {t.name}
                    </div>
                 ))}
                 {permanentMult > 0 && (
                    <div className="text-xs bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-sm text-yellow-500 font-mono uppercase">
                       +KASI_M: {permanentMult}
                    </div>
                 )}
              </div>
            )}

            <main className="flex-1 flex flex-col items-center justify-center w-full relative">
               <Board pits={pits} isSowing={isSowing} onPitClick={runSow} onPasuTap={handlePasuTap} />
            </main>
            
            <footer className="flex flex-col md:flex-row items-center gap-8 border-t border-white/10 pt-8 mt-12 mb-4">
              <div className="flex-1 flex flex-col w-full h-24 justify-center">
                 {isSowing ? (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full items-center gap-6 justify-start md:justify-end">
                       <div className="flex flex-col items-end">
                          <span className="font-mono text-xs opacity-50 uppercase mb-1">Turn Chips</span>
                          <span className="font-display text-4xl md:text-6xl text-blue-500">{turnChips}</span>
                       </div>
                       <span className="font-display text-2xl md:text-4xl opacity-20 italic">X</span>
                       <div className="flex flex-col items-end">
                          <span className="font-mono text-xs opacity-50 uppercase mb-1">Multiplier</span>
                          <span className="font-display text-4xl md:text-6xl text-rose-500">{turnMult.toFixed(1)}</span>
                       </div>
                   </motion.div>
                 ) : (
                    <div className="flex w-full items-center gap-6 justify-start md:justify-end">
                       <div className="flex flex-col items-end">
                          <span className="font-mono text-xs opacity-50 uppercase mb-1">Total Score</span>
                          <span className="font-display text-4xl md:text-6xl text-blue-500">{blindScore.toLocaleString()}</span>
                       </div>
                       <span className="font-display text-2xl md:text-4xl opacity-20 italic">/</span>
                       <div className="flex flex-col items-end">
                          <span className="font-mono text-xs opacity-50 uppercase mb-1">Target</span>
                          <span className="font-display text-4xl md:text-6xl text-yellow-500">{currentBlind.target.toLocaleString()}</span>
                       </div>
                    </div>
                 )}
              </div>
              <div className="bg-white text-black p-4 h-24 flex flex-col justify-center items-center w-32 border-l-4 border-yellow-500 shrink-0">
                 <span className="font-mono text-[10px] font-black tracking-widest">GOLD</span>
                 <span className="font-display text-4xl">${gold.toLocaleString()}</span>
              </div>
            </footer>
          </motion.div>
        )}

        {route === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col py-12 px-4 overflow-y-auto w-full items-center">
             <ShopUI gold={gold} onBuyTalisman={buyTalisman} onBuyBlessing={buyBlessing} ownedTalismans={talismans} />
             <div className="w-full max-w-4xl flex justify-end mt-8">
                <button onClick={nextBlind} className="px-8 py-3 bg-[#1a1a1a] text-white border border-white/20 rounded font-display text-2xl uppercase hover:border-white hover:bg-white hover:text-black transition-colors">NEXT_BLIND</button>
             </div>
          </motion.div>
        )}
        
        {route === 'gameover' && (
          <motion.div key="gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center pattern-bg">
             <h1 className="text-6xl md:text-[8rem] font-display text-rose-500 mb-6 drop-shadow-md">RUN ENDED</h1>
             <p className="text-2xl text-white/70 font-mono mb-2 uppercase">Final Score // {score.toLocaleString()}</p>
             <p className="text-white/30 font-mono uppercase mb-8">Ante 0{currentAnte?.ante || 8}</p>
             <button onClick={startGame} className="px-8 py-4 bg-[#1a1a1a] border border-white/20 hover:border-white/40 text-white rounded font-display uppercase text-2xl transition-colors">
                 TRY AGAIN
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
