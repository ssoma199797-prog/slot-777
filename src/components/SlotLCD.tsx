import { motion, AnimatePresence } from 'motion/react';
import { CutinEffect, EffectLevel, SlotState, MismatchType } from '../types';
import { Sparkles, Zap, Flame, Trophy, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

interface SlotLCDProps {
  state: SlotState;
  finalValue: number | null;
  currentEffect: CutinEffect | null;
  activeCutinVisible: boolean;
  minLimit: number;
  maxLimit: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  history: { value: number; levelUsed?: string }[];
  mismatchType?: MismatchType;
}

export default function SlotLCD({
  state,
  finalValue,
  currentEffect,
  activeCutinVisible,
  minLimit,
  maxLimit,
  soundEnabled,
  onToggleSound,
  history,
  mismatchType,
}: SlotLCDProps) {
  
  // Custom helper to decide result overlay text and style based on value
  const getResultStyle = (val: number) => {
    if (val <= 10) {
      return {
        title: 'GOD DRAW 🎰',
        colorClass: 'gradient-rainbow font-extrabold',
        icon: <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />,
        badge: 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)]'
      };
    } else if (val <= 30) {
      return {
        title: 'SUPER HOT 🔥',
        colorClass: 'gradient-gold font-bold',
        icon: <Flame className="w-8 h-8 text-orange-500 animate-pulse" />,
        badge: 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
      };
    } else if (val <= 50) {
      return {
        title: 'CHANCE SPEED ⚡',
        colorClass: 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)] font-bold',
        icon: <Zap className="w-8 h-8 text-sky-400 animate-pulse" />,
        badge: 'bg-sky-950 border border-sky-400 text-sky-300'
      };
    } else if (val <= 100) {
      return {
        title: 'GOOD CHANCE 👍',
        colorClass: 'text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] font-bold',
        icon: <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />,
        badge: 'bg-indigo-950 border border-indigo-400 text-indigo-300'
      };
    }
    return {
      title: 'COMPLETE',
      colorClass: 'text-slate-300',
      icon: <Sparkles className="w-8 h-8 text-slate-400" />,
      badge: 'bg-slate-800 text-slate-400'
    };
  };

  const stoppedResult = finalValue !== null && state === 'completed' ? getResultStyle(finalValue) : null;

  return (
    <div 
      className={`relative w-full h-40 sm:h-52 rounded-3xl overflow-hidden shadow-[inset_0_4px_24px_rgba(0,0,0,0.9),0_10px_30px_rgba(0,0,0,0.6)] flex flex-col justify-between p-2.5 sm:p-4 scanline-overlay font-sans select-none transition-all duration-300 ${
        mismatchType === 'lcd_invert' 
          ? 'bg-emerald-400 border-4 border-emerald-500 shadow-[0_0_25px_rgba(52,211,153,0.7)] invert text-slate-950' 
          : 'bg-slate-950 border-4 border-slate-800 text-slate-100'
      } ${
        activeCutinVisible && currentEffect?.animationStyle === 'shake' ? 'animate-shake' : ''
      }`}
      id="slot-pachislot-lcd"
    >
      {/* 1. Technical Grid / Background layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.6)_0%,rgba(2,4,12,0.9)_100%)] z-1" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none z-1" />

      {/* 2. Top Header Stat Bar */}
      <div className="flex justify-between items-center z-10 w-full" id="lcd-h-bar">
        <div className="flex items-center gap-2">
          {/* Active status indicator */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800/60 font-mono text-[9px] uppercase tracking-wider text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${state === 'spinning' ? 'bg-orange-500 animate-ping' : state === 'rewrite_pending' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            {state === 'spinning' ? 'SPINNING' : state === 'rewrite_pending' ? 'REWRITE' : 'READY'}
          </div>
          <div className="hidden sm:flex items-center bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800/60 font-mono text-[9px] text-slate-500">
            LIMIT: <span className="text-sky-400 font-bold ml-1">{minLimit}-{maxLimit}</span>
          </div>
        </div>

        {/* Global Sound Control Trigger */}
        <button
          onClick={onToggleSound}
          className={`flex items-center justify-center p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
            soundEnabled 
              ? 'bg-sky-950/80 border-sky-600/50 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)] hover:bg-sky-900' 
              : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:bg-slate-800'
          }`}
          title={soundEnabled ? 'ミュートする' : '音声を有効化'}
          id="sound-opt-toggle"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. Center Screen Arena */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full my-1" id="lcd-display-viewport">
        
        {/* State A: Idle display */}
        {state === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center flex flex-col items-center justify-center h-full"
            id="idle-stage-visual"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-sky-500/20 flex items-center justify-center bg-sky-950/10 mb-1.5 relative">
              {/* Outer glowing rings */}
              <div className="absolute inset-0 rounded-full border border-t-sky-400/30 border-r-transparent border-b-sky-400/30 border-l-transparent animate-spin" />
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 animate-pulse" />
            </div>
            
            <h2 className="text-xs sm:text-sm font-display font-medium tracking-widest text-sky-100 mb-0.5">
              RNG READY
            </h2>
            <p className="text-[8px] sm:text-[9px] font-mono tracking-wider text-slate-400">
              PULL LEVER TO GENERATE
            </p>
          </motion.div>
        )}

        {/* State B: Spinning display */}
        {state === 'spinning' && (
          <div className="text-center flex flex-col items-center justify-center h-full" id="spinning-stage-visual">
            {/* Spinning virtual indicator */}
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 mb-1.5 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed border-sky-500/30 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-1 border-2 border-dotted border-rose-500/40 rounded-full animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
              <div className="font-mono text-[8px] text-pink-500 font-bold tracking-tighter animate-pulse">LOCKED</div>
            </div>
            <h2 className="text-xs sm:text-md font-display tracking-widest text-rose-500 font-extrabold uppercase animate-pulse">
              REELS RUNNING
            </h2>
            <p className="text-[8px] sm:text-[9px] font-mono tracking-wider text-slate-400 mt-0.5 animate-pulse">
              STOP REELS TO FIND YOUR NUMBER
            </p>
          </div>
        )}

        {/* State C: Stopped, but spin completing sequence (Waiting all stops) */}
        {(state === 'stopping_1' || state === 'stopping_2') && (
          <div className="text-center flex flex-col items-center justify-center h-full" id="stopping-stage-visual">
            <div className="flex gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
            <h2 className="text-xs sm:text-sm font-display tracking-widest text-sky-400 font-bold uppercase">
              REEL STOPPING
            </h2>
            <p className="text-[8px] sm:text-[9px] font-mono tracking-wider text-slate-400 animate-pulse mt-0.5">
              PRESS STOP BUTTONS SEQUENTIALLY
            </p>
          </div>
        )}

        {/* State E: Rewrite Pending PUSH event */}
        {state === 'rewrite_pending' && (
          <div className="text-center flex flex-col items-center justify-center h-full w-full relative overflow-hidden" id="rewrite-pending-stage-visual">
            <div className="absolute inset-0 bg-red-950/20 animate-pulse pointer-events-none" />
            
            <div className="flex gap-2 mb-1.5 animate-bounce">
              <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
              <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" style={{ animationDelay: '0.15s' }} />
              <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            
            <h2 className="text-xs sm:text-sm font-display tracking-widest text-red-500 font-black uppercase animate-pulse">
              書き換え待機中
            </h2>
            <p className="text-[10px] sm:text-[11px] font-sans text-amber-400 mt-1 font-bold tracking-widest animate-pulse">
              ボタンプッシュで運命を切り拓け！
            </p>
          </div>
        )}

        {/* State D: Finished Result Screen */}
        {state === 'completed' && stoppedResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center flex flex-col items-center justify-center h-full w-full"
            id="completed-stage-visual"
          >
            {/* Highlight Banner */}
            <div className={`text-[8px] sm:text-[9px] font-display font-black tracking-widest px-2.5 py-0.5 rounded-full mb-1 sm:mb-1.5 uppercase ${stoppedResult.badge}`}>
              {stoppedResult.title}
            </div>

            {/* Giant Dynamic Number */}
            <div className={`font-mono text-5xl sm:text-6xl font-black tracking-tight leading-none flex items-center justify-center gap-1.5 ${stoppedResult.colorClass}`} id="pachislot-giant-number">
              <span className="scale-75 sm:scale-90">{stoppedResult.icon}</span>
              {finalValue}
            </div>

            {/* Sub-text information */}
            <p className="text-[8px] sm:text-[9px] font-mono text-slate-400 mt-1 sm:mt-1.5 tracking-wide font-normal">
              GENERATED UNDER MAX LIMIT OF <span className="text-slate-200 font-bold">{maxLimit}</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* 5. Bottom Footer LCD Info Bar */}
      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 z-10 w-full" id="lcd-f-bar">
        <div>
          MODE: <span className="text-slate-400">Pachislot V3</span>
        </div>
        
        {/* Quick history reel summary right aligned */}
        <div className="flex gap-1.5 items-center overflow-hidden max-w-40 sm:max-w-64 text-[8px] sm:text-[9px]">
          <span className="shrink-0 text-slate-600 font-semibold uppercase">HIST:</span>
          {history.length === 0 ? (
            <span className="text-slate-600">EMPTY</span>
          ) : (
            history.slice(0, 3).map((item, i) => (
              <span 
                key={i} 
                className={`px-1 py-0.5 rounded leading-none ${
                  item.levelUsed === 'under_10' 
                    ? 'bg-rose-950/80 text-rose-400 font-bold border border-rose-900/40' 
                    : item.levelUsed === 'under_30'
                    ? 'bg-orange-950/80 text-orange-400 border border-orange-900/40'
                    : item.levelUsed === 'under_50'
                    ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/40'
                    : item.levelUsed === 'under_100'
                    ? 'bg-blue-950/80 text-blue-400 border border-blue-900/40'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {item.value}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

