import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, BarChart3, Users, Sparkles, CheckCircle } from 'lucide-react';
import { MatchPlayer, MatchGameRecord } from '../types';

interface RoundSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextRound: () => void;
  onDisbandRoom: () => void;
  currentSetIndex: number;
  currentRoundInSet: number;
  lastRoundRecord: MatchGameRecord | null;
  players: MatchPlayer[];
}

export default function RoundSummaryModal({
  isOpen,
  onClose,
  onNextRound,
  onDisbandRoom,
  currentSetIndex,
  currentRoundInSet,
  lastRoundRecord,
  players,
}: RoundSummaryModalProps) {
  if (!isOpen || !lastRoundRecord) return null;

  const winnerResult = lastRoundRecord.results.find((r) => r.isWinner);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col gap-4 text-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="text-center bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 p-3 rounded-2xl border border-amber-500/30">
            <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              第 {currentSetIndex} セット ➔ 【{currentRoundInSet} 周目】 完了小計
            </div>
            <h2 className="text-lg font-black text-yellow-300 mt-1 drop-shadow-md">
              3人のスコア確定！ 1周目小計結果
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              （3人が各1ターン終了した時点のポイント変動）
            </p>
          </div>

          {/* Winner Banner */}
          {winnerResult ? (
            <div className="bg-amber-950/50 border border-amber-400/60 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase">1位 勝利者</div>
                  <div className="text-sm font-black text-amber-200">{winnerResult.playerName}</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400">確定スコア</div>
                <div className="text-base font-black text-yellow-300">{winnerResult.finalScore}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-center text-xs font-bold text-amber-300">
              🤝 この周は引き分け (DRAW) でした！
            </div>
          )}

          {/* Player Breakdown Table */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex justify-between">
              <span>プレイヤー</span>
              <span>スコア ➔ 獲得pt</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {lastRoundRecord.results.map((res) => (
                <div
                  key={res.playerId}
                  className={`p-2.5 rounded-xl border flex justify-between items-center ${
                    res.isWinner
                      ? 'bg-amber-950/60 border-amber-400/80 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{res.playerName}</span>
                    {res.isWinner && (
                      <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                        1位勝者
                      </span>
                    )}
                    {res.isZoromeBonus && (
                      <span className="text-[9px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded">
                        ゾロ目ボーナス
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 mr-2.5">
                      数値: <strong className="text-cyan-300">{res.finalScore}</strong>
                    </span>
                    <strong
                      className={`text-sm ${
                        res.pointsEarned >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {res.pointsEarned >= 0 ? `+${res.pointsEarned}` : res.pointsEarned} pt
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cumulative Total Standings so far */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              📊 通算累積ポイント
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
              {players.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
                  <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                  <div className={`font-black text-xs ${p.totalMatchPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.totalMatchPoints >= 0 ? `+${p.totalMatchPoints}` : p.totalMatchPoints}pt
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
              onClick={onNextRound}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {currentRoundInSet < 3 ? `次の周 (${currentRoundInSet + 1}周目) へ進む` : 'セット結果ポップアップを表示'}
            </button>

            <button
              onClick={onDisbandRoom}
              className="py-3 px-4 bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
            >
              ルーム終了 (全集計)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
