import React, { useEffect, useState } from 'react';
import { Pit as PitType } from '../types';
import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';
import { initAudio } from '../engine/audio';

const SEED_COLORS = {
  normal: 'bg-amber-600',
  palingu: 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]',
  irumbu: 'bg-slate-400',
  thangam: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
};

const Pit = ({ pit, onClick, isSowing }: { pit: PitType, onClick: () => void, isSowing: boolean, key?: React.Key }) => {
  const [burst, setBurst] = useState(false);
  
  useEffect(() => {
    if (pit.seeds.length > 0) {
      setBurst(true);
      const to = setTimeout(() => setBurst(false), 200);
      return () => clearTimeout(to);
    }
  }, [pit.seeds.length]);

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        initAudio();
        onClick();
      }}
      disabled={pit.isRubbish || (!isSowing && (pit.seeds.length === 0 || pit.isKasi || pit.id > 6))}
      className={`relative w-14 sm:w-16 md:w-20 lg:w-24 aspect-[1/1.2] border-4 rounded-[20px] flex flex-col items-center justify-center p-2 transition-all overflow-hidden
        ${pit.isRubbish ? 'bg-[#111] border-dashed border-[#333] opacity-30 select-none pointer-events-none' : 'bg-gradient-to-br from-[#0f0f0f] to-[#080808]'}
        ${(!pit.isRubbish && !isSowing && pit.seeds.length > 0 && pit.id <= 6 && !pit.isKasi) ? 'hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] cursor-pointer pit-active' : 'cursor-pointer'}
        ${!pit.isRubbish && pit.isKasi ? (
           pit.claimedBy === 'player' ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-gradient-to-br from-[#0a1128] to-[#040814]' :
           pit.claimedBy === 'enemy' ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-gradient-to-br from-[#280a11] to-[#140408]' :
           pit.claimedBy === 'both' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-gradient-to-br from-[#1a0a28] to-[#0d0414]' :
           'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-gradient-to-br from-[#1a1400] to-[#0a0800]'
        ) : (!pit.isRubbish ? 'border-[#1a1a1a]' : '')}
      `}
    >
      {pit.isRubbish && <div className="absolute inset-0 flex items-center justify-center text-[#333] text-4xl">✕</div>}
      {!pit.isRubbish && (
         <div className={`absolute inset-0 flex items-center justify-center font-display uppercase tracking-[-0.02em] ${pit.seeds.length > 20 ? 'text-4xl' : 'text-5xl'} ${pit.isKasi ? 'text-yellow-500' : pit.id <= 6 ? 'text-blue-400' : 'text-white'} pointer-events-none z-20 mix-blend-screen drop-shadow-md`}>
           {pit.seeds.length}
         </div>
      )}
      {!pit.isRubbish && pit.isKasi && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none z-30 shadow-lg">
            <span className={`font-mono text-[10px] md:text-[12px] font-black tracking-widest uppercase px-2 py-1 rounded shadow-xl ${
               pit.claimedBy === 'player' ? 'bg-blue-500 text-black' :
               pit.claimedBy === 'enemy' ? 'bg-rose-500 text-black' :
               pit.claimedBy === 'both' ? 'bg-purple-500 text-white' :
               'bg-yellow-500 text-black absolute top-[-60px]'
            }`}>
               {pit.claimedBy === 'both' ? 'SPLIT!' : pit.claimedBy === 'player' ? 'PLAYER!' : pit.claimedBy === 'enemy' ? 'ENEMY!' : 'KASI'}
            </span>
         </div>
      )}

      <motion.div animate={{ scale: burst ? 1.1 : 1 }} className="flex flex-wrap gap-[2px] w-full h-full justify-center items-center overflow-hidden opacity-30 pointer-events-none">
        {pit.seeds.map((s, i) => (
           <div 
             key={i}
             className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${SEED_COLORS[s.type]}`}
           />
        ))}
      </motion.div>
    </motion.button>
  );
};

export const Board = ({ pits, isSowing, onPitClick, onPasuTap }: { pits: PitType[], isSowing: boolean, onPitClick: (i: number) => void, onPasuTap: (i: number) => void }) => {
   const topRow = pits.slice(7, 14).reverse();
   const bottomRow = pits.slice(0, 7);

   return (
     <div className="flex flex-col gap-6 sm:gap-10 w-full max-w-[1024px] mx-auto items-center justify-center py-8">
        <div className="flex gap-2 sm:gap-3 w-full justify-center relative px-2">
            {topRow.map(pit => (
               <Pit key={pit.id} pit={pit} isSowing={isSowing} onClick={() => pit.pasuActive ? onPasuTap(pit.id) : (!isSowing ? onPitClick(pit.id) : null)} />
            ))}
        </div>
        <div className="flex gap-2 sm:gap-3 w-full justify-center relative px-2">
            {bottomRow.map(pit => (
               <Pit key={pit.id} pit={pit} isSowing={isSowing} onClick={() => pit.pasuActive ? onPasuTap(pit.id) : (!isSowing ? onPitClick(pit.id) : null)} />
            ))}
        </div>
     </div>
   );
};
