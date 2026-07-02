import React, { useState, useEffect } from 'react';
import { generateInitialPits, collectBoard, refillPitsFromStash, mutateRandomSeeds, getBestAIMove } from './engine/logic';
import { useSowEngine } from './engine/useSowEngine';
import { Board } from './components/Board';
import { ShopUI } from './components/Shop';
import { Pit, Seed, Talisman, SeedType } from './types';
import { ANTES } from './data';
import { motion, AnimatePresence } from 'motion/react';
import { initAudio } from './engine/audio';
import { HelpModal } from './components/HelpModal';
import { HelpCircle } from 'lucide-react';

export default function App() {
  const [route, setRoute] = useState<'menu'|'game'|'shop'|'gameover'|'ante_summary'>('menu');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const [pits, setPits] = useState<Pit[]>([]);
  const [stash, setStash] = useState<Seed[]>([]);
  const [enemyStash, setEnemyStash] = useState<Seed[]>([]);
  const [talismans, setTalismans] = useState<Talisman[]>([]);
  const [permanentMult, setPermanentMult] = useState(0);
  const [gold, setGold] = useState(0);

  const [anteIdx, setAnteIdx] = useState(0);
  const [blindIdx, setBlindIdx] = useState(0);
  const [score, setScore] = useState(0); 
  const [blindScore, setBlindScore] = useState(0); 
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [sowsLeft, setSowsLeft] = useState(4);
  const [gameOverReason, setGameOverReason] = useState('');
  
  const [activePlayer, setActivePlayer] = useState<'player'|'enemy'>('player');
  const [tossPhase, setTossPhase] = useState<'idle'|'tossing'|'done'>('done');
  const [transitionPhase, setTransitionPhase] = useState<'none'|'collecting'|'refilling'>('none');
  const [fastMode, setFastMode] = useState(false);
  const skipRef = React.useRef(false);

  const currentAnte = ANTES[anteIdx];
  const currentBlind = currentAnte?.blinds[blindIdx];

  const startGame = () => {
    initAudio();
    setPits(generateInitialPits());
    setStash([]);
    setEnemyStash([]);
    setTalismans([]);
    setPermanentMult(0);
    setGold(0);
    setAnteIdx(0);
    setBlindIdx(0);
    setScore(0);
    setBlindScore(0);
    setSowsLeft(4);
    startBlind();
    setRoute('game');
  };

  const startBlind = () => {
      setTurnHistory([]);
      setTossPhase('tossing');
      setFastMode(false);
      setTimeout(() => {
          const goesFirst = Math.random() > 0.5 ? 'player' : 'enemy';
          setActivePlayer(goesFirst);
          setTossPhase('done');
      }, 2000);
  };

  const [turnHistory, setTurnHistory] = useState<{chips: number, mult: number, stashBonus: number, finalScore: number}[]>([]);

  const handleSowComplete = (details: {chips: number, mult: number, stashBonus: number, finalScore: number}, isEnemy: boolean) => {
     if (!isEnemy) {
         const newBlindScore = blindScore + details.finalScore;
         setBlindScore(newBlindScore);
         setScore(s => s + details.finalScore);
         
         setTurnHistory(prev => [...prev, details]);

         const newSowsLeft = sowsLeft - 1;
         setSowsLeft(newSowsLeft);

         if (newBlindScore >= currentBlind.target) {
            setTimeout(() => {
               setGold(g => g + currentBlind.reward + (newSowsLeft * 5));
               setRoute('ante_summary');
            }, 1500);
            return;
         } else if (newSowsLeft <= 0) {
            setGameOverReason('Failed to meet Target Score');
            setTimeout(() => setRoute('gameover'), 1000);
            return;
         }
         setActivePlayer('enemy');
     } else {
         setActivePlayer('player');
     }
  };

  const { runSow, isSowing, turnChips, turnMult, handSize, handlePasuTap } = useSowEngine(
      pits, setPits, 
      stash, setStash,
      enemyStash, setEnemyStash,
      fastMode ? [...talismans, { id: 'skip_animation', name: '', tier: 'common', description: '', cost: 0 }] : talismans,
      permanentMult, setPermanentMult, 
      (g) => setGold(prev => prev + g),
      handleSowComplete
  );

  const pitsRef = React.useRef(pits);
  React.useEffect(() => { pitsRef.current = pits; }, [pits]);

  useEffect(() => {
      if (activePlayer === 'enemy' && route === 'game' && tossPhase === 'done' && !isSowing && transitionPhase === 'none') {
          let isCancelled = false;

          const runAI = async () => {
              await new Promise(r => setTimeout(r, 1000));
              if (isCancelled) return;
              
              const currentAnteNumber = currentAnte?.ante || 1;
              const prob = Math.min(1, currentAnteNumber / 8); 
              
              pitsRef.current.forEach(p => {
                 if (p.id >= 7 && p.id <= 13 && p.pasuActive) {
                    if (Math.random() < prob) {
                       handlePasuTap(p.id, true);
                    }
                 }
              });

              await new Promise(r => setTimeout(r, 500));
              if (isCancelled) return;

              const latestPits = pitsRef.current;
              const bestPit = getBestAIMove(latestPits, currentAnteNumber);
              if (bestPit !== -1) {
                  runSow(bestPit, true, latestPits);
              } else {
                  handleSowComplete({ chips: 0, mult: 0, stashBonus: 0, finalScore: 0 }, true);
              }
          };

          runAI();

          return () => { isCancelled = true; };
      }
  }, [activePlayer, route, tossPhase, isSowing, currentAnte, transitionPhase]);

  const nextBlind = () => {
     if (transitionPhase !== 'none') return;
     let nextBlindIdx = blindIdx + 1;
     let nextAnteIdx = anteIdx;
     let isNewAnte = false;
     
     if (nextBlindIdx >= currentAnte.blinds.length) {
         nextBlindIdx = 0;
         nextAnteIdx++;
         isNewAnte = true;
     }
     
     if (nextAnteIdx >= ANTES.length) {
         setGameOverReason('You beat the game!');
         setRoute('gameover');
         return;
     }

     if (isNewAnte) {
         setTalismans([]); // expire modifiers
         setRoute('game');
         setTransitionPhase('collecting');
         
         const doTransition = async () => {
             skipRef.current = false;
             if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 1000));
             
             let currentPits = [...pits.map(p => ({...p}))];
             let currentPStash = [...stash];
             let currentEStash = [...enemyStash];
             
             // Collect animation
             for (let i = 0; i <= 13; i++) {
                 let p = currentPits[i];
                 if (p.seeds.length > 0) {
                     if (p.isKasi) {
                         let claimedBy = p.claimedBy;
                         if (!claimedBy) claimedBy = p.id === 3 ? 'player' : 'enemy';
                         if (claimedBy === 'both') {
                             const half = Math.floor(p.seeds.length / 2);
                             const remainder = p.seeds.length % 2;
                             currentPStash.push(...p.seeds.slice(0, half + remainder));
                             currentEStash.push(...p.seeds.slice(half + remainder));
                         } else if (claimedBy === 'player') {
                             currentPStash.push(...p.seeds);
                         } else {
                             currentEStash.push(...p.seeds);
                         }
                     } else {
                         if (p.id <= 6) {
                             currentPStash.push(...p.seeds);
                         } else {
                             currentEStash.push(...p.seeds);
                         }
                     }
                     p.seeds = [];
                 }
                 p.isRubbish = false;
                 p.pasuActive = false;
                 p.claimedBy = undefined;
                 
                 setPits([...currentPits]);
                 setStash([...currentPStash]);
                 setEnemyStash([...currentEStash]);
                 if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 400));
             }
             
             if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 1000));
             setTransitionPhase('refilling');
             if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 800));
             
             // Refill animation
             for (let i = 0; i <= 6; i++) {
                 let p = currentPits[i];
                 if (p.isKasi) continue;
                 if (currentPStash.length >= 12) {
                     p.seeds = currentPStash.splice(0, 12);
                 } else {
                     p.isRubbish = true;
                     p.seeds = [];
                 }
                 setPits([...currentPits]);
                 setStash([...currentPStash]);
                 if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 400));
             }
             
             for (let i = 7; i <= 13; i++) {
                 let p = currentPits[i];
                 if (p.isKasi) continue;
                 if (currentEStash.length >= 12) {
                     p.seeds = currentEStash.splice(0, 12);
                 } else {
                     p.isRubbish = true;
                     p.seeds = [];
                 }
                 setPits([...currentPits]);
                 setEnemyStash([...currentEStash]);
                 if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 400));
             }
             
             if (!skipRef.current) await new Promise(resolve => setTimeout(resolve, 1500));
             setTransitionPhase('none');
             
             if (currentPStash.length < 12 && currentPits.filter(p => p.id <= 6 && !p.isKasi && !p.isRubbish).length === 0) {
                 setGameOverReason('Bankrupt! You ran out of seeds.');
                 setRoute('gameover');
                 return;
             }
             if (currentEStash.length < 12 && currentPits.filter(p => p.id >= 7 && p.id <= 13 && !p.isKasi && !p.isRubbish).length === 0) {
                 setGameOverReason('Victory! The opponent ran out of seeds.');
                 setRoute('gameover');
                 return;
             }
             
             setAnteIdx(nextAnteIdx);
             setBlindIdx(nextBlindIdx);
             setBlindScore(0);
             setSowsLeft(4);
             setRoute('game');
             startBlind();
         };
         
         doTransition();
         return;
     }
     
     setAnteIdx(nextAnteIdx);
     setBlindIdx(nextBlindIdx);
     setBlindScore(0);
     setSowsLeft(4);
     setRoute('game');
     startBlind();
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
             <div className="absolute inset-0 bg-[#050505] z-0"></div>
             <div className="absolute top-8 right-8 z-20">
                <button onClick={() => setIsHelpOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-white/50 text-white/70 hover:text-white rounded uppercase font-mono text-sm transition-colors">
                  <HelpCircle className="w-4 h-4" /> How to Play
                </button>
             </div>
             <div className="z-10 flex flex-col items-center gap-6">
                <h1 className="text-6xl md:text-[8rem] font-display text-white mb-2 tracking-[-0.02em]">PALLANTRO</h1>
                <button onClick={startGame} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded font-display uppercase tracking-wider text-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-1 mt-8">
                   BEGIN_SOWING
                </button>
             </div>
          </motion.div>
        )}

        {route === 'game' && currentBlind && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col py-6 px-4 md:px-8 max-w-[1024px] mx-auto w-full">
            
            <AnimatePresence>
              {tossPhase === 'tossing' && transitionPhase === 'none' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                   <div className="flex flex-col items-center">
                       <h2 className="text-4xl font-display text-white mb-4 animate-pulse">TOSSING COWRY SHELLS...</h2>
                   </div>
                </motion.div>
              )}
              {transitionPhase !== 'none' && (
                <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-[#111] border-2 border-white/20 px-8 py-4 rounded shadow-2xl flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-display text-white animate-pulse uppercase">
                        {transitionPhase === 'collecting' ? 'RECONCILING SEEDS...' : 'REFILLING BOARD...'}
                    </h2>
                    <button onClick={() => { skipRef.current = true; }} className="text-xs font-mono text-white/50 hover:text-white uppercase px-4 py-2 border border-white/10 hover:border-white/30 rounded">
                       Skip Animation
                    </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showScoreInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                   <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#111] border border-white/10 rounded overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl relative">
                      <div className="bg-[#1a1a1a] px-6 py-4 border-b border-white/10 flex justify-between items-center sticky top-0">
                          <span className="font-mono text-white/50 uppercase">Score Info</span>
                          <button onClick={() => setShowScoreInfo(false)} className="text-white hover:text-rose-400 font-bold transition-colors w-6 h-6 flex items-center justify-center">×</button>
                      </div>
                      <div className="overflow-y-auto divide-y divide-white/5 flex-1 p-0">
                         {turnHistory.length === 0 ? (
                             <div className="p-8 text-center text-white/30 font-mono text-sm uppercase">No turns completed yet.</div>
                         ) : (
                             turnHistory.map((turn, i) => (
                                 <div key={i} className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                     <div className="flex items-center gap-4">
                                         <div className="bg-blue-500/20 text-blue-400 font-mono text-xs px-2 py-1 rounded">Turn {i + 1}</div>
                                         <div className="font-mono text-sm">
                                             <span className="text-white/50 uppercase">Chips: </span>
                                             <span className="text-white">{turn.chips.toLocaleString()}</span>
                                         </div>
                                         <div className="font-mono text-sm">
                                             <span className="text-white/50 uppercase">Mult: </span>
                                             <span className="text-rose-400">{turn.mult}x</span>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-6">
                                         <div className="font-mono text-sm flex flex-col md:items-end">
                                             <span className="text-white/50 uppercase text-[10px]">Stash Bonus</span>
                                             <span className="text-green-400">+{turn.stashBonus.toLocaleString()}</span>
                                         </div>
                                         <div className="flex flex-col items-end">
                                             <span className="text-white/30 text-[10px] font-mono tracking-tighter">({turn.chips}×{turn.mult})+{turn.stashBonus}</span>
                                             <div className="font-display text-2xl text-blue-400 w-24 text-right">
                                                 {turn.finalScore.toLocaleString()}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))
                         )}
                      </div>
                      <div className="bg-[#1a1a1a] px-6 py-4 border-t border-white/10 flex justify-between items-center sticky bottom-0 mt-auto">
                          <span className="font-mono text-white/50 uppercase">Total Score</span>
                          <span className="font-display text-4xl text-blue-500">{blindScore.toLocaleString()}</span>
                      </div>
                   </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4 relative z-10">
               <div className="flex flex-col">
                  <div className="flex items-center gap-4 mb-2">
                     <span className="font-mono text-blue-500 text-sm tracking-widest uppercase">RUNNING_BLIND // ANTE_{currentAnte.ante < 10 ? `0${currentAnte.ante}` : currentAnte.ante}</span>
                     <button onClick={() => setIsHelpOpen(true)} className="flex items-center gap-2 px-3 py-1 border border-white/20 hover:border-white/50 text-white/70 hover:text-white rounded uppercase font-mono text-[10px] transition-colors pointer-events-auto" title="How to Play">
                       <HelpCircle className="w-3 h-3" /> How to Play
                     </button>
                  </div>
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
                  <button onClick={() => setFastMode(!fastMode)} className={`mt-2 font-mono text-xs px-2 py-1 rounded border transition-colors ${fastMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-transparent text-white/50 border-white/20 hover:text-white'}`}>
                      {fastMode ? '>> FAST SOW' : 'NORMAL SOW'}
                  </button>
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
               <div className="w-full flex justify-between items-center mb-4 px-8">
                  <div className="flex items-center gap-4 text-white/50 font-mono text-sm uppercase">
                      Enemy Stash: <span className="text-white text-xl">{enemyStash.length}</span>
                  </div>
                  {activePlayer === 'enemy' && tossPhase === 'done' && (
                      <div className="text-rose-500 font-mono animate-pulse uppercase">Enemy is thinking...</div>
                  )}
               </div>
               
               <Board pits={pits} isSowing={isSowing} onPitClick={(id) => {
                   if (activePlayer === 'player' && tossPhase === 'done') runSow(id, false, pitsRef.current);
               }} onPasuTap={handlePasuTap} />

               <div className="w-full flex justify-between items-center mt-4 px-8">
                  <div className="flex items-center gap-4 text-white/50 font-mono text-sm uppercase">
                      Player Stash: <span className="text-blue-400 text-xl">{stash.length}</span>
                  </div>
                  {activePlayer === 'player' && tossPhase === 'done' && !isSowing && (
                      <div className="text-blue-400 font-mono animate-pulse uppercase">Your Turn</div>
                  )}
               </div>
            </main>
            
            <footer className="flex flex-col md:flex-row items-center gap-8 border-t border-white/10 pt-8 mt-12 mb-4">
              <div className="flex-1 flex flex-col w-full h-24 justify-center">
                 {isSowing && activePlayer === 'player' ? (
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
                       <div className="flex flex-col items-end relative group">
                          <div className="flex items-center gap-2 mb-1">
                             <button onClick={() => setShowScoreInfo(true)} className="text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">i</button>
                             <span className="font-mono text-xs opacity-50 uppercase">Total Score</span>
                          </div>
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

        {route === 'ante_summary' && (
          <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto">
             <h2 className="text-4xl md:text-6xl font-display text-blue-500 mb-8 uppercase text-center">Blind Cleared!</h2>
             
             <div className="w-full bg-[#111] border border-white/10 rounded overflow-hidden mb-8">
                <div className="bg-[#1a1a1a] px-6 py-4 border-b border-white/10 flex justify-between items-center">
                    <span className="font-mono text-white/50 uppercase">Turn History</span>
                    <span className="font-mono text-white/50 uppercase">Target: {currentBlind?.target.toLocaleString()}</span>
                </div>
                <div className="divide-y divide-white/5">
                   {turnHistory.map((turn, i) => (
                       <div key={i} className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                           <div className="flex items-center gap-4">
                               <div className="bg-blue-500/20 text-blue-400 font-mono text-xs px-2 py-1 rounded">Turn {i + 1}</div>
                               <div className="font-mono text-sm">
                                   <span className="text-white/50 uppercase">Chips: </span>
                                   <span className="text-white">{turn.chips.toLocaleString()}</span>
                               </div>
                               <div className="font-mono text-sm">
                                   <span className="text-white/50 uppercase">Mult: </span>
                                   <span className="text-rose-400">{turn.mult}x</span>
                               </div>
                           </div>
                           <div className="flex items-center gap-6">
                               <div className="font-mono text-sm flex flex-col md:items-end">
                                   <span className="text-white/50 uppercase text-[10px]">Stash Bonus</span>
                                   <span className="text-green-400">+{turn.stashBonus.toLocaleString()}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                   <span className="text-white/30 text-[10px] font-mono tracking-tighter">({turn.chips}×{turn.mult})+{turn.stashBonus}</span>
                                   <div className="font-display text-2xl text-blue-400 w-32 text-right">
                                       {turn.finalScore.toLocaleString()}
                                   </div>
                               </div>
                           </div>
                       </div>
                   ))}
                </div>
                <div className="bg-[#1a1a1a] px-6 py-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-mono text-white/50 uppercase">Total Score</span>
                    <span className="font-display text-4xl text-blue-500">{blindScore.toLocaleString()}</span>
                </div>
             </div>

             <button onClick={() => setRoute('shop')} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded font-display uppercase text-2xl transition-transform hover:-translate-y-1 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                 CONTINUE TO SHOP
             </button>
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
          <motion.div key="gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
             <h1 className="text-6xl md:text-[8rem] font-display text-rose-500 mb-6 drop-shadow-md">RUN ENDED</h1>
             <p className="text-2xl text-white/70 font-mono mb-2 uppercase">{gameOverReason}</p>
             <p className="text-2xl text-blue-400 font-mono mb-2 uppercase">Final Score // {score.toLocaleString()}</p>
             <p className="text-white/30 font-mono uppercase mb-8">Ante 0{currentAnte?.ante || 8}</p>
             <button onClick={startGame} className="px-8 py-4 bg-[#1a1a1a] border border-white/20 hover:border-white/40 text-white rounded font-display uppercase text-2xl transition-colors">
                 TRY AGAIN
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
