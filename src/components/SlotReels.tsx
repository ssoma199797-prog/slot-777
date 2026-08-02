import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { playStopSound, startSpinSound, stopSpinSound, playBuzzerSound, playWeirdStopSound, playFreezeRevealSound } from '../utils/audio';
import { CutinEffect, MismatchType } from '../types';

interface SlotReelsProps {
  targetValue: number; // e.g. 77 -> [0, 7, 7]
  isSpinning: boolean;
  isInstant: boolean;
  onReelStop: (reelIndex: number) => void;
  onAllStopped: () => void;
  activeCutinVisible: boolean;
  currentEffect: CutinEffect | null;
  isButtonLocked?: boolean;
  mismatchType?: MismatchType;
  isMatchMode?: boolean;
  onPassPlayer?: () => void;
  passConfirmPending?: boolean;
  skillBonus?: number;
  skillCutinText?: string | null;
  isMyTurn?: boolean;
  activePlayerScore?: number | null;
  hasConsumedPointsThisTurn?: boolean;
  remoteStoppedReels?: boolean[];
  /** Changes once per spin. Anything internal that survives a spin resets on it. */
  spinToken?: number;
}

// Longer strip to enable realistic physical rolling and overshoot buffer
const REEL_STRIP = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9
];

export default function SlotReels({
  targetValue,
  isSpinning,
  isInstant,
  onReelStop,
  onAllStopped,
  activeCutinVisible,
  currentEffect,
  isButtonLocked = false,
  mismatchType = 'none',
  isMatchMode = false,
  onPassPlayer,
  passConfirmPending = false,
  skillBonus = 0,
  skillCutinText = null,
  isMyTurn = true,
  activePlayerScore = null,
  hasConsumedPointsThisTurn = false,
  remoteStoppedReels,
  spinToken = 0,
}: SlotReelsProps) {
  // Parse targetValue to digits e.g. 15 -> [0, 1, 5]
  // Skills subtract with no floor, so a match score legitimately goes negative
  // ("マイナス値で勝利"). Reel strips only carry 0-9, so they show the magnitude
  // and the score panel carries the sign; without this the digits themselves went
  // negative (-5 -> [-1, -1, -5]) and parked the strip on a blank position.
  const reelValue = Math.abs(Math.trunc(targetValue)) % 1000;
  const digits = [
    Math.floor(reelValue / 100) % 10,
    Math.floor(reelValue / 10) % 10,
    reelValue % 10,
  ];

  // Reel states: 'idle' | 'spinning' | 'stopping' | 'stopped'
  const [reelStates, setReelStates] = useState<('idle' | 'spinning' | 'stopping' | 'stopped')[]>([
    'idle',
    'idle',
    'idle',
  ]);

  // Track physical bumps for each reel when stopped
  const [reelBumps, setReelBumps] = useState<boolean[]>([false, false, false]);

  // Track button click glows for input feedback
  const [buttonGlows, setButtonGlows] = useState<boolean[]>([false, false, false]);

  // Track button shake animation for lockout clicks
  const [buttonShakes, setButtonShakes] = useState<boolean[]>([false, false, false]);

  // Track if reels are in the process of stopping or stopped
  const stoppingRef = useRef<boolean[]>([false, false, false]);

  // Track if reels have fully completed their stopping animation and are settled
  const finishedRef = useRef<boolean[]>([false, false, false]);

  // Framer Motion controls for each reel position
  const controlLeft = useAnimation();
  const controlCenter = useAnimation();
  const controlRight = useAnimation();

  const reelControls = [controlLeft, controlCenter, controlRight];
  const itemHeight = 96; // height of each digit element in px

  // Track active spins
  const prevTargetValueRef = useRef<number>(targetValue);

  // Listen to targetValue changes while stopped (e.g. when rewritten) to play a flashy simultaneous stop!
  useEffect(() => {
    if (!isSpinning && targetValue !== prevTargetValueRef.current) {
      prevTargetValueRef.current = targetValue;

      // Animate all three reels to their new positions simultaneously with an explosive bounce
      reelControls.forEach((control, idx) => {
        const targetY = -(digits[idx] + 10) * itemHeight;
        control.start({
          y: [targetY - 180, targetY + 25, targetY - 6, targetY],
          transition: {
            duration: 0.38,
            ease: "easeOut"
          }
        });
      });

      // Play stop sound
      playStopSound();

      // Trigger bumps and flash on all reels
      setReelBumps([true, true, true]);
      setTimeout(() => setReelBumps([false, false, false]), 300);
    } else {
      prevTargetValueRef.current = targetValue;
    }
  }, [targetValue, isSpinning]);

  // A spin that ended badly (a dropped sync message, a device that was asleep)
  // used to leave these refs half-set, and every later spin inherited that state.
  // Tying the reset to the spin id makes each spin start from a known point.
  useEffect(() => {
    stoppingRef.current = [false, false, false];
    finishedRef.current = [false, false, false];
    setReelStates(['idle', 'idle', 'idle']);
    setReelBumps([false, false, false]);
    setButtonGlows([false, false, false]);
    setButtonShakes([false, false, false]);
  }, [spinToken]);

  // Track active spins
  useEffect(() => {
    let autoStopTimeout: any = null;

    if (isSpinning) {
      if (isInstant) {
        stoppingRef.current = [true, true, true];
        finishedRef.current = [true, true, true];
        // Instant play: super fast spin and immediate sequential stop
        setReelStates(['spinning', 'spinning', 'spinning']);
        startSpinSound();
        
        const runInstant = async () => {
          try {
            // Left Reel Stop with rapid overshoot & rebound
            const targetY0 = -(digits[0] + 10) * itemHeight; // stopping on middle strip
            await reelControls[0].start({
              y: [0, targetY0 - 60, targetY0 + 15, targetY0],
              transition: { duration: 0.3, ease: "easeOut" }
            }).catch(() => {});
            playStopSound();
            setReelStates(prev => ['stopped', prev[1], prev[2]]);
            onReelStop(0);

            // Center Reel Stop
            const targetY1 = -(digits[1] + 10) * itemHeight;
            await reelControls[1].start({
              y: [0, targetY1 - 60, targetY1 + 15, targetY1],
              transition: { duration: 0.25, ease: "easeOut" }
            }).catch(() => {});
            playStopSound();
            setReelStates(prev => [prev[0], 'stopped', prev[2]]);
            onReelStop(1);

            // Right Reel Stop
            const targetY2 = -(digits[2] + 10) * itemHeight;
            await reelControls[2].start({
              y: [0, targetY2 - 60, targetY2 + 15, targetY2],
              transition: { duration: 0.25, ease: "easeOut" }
            }).catch(() => {});
            playStopSound();
            setReelStates(prev => [prev[0], prev[1], 'stopped']);
            onReelStop(2);
            
            stopSpinSound();
            onAllStopped();
          } catch (e) {
            console.error("Instant play animation error:", e);
          }
        };

        runInstant();
      } else {
        stoppingRef.current = [false, false, false];
        finishedRef.current = [false, false, false];
        // Standard slot mode: persistent spin until STOP clicked manually
        setReelStates(['spinning', 'spinning', 'spinning']);
        startSpinSound();

        // If the buttons are locked, schedule automatic simultaneous stop after 3 seconds!
        if (mismatchType === 'button_lock') {
          autoStopTimeout = setTimeout(async () => {
            stoppingRef.current = [true, true, true];
            setReelStates(['stopping', 'stopping', 'stopping']);
            
            // Trigger visual bumps and button glows
            setReelBumps([true, true, true]);
            setTimeout(() => setReelBumps([false, false, false]), 300);
            
            setButtonGlows([true, true, true]);
            setTimeout(() => setButtonGlows([false, false, false]), 350);

            // Play massive explosive "ドーン" sounds!
            playFreezeRevealSound();
            playStopSound();

            const targetY0 = -(digits[0] + 10) * itemHeight;
            const targetY1 = -(digits[1] + 10) * itemHeight;
            const targetY2 = -(digits[2] + 10) * itemHeight;

            try {
              await Promise.all([
                reelControls[0].start({
                  y: [targetY0 - 260, targetY0 - 80, targetY0 + 18, targetY0 - 4, targetY0],
                  transition: { duration: 0.52, times: [0, 0.45, 0.72, 0.88, 1], ease: "easeOut" }
                }),
                reelControls[1].start({
                  y: [targetY1 - 260, targetY1 - 80, targetY1 + 18, targetY1 - 4, targetY1],
                  transition: { duration: 0.52, times: [0, 0.45, 0.72, 0.88, 1], ease: "easeOut" }
                }),
                reelControls[2].start({
                  y: [targetY2 - 260, targetY2 - 80, targetY2 + 18, targetY2 - 4, targetY2],
                  transition: { duration: 0.52, times: [0, 0.45, 0.72, 0.88, 1], ease: "easeOut" }
                })
              ]);
            } catch (e) {
              console.warn("Auto simultaneous stop animation interrupted:", e);
            }

            finishedRef.current = [true, true, true];
            setReelStates(['stopped', 'stopped', 'stopped']);
            stopSpinSound();
            onAllStopped();
          }, 3000);
        }

        const isReverse = mismatchType === 'reverse_spin';
        const direction = isReverse ? 1 : -1;

        // Loop rotation animation endlessly for each reel with high speed blur after dynamic acceleration
        reelControls.forEach(async (control, idx) => {
          // Stagger starting positions for slot authenticity
          const initialY = -idx * 3 * itemHeight;
          control.set({ y: initialY });
          
          try {
            // Step 1: Smooth Acceleration ramp up
            await control.start({
              y: [initialY, initialY + direction * 3 * itemHeight],
              transition: {
                duration: 0.35,
                ease: "easeIn",
              }
            });

            // Step 2: Continuous high-speed spin loop
            const loopStartY = initialY + direction * 3 * itemHeight;
            control.start({
              y: [loopStartY, loopStartY + direction * 10 * itemHeight],
              transition: {
                repeat: Infinity,
                duration: 0.14,
                ease: "linear",
              },
            }).catch(() => {});
          } catch (e) {
            // Suppress animation cancel warnings
          }
        });
      }
    } else {
      // Return to Idle / Init only if not already fully stopped
      setReelStates(prev => {
        if (prev.every(s => s === 'stopped')) return prev;
        return ['idle', 'idle', 'idle'];
      });
      reelControls.forEach((control, idx) => {
        control.set({ y: -(digits[idx] + 10) * itemHeight }); // Align to the middle strip for smooth overshoot buffers
      });
    }

    return () => {
      if (autoStopTimeout) clearTimeout(autoStopTimeout);
    };
  }, [isSpinning, targetValue, isInstant, mismatchType]);

  // Sync reel stops triggered from remote devices
  useEffect(() => {
    if (remoteStoppedReels && isSpinning && !isInstant) {
      remoteStoppedReels.forEach((stopped, idx) => {
        if (stopped && !stoppingRef.current[idx]) {
          handleStopReel(idx);
        }
      });
    }
  }, [remoteStoppedReels, isSpinning, isInstant]);

  // Handle stopping a specific reel
  const handleStopReel = async (reelIdx: number) => {
    if (stoppingRef.current[reelIdx] || isInstant) return;

    // If button lock is active, play buzzer sound, shake the button, and do NOT stop the reel!
    if (isButtonLocked) {
      playBuzzerSound();
      setButtonShakes(prev => {
        const next = [...prev];
        next[reelIdx] = true;
        return next;
      });
      setTimeout(() => {
        setButtonShakes(prev => {
          const next = [...prev];
          next[reelIdx] = false;
          return next;
        });
      }, 300);
      return;
    }

    stoppingRef.current[reelIdx] = true;

    // Transition state immediately to prevent multi-triggering
    setReelStates(prev => {
      const next = [...prev];
      next[reelIdx] = 'stopping';
      return next;
    });

    // Trigger physical impact bump on this reel
    setReelBumps(prev => {
      const next = [...prev];
      next[reelIdx] = true;
      return next;
    });
    setTimeout(() => {
      setReelBumps(prev => {
        const next = [...prev];
        next[reelIdx] = false;
        return next;
      });
    }, 300);

    // Trigger brief input success button glow
    setButtonGlows(prev => {
      const next = [...prev];
      next[reelIdx] = true;
      return next;
    });
    setTimeout(() => {
      setButtonGlows(prev => {
        const next = [...prev];
        next[reelIdx] = false;
        return next;
      });
    }, 350);

    // Choose normal stop sound vs weird stop sound mismatch
    if (mismatchType === 'weird_stop_sound') {
      playWeirdStopSound();
    } else {
      playStopSound();
    }
    
    // Stop the CSS spin loop, snap into the target digit with a majestic bounce physical effect
    const targetY = -(digits[reelIdx] + 10) * itemHeight;

    try {
      // Slit-overshoot bounce animation: simulating actual physical metal gear lock and deceleration
      await reelControls[reelIdx].start({
        y: [targetY - 260, targetY - 80, targetY + 18, targetY - 4, targetY],
        transition: { 
          duration: 0.52, 
          times: [0, 0.45, 0.72, 0.88, 1],
          ease: "easeOut" 
        }
      });
    } catch (e) {
      console.warn("Reel stop animation cancelled/interrupted:", e);
    }

    finishedRef.current[reelIdx] = true;

    setReelStates(prev => {
      const next = [...prev];
      next[reelIdx] = 'stopped';
      return next;
    });

    onReelStop(reelIdx);

    if (finishedRef.current.every(Boolean)) {
      stopSpinSound();
      onAllStopped();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 relative" id="slot-reels-subsystem">
      {/* 3 Reels Stage */}
      <div className="grid grid-cols-3 gap-2.5 p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-4 border-amber-500/40 rounded-3xl shadow-[0_12px_30px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(0,0,0,0.9)] max-w-sm w-full mx-auto relative decoration-clone">
        {/* Persistent skill badge — small, out of the way, left of the reels */}
        {skillBonus !== 0 && (
          <div className={`absolute -top-3.5 left-1 z-30 px-2 py-0.5 rounded-lg border font-black text-[10px] shadow-lg flex items-center gap-1 ${
            skillBonus > 0
              ? 'border-indigo-400/70 bg-indigo-950/95 text-indigo-100'
              : 'border-rose-400/70 bg-rose-950/95 text-rose-100'
          }`}>
            <span className={skillBonus > 0 ? 'text-indigo-300' : 'text-rose-300'}>SKILL</span>
            {/* A negative bonus means the score goes up — the ±40 gamble lost. */}
            <span className={skillBonus > 0 ? 'text-amber-300' : 'text-rose-300'}>
              {skillBonus > 0 ? `−${skillBonus}` : `+${-skillBonus}`}
            </span>
            <span className="text-[7.5px] opacity-80">適用中</span>
          </div>
        )}

        {/* Skill announcement cut-in */}
        {skillCutinText && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="px-5 py-2 rounded-2xl border-2 border-amber-300 bg-slate-950/90 shadow-[0_0_28px_rgba(251,191,36,0.85)] animate-pulse">
              <span className="font-black text-lg text-amber-300 tracking-widest">{skillCutinText}</span>
            </div>
          </div>
        )}

        {/* Top-Right "数値確定" button for Match Mode */}
        {isMatchMode && onPassPlayer && isMyTurn && activePlayerScore !== null && (
          <button
            onClick={onPassPlayer}
            disabled={!isMyTurn || isSpinning || activePlayerScore === null}
            className={`absolute -top-3.5 right-1 z-30 px-2.5 py-1 rounded-xl border-2 font-black text-[10.5px] flex items-center gap-1 shadow-xl transition ${
              isMyTurn && activePlayerScore !== null && !isSpinning
                ? (passConfirmPending
                    ? 'bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 border-rose-100 text-slate-950 scale-110 shadow-[0_0_22px_rgba(251,113,133,0.9)] animate-pulse cursor-pointer'
                    : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 border-emerald-200 text-slate-950 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-bounce cursor-pointer')
                : 'bg-slate-900/90 border-slate-700 text-slate-500 opacity-70 cursor-not-allowed'
            }`}
            title={
              activePlayerScore !== null
                ? '現在の数値で確定してターンを終了する'
                : 'スピン後に確定できます'
            }
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-950" />
            <span>
              {passConfirmPending
                ? `本当に ${activePlayerScore} で確定？ → もう一度タップ`
                : `✓ 数値確定 ${activePlayerScore !== null ? `(${activePlayerScore})` : '(スピン必要)'}`}
            </span>
          </button>
        )}

        {/* Shadow Overlay top/bottom for 3D depth */}
        <div className="absolute top-4 left-4 right-4 h-10 bg-gradient-to-b from-slate-950/80 via-slate-950/20 to-transparent z-10 pointer-events-none rounded-t-xl" />
        <div className="absolute bottom-4 left-4 right-4 h-10 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent z-10 pointer-events-none rounded-b-xl" />

        {/* Loop individual reels */}
        {reelStates.map((state, idx) => {
          const isSpin = state === 'spinning';
          const isStopping = state === 'stopping';

          return (
            <div
              key={idx}
              className={`flex-1 h-32 sm:h-28 bg-slate-950 rounded-xl overflow-hidden relative border flex flex-col items-center transition-all duration-300 ${
                isSpin 
                  ? 'border-sky-500/30 bg-slate-950 shadow-[inset_0_0_12px_rgba(56,189,248,0.15)]' 
                  : isStopping
                  ? 'border-orange-500/40 bg-slate-950 animate-shake'
                  : 'border-slate-800'
              } ${reelBumps[idx] ? 'animate-reel-bump' : ''}`}
              id={`slot-reel-${idx}`}
            >
              {/* Reel Strips with CSS Filter-based motion blur */}
              <motion.div
                animate={reelControls[idx]}
                // No filter transition here: this column is transforming every
                // frame, and animating a blur on top of that forced a full
                // re-rasterisation per frame on phones.
                className={`flex flex-col text-center ${
                  isSpin
                    ? 'blur-[2px] opacity-80'
                    : isStopping
                    ? 'opacity-95'
                    : ''
                }`}
                style={{ transformOrigin: 'center center' }}
              >
                {REEL_STRIP.map((num, sIdx) => {
                  const isMatchDigit = num === digits[idx] && state === 'stopped';
                  // Let's highlight the matched digit only if it falls in the active center view (e.g. index 10-19)
                  const isTargetIndex = sIdx === (digits[idx] + 10);
                  const isHighlighted = isMatchDigit && isTargetIndex;
                  const displayedDigit = (mismatchType === 'only_zeros' && (state === 'spinning' || state === 'stopping')) ? 0 : num;

                  return (
                    <div
                      key={sIdx}
                      style={{ height: `${itemHeight}px` }}
                      className={`w-full flex items-center justify-center font-display font-black text-5xl tracking-tighter transition-colors duration-150 ${
                        isSpin 
                          ? 'text-sky-400/80' 
                          : isHighlighted
                          ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] scale-110 font-bold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {displayedDigit}
                    </div>
                  );
                })}
              </motion.div>
            </div>
          );
        })}

        {/* Cinematic Character Cutins! Overlaid DIRECTLY on top of the reels/digits */}
        <AnimatePresence>
          {activeCutinVisible && currentEffect && (
            <motion.div
              initial={{ x: '-120%', skewX: -15, opacity: 0 }}
              animate={{ x: '0%', skewX: 0, opacity: 0.95 }}
              exit={{ x: '120%', skewX: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              className={`absolute inset-1.5 z-30 flex flex-col justify-center items-center p-3 border-y-4 rounded-xl shadow-2xl bg-gradient-to-r ${currentEffect.bgGradients} ${currentEffect.borderColor}`}
              id="active-combat-cutin"
            >
              {/* Decorative laser lightning lines for Extreme styles */}
              {currentEffect.animationStyle === 'lightning' && (
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-yellow-400/20 to-transparent animate-pulse pointer-events-none" />
              )}
              {currentEffect.animationStyle === 'glitch' && (
                <div className="absolute inset-0 bg-red-500/10 animate-glitch pointer-events-none" />
              )}

              {/* Rarity Level tag */}
              <div className={`text-[8px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-md mb-1.5 uppercase border ${
                currentEffect.level === 'under_10' 
                  ? 'bg-rose-950 border-rose-500 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  : currentEffect.level === 'under_30'
                  ? 'bg-orange-950 border-orange-500 text-orange-400'
                  : currentEffect.level === 'under_50'
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-400'
                  : 'bg-blue-950 border-blue-500/50 text-blue-400'
              }`}>
                {currentEffect.level === 'under_10' 
                  ? '特別・極アツ (10以下)' 
                  : currentEffect.level === 'under_30'
                  ? '激アツ (30以下)' 
                  : currentEffect.level === 'under_50'
                  ? '好機 (50以下)'
                  : 'チャンス (100以下)'}
              </div>

              {/* Huge stylized Kanji display */}
              <motion.h1 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 400, damping: 12 }}
                className={`font-display font-black text-4xl tracking-wider leading-none select-none text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter ${
                  currentEffect.level === 'under_10' 
                    ? 'gradient-rainbow drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse' 
                    : currentEffect.level === 'under_30'
                    ? 'gradient-gold animate-pulse'
                    : currentEffect.level === 'under_50'
                    ? 'text-indigo-300'
                    : 'text-sky-300'
                }`}
                id="cutin-kanji-text"
              >
                {currentEffect.text}
              </motion.h1>

              {/* Cinematic subtitle details */}
              <div className="text-[9px] font-mono tracking-widest text-slate-300 font-bold uppercase mt-1">
                {currentEffect.subtitle}
              </div>

              {/* Dialogue balloon lines */}
              {currentEffect.dialog && (
                <div className="mt-2 bg-slate-950/85 px-3 py-1 rounded-md border border-slate-800/80 max-w-[280px] text-center">
                  <p className="text-[10px] text-slate-300 font-sans tracking-wide leading-tight italic font-medium">
                    {currentEffect.dialog}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reel Stop Button Panel (Left, Center, Right Red Buttons) */}
      <div className="flex justify-between items-center gap-2.5 w-full max-w-sm px-4 select-none" id="stop-button-panel">
        {reelStates.map((state, idx) => {
          const isActive = (state === 'spinning' && !isInstant) || (isButtonLocked && state === 'spinning');
          
          return (
            <button
              key={idx}
              disabled={state !== 'spinning' || isInstant || (isMatchMode && !isMyTurn)}
              onClick={() => handleStopReel(idx)}
              className={`flex-1 flex flex-col items-center justify-center h-12 rounded-full font-sans font-bold text-center border-b-4 transition-all duration-75 relative stop-button-class ${
                buttonGlows[idx] ? 'clicked-glow' : ''
              } ${
                buttonShakes[idx] ? 'animate-shake border-red-900 bg-red-950/80 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : ''
              } ${
                isActive && !buttonShakes[idx]
                  ? 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:brightness-110 active:translate-y-[3px] active:border-b-[1px] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.7),0_1px_3px_rgba(239,68,68,0.3)] border-r border-l border-red-500 border-b-red-800 text-white shadow-[0_4px_10px_rgba(239,68,68,0.5)] glow-btn-stop-active cursor-pointer'
                  : 'bg-gradient-to-b from-red-800/70 via-red-900/70 to-red-950 border-r border-l border-red-900/70 border-b-red-950 text-red-300/50 cursor-not-allowed shadow-inner'
              }`}
              id={`stop-btn-${idx}`}
            >
              {/* LED Ring inside buttons */}
              <div className={`absolute top-1 w-[80%] h-[10%] rounded-full transition-all duration-300 ${
                isActive ? 'bg-orange-300 shadow-md animate-pulse' : 'bg-slate-700/50'
              }`} />
              

            </button>
          );
        })}
      </div>
    </div>
  );
}
