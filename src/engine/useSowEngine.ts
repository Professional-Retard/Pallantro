import React, { useRef, useState, useEffect } from 'react';
import { Pit, Seed, Talisman } from '../types';
import { getNextValidPit } from './logic';
import { initAudio, playClack, playCapture, playPasu } from './audio';

export const useSowEngine = (
  pits: Pit[], 
  setPits: React.Dispatch<React.SetStateAction<Pit[]>>,
  stash: Seed[], 
  setStash: React.Dispatch<React.SetStateAction<Seed[]>>,
  talismans: Talisman[],
  permanentMult: number,
  setPermanentMult: (m: (prev: number) => number) => void,
  addGold: (g: number) => void,
  onSowComplete: (score: number) => void
) => {
  const [isSowing, setIsSowing] = useState(false);
  const [turnChips, setTurnChips] = useState(0);
  const [turnMult, setTurnMult] = useState(1);
  const [handSize, setHandSize] = useState(0);

  const turnRef = useRef({
     localPits: [] as Pit[],
     chips: 0,
     mult: 1,
     pasuTaps: [] as number[],
     isSitharalAvailable: false,
     talismans: [] as string[]
  });

  useEffect(() => {
     turnRef.current.talismans = talismans.map(t => t.id);
  }, [talismans]);

  const handlePasuTap = (pitId: number) => {
      const pit = turnRef.current.localPits[pitId];
      if (pit && pit.pasuActive && !pit.isKasi) {
          pit.pasuActive = false; 
          turnRef.current.pasuTaps.push(pitId);
          
          const captured = [...pit.seeds];
          setStash(s => [...s, ...captured]);
          pit.seeds = [];
          
          playPasu();
          setPits([...turnRef.current.localPits]);
      }
  };

  const runSow = async (startIndex: number) => {
      if (isSowing) return;
      initAudio();
      setIsSowing(true);
      
      let localPits = pits.map(p => ({ ...p, seeds: [...p.seeds], pasuActive: false }));
      turnRef.current.localPits = localPits;
      turnRef.current.chips = 0;
      turnRef.current.mult = 1;
      turnRef.current.pasuTaps = [];
      turnRef.current.isSitharalAvailable = turnRef.current.talismans.includes('t_sitharal');
      let pitchStep = 0;

      let hand = [...localPits[startIndex].seeds];
      localPits[startIndex].seeds = [];
      setHandSize(hand.length);
      
      if (turnRef.current.talismans.includes('t_kalasam') && startIndex % 2 !== 0) {
          turnRef.current.chips += 50;
      }

      let currIdx = startIndex;
      let speed = 250; 

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      while(hand.length > 0) {
          await sleep(speed);
          
          while(turnRef.current.pasuTaps.length > 0) {
              const tappedId = turnRef.current.pasuTaps.shift()!;
              turnRef.current.mult *= 1.5;
              if (turnRef.current.talismans.includes('t_aayar')) turnRef.current.mult += 4;
          }

          currIdx = getNextValidPit(currIdx, localPits);
          const droppedSeed = hand.pop()!;
          setHandSize(hand.length);

          playClack(pitchStep);
          pitchStep++;

          let currentSeeds = [...localPits[currIdx].seeds, droppedSeed];

          let dropChips = (currIdx >= 7 && currIdx <= 13) && turnRef.current.talismans.includes('t_charal') ? 25 : 10;
          
          if (droppedSeed.type === 'palingu') {
              turnRef.current.mult *= 2;
              if (Math.random() < 0.2) {
                  currentSeeds.pop(); 
              }
          }

          if (droppedSeed.type === 'thangam' && localPits[currIdx].isKasi) {
              addGold(1);
          }

          turnRef.current.chips += dropChips;

          if (currentSeeds.length === 4 && !localPits[currIdx].isKasi) {
              localPits[currIdx].pasuActive = true;
          } else {
              localPits[currIdx].pasuActive = false;
          }

          localPits[currIdx].seeds = currentSeeds;
          setPits([...localPits]); 
          setTurnChips(turnRef.current.chips);
          setTurnMult(turnRef.current.mult);

          if (hand.length === 0) {
              await sleep(speed + 150); 
              
              if (currentSeeds.length > 1) {
                  turnRef.current.mult += 1;
                  hand = [...currentSeeds];
                  localPits[currIdx].seeds = [];
                  localPits[currIdx].pasuActive = false; 
                  setHandSize(hand.length);
                  speed = Math.max(80, speed * 0.9); 
              } else {
                  if (turnRef.current.isSitharalAvailable) {
                      turnRef.current.isSitharalAvailable = false;
                      hand = [...currentSeeds];
                      localPits[currIdx].seeds = [];
                      setHandSize(hand.length);
                      continue;
                  }

                  let nextPit = getNextValidPit(currIdx, localPits);
                  if (localPits[nextPit].seeds.length === 0) {
                      let capturePit = getNextValidPit(nextPit, localPits);
                      let captured = [...localPits[capturePit].seeds];
                      if (captured.length > 0) {
                          playCapture();
                          localPits[capturePit].seeds = [];
                          localPits[capturePit].pasuActive = false;
                          
                          setStash(s => [...s, ...captured]);
                          turnRef.current.chips += captured.length * 100;
                          turnRef.current.mult += captured.length * 5;

                          if (localPits[capturePit].isKasi) {
                              if (turnRef.current.talismans.includes('t_viyabari')) turnRef.current.mult *= 2;
                              turnRef.current.chips += 500;
                              setPermanentMult(m => m + 1);
                          }
                      }
                  }
              }
          }
      }

      for(let p of localPits) {
          p.pasuActive = false; 
          for(let s of p.seeds) {
              if (s.type === 'irumbu') turnRef.current.chips += 50;
          }
      }

      if (turnRef.current.talismans.includes('t_pannaiyar')) {
          let rubbishCount = localPits.filter(p => p.isRubbish).length;
          turnRef.current.mult *= Math.pow(1.2, rubbishCount);
      }

      setPits([...localPits]);
      setTurnChips(turnRef.current.chips);
      setTurnMult(turnRef.current.mult);

      const finalScore = turnRef.current.chips * (turnRef.current.mult + permanentMult);
      setIsSowing(false);
      onSowComplete(Math.floor(finalScore));
  };

  return { runSow, isSowing, turnChips, turnMult, handSize, handlePasuTap };
}
