import React from 'react';
import { createPortal } from 'react-dom';
import { MatchPlayer, MatchGameRecord, MatchSetRecord } from '../types';
import { aggregateAllSets, aggregateSession, rankSet, rankLabel, pointSeries } from '../utils/stats';
import PointsTrendChart from './PointsTrendChart';
import { Trophy, BarChart3, Clock, X, Award, Flame, Users, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface MatchStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: MatchPlayer[];
  gameHistory: MatchGameRecord[];
  setHistory: MatchSetRecord[];
  currentSetIndex: number;
  onDisbandRoom?: () => void;
}

export default function MatchStatsModal({
  isOpen,
  onClose,
  players,
  gameHistory,
  setHistory,
  currentSetIndex,
  onDisbandRoom,
}: MatchStatsModalProps) {
  if (!isOpen) return null;

  // Sort players by totalMatchPoints descending
  // Derived from the game log so it cannot disagree with the per-game records.
  const setAggregates = aggregateAllSets(gameHistory);
  // The session total is the sum of every set, so it is summed from the same log
  // rather than read off the players — the two can only ever agree this way.
  const sessionRanking = rankSet(aggregateSession(gameHistory));
  const livePlayers = new Map(players.map((p) => [p.id, p]));
  const series = pointSeries(gameHistory);
  const seriesByPlayer = new Map(series.map((s) => [s.playerId, s]));

  // Rendered into <body>: these panels sit inside the cabinet, whose animated
  // ancestors create stacking contexts that trapped a fixed overlay behind the
  // game screen no matter how high its z-index was.
  return createPortal(
    // Above the round/set summaries (z-[10005]): the tally is opened *from* those
    // screens, so at z-50 it rendered behind them and looked like nothing happened.
    <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-300 font-mono tracking-wide flex items-center gap-2">
                📊 セッション全集計
              </h2>
              <p className="text-[10px] text-slate-400 font-sans">
                入室してから今この試合までの全対戦記録・通算ポイント
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar text-slate-200">
          
          {/* Top Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Trophy className="w-4 h-4 text-amber-400" /> 入室からの通算（全セット合計）
              </span>
              <span className="text-[10px] text-slate-400 font-mono">現在第 {currentSetIndex} セット</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sessionRanking.map((row, rank) => {
                let badgeColor = "bg-slate-800 border-slate-700 text-slate-400";
                if (rank === 0) {
                  badgeColor = "bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
                } else if (rank === 1) {
                  badgeColor = "bg-slate-800/90 border-slate-400 text-slate-200";
                } else if (rank === 2) {
                  badgeColor = "bg-amber-900/30 border-amber-700/60 text-amber-400/80";
                }
                const live = livePlayers.get(row.playerId);

                return (
                  <div
                    key={row.playerId}
                    className={`p-3 rounded-2xl border flex flex-col justify-between relative overflow-hidden ${badgeColor}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-white/10 font-mono">
                        {rankLabel(rank)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{row.wins}勝</span>
                    </div>

                    <div className="my-1">
                      <div className="text-sm font-black truncate">{row.name}</div>
                      <div className="text-xl font-black font-mono mt-0.5 flex items-baseline gap-1">
                        <span className={row.points >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {row.points >= 0 ? `+${row.points}` : row.points}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">pt</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-white/10 font-mono">
                      <div className="text-[9px] text-slate-400 mb-0.5">周ごとの結果</div>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] font-bold">
                        {(seriesByPlayer.get(row.playerId)?.changes ?? []).length === 0 ? (
                          <span className="text-slate-500 font-normal">まだありません</span>
                        ) : (
                          (seriesByPlayer.get(row.playerId)?.changes ?? []).map((change, i) => (
                            <span
                              key={i}
                              className={change >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {change >= 0 ? `+${change}` : change}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">残りHP: {live?.points ?? 0}pt</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cumulative points over the session — one chart, every player */}
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-2">
              <Users className="w-4 h-4 text-amber-400" /> 通算ポイントの推移
            </span>
            <PointsTrendChart series={series} />
          </div>

          {/* Rule Points Calculation Reference */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 font-sans">
            <div className="font-bold text-amber-400 flex items-center gap-1 font-mono text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> ポイント集計配分ルール（ゼロサム方式）
            </div>
            <ul className="text-[10px] space-y-1 text-slate-400 list-disc list-inside">
              <li><strong>1位勝利獲得pt</strong>: スキル適用後 <span className="text-rose-400">マイナス(&lt; 0)で勝利: +4000pt</span> / <span className="text-amber-300">10以下で勝利: +3000pt</span> / 通常勝利: +2000pt</li>
              <li><strong>2位・3位の減算pt</strong>: 1位とのスコア差の比率で1位の獲得ptを分配マイナス（合計が常にゼロ）</li>
              <li><strong>ゾロ目特別ボーナス</strong>: 5pt全消費＆ゾロ目勝利で<span className="text-yellow-300 font-bold">1位+3000pt固定</span>（他2人は各自-1500pt）</li>
            </ul>
          </div>

          {/* Per-set breakdown */}
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-2">
              <Award className="w-4 h-4 text-amber-400" /> セット別の集計 ({setAggregates.length} セット)
            </span>

            {setAggregates.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                まだセットの記録はありません
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {setAggregates.map((agg) => (
                  <div key={agg.setIndex} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1 mb-1.5">
                      <span>第 {agg.setIndex} セット</span>
                      <span>{agg.gameCount} ゲーム</span>
                    </div>
                    <div className="space-y-1">
                      {rankSet(agg).map((row, rank) => (
                        <div key={row.playerId} className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 w-10">{rankLabel(rank)}</span>
                            <span className="font-bold">{row.name}</span>
                            <span className="text-[9px] text-slate-500">{row.wins}勝</span>
                          </span>
                          <strong className={row.points >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {row.points >= 0 ? `+${row.points}` : row.points}pt
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Game History Log */}
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-2">
              <Clock className="w-4 h-4 text-amber-400" /> ゲーム対戦記録履歴 ({gameHistory.length} 回プレイ)
            </span>

            {gameHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                まだ対戦記録はありません。対戦を開始するとこちらに全記録が集計されます！
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {gameHistory.map((game) => (
                  <div
                    key={game.gameIndex}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-1.5 text-xs font-mono"
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                      <span>第 {game.setIndex} セット - ゲーム #{game.gameIndex}</span>
                      <span>{game.timestamp}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                      {game.results.map((res) => (
                        <div
                          key={res.playerId}
                          className={`p-1.5 rounded-lg border text-[11px] flex justify-between items-center ${
                            res.isWinner
                              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-200">{res.playerName}</span>
                            {res.isWinner && <span className="ml-1 text-[9px] text-amber-400">👑1位</span>}
                            {res.isZoromeBonus && <span className="ml-1 text-[8px] bg-yellow-500 text-slate-950 font-bold px-1 rounded">ゾロ目</span>}
                          </div>

                          <div className="text-right">
                            <div className="text-[10px]">
                              {res.finalScore !== null ? (
                                <span>
                                  {res.rawScore !== res.finalScore && (
                                    <span className="line-through opacity-50 mr-1 text-[9px]">{res.rawScore}</span>
                                  )}
                                  <strong className="text-amber-300">{res.finalScore}</strong>
                                </span>
                              ) : (
                                '---'
                              )}
                            </div>
                            <div className={`font-bold text-[10px] ${res.pointsEarned >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {res.pointsEarned >= 0 ? `+${res.pointsEarned}` : res.pointsEarned}pt
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            対戦に戻る
          </button>

          {onDisbandRoom && (
            <button
              onClick={() => {
                if (confirm('セッションを終了します。ここまでの集計は消えます。よろしいですか？')) {
                  onDisbandRoom();
                  onClose();
                }
              }}
              className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> セッションを終了する
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
