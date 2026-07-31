import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { playLeverOn } from '../utils/audio';

interface SlotLeverProps {
  onTrigger: () => void;
  disabled: boolean;
  compact?: boolean;
}

export default function SlotLever({ onTrigger, disabled, compact = false }: SlotLeverProps) {
  const [isLeverActive, setIsLeverActive] = useState(false);
  const dragY = useMotionValue(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Translate vertical drag into elegant angular rotation for 3D physics effect
  const rotateX = useTransform(dragY, [0, 80], [0, 50]);
  const ballY = useTransform(dragY, [0, 80], [0, 25]);
  const shaftScaleY = useTransform(dragY, [0, 80], [1, 0.7]);

  // Handle manual tap/click (automates pulling)
  const handleTap = () => {
    if (disabled) return;
    setIsLeverActive(true);
    playLeverOn();
    onTrigger();

    // Reset back with physics bounce
    setTimeout(() => {
      setIsLeverActive(false);
    }, 150);
  };

  // Handle physical drag completion
  const handleDragEnd = (_event: any, info: any) => {
    if (disabled) {
      dragY.set(0);
      return;
    }

    if (info.offset.y > 45) {
      // Lever fully pulled!
      playLeverOn();
      onTrigger();
    }
    // Return with bounce
    dragY.set(0);
  };

  const containerWidth = compact ? 'w-20 h-36' : 'w-28 h-56';

  return (
    <div 
      ref={constraintsRef} 
      className={`relative flex flex-col items-center justify-center select-none ${containerWidth}`}
      id="slot-lever-container"
    >
      {/* 3D Base Attachment Cover */}
      <div className={`absolute rounded-full bg-slate-800 border-4 border-slate-700 shadow-inner flex items-center justify-center ${compact ? 'w-16 h-16' : 'w-20 h-20'}`}>
        <div className={`rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-lg ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
          {/* Neon core indicator */}
          <div className={`rounded-full transition-all duration-300 ${compact ? 'w-5 h-5' : 'w-6 h-6'} ${
            disabled 
              ? 'bg-red-950/40 border border-red-900/50' 
              : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] border border-emerald-300 animate-pulse'
          }`} />
        </div>
      </div>

      {/* Lever components: Shaft & Ball */}
      <div className="absolute w-full h-full flex flex-col items-center justify-start pt-2 z-10">
        <motion.div
          drag={disabled ? false : "y"}
          dragConstraints={{ top: 0, bottom: 65 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ y: dragY }}
          animate={isLeverActive ? { y: 60 } : { y: 0 }}
          transition={{ type: "spring", stiffness: 450, damping: 14 }}
          className={`flex flex-col items-center cursor-grab active:cursor-grabbing ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          id="lever-interactive-arm"
        >
          {/* Outer Ball (Sphere Knob) - Red gloss design */}
          <motion.div 
            style={{ y: ballY }}
            onClick={handleTap}
            className={`rounded-full relative flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.5),inset_0_-8px_16px_rgba(0,0,0,0.4),inset_0_8px_16px_rgba(255,255,255,0.4)] border border-amber-700 transition-all duration-200 cursor-pointer ${
              compact ? 'w-16 h-16' : 'w-20 h-20'
            } ${
              disabled 
                ? 'bg-gradient-to-b from-amber-900 to-amber-950 shadow-none' 
                : 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 hover:scale-105 active:scale-95'
            }`}
          >
            {/* Highlight Flare */}
            <div className="absolute top-1.5 left-2 w-3 h-3 rounded-full bg-white/40 blur-xs pointer-events-none" />
            <span className="text-[8px] font-black text-amber-950 font-mono tracking-tighter drop-shadow-sm select-none">
              LEVER
            </span>
          </motion.div>

          {/* Metal Shaft (Stem) */}
          <motion.div 
            style={{ 
              rotateX: rotateX, 
              scaleY: shaftScaleY,
              transformOrigin: "bottom center"
            }}
            className={`bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400 shadow-[2px_0_5px_rgba(0,0,0,0.3)] mt-[-4px] rounded-b-md ${
              compact ? 'w-3.5 h-16' : 'w-4 h-28'
            }`}
          />
        </motion.div>
      </div>

      {/* Decorative Pull Direction Label */}
      <div className="absolute bottom-0 bg-slate-900/90 py-0.5 px-2 rounded-full border border-slate-700/60 pointer-events-none">
        <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-300 uppercase">
          {disabled ? 'LOCKED' : 'TAP / PULL'}
        </span>
      </div>
    </div>
  );
}
