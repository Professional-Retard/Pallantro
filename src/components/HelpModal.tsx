import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <h2 className="text-2xl font-display text-white uppercase flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-400" />
                How to Play
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-sans text-white/80 space-y-8 custom-scrollbar">
              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Goal of the Game</h3>
                <p className="leading-relaxed">
                  Beat each blind's target score by accumulating enough Chips multiplied by your Mult. 
                  You play by "sowing" seeds around the board, originating from the traditional game of Ali Guli Mane.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">The Board</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li>The board has 14 pits total: 7 on your side (bottom) and 7 on the opponent's side (top).</li>
                  <li>At the start of an Ante, each active pit is filled with 12 seeds.</li>
                  <li>The middle pits (pit 3 for you, pit 10 for the opponent) are special "Kasi" pits. They start empty.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Sowing Rules</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li>When it's your turn, click one of your non-empty pits to pick up all its seeds and start sowing them counter-clockwise, one seed per pit.</li>
                  <li>If the last seed falls into a non-empty pit, you immediately pick up all seeds in that pit and continue sowing.</li>
                  <li>If the last seed falls into an empty pit, your turn ends.</li>
                  <li><strong>Capturing:</strong> If the empty pit you landed in was next to an opponent's pit that contains seeds, you capture all seeds in that opponent's pit and add them to your score.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Kasi (Safe Havens)</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li>Seeds dropped into Kasi pits are safe and can never be picked up to continue sowing.</li>
                  <li>If your last seed falls into a Kasi pit, you do not pick up its seeds. Your turn ends.</li>
                  <li>If you drop a seed into a Kasi pit during your turn, it belongs to you. If both players have dropped seeds into a Kasi pit, it becomes neutral and seeds are split equally at the end of the Ante.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Pasu (Cows)</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li>When a pit accumulates exactly 4 seeds during a turn, it becomes a "Pasu" (Cow).</li>
                  <li>Pasu pits belong to whoever formed them, but can be claimed if someone else lands their last seed there.</li>
                  <li>During an opponent's turn, if they have an active Pasu pit, you can tap it to steal some Mult or Chips!</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Scoring</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li><strong>Chips:</strong> Base points earned during your turn (e.g., from capturing seeds).</li>
                  <li><strong>Mult:</strong> The multiplier applied to your chips. Starts at 1x. Increases during long sowing chains or by capturing Pasu.</li>
                  <li><strong>Stash Bonus:</strong> Extra points added based on the total number of seeds you have securely stored in your stash or captured this turn.</li>
                  <li><strong>Final Score:</strong> <code>(Chips × Mult) + Stash Bonus</code></li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-display text-blue-400 uppercase mb-3">Ante Reset</h3>
                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                  <li>At the end of an Ante, all seeds on your side (plus your share of the Kasi pits) go into your stash.</li>
                  <li>Then, your pits are refilled using seeds from your stash. <strong>Each pit requires exactly 12 seeds.</strong></li>
                  <li>If you don't have enough seeds to fill a pit with 12, that pit becomes "rubbish" and is unusable for the rest of the game!</li>
                  <li>Any leftover seeds stay in your stash to provide a Stash Bonus.</li>
                </ul>
              </section>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-black/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-display uppercase transition-colors"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
