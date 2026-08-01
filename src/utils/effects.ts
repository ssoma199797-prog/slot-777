import { CutinEffect, EffectLevel, CutinTiming, MismatchType, RewriteTriggerType } from '../types';

export const CHANCE_100_EFFECTS: CutinEffect[] = [
  {
    id: 'chance_100',
    name: 'チャンス',
    level: 'under_100',
    text: 'チャンス',
    subtitle: 'CHANCE',
    dialog: '',
    bgGradients: 'from-blue-600/90 via-slate-900/95 to-slate-950/98',
    borderColor: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    soundName: 'under_50',
    animationStyle: 'pulse'
  },
  {
    id: 'small_win_check',
    name: '小役？',
    level: 'under_100',
    text: '小役？',
    subtitle: 'SMALL WIN?',
    dialog: '',
    bgGradients: 'from-emerald-600/90 via-slate-900/95 to-slate-950/98',
    borderColor: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    soundName: 'under_50',
    animationStyle: 'pulse'
  }
];

export const CHANCE_50_EFFECTS: CutinEffect[] = [
  {
    id: 'chance_50',
    name: '好機',
    level: 'under_50',
    text: '好機',
    subtitle: 'GOOD CHANCE',
    dialog: '',
    bgGradients: 'from-indigo-600/90 via-slate-900/95 to-slate-950/98',
    borderColor: 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]',
    soundName: 'under_50',
    animationStyle: 'pulse'
  },
  {
    id: 'hot_signs',
    name: '予兆',
    level: 'under_50',
    text: '予兆',
    subtitle: 'SIGNS',
    dialog: '「何かが起こりそうな気配がする…」',
    bgGradients: 'from-violet-700/90 via-slate-900/95 to-slate-950/98',
    borderColor: 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]',
    soundName: 'under_50',
    animationStyle: 'shake'
  },
  {
    id: 'develop_check',
    name: '発展？',
    level: 'under_50',
    text: '発展？',
    subtitle: 'DEVELOPMENT?',
    dialog: '',
    bgGradients: 'from-fuchsia-600/90 via-slate-900/95 to-slate-950/98',
    borderColor: 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]',
    soundName: 'under_50',
    animationStyle: 'flash'
  }
];

export const HOT_EFFECTS: CutinEffect[] = [
  {
    id: 'hot_30',
    name: '激アツ',
    level: 'under_30',
    text: '激アツ',
    subtitle: 'SUPER HOT',
    dialog: '',
    bgGradients: 'from-red-600 via-red-950/95 to-slate-950/98',
    borderColor: 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse',
    soundName: 'under_30',
    animationStyle: 'lightning'
  },
  {
    id: 'searing_hot',
    name: '灼熱',
    level: 'under_30',
    text: '灼熱',
    subtitle: 'SEARING HOT',
    dialog: '「この熱さ、本物だ！」',
    bgGradients: 'from-amber-600 via-red-950/95 to-slate-950/98',
    borderColor: 'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-pulse',
    soundName: 'under_30',
    animationStyle: 'lightning'
  },
  {
    id: 'glitch_mismatch',
    name: '違和感：液晶バグ',
    level: 'under_30',
    text: '液晶バグ',
    subtitle: 'SYSTEM GLITCH',
    dialog: '「画面の様子がおかしい…！？」',
    bgGradients: 'from-rose-950 via-slate-950 to-red-950/90',
    borderColor: 'border-rose-600 shadow-[0_0_25px_rgba(225,29,72,0.8)]',
    soundName: 'under_30',
    animationStyle: 'glitch'
  },
  {
    id: 'silence_mismatch',
    name: '違和感：静寂',
    level: 'under_30',
    text: '一瞬の静寂',
    subtitle: 'MOMENT OF SILENCE',
    dialog: '「…ッ！？音が消えた？」',
    bgGradients: 'from-slate-900 via-zinc-950 to-slate-950',
    borderColor: 'border-slate-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]',
    soundName: 'under_30',
    animationStyle: 'pulse'
  }
];

