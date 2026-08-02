export type CutinTiming = 'lever_on' | 'stop_1' | 'stop_2' | 'stop_3' | 'none';

export type EffectLevel = 'under_100' | 'under_50' | 'under_30' | 'under_10' | 'none';

export interface CutinEffect {
  id: string;
  name: string;
  level: EffectLevel;
  text: string;
  subtitle: string;
  dialog?: string;
  bgGradients: string;
  borderColor: string;
  soundName: string;
  animationStyle: 'pulse' | 'flash' | 'shake' | 'glitch' | 'lightning';
}

export type SlotState = 'idle' | 'spinning' | 'stopping_1' | 'stopping_2' | 'completed' | 'rewrite_pending' | 'reroll_pending' | 'gamble_pending';

export type RewriteTriggerType = 'success' | 'failure' | 'dummy_99_success' | 'dummy_99_failure' | 'none';

export type MismatchType = 
  | 'none' 
  | 'button_lock' 
  | 'lever_silence' 
  | 'start_delay' 
  | 'weird_stop_sound' 
  | 'lcd_invert'
  | 'only_zeros'
  | 'reverse_spin'
  | 'cabinet_rainbow_flash'
  | 'weird_lever_sound';

export interface HistoryItem {
  id: string;
  value: number;
  maxLimit: number;
  cutinUsed?: string;
  timingUsed?: string;
  levelUsed?: string;
  timestamp: string;
}

export interface MatchPlayer {
  id: number;
  name: string;
  points: number; // 初期5ポイント
  rawScore: number | null; // スキル適用前出目
  currentScore: number | null; // スキル適用後の数値結果
  hasPassed: boolean; // 確定（パスターン）済みか
  usedAll5Points: boolean; // 5pt全消費したか
  skillsActive: {
    minus5Active: boolean; // ターン終了まで-5が有効か
  };
  spinCount: number;
  /** スキル⑤をこのターンで使ったか（ターン中1回まで）。 */
  reverseUsedThisTurn?: boolean;
  history: number[];
  totalMatchPoints: number; // 累計対戦ポイント
  winCount: number;
  hasConsumedPointsThisTurn?: boolean;
}

export interface SkillSelection {
  minus20Count: number; // 0, 1, or 2 (スキル①: -20を1~2回)
  minus40Selected: boolean; // true/false (スキル②: -40)
  minus5Selected: boolean; // true/false (スキル③: ターン終了まで-5)
  /** スキル④: 次回−50/+100（50%ずつ）&その値で数値確定。残り2pt以下でのみ選べる。 */
  gambleSelected: boolean;
  /** スキル⑤: 出目の強さを逆にする（0pt・ターン中1回・他と併用不可）。 */
  reverseSelected: boolean;
  /** スキル⑥: 停止後にリール1本を選んで引き直す（2pt）。 */
  rerollSelected: boolean;
}

export interface MatchGameRecord {
  gameIndex: number;
  setIndex: number;
  /** 何周目のゲームか（1始まり）。セット内の並び順に使う。 */
  roundInSet?: number;
  results: {
    playerId: number;
    playerName: string;
    rawScore: number | null;
    finalScore: number | null;
    pointsEarned: number; // このゲームで獲得/減少したポイント
    isWinner: boolean;
    isZoromeBonus: boolean;
  }[];
  timestamp: string;
}

export interface MatchSetRecord {
  setIndex: number;
  turnOrderNames: string[];
  gameCount: number;
  setPointChanges: Record<number, number>; // playerId -> set score change
}

