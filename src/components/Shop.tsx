import React from 'react';
import { Talisman, SeedType } from '../types';
import { TALISMANS } from '../data';
import { motion } from 'motion/react';
import { Pickaxe, Sparkles } from 'lucide-react';

export const ShopUI = ({ 
  gold, 
  onBuyTalisman, 
  onBuyBlessing, 
  ownedTalismans 
}: { 
  gold: number; 
  onBuyTalisman: (t: Talisman) => void; 
  onBuyBlessing: (type: SeedType, amount: number, cost: number) => void;
  ownedTalismans: Talisman[];
}) => {
  const availableTalismans = TALISMANS.filter(t => !ownedTalismans.some(ot => ot.id === t.id));

  return (
    <div className="w-full max-w-4xl mx-auto p-8 border-[4px] border-[#1a1a1a] rounded-[20px] bg-gradient-to-br from-[#0f0f0f] to-[#080808] shadow-2xl flex flex-col gap-8">
      <div className="flex justify-between items-center border-b-[4px] border-[#1a1a1a] pb-6">
         <h2 className="text-4xl font-display text-white uppercase tracking-[0.02em] flex items-center gap-3"><Pickaxe className="text-blue-500" size={32} /> ANGADI_SHOP</h2>
         <div className="bg-white text-black px-4 py-2 flex gap-4 items-center">
             <span className="font-mono text-[10px] font-black tracking-widest">GOLD</span>
             <span className="font-display text-3xl">${gold}</span>
         </div>
      </div>

      <div className="flex flex-col gap-6">
        <h3 className="text-lg font-mono text-white/50 uppercase tracking-widest">Talismans // Max 05</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
           {availableTalismans.map(t => (
             <button 
               key={t.id} 
               disabled={gold < t.cost || ownedTalismans.length >= 5}
               onClick={() => onBuyTalisman(t)}
               className="flex flex-col p-4 bg-[#111] border-[2px] border-white/10 hover:border-blue-500 disabled:opacity-50 disabled:hover:border-white/10 text-left transition-colors rounded-sm group"
             >
               <div className="flex justify-between items-start w-full mb-4">
                 <span className="font-display text-2xl text-white group-hover:text-blue-400 leading-none">{t.name.split(' ')[0]}</span>
                 <span className="font-mono text-xl text-yellow-500">${t.cost}</span>
               </div>
               <span className="text-xs font-mono text-white/60">{t.description}</span>
             </button>
           ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-4 border-t-[4px] border-[#1a1a1a]">
        <h3 className="text-lg font-mono text-white/50 uppercase tracking-widest">Seed Alchemy // Blessings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <button disabled={gold < 15} onClick={() => onBuyBlessing('palingu', 3, 15)} className="flex flex-col p-4 bg-[#111] border-[2px] border-white/10 hover:border-blue-400 disabled:opacity-50 text-left rounded-sm group">
               <div className="flex justify-between items-start w-full mb-4">
                 <span className="font-display text-2xl text-blue-300 group-hover:text-white leading-none">PALINGU</span>
                 <span className="font-mono text-xl text-yellow-500">${15}</span>
               </div>
               <span className="text-xs font-mono text-white/60">Mutates 3 random normal seeds into Glass. (x2 Mult)</span>
             </button>
             
             <button disabled={gold < 20} onClick={() => onBuyBlessing('irumbu', 2, 20)} className="flex flex-col p-4 bg-[#111] border-[2px] border-white/10 hover:border-white/40 disabled:opacity-50 text-left rounded-sm group">
               <div className="flex justify-between items-start w-full mb-4">
                 <span className="font-display text-2xl text-white/70 group-hover:text-white leading-none">IRUMBU</span>
                 <span className="font-mono text-xl text-yellow-500">${20}</span>
               </div>
               <span className="text-xs font-mono text-white/60">Mutates 2 random normal seeds into Steel. (+50 Chips resting)</span>
             </button>

             <button disabled={gold < 25} onClick={() => onBuyBlessing('thangam', 1, 25)} className="flex flex-col p-4 bg-[#111] border-[2px] border-white/10 hover:border-yellow-400 disabled:opacity-50 text-left rounded-sm group">
               <div className="flex justify-between items-start w-full mb-4">
                 <span className="font-display text-2xl text-yellow-500 group-hover:text-white leading-none">THANGAM</span>
                 <span className="font-mono text-xl text-yellow-500">${25}</span>
               </div>
               <span className="text-xs font-mono text-white/60">Mutates 1 random normal seed into Gold. (+1 Gold on Kasi pass)</span>
             </button>
        </div>
      </div>
    </div>
  );
};
