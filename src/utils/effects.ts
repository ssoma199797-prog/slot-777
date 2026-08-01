import { CutinEffect, EffectLevel, CutinTiming, MismatchType, RewriteTriggerType } from '../types';

export const CHANCE_100_EFFECTS: CutinEffect[] = [
  {
    id: 'chance_100',
    name: 'チャンス',
    level: 'under_100',
    text: 'チャンス',
    subtitle: 'CHANCE',
    dialog: '',
    bgGradients: 'from-sky-500/80 via-slate-900/95 to-slate-950',
    borderColor: 'border-sky-400/70 shadow-[0_0_20px_rgba(56,189,248,0.45)]',
    soundName: 'under_50',
    animationStyle: 'pulse'
  },
  {
    id: 'small_win_check',
    name: '気配',
    level: 'under_100',
    text: '気配アリ',
    subtitle: 'SOMETHING IS COMING',
    dialog: '',
    bgGradients: 'from-teal-500/80 via-slate-900/95 to-slate-950',
    borderColor: 'border-teal-300/70 shadow-[0_0_20px_rgba(45,212,191,0.45)]',
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
    bgGradients: 'from-violet-500/85 via-indigo-950/95 to-slate-950',
    borderColor: 'border-violet-300/80 shadow-[0_0_24px_rgba(167,139,250,0.55)]',
    soundName: 'under_50',
    animationStyle: 'pulse'
  },
  {
    id: 'hot_signs',
    name: '予兆',
    level: 'under_50',
    text: '予兆',
    subtitle: 'SIGNS DETECTED',
    dialog: '「…何かが動き出した」',
    bgGradients: 'from-fuchsia-600/85 via-purple-950/95 to-slate-950',
    borderColor: 'border-fuchsia-300/80 shadow-[0_0_24px_rgba(232,121,249,0.55)]',
    soundName: 'under_50',
    animationStyle: 'shake'
  },
  {
    id: 'develop_check',
    name: '発展',
    level: 'under_50',
    text: '発展',
    subtitle: 'NEXT STAGE?',
    dialog: '',
    bgGradients: 'from-cyan-500/85 via-blue-950/95 to-slate-950',
    borderColor: 'border-cyan-300/80 shadow-[0_0_24px_rgba(103,232,249,0.55)]',
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
    subtitle: 'CRITICAL HEAT',
    dialog: '',
    bgGradients: 'from-rose-500 via-red-950 to-slate-950',
    borderColor: 'border-rose-300 shadow-[0_0_34px_rgba(251,113,133,0.85)]',
    soundName: 'under_30',
    animationStyle: 'lightning'
  },
  {
    id: 'searing_hot',
    name: '灼熱',
    level: 'under_30',
    text: '灼熱',
    subtitle: 'OVERHEAT',
    dialog: '「この熱、本物だ」',
    bgGradients: 'from-orange-400 via-rose-950 to-slate-950',
    borderColor: 'border-orange-200 shadow-[0_0_34px_rgba(251,146,60,0.85)]',
    soundName: 'under_30',
    animationStyle: 'lightning'
  },
  {
    id: 'glitch_mismatch',
    name: 'ノイズ',
    level: 'under_30',
    text: 'ノイズ',
    subtitle: 'SIGNAL LOST',
    dialog: '「…画面が、壊れてる？」',
    bgGradients: 'from-emerald-400/90 via-slate-950 to-rose-950',
    borderColor: 'border-emerald-200 shadow-[0_0_34px_rgba(52,211,153,0.8)]',
    soundName: 'under_30',
    animationStyle: 'glitch'
  },
  {
    id: 'silence_mismatch',
    name: '静寂',
    level: 'under_30',
    text: '静寂',
    subtitle: 'SILENCE',
    dialog: '「────」',
    bgGradients: 'from-slate-700 via-zinc-950 to-black',
    borderColor: 'border-white/70 shadow-[0_0_30px_rgba(255,255,255,0.45)]',
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
    subtitle: 'CONFIRMED',
    dialog: '',
    bgGradients: 'from-fuchsia-500 via-violet-600 to-cyan-500',
    borderColor: 'border-white shadow-[0_0_45px_rgba(217,70,239,0.95)]',
    soundName: 'under_10',
    animationStyle: 'flash'
  },
  {
    id: 'god_revelation',
    name: '降臨',
    level: 'under_10',
    text: '降臨',
    subtitle: 'DESCEND',
    dialog: '「頭が高い」',
    bgGradients: 'from-amber-300 via-yellow-600 to-slate-950',
    borderColor: 'border-amber-100 shadow-[0_0_45px_rgba(252,211,77,0.95)]',
    soundName: 'under_10',
    animationStyle: 'lightning'
  },
  {
    id: 'mugen_dream',
    name: '夢幻',
    level: 'under_10',
    text: '夢幻',
    subtitle: 'INFINITE',
    dialog: '「まだ終わらせない」',
    bgGradients: 'from-cyan-300 via-fuchsia-500 to-violet-700',
    borderColor: 'border-cyan-100 shadow-[0_0_45px_rgba(103,232,249,0.95)]',
    soundName: 'under_10',
    animationStyle: 'flash'
  },
  {
    id: 'puchun_revelation',
    name: 'フリーズ',
    level: 'under_10',
    text: 'フリーズ',
    subtitle: 'FREEZE',
    dialog: '「動くな」',
    bgGradients: 'from-white via-slate-300 to-slate-900',
    borderColor: 'border-white shadow-[0_0_50px_rgba(255,255,255,0.9)]',
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
 * How often a spin that is already lost still shows a cut-in of each tier.
 *
 * The rule is that heat has to mean something: the hotter the cut-in, the less
 * often it lies. チャンス is barely a promise, 確定 almost always keeps its word.
 * The blackout freeze is deliberately absent — it never fires on a losing spin,
 * so it stays the one tell that cannot betray you.
 */
export const FAKE_CUTIN_RATES = {
  under_100: 0.016,   // チャンス      … 約1/63
  under_50: 0.005,    // 好機          … 約1/200
  under_30: 0.0015,   // 激アツ・灼熱  … 約1/670
  under_10: 0.0003,   // 確定・降臨    … 約1/3300
};

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
    // A cut-in may always UNDER-sell the result — landing on 8 after a mere
    // "チャンス" is a pleasant surprise, not a betrayal. What it must not do is
    // over-sell, so a winning spin never reaches for a hotter tier than it earned.
    // Over-selling is reserved for the losing branch below, at FAKE_CUTIN_RATES.
    if (baseLevel === 'under_10') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.70) {
        pool = [...LEGEND_EFFECTS];
      } else if (randPool < 0.88) {
        pool = [...HOT_EFFECTS];
      } else if (randPool < 0.96) {
        pool = [...CHANCE_50_EFFECTS]; // "好機" can also turn out to be under 10!
      } else {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can also turn out to be under 10!
      }
    } else if (baseLevel === 'under_30') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.82) {
        pool = [...HOT_EFFECTS];
      } else if (randPool < 0.95) {
        pool = [...CHANCE_50_EFFECTS]; // "好機" can be under 30!
      } else {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can be under 30!
      }
    } else if (baseLevel === 'under_50') {
      isCutinTriggered = true;
      const randPool = secureRandom();
      if (randPool < 0.85) {
        pool = [...CHANCE_50_EFFECTS];
      } else {
        pool = [...CHANCE_100_EFFECTS]; // "チャンス" can be under 50!
      }
    } else if (baseLevel === 'under_100') {
      // Two-digit results are the ones players care about, so they almost always
      // get a cut-in; 30以下・50以下 are already guaranteed above.
      const chanceTrigger = cutinFrequency === 'high' ? 1 : cutinFrequency === 'low' ? 0.88 : 0.97;
      isCutinTriggered = secureRandom() < chanceTrigger;
      // Only チャンス here. Letting a 51-100 borrow 好機 was over-selling, and it
      // made 好機 lie more often than the tier below it.
      if (isCutinTriggered) {
        pool = [...CHANCE_100_EFFECTS];
      }
    } else {
      // ハズレ (initialValue > 100): this is where a cut-in is a lie.
      // Rolled hottest-first so the rare tiers are never masked by the common
      // ones, and each tier is rarer than the one below it — a 激アツ that lies is
      // uncommon, a 確定 that lies is a story you tell afterwards.
      const scale = cutinFrequency === 'high' ? 2 : cutinFrequency === 'low' ? 0.4 : 1;
      const roll = secureRandom();
      let ceiling = FAKE_CUTIN_RATES.under_10 * scale;
      if (roll < ceiling) {
        isCutinTriggered = true;
        pool = [...LEGEND_EFFECTS];
      } else if (roll < (ceiling += FAKE_CUTIN_RATES.under_30 * scale)) {
        isCutinTriggered = true;
        pool = [...HOT_EFFECTS];
      } else if (roll < (ceiling += FAKE_CUTIN_RATES.under_50 * scale)) {
        isCutinTriggered = true;
        pool = [...CHANCE_50_EFFECTS];
      } else if (roll < ceiling + FAKE_CUTIN_RATES.under_100 * scale) {
        isCutinTriggered = true;
        pool = [...CHANCE_100_EFFECTS];
      }
    }

    // A spin that is about to snatch the number away (the 99以下 tease that gets
    // rewritten back up) is the harshest betrayal in the game. Left alone it
    // inherited the cut-in tier of the *teased* number, so 確定 lied as often as
    // チャンス did. Here the promise is deliberately kept small, so the hotter the
    // cut-in the likelier it is that the number is really yours.
    if (rewriteTrigger === 'dummy_99_success') {
      // Not every betrayal announces itself, which keeps a quiet 99以下 from
      // becoming a tell in its own right.
      isCutinTriggered = secureRandom() < 0.5;
      const r = secureRandom();
      if (r < 0.70) {
        pool = [...CHANCE_100_EFFECTS];
      } else if (r < 0.92) {
        pool = [...CHANCE_50_EFFECTS];
      } else if (r < 0.99) {
        pool = [...HOT_EFFECTS];
      } else {
        pool = [...LEGEND_EFFECTS];
      }
    }

    if (isCutinTriggered && pool.length > 0) {
      selectedEffect = pool[Math.floor(secureRandom() * pool.length)];

      // Lever, 1st stop and 2nd stop each get an equal share, so where a cut-in
      // lands carries no information about how good the spin is.
      const randTime = secureRandom();
      if (randTime < 1 / 3) {
        timing = 'lever_on';
      } else if (randTime < 2 / 3) {
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

