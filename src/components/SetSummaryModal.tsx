import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, BarChart3, Sparkles, RotateCcw } from 'lucide-react';
import { MatchPlayer, MatchGameRecord } from '../types';

interface SetSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextSet: () => void;
  onDisbandRoom: () => void;
  onShowStats?: () => void;
  currentSetIndex: number;
  lastGameRecord: MatchGameRecord | null;
  players: MatchPlayer[];
  winner: MatchPlayer | null;
  isDraw: boolean;
}

export default function SetSummaryModal({
  isOpen,
  onClose,
  onNextSet,
  onDisbandRoom,
  onShowStats,
  currentSetIndex,
  lastGameRecord,
  players,
  winner,
  isDraw,
}: SetSummaryModalProps) {
  if (!isOpen) return null;

  const rankedPlayers = [...players].sort((a, b) => b.totalMatchPoints - a.totalMatchPoints);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-[0_0_60px_rgba(245,158,11,0.3)] flex flex-col gap-4 text-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="text-center bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 p-3.5 rounded-2xl border border-amber-500/40">
            <div className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              第 {currentSetIndex} セット (全{players.length}周) 完了！
            </div>
            <h2 className="text-xl font-black text-yellow-300 mt-1 drop-shadow-md">
              第 {currentSetIndex} セット（全{players.length}周）終了！ 小計結果
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              （全員が全ての手番順を経験した時点のセット総合順位）
            </p>
          </div>

          {/* Winner or Draw */}
          {isDraw ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
              <div className="text-sm font-black text-amber-300">🤝 このセットは同点引き分け！</div>
              <p className="text-[11px] text-slate-400 mt-0.5">大接戦の末、通算ポイントが拮抗しています</p>
            </div>
          ) : winner ? (
            <div className="bg-amber-950/60 border border-amber-400/80 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase">第 {currentSetIndex} セット 勝者</div>
                  <div className="text-base font-black text-yellow-200">{winner.name} 🎉</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400">通算pt</div>
                <div className="text-lg font-black text-emerald-400">
                  {winner.totalMatchPoints >= 0 ? `+${winner.totalMatchPoints}` : winner.totalMatchPoints}pt
                </div>
              </div>
            </div>
          ) : null}

          {/* Standings Table */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex justify-between">
              <span>順位 & プレイヤー</span>
              <span>勝利数 ➔ 累積通算pt</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {rankedPlayers.map((p, rank) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex justify-between items-center ${
                    rank === 0
                      ? 'bg-amber-950/60 border-amber-400/80 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                      {rank === 0 ? '🥇 1位' : rank === 1 ? '🥈 2位' : '🥉 3位'}
                    </span>
                    <span className="font-bold text-sm">{p.name}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 mr-2.5">{p.winCount}勝</span>
                    <strong
                      className={`text-sm ${
                        p.totalMatchPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {p.totalMatchPoints >= 0 ? `+${p.totalMatchPoints}` : p.totalMatchPoints} pt
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={onShowStats}
              className="w-full py-3 bg-slate-900 border border-indigo-500/50 text-indigo-200 hover:bg-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              セットの結果をみる
            </button>

            <button
              onClick={onNextSet}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              第 {currentSetIndex + 1} セットへ進む (手番回転)
            </button>

            <button
              onClick={onDisbandRoom}
              className="w-full py-3.5 px-4 bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              これまでの結果を見て終了
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
