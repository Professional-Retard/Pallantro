import React, { useRef, useState, useEffect } from 'react';
import { Pit, Seed, Talisman } from '../types';
import { getNextValidPit } from './logic';
import { initAudio, playClack, playCapture, playPasu } from './audio';

export const useSowEngine = (
  pits: Pit[], 
  setPits: React.Dispatch<React.SetStateAction<Pit[]>>,
  playerStash: Seed[], 
  setPlayerStash: React.Dispatch<React.SetStateAction<Seed[]>>,
  enemyStash: Seed[],
  setEnemyStash: React.Dispatch<React.SetStateAction<Seed[]>>,
  talismans: Talisman[],
  permanentMult: number,
  setPermanentMult: (m: (prev: number) => number) => void,
  addGold: (g: number) => void,
  onSowComplete: (details: {chips: number, mult: number, stashBonus: number, finalScore: number}, isEnemy: boolean) => void
) => {
  const [isSowing, setIsSowing] = useState(false);
  const [turnChips, setTurnChips] = useState(0);
  const [turnMult, setTurnMult] = useState(1);
  const [handSize, setHandSize] = useState(0);

  const pitsRef = useRef(pits);
  useEffect(() => { pitsRef.current = pits; }, [pits]);

  const turnRef = useRef({
     localPits: [] as Pit[],
     chips: 0,
     mult: 1,
     pasuTaps: [] as number[],
     talismans: [] as string[],
     isEnemyTurn: false,
     isRunning: false,
     capturedSeeds: 0
  });

  useEffect(() => {
     turnRef.current.talismans = talismans.map(t => t.id);
  }, [talismans]);

  const handlePasuTap = (pitId: number, isEnemy: boolean = false) => {
      let captured: Seed[] = [];
      
      if (turnRef.current.isRunning) {
          const pit = turnRef.current.localPits[pitId];
          if (pit && pit.pasuActive && !pit.isKasi) {
              pit.pasuActive = false;
              turnRef.current.pasuTaps.push(pitId);
              captured = [...pit.seeds];
              pit.seeds = [];
              setPits([...turnRef.current.localPits]);
          }
      } else {
          const currentPits = pitsRef.current;
          const pit = currentPits[pitId];
          if (pit && pit.pasuActive && !pit.isKasi) {
              const newPits = currentPits.map(p => ({...p, seeds: [...p.seeds]}));
              newPits[pitId].pasuActive = false;
              captured = [...newPits[pitId].seeds];
              newPits[pitId].seeds = [];
              setPits(newPits);
          }
      }
      
      if (captured.length > 0) {
          if (isEnemy) {
              setEnemyStash(s => [...s, ...captured]);
          } else {
              setPlayerStash(s => [...s, ...captured]);
          }
          playPasu();
      }
  };

  const runSow = async (startIndex: number, isEnemy: boolean = false, overridePits?: Pit[]) => {
      if (turnRef.current.isRunning) return;
      turnRef.current.isRunning = true;
      initAudio();
      setIsSowing(true);
      
      turnRef.current.isEnemyTurn = isEnemy;
      const startingPits = overridePits || pitsRef.current;
      let localPits = startingPits.map(p => ({ ...p, seeds: [...p.seeds], pasuActive: false }));
      turnRef.current.localPits = localPits;
      turnRef.current.chips = 0;
      turnRef.current.mult = 1;
      turnRef.current.pasuTaps = [];
      turnRef.current.capturedSeeds = 0;
      let pitchStep = 0;

      let hand = [...localPits[startIndex].seeds];
      localPits[startIndex].seeds = [];
      setHandSize(hand.length);
      
      if (!isEnemy && turnRef.current.talismans.includes('t_kalasam') && startIndex % 2 !== 0) {
          turnRef.current.chips += 50;
      }

      if (!isEnemy && turnRef.current.talismans.includes('t_mystery')) {
          turnRef.current.mult += Math.floor(Math.random() * 10) + 1; // 1 to 10 extra mult
      }

      let currIdx = startIndex;
      let speed = 400; 
      if (turnRef.current.talismans.includes('skip_animation')) {
          speed = 0;
      }

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      while(hand.length > 0) {
          await sleep(speed);
          
          while(turnRef.current.pasuTaps.length > 0) {
              const tappedId = turnRef.current.pasuTaps.shift()!;
              if (!isEnemy) {
                  turnRef.current.mult *= 1.5;
                  if (turnRef.current.talismans.includes('t_aayar')) turnRef.current.mult += 1;
              }
          }

          currIdx = getNextValidPit(currIdx, localPits);
          const droppedSeed = hand.pop()!;
          setHandSize(hand.length);

          playClack(pitchStep);
          pitchStep++;

          let currentSeeds = [...localPits[currIdx].seeds, droppedSeed];

          let dropChips = (currIdx >= 7 && currIdx <= 13) && turnRef.current.talismans.includes('t_saaral') ? 25 : 10;
          
          if (!isEnemy && droppedSeed.type === 'palingu') {
              turnRef.current.mult *= 2;
          }

          if (!isEnemy && droppedSeed.type === 'thangam' && localPits[currIdx].isKasi) {
              addGold(1);
          }

          if (!isEnemy) turnRef.current.chips += dropChips;

          if (currentSeeds.length === 4 && !localPits[currIdx].isKasi) {
              localPits[currIdx].pasuActive = true;
          } else {
              localPits[currIdx].pasuActive = false;
          }

          localPits[currIdx].seeds = currentSeeds;
          setPits([...localPits]); 
          if (!isEnemy) {
              setTurnChips(turnRef.current.chips);
              setTurnMult(turnRef.current.mult);
          }

          if (hand.length === 0) {
              await sleep(speed + 150); 
              
              let nextPit = getNextValidPit(currIdx, localPits);
              
              if (localPits[nextPit].seeds.length === 0) {
                  // Capture!
                  let capturePit = getNextValidPit(nextPit, localPits);
                  
                  if (localPits[capturePit].isKasi) {
                      const claimedBy = localPits[capturePit].claimedBy;
                      const activeType = isEnemy ? 'enemy' : 'player';
                      if (!claimedBy) {
                          localPits[capturePit].claimedBy = activeType;
                      } else if (claimedBy !== activeType) {
                          localPits[capturePit].claimedBy = 'both';
                      }
                      playCapture();
                      
                      if (!isEnemy) {
                          if (turnRef.current.talismans.includes('t_kasi_greed')) turnRef.current.mult *= 3;
                          turnRef.current.chips += 500;
                          setPermanentMult(m => m + 1);
                      } else {
                          if (turnRef.current.talismans.includes('t_kasi_greed')) {
                              setPlayerStash(s => s.slice(Math.floor(s.length * 0.1))); // lose 10% stash
                          }
                      }
                  } else {
                      let captured = [...localPits[capturePit].seeds];
                      if (captured.length > 0) {
                          playCapture();
                          localPits[capturePit].seeds = [];
                          localPits[capturePit].pasuActive = false;
                          
                          if (!isEnemy) {
                              setPlayerStash(s => [...s, ...captured]);
                              turnRef.current.capturedSeeds += captured.length;
                              let chipReward = captured.length * 50;
                              if (turnRef.current.talismans.includes('t_thief') && capturePit >= 7 && capturePit <= 13) {
                                  chipReward += captured.length * 100;
                              }
                              turnRef.current.chips += chipReward;
                              turnRef.current.mult += captured.length;
                          } else {
                              setEnemyStash(s => [...s, ...captured]);
                          }
                      }
                  }
              } else if (localPits[nextPit].isKasi) {
                  // If next pit is Kasi, we cannot pick it up. Turn ends.
                  break;
              } else {
                  // Pick up next pit and continue
                  if (!isEnemy) turnRef.current.mult += 1;
                  hand = [...localPits[nextPit].seeds];
                  localPits[nextPit].seeds = [];
                  localPits[nextPit].pasuActive = false;
                  setHandSize(hand.length);
                  currIdx = nextPit;
                  speed = Math.max(120, speed * 0.9);
                  if (turnRef.current.talismans.includes('skip_animation')) speed = 0;
                  continue;
              }
          }
      }

      for(let p of localPits) {
          p.pasuActive = false; 
          if (!isEnemy) {
              for(let s of p.seeds) {
                  if (s.type === 'irumbu') turnRef.current.chips += 50;
              }
          }
      }

      setPits([...localPits]);
      
      if (!isEnemy) {
          setTurnChips(turnRef.current.chips);
          setTurnMult(turnRef.current.mult);
          
          let stashBonus = (playerStash.length + turnRef.current.capturedSeeds) * 5;
          if (turnRef.current.talismans.includes('t_kuberan')) stashBonus *= 3;
          
          const calculatedChips = turnRef.current.chips;
          const calculatedMult = turnRef.current.mult + permanentMult;
          const finalScore = Math.floor(calculatedChips * calculatedMult) + stashBonus;

          turnRef.current.isRunning = false;
          setIsSowing(false);
          onSowComplete({
              chips: calculatedChips,
              mult: calculatedMult,
              stashBonus,
              finalScore
          }, isEnemy);
      } else {
          turnRef.current.isRunning = false;
          setIsSowing(false);
          onSowComplete({ chips: 0, mult: 0, stashBonus: 0, finalScore: 0 }, isEnemy);
      }
  };

  return { runSow, isSowing, turnChips, turnMult, handSize, handlePasuTap };
}
