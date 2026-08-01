import React, { useState } from 'react';
import { MatchPlayer, SkillSelection, MatchGameRecord, MatchSetRecord } from '../types';
import { Trophy, Zap, CheckCircle2, RotateCcw, User, Play, BarChart3, Sparkles, Layers, Edit3, Smartphone, Smile, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SlotLever from './SlotLever';

interface MatchPanelProps {
  playerCount: number;
  setPlayerCount: (count: number) => void;
  playerNames: string[];
  setPlayerNames: React.Dispatch<React.SetStateAction<string[]>>;
  players: MatchPlayer[];
  activePlayerIndex: number;
  matchState: 'setup' | 'lobby' | 'playing' | 'set_summary' | 'game_over';
  skillSelection: SkillSelection;
  setSkillSelection: React.Dispatch<React.SetStateAction<SkillSelection>>;
  onSkillAnnounce?: (text: string | null, bonus: number) => void;
  onStartMatch: () => void;
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
  onLaunchGame?: () => void;
  onPassPlayer: () => void;
  onResetMatch: () => void;
  onNextSet: () => void;
  onDisbandRoom: () => void;
  isSpinning: boolean;
  totalSkillCost: number;
  totalMinusBonus: number;
  winner: MatchPlayer | null;
  isDraw: boolean;
  currentSetIndex: number;
  currentTurnInSet: number;
  turnOrderNames: string[];
  lastGameRecord: MatchGameRecord | null;
  gameHistory?: MatchGameRecord[];
  setHistory?: MatchSetRecord[];
  isSkillEffectActive?: boolean;
  skillEffectText?: string | null;
  onSendStamp?: (stampText: string, senderName: string) => void;
  onTriggerNormalSpin: () => void;
  onTriggerInstantSpin: () => void;
  onShowStats?: () => void;
  canLaunchGame?: boolean;
  lobbyReadyCount?: number;
  lobbyTotalCount?: number;
  section?: 'upper' | 'lower' | 'full';
  roomId?: string;
  setRoomId?: (id: string) => void;
  myPlayerId?: number;
  setMyPlayerId?: (id: number) => void;
  joinMode?: 'create' | 'join';
  setJoinMode?: (mode: 'create' | 'join') => void;
  customRoomInput?: string;
  setCustomRoomInput?: (val: string) => void;
  userNameInput?: string;
  setUserNameInput?: (val: string) => void;
}

const STAMP_LIST = [
  'やーいやーい‼️',
  'もりりもりり〜',
  '💩',
  'なんで回さんかったん❓',
  'ここで終わることもできます',
  'ぴゅっぴゅ💦',
];

export default function MatchPanel({
  playerCount,
  setPlayerCount,
  playerNames,
  setPlayerNames,
  players,
  activePlayerIndex,
  matchState,
  skillSelection,
  setSkillSelection,
  onSkillAnnounce,
  onStartMatch,
  onCreateRoom,
  onJoinRoom,
  onLaunchGame,
  onPassPlayer,
  onResetMatch,
  onNextSet,
  onDisbandRoom,
  isSpinning,
  totalSkillCost,
  totalMinusBonus,
  winner,
  isDraw,
  currentSetIndex,
  currentTurnInSet,
  turnOrderNames,
  lastGameRecord,
  gameHistory,
  setHistory,
  onSendStamp,
  onTriggerNormalSpin,
  onTriggerInstantSpin,
  onShowStats,
  canLaunchGame = true,
  lobbyReadyCount = 0,
  lobbyTotalCount = 0,
  section = 'full',
  roomId = 'ROOM-777',
  setRoomId,
  myPlayerId = 1,
  setMyPlayerId,
  joinMode: propsJoinMode,
  setJoinMode: propsSetJoinMode,
  customRoomInput: propsCustomRoomInput,
  setCustomRoomInput: propsSetCustomRoomInput,
  userNameInput: propsUserNameInput,
  setUserNameInput: propsSetUserNameInput,
}: MatchPanelProps) {
  const [showRuleQuickSheet, setShowRuleQuickSheet] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [localJoinMode, setLocalJoinMode] = useState<'create' | 'join'>('create');
  const [localCustomRoom, setLocalCustomRoom] = useState<string>('ROOM-777');
  const [localUserName, setLocalUserName] = useState<string>('おれ');

  const joinMode = propsJoinMode ?? localJoinMode;
  const setJoinMode = propsSetJoinMode ?? setLocalJoinMode;
  const customRoomInput = propsCustomRoomInput ?? localCustomRoom;
  const setCustomRoomInput = propsSetCustomRoomInput ?? setLocalCustomRoom;
  const userNameInput = propsUserNameInput ?? localUserName;
  const setUserNameInput = propsSetUserNameInput ?? setLocalUserName;

  const activePlayer = players[activePlayerIndex];

  // Check if current device is the active turn player
  const isMyTurn = !myPlayerId || (activePlayer && activePlayer.id === myPlayerId);

  // Helper to handle player name change
  const handleNameChange = (index: number, name: string) => {
    setPlayerNames((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  // Helper to trigger stamp reaction
  const handleStampClick = (stampText: string) => {
    if (!onSendStamp) return;
    const myPlayer = players.find((p) => p.id === myPlayerId);
    const sender = myPlayer ? myPlayer.name : activePlayer ? activePlayer.name : '観客';
    onSendStamp(stampText, sender);
  };

  // Helper to copy full share link
  const handleCopyShareLink = () => {
    const shareUrl = window.location.origin + window.location.pathname + '?room=' + roomId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2500);
    }
  };

  // Helper to toggle Skill 1 (-20: 1pt cost, max 1 per spin)
  const announce = (sel: SkillSelection, text: string | null) => {
    const bonus =
      sel.minus20Count * 20 +
      (sel.minus40Selected ? 40 : 0) +
      (sel.minus5Selected || activePlayer?.skillsActive.minus5Active ? 5 : 0);
    onSkillAnnounce?.(text, bonus);
  };

  const handleToggleMinus20 = () => {
    if (!isMyTurn || isSpinning || matchState !== 'playing' || !activePlayer) return;
    const prev = skillSelection;
    let nextCount = prev.minus20Count > 0 ? 0 : 1; // 0 <-> 1 (取り消し可)
    const minus5Cost = prev.minus5Selected ? 1 : 0;
    if (nextCount > 0 && activePlayer.points < nextCount * 1 + minus5Cost + 1) nextCount = 0;

    const next = { ...prev, minus20Count: nextCount, minus40Selected: false };
    setSkillSelection(next);
    announce(next, nextCount > 0 ? '−20 セット' : null);
  };

  // Helper to toggle Skill 2 (-40: 3pt cost)
  const handleToggleMinus40 = () => {
    if (!isMyTurn || isSpinning || matchState !== 'playing' || !activePlayer) return;
    const prev = skillSelection;
    const willSelect = !prev.minus40Selected;
    const minus5Cost = prev.minus5Selected ? 1 : 0;
    if (willSelect && activePlayer.points < (willSelect ? 3 : 0) + minus5Cost + 1) return;

    const next = { ...prev, minus40Selected: willSelect, minus20Count: 0 };
    setSkillSelection(next);
    announce(next, willSelect ? '−40 セット' : null);
  };

  // Helper to toggle Skill 3 (turn minus5: 1pt cost)
  const handleToggleMinus5 = () => {
    if (!isMyTurn || isSpinning || matchState !== 'playing' || !activePlayer) return;
    if (activePlayer.skillsActive.minus5Active) return;

    const prev = skillSelection;
    const willSelect = !prev.minus5Selected;
    const otherCost = prev.minus20Count * 1 + (prev.minus40Selected ? 3 : 0);
    if (willSelect && activePlayer.points < otherCost + (willSelect ? 1 : 0) + 1) return;

    const next = { ...prev, minus5Selected: willSelect };
    setSkillSelection(next);
    announce(next, willSelect ? 'ターン中 −5 セット' : null);
  };

  const canAffordMinus20Step = (targetCount: number) => {
    if (!activePlayer) return false;
    const minus5Cost = skillSelection.minus5Selected ? 1 : 0;
    const req = targetCount * 1 + minus5Cost + 1;
    return activePlayer.points >= req;
  };

  const canAffordMinus40 = () => {
    if (!activePlayer) return false;
    const minus5Cost = skillSelection.minus5Selected ? 1 : 0;
    const req = 3 + minus5Cost + 1;
    return activePlayer.points >= req;
  };

  const canAffordMinus5 = () => {
    if (!activePlayer) return false;
    if (activePlayer.skillsActive.minus5Active) return true;
    const otherSkillCost = skillSelection.minus20Count * 1 + (skillSelection.minus40Selected ? 3 : 0);
    const req = otherSkillCost + 1 + 1;
    return activePlayer.points >= req;
  };

  const showUpper = section === 'upper' || section === 'full';
  const showLower = section === 'lower' || section === 'full';

  return (
    <div className={`w-full flex flex-col gap-1.5 ${section === 'full' ? 'bg-slate-900/90 border border-amber-500/30 p-2 sm:p-3.5 rounded-3xl shadow-xl backdrop-blur-md' : ''}`}>
      {/* UPPER SECTION */}
      {showUpper && (
        <>
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <h2 className="text-xs font-black text-amber-300 tracking-wide font-mono uppercase">
                  ⚔️ オンラインスロット対戦
                </h2>
                {matchState !== 'setup' && (
                  <span className="text-[8px] text-slate-400 font-mono block leading-none mt-0.5">
                    第 {currentSetIndex} セット・{currentTurnInSet} / {players.length} 周目
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowRuleQuickSheet((prev) => !prev)}
                className="text-[9px] font-bold text-cyan-300 hover:text-cyan-100 flex items-center gap-1 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded-lg transition cursor-pointer hover:bg-cyan-900 shadow-sm"
                title="簡易ルールガイド"
              >
                <Info className="w-3 h-3 text-cyan-400" /> ルール
              </button>

              <button
                onClick={onShowStats}
                className="text-[9px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded-lg transition cursor-pointer hover:bg-amber-900/80 shadow-sm"
                title="全集計表示"
              >
                <BarChart3 className="w-3 h-3 text-amber-400" /> 集計
              </button>

              {matchState !== 'setup' && (
                <button
                  // Ending the session goes through the tally: you see every game
                  // played since joining, and only then decide to close it.
                  onClick={onShowStats}
                  className="text-[9px] font-bold text-rose-300 hover:text-rose-100 flex items-center gap-1 bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.5 rounded-lg transition cursor-pointer hover:bg-rose-900 shadow-sm"
                  title="集計を見てセッションを終了する"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" /> 終了
                </button>
              )}
            </div>
          </div>

          {/* Quick Rule Cheat-Sheet Popover */}
          <AnimatePresence>
            {showRuleQuickSheet && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 border border-cyan-500/30 rounded-xl p-2 text-[9px] text-slate-300 space-y-1 font-mono overflow-hidden"
              >
                <div className="font-bold text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> スコア＆勝敗クイックルール
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>1ターンで<strong>最大5pt</strong>までスキル追加やスピンが可能。</li>
                  <li>「確定」を押すと現在の数値を持ち点として即ターン終了。</li>
                  <li>勝者: 通常 <strong className="text-amber-300">+2000pt</strong> / マイナス値勝 <strong className="text-rose-400">+4000pt</strong> / ゾロ目勝 <strong className="text-yellow-300">+3000pt</strong></li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SETUP STATE: Online Lobby Entry */}
          {matchState === 'setup' && (
            <div className="flex flex-col gap-2.5 text-center py-1">
              <div className="space-y-3 text-left">
                {/* Room ID & Mode Selector */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> 対戦ルームID
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">同じIDで合流</span>
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    value={customRoomInput}
                    onChange={(e) => setCustomRoomInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-indigo-200 font-bold font-mono focus:outline-none focus:border-indigo-400 transition"
                    placeholder="例: GLOBAL_LOBBY または ROOM-777"
                  />
                </div>

                {/* User Name Input */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                    <User className="w-3.5 h-3.5 text-amber-400" /> あなたのユーザー名を入力
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400 transition"
                    placeholder="例: プレイヤー1"
                  />
                </div>

                <button
                  onClick={onStartMatch || onCreateRoom}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>オンライン対戦待機室に入る</span>
                </button>
              </div>
            </div>
          )}

          {/* LOBBY STATE: Waiting Room */}
          {matchState === 'lobby' && (
            <div className="flex flex-col gap-2.5 text-center py-1">
              <div className="bg-slate-950 border-2 border-amber-500/60 rounded-2xl p-3 text-center space-y-2 relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <div className="text-[11px] font-black text-amber-400 tracking-wider uppercase flex items-center justify-center gap-1 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} /> オンライン対戦待機室 [{roomId}]
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-200 font-bold leading-relaxed space-y-1.5">
                  <div>📱 スマホ・別PC・別タブで同じURLを開くだけで合流できます！</div>
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[10px] rounded-lg font-bold hover:bg-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{copiedRoomId ? '✓ 招待URLをコピーしました！' : '🔗 対戦URLをコピーして友達に送信'}</span>
                  </button>
                </div>
              </div>

              {/* Joined Players Grid */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-2 text-left">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between font-mono">
                  <span>👥 参加中のプレイヤー ({playerNames.filter(Boolean).length}人)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-normal">🟢 リアルタイム同期中</span>
                  </div>
                </div>

                {/* My Slot Selector */}
                <div className="flex items-center justify-between bg-slate-900/80 border border-amber-500/40 rounded-lg p-2 text-xs">
                  <span className="text-slate-300 font-bold text-[10px] font-mono">👤 自分の操作枠:</span>
                  <select
                    value={myPlayerId}
                    onChange={(e) => setMyPlayerId?.(Number(e.target.value))}
                    className="bg-slate-950 border border-amber-500/60 text-amber-300 text-xs font-bold rounded px-2 py-1 focus:outline-none cursor-pointer font-mono"
                  >
                    {playerNames.map((pName, idx) => (
                      <option key={idx} value={idx + 1}>
                        {idx + 1}P: {pName || `プレイヤー${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  {playerNames.filter(Boolean).map((pName, idx) => {
                    const pId = idx + 1;
                    const isMe = myPlayerId === pId;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition ${
                          isMe
                            ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isMe ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {pId}P
                          </span>
                          <input
                            type="text"
                            maxLength={10}
                            value={pName}
                            onChange={(e) => handleNameChange(idx, e.target.value)}
                            className="bg-transparent text-xs font-bold focus:outline-none focus:border-b border-amber-400 transition"
                          />
                          {isMe && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono">
                              あなた
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">✓ 待機中</span>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start button */}
              <div className="space-y-1.5">
                <button
                  onClick={onLaunchGame || onStartMatch}
                  disabled={!canLaunchGame}
                  className={`w-full py-3.5 font-black text-xs rounded-xl shadow-xl transition flex items-center justify-center gap-1.5 ${
                    canLaunchGame
                      ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Play className={`w-4 h-4 ${canLaunchGame ? 'fill-slate-950' : 'fill-slate-500'}`} />
                  {canLaunchGame
                    ? '全員揃ったので対戦開始！'
                    : `待機室に全員が入るまで待っています (${lobbyReadyCount}/${lobbyTotalCount})`}
                </button>
                <button
                  onClick={onDisbandRoom}
                  className="w-full py-1.5 bg-slate-900 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-lg border border-slate-800 transition cursor-pointer"
                >
                  退室する
                </button>
              </div>
            </div>
          )}

          {/* PLAYING STATE: Turn Order & Confirmed Scores */}
          {matchState === 'playing' && activePlayer && (
            <div className="flex flex-col gap-1.5">
              {/* 各プレイヤーの確定数値 (Confirmed Scores) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex flex-col gap-0.5">
                <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider flex justify-between items-center font-mono">
                  <span>プレイヤー状況（スキル適用済）</span>
                  <span className="text-emerald-400 text-[8px]">🟢 同期中</span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {players.map((p, idx) => {
                    const isActive = idx === activePlayerIndex;
                    return (
                      <div
                        key={p.id}
                        className={`p-1 rounded-lg border font-mono text-[9.5px] flex justify-between items-center transition-all ${
                          isActive
                            ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.2)]'
                            : p.hasPassed
                            ? 'bg-slate-900/90 border-slate-800 text-emerald-300'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="truncate max-w-[50px] font-bold">
                          {p.name}
                        </div>

                        <div className="text-right font-black shrink-0">
                          {isActive ? (
                            <span className="text-amber-300 flex items-center gap-1">
                              {p.currentScore !== null && <span>{p.currentScore}</span>}
                              <span className="text-[8px] bg-amber-500 text-amber-950 px-1 rounded animate-pulse">遊戯中</span>
                            </span>
                          ) : p.currentScore !== null ? (
                            <span className="text-emerald-300">{p.currentScore}</span>
                          ) : (
                            <span className="text-slate-600 text-[8px]">未確定</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* LOWER SECTION (レバー・スキル一体化四角欄 & スタンプ) */}
      {showLower && matchState === 'playing' && activePlayer && (
        <div className="flex flex-col gap-1.5">
          {/* ALL-IN-ONE CONTROL CABINET (レバー・スキル・乱数調整・確定の一体化四角欄) */}
          <div className={`bg-slate-950 border-2 rounded-2xl p-2 flex flex-col gap-1 shadow-xl my-0.5 relative overflow-hidden transition-all ${
            isMyTurn ? 'border-slate-800' : 'border-slate-900 opacity-50 pointer-events-none select-none'
          }`}>
            {!isMyTurn && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40">
                <span className="text-[10px] font-mono font-bold text-rose-300 bg-slate-950/90 border border-rose-500/40 rounded-full px-3 py-1">
                  観戦中 ・ 操作できません
                </span>
              </div>
            )}
            {/* Panel Header & Simple Turn Order */}
            <div className="flex items-center justify-between text-[9px] font-mono border-b border-slate-900 pb-1 px-0.5 gap-1">
              {/* Simple Player Turn Sequence Order */}
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto py-0.5 shrink-0 scrollbar-none">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">手番順:</span>
                {players.map((p, idx) => {
                  const isCurrent = p.id === activePlayer.id;
                  const isYou = p.id === myPlayerId;
                  return (
                    <React.Fragment key={p.id}>
                      {idx > 0 && <span className="text-slate-700 text-[8px]">→</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold whitespace-nowrap flex items-center gap-0.5 border ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-sm'
                          : p.hasPassed
                          ? 'bg-slate-900 text-slate-500 border-slate-800 line-through'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800'
                      }`}>
                        {isCurrent && <span className="text-[7px]">▶</span>}
                        {p.name}{isYou ? '(自分)' : ''}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <span className="bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[8.5px] flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                  残{activePlayer.points}pt
                </span>
              </div>
            </div>

            {/* LOWER CONTROLS SECTION */}
            <div className="flex items-stretch gap-1.5 pt-0.5">
              {/* LEFT: Slot Lever */}
              <div className="flex flex-col items-center justify-center shrink-0 bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <SlotLever
                  onTrigger={onTriggerNormalSpin}
                  disabled={!isMyTurn || isSpinning || (activePlayer && activePlayer.points <= 0)}
                  compact={true}
                />
              </div>

              {/* RIGHT: Skills + 乱数調整 */}
              <div className="flex-1 flex flex-col gap-1 min-w-0 justify-between">
                {/* 1. Skill Section */}
                <div className="space-y-0.5">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono px-0.5 flex justify-between items-center">
                    <span>⚡ スキル選択 (発動Cost)</span>
                    {!isMyTurn && <span className="text-rose-400 font-normal">※相手の手番中</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {/* SKILL 1: -20 */}
                    <button
                      onClick={handleToggleMinus20}
                      disabled={!isMyTurn || isSpinning || (!skillSelection.minus20Count && !canAffordMinus20Step(1))}
                      className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg border transition-all text-center cursor-pointer ${
                        skillSelection.minus20Count > 0
                          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_6px_rgba(34,211,238,0.3)]'
                          : canAffordMinus20Step(1) && isMyTurn
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="text-[8.5px] font-bold leading-tight">次回 -20</div>
                      <div className="text-[9.5px] font-black text-cyan-300 font-mono leading-tight mt-0.5">
                        {skillSelection.minus20Count === 0 ? '1pt' : '1回(-20)'}
                      </div>
                    </button>

                    {/* SKILL 2: -40 */}
                    <button
                      onClick={handleToggleMinus40}
                      disabled={!isMyTurn || isSpinning || (!skillSelection.minus40Selected && !canAffordMinus40())}
                      className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg border transition-all text-center cursor-pointer ${
                        skillSelection.minus40Selected
                          ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_6px_rgba(192,132,252,0.3)]'
                          : canAffordMinus40() && isMyTurn
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:bg-slate-800'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="text-[8.5px] font-bold leading-tight">次回 -40</div>
                      <div className="text-[9.5px] font-black text-purple-300 font-mono leading-tight mt-0.5">3pt</div>
                    </button>

                    {/* SKILL 3: Turn -5 */}
                    <button
                      onClick={handleToggleMinus5}
                      disabled={!isMyTurn || isSpinning || activePlayer?.skillsActive.minus5Active || (!skillSelection.minus5Selected && !canAffordMinus5())}
                      className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg border transition-all text-center cursor-pointer ${
                        activePlayer?.skillsActive.minus5Active
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : skillSelection.minus5Selected
                          ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_6px_rgba(52,211,153,0.3)]'
                          : canAffordMinus5() && isMyTurn
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:bg-slate-800'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="text-[8.5px] font-bold leading-tight">ターン中-5</div>
                      <div className="text-[9.5px] font-black text-emerald-300 font-mono leading-tight mt-0.5">
                        {activePlayer?.skillsActive.minus5Active ? '継続中' : '1pt'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Action Control (⚡ 乱数調整) — 数値確定はリール上部のみ */}
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <button
                    disabled={!isMyTurn || isSpinning}
                    onClick={onTriggerInstantSpin}
                    className={`py-1.5 px-1 rounded-lg font-display font-bold transition-all border uppercase text-center cursor-pointer flex items-center justify-center gap-1 ${
                      !isMyTurn || isSpinning
                        ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:brightness-110 border-indigo-400/80 text-white shadow-sm active:scale-95'
                    }`}
                    title="3桁同時に即時揃え（乱数調整・0pt消費）"
                  >
                    <span className="text-[9.5px] font-black tracking-tight">⚡ 乱数調整</span>
                    <span className="text-[7.5px] font-mono text-cyan-300 font-bold">(0pt)</span>
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* STAMP REACTION BAR */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[8.5px] font-mono text-amber-400 font-bold px-0.5">
              <span className="flex items-center gap-1">
                <Smile className="w-2.5 h-2.5 text-amber-300" /> リアクションスタンプ
              </span>
              <span className="text-[7.5px] text-slate-500">画面浮遊</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5">
              {STAMP_LIST.map((stamp, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleStampClick(stamp)}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-400/60 hover:bg-amber-950/40 text-[9px] py-1 px-0.5 rounded-lg font-bold transition active:scale-90 cursor-pointer text-amber-200 truncate text-center shadow-sm"
                  title={`${stamp} を送信`}
                >
                  {stamp}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