export const LEGEND_EFFECTS: CutinEffect[] = [
  {
    id: 'rainbow_10',
    name: '確定',
    level: 'under_10',
    text: '確定',
    subtitle: 'CONGRATS',
    dialog: '',
    bgGradients: 'from-pink-500 via-indigo-600 to-purple-900/90',
    borderColor: 'border-indigo-400 shadow-[0_0_35px_rgba(139,92,246,0.9)]',
    soundName: 'under_10',
    animationStyle: 'flash'
  },
  {
    id: 'god_revelation',
    name: '降臨',
    level: 'under_10',
    text: '降臨',
    subtitle: 'GOD ARRIVAL',
    dialog: '「ついに、神が舞い降りる」',
    bgGradients: 'from-yellow-600 via-amber-950 to-slate-950/98',
    borderColor: 'border-yellow-400 shadow-[0_0_35px_rgba(234,179,8,0.9)] animate-pulse',
    soundName: 'under_10',
    animationStyle: 'lightning'
  },
  {
    id: 'mugen_dream',
    name: '夢幻',
    level: 'under_10',
    text: '夢幻',
    subtitle: 'INFINITE DREAM',
    dialog: '「終わらない夢を見せてやる」',
    bgGradients: 'from-cyan-500 via-purple-600 to-pink-600',
    borderColor: 'border-pink-400 shadow-[0_0_35px_rgba(236,72,153,0.9)]',
    soundName: 'under_10',
    animationStyle: 'flash'
  },
  {
    id: 'puchun_revelation',
    name: 'フリーズ',
    level: 'under_10',
    text: '全回転',
    subtitle: 'FREEZE REVELATION',
    dialog: '「時よ、止まれ…！」',
    bgGradients: 'from-black via-zinc-900 to-black',
    borderColor: 'border-zinc-400 shadow-[0_0_30px_rgba(255,255,255,0.7)]',
    soundName: 'under_10',
    animationStyle: 'glitch'
  }
];

export interface LotteryResult {
  value: number;       // The initial target value displayed on reels
  realValue: number;   // The true final target value
  rewriteTrigger: RewriteTriggerType;
  mismatchType: MismatchType;
  shouldVibrate: boolean;
  effect: CutinEffect | null;
  timing: CutinTiming;
  level: EffectLevel;
}

/**
 * 出目の分布モード
 *
 * false          … 元の仕様どおり。「400以上を引いたが99以下を見せる」演出のうち
 *                 半分は99以下のまま確定する“救済”になるため、1〜99が理論値より
 *                 約12.7%出やすく、400以上が約12.6%出にくくなります（実測値）。
 *                 パチスロ的な遊び心としては、この偏りが演出の旨味になります。
 *
 * true（既定）  … 演出（99以下を一瞬見せる書き換え）はそのまま残しつつ、
 *                 最終的な出目は必ず抽選どおりにします。完全な一様分布が必要な
 *                 用途（くじ引き・順番決めなど）ではこちらにしてください。
 */
export const STRICT_UNIFORM_DISTRIBUTION = true;

/**
 * How often a low result (100以下) shows a 違和感演出 instead of a cut-in.
 *
 * Mismatches deliberately silence the normal cut-in, so this is what actually
 * caps the cut-in rate on two-digit results — lower it to see more cut-ins.
 */
export const MISMATCH_RATE = 0.32;

/**
 * Cryptographically strong random float in [0, 1).
 * Falls back to Math.random() only if the Web Crypto API is unavailable.
 */
export const secureRandom = (): number => {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      c.getRandomValues(buf);
      return buf[0] / 4294967296; // 2^32
    }
  } catch {
    // fall through
  }
  return Math.random();
};

/**
 * Uniform integer in [min, max] with modulo bias removed by rejection sampling.
 * This is the function that actually decides the player's number.
 */
export const secureRandomInt = (min: number, max: number): number => {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  const range = hi - lo + 1;
  if (range <= 0) return lo;

  try {
    const c = globalThis.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      // Largest multiple of `range` that fits in 2^32, so every value is equally likely.
      const limit = Math.floor(4294967296 / range) * range;
      const buf = new Uint32Array(1);
      for (let attempt = 0; attempt < 64; attempt++) {
        c.getRandomValues(buf);
        if (buf[0] < limit) return lo + (buf[0] % range);
      }
    }
  } catch {
    // fall through
  }
  return lo + Math.floor(Math.random() * range);
};

