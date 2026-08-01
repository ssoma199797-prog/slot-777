import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, BarChart3, Sparkles, RotateCcw } from 'lucide-react';
import { MatchPlayer, MatchGameRecord } from '../types';
import { aggregateSet, rankSet, rankLabel, roundsOfSet } from '../utils/stats';

interface SetSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextSet: () => void;
  onDisbandRoom: () => void;
  onShowStats?: () => void;
  currentSetIndex: number;
  lastGameRecord: MatchGameRecord | null;
  gameHistory: MatchGameRecord[];
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
  gameHistory,
  players,
  winner,
  isDraw,
}: SetSummaryModalProps) {
  if (!isOpen) return null;

  // This screen is about the set that just ended, so rank by what was earned
  // inside it — `totalMatchPoints` is the running session total and made every
  // set show the same standings.
  const setAggregate = aggregateSet(gameHistory, currentSetIndex);
  const setRanking = rankSet(setAggregate);
  const rounds = roundsOfSet(gameHistory, currentSetIndex);
  const sessionTotals = new Map(players.map((p) => [p.id, p.totalMatchPoints]));

  // Rendered into <body>: these panels sit inside the cabinet, whose animated
  // ancestors create stacking contexts that trapped a fixed overlay behind the
  // game screen no matter how high its z-index was.
  return createPortal(
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
              第 {currentSetIndex} セット 終了
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              全員が全ての手番順を一巡しました
            </p>
          </div>

          {/* Each round of the set and who took it. A single "set winner" line was
              read as the winner of the last game, so the rounds are listed out. */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              周ごとの勝者
            </div>
            {rounds.length === 0 ? (
              <div className="text-[11px] text-slate-500 text-center py-1">記録がありません</div>
            ) : (
              rounds.map((r) => (
                <div
                  key={r.gameIndex}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs"
                >
                  <span className="text-slate-400 text-[11px]">{r.roundInSet}周目</span>
                  {r.isDraw ? (
                    <span className="text-amber-300 font-bold">🤝 引き分け</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="font-black text-yellow-200">{r.winnerName}</span>
                      <span className="text-emerald-400 font-bold">
                        {r.winnerPoints >= 0 ? `+${r.winnerPoints}` : r.winnerPoints}pt
                      </span>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Standings Table */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex justify-between">
              <span>このセットの順位 ({setAggregate.gameCount}ゲーム)</span>
              <span>セットpt ／ 通算pt</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {setRanking.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-500">
                  このセットの記録がまだありません
                </div>
              ) : (
                setRanking.map((row, rank) => {
                  const total = sessionTotals.get(row.playerId) ?? 0;
                  return (
                    <div
                      key={row.playerId}
                      className={`p-2.5 rounded-xl border flex justify-between items-center ${
                        rank === 0
                          ? 'bg-amber-950/60 border-amber-400/80 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                          {rankLabel(rank)}
                        </span>
                        <span className="font-bold text-sm">{row.name}</span>
                        <span className="text-[10px] text-slate-400">{row.wins}勝</span>
                      </div>

                      <div className="text-right">
                        <strong className={`text-sm ${row.points >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.points >= 0 ? `+${row.points}` : row.points}
                        </strong>
                        <span className="text-[10px] text-slate-500 ml-2">
                          通算 {total >= 0 ? `+${total}` : total}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={onNextSet}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              第 {currentSetIndex + 1} セットへ進む (手番回転)
            </button>

            {/* The tally opens on top of this screen and closing it comes back
                here, so ending the session is always a deliberate second step. */}
            <button
              onClick={onShowStats}
              className="w-full py-3 bg-slate-900 border border-indigo-500/50 text-indigo-200 hover:bg-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              入室からの集計をみる（ここから終了できます）
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