/**
 * Three matching reel digits (111, 222, …).
 *
 * Only an actual spin result can qualify. Scores fall to zero or below once
 * skills are applied, and `String(0).padStart(3, '0')` is "000" — which used to
 * award the zorome bonus to anyone whose score landed on exactly zero.
 */
export const isZoromeVal = (val: number): boolean => {
  if (!Number.isFinite(val) || val < 1) return false;
  const s = String(val).padStart(3, '0');
  return s[0] === s[1] && s[1] === s[2];
};

/**
 * Executes a Pachislot Lottery for a spin.
 * Determines the final value, and selects a cut-in effect + timing based on probability rules.
 */
export const performLottery = (
  min: number, 
  max: number, 
  cutinFrequency: 'high' | 'normal' | 'low'
): LotteryResult => {
  // 1. Draw the target number (crypto-grade, bias-free within [min, max]).
  //    See STRICT_UNIFORM_DISTRIBUTION above for how the presentation layer can
  //    still nudge the final outcome.
  let realValue = secureRandomInt(min, max);
  
  let rewriteTrigger: RewriteTriggerType = 'none';
  let initialValue = realValue;
  let mismatchType: MismatchType = 'none';

  // Extract pools to decide disguise visuals depending on range limits
  const validUnder100: number[] = [];
  const validUnder99: number[] = [];
  const validOver200: number[] = [];
  const validOver400: number[] = [];
  const validZoromes: number[] = [];
  const normalPool: number[] = [];

  for (let i = min; i <= max; i++) {
    if (i <= 99) validUnder99.push(i);
    if (i >= 400) validOver400.push(i);

    if (isZoromeVal(i)) {
      validZoromes.push(i);
    } else {
      if (i <= 100) {
        validUnder100.push(i);
      } else if (i >= 200) {
        validOver200.push(i);
      } else {
        normalPool.push(i);
      }
    }
  }

  const N_under100 = validUnder100.length;
  const N_over200 = validOver200.length;

  // Normal Mode
  if (isZoromeVal(realValue)) {
    rewriteTrigger = 'none';
    mismatchType = 'none';
  } else if (realValue >= 400 && validUnder99.length > 0 && secureRandom() < 0.25) {
      // 25% of native >= 400 spins trigger Dummy 99 or less effect!
      initialValue = validUnder99[Math.floor(secureRandom() * validUnder99.length)];
      if (STRICT_UNIFORM_DISTRIBUTION || secureRandom() < 0.50) {
        // Shows a teasing <= 99, then rewrites up to the number that was actually drawn.
        rewriteTrigger = 'dummy_99_success';
      } else {
        // The teased <= 99 sticks. This is the one path that alters the drawn number,
        // so it is skipped entirely when STRICT_UNIFORM_DISTRIBUTION is on.
        rewriteTrigger = 'dummy_99_failure';
        realValue = initialValue;
      }
    } else if (realValue <= 99 && validOver400.length > 0 && secureRandom() < 0.15) {
      // 15% of native <= 99 spins trigger Dummy 99 or less taunt mode
      rewriteTrigger = 'dummy_99_failure';
      initialValue = realValue;
    } else if (realValue <= 100 && N_over200 > 0 && N_under100 > 0) {
      let p_success = (0.0526 * N_over200) / N_under100;
      if (p_success > 0.85) p_success = 0.85;
      
      const r = secureRandom();
      if (r < p_success) {
        rewriteTrigger = 'success';
        initialValue = validOver200[Math.floor(secureRandom() * N_over200)];
      } else if (r < p_success + MISMATCH_RATE) {
        const mismatches: MismatchType[] = [
          'button_lock', 
          'lever_silence', 
          'start_delay', 
          'weird_stop_sound', 
          'lcd_invert', 
          'only_zeros', 
          'reverse_spin', 
          'cabinet_rainbow_flash', 
          'weird_lever_sound'
        ];
        mismatchType = mismatches[Math.floor(secureRandom() * mismatches.length)];
      }
    } else if (realValue >= 200) {
      if (secureRandom() < 0.05) {
        rewriteTrigger = 'failure';
        const possibleInitialValues = validOver200.filter(v => v !== realValue);
        initialValue = possibleInitialValues.length > 0 
          ? possibleInitialValues[Math.floor(secureRandom() * possibleInitialValues.length)]
          : realValue;
      }
    }

  // 3. Determine if device/screen vibration occurs (guaranteed for realValue <= 20)
  const shouldVibrate = realValue <= 20;

  // 4. Identify maximum possible effect level based on initialValue (disguised spins look normal initially)
  let baseLevel: EffectLevel = 'none';
  if (initialValue <= 10) baseLevel = 'under_10';
  else if (initialValue <= 30) baseLevel = 'under_30';
  else if (initialValue <= 50) baseLevel = 'under_50';
  else if (initialValue <= 100) baseLevel = 'under_100';

  let selectedEffect: CutinEffect | null = null;
  let timing: CutinTiming = 'none';
  let isCutinTriggered = false;
  let pool: CutinEffect[] = [];

  // Mismatches silence normal lever cut-ins to preserve the eerie "weirdness" feeling
  if (mismatchType === 'none') {
    // 5. Decide if cutin occurs and select from pool (Rich overlapping rates to allow surprise wins!)
    if (baseLevel === 'under_10') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.65) {
        pool = [...LEGEND_EFFECTS];
      } else if (randPool < 0.85) {
        pool = [...HOT_EFFECTS];
      } else if (randPool < 0.95) {
        pool = [...CHANCE_50_EFFECTS]; // "好機" can also turn out to be under 10!
      } else {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can also turn out to be under 10!
      }
    } else if (baseLevel === 'under_30') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.75) {
        pool = [...HOT_EFFECTS];
      } else if (randPool < 0.93) {
        pool = [...CHANCE_50_EFFECTS]; // "好機" can be under 30!
      } else {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can be under 30!
      }
    } else if (baseLevel === 'under_50') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.75) {
        pool = [...CHANCE_50_EFFECTS];
      } else if (randPool < 0.93) {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can be under 50!
      } else {
        pool = [...HOT_EFFECTS]; // Small chance of overhyping with "激アツ"
      }
    } else if (baseLevel === 'under_100') {
      // Two-digit results are the ones players care about, so they almost always
      // get a cut-in; 30以下・50以下 are already guaranteed above.
      const chanceTrigger = cutinFrequency === 'high' ? 1 : cutinFrequency === 'low' ? 0.88 : 0.97;
      isCutinTriggered = secureRandom() < chanceTrigger;
      if (isCutinTriggered) {
        const randPool = secureRandom();
        if (randPool < 0.88) {
          pool = [...CHANCE_100_EFFECTS];
        } else {
          pool = [...CHANCE_50_EFFECTS]; // "好機" occasionally used
        }
      }
    } else {
      // ハズレ (initialValue > 100): Fake cut-ins
      const fakeChance = cutinFrequency === 'high' ? 0.05 : cutinFrequency === 'low' ? 0.005 : 0.02;
      isCutinTriggered = secureRandom() < fakeChance;
      if (isCutinTriggered) {
        const randFake = secureRandom();
        if (randFake < 0.85) {
          pool = [...CHANCE_100_EFFECTS]; // 85% is "チャンス"
        } else if (randFake < 0.97) {
          pool = [...CHANCE_50_EFFECTS];  // 12% is "好機"
        } else {
          pool = [...HOT_EFFECTS];        // 3% is "激アツ" or "灼熱" (たまーーーーにガセ!)
        }
      }
    }

    if (isCutinTriggered && pool.length > 0) {
      selectedEffect = pool[Math.floor(secureRandom() * pool.length)];

      // Select timing (lever_on: 60%, stop_1: 25%, stop_2: 15%)
      const randTime = secureRandom();
      if (randTime < 0.60) {
        timing = 'lever_on';
      } else if (randTime < 0.85) {
        timing = 'stop_1';
      } else {
        timing = 'stop_2';
      }
    }
  }

  if (isZoromeVal(realValue) || isZoromeVal(initialValue)) {
    rewriteTrigger = 'none';
    mismatchType = 'none';
    initialValue = realValue;
  }

  return {
    value: initialValue,
    realValue,
    rewriteTrigger,
    mismatchType,
    shouldVibrate,
    effect: selectedEffect,
    timing,
    level: baseLevel
  };
};

