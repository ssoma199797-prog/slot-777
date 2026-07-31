import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { performLottery, isZoromeVal } from './utils/effects';
import { toggleMute, isSoundEnabled, playWinFanfare, playCutinSound, playPuchunSound, playFreezeRevealSound, playButtonUnlockSound, playRewriteTriggerSound, playRewriteSuccessSound, playRewriteFailureSound, playMockTriggerSound, playMockLaughSound, playLeverOn, playWeirdLeverSound, playZoromeVictorySound, playStampSound } from './utils/audio';
import { CutinEffect, CutinTiming, SlotState, HistoryItem, MismatchType, RewriteTriggerType, MatchPlayer, SkillSelection, MatchGameRecord, MatchSetRecord } from './types';
import SlotLCD from './components/SlotLCD';
import SlotReels from './components/SlotReels';
import SlotLever from './components/SlotLever';
import MatchPanel from './components/MatchPanel';
import RoundSummaryModal from './components/RoundSummaryModal';
import SetSummaryModal from './components/SetSummaryModal';
import MatchStatsModal from './components/MatchStatsModal';
import { Settings, RefreshCw, BarChart2, Star, Volume2, VolumeX, Sparkles, HelpCircle, History, Trophy, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const rainbowStars = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 110 - 20}%`,
      left: `${Math.random() * 50 + 80}%`,
      size: Math.random() * 18 + 12,
      delay: Math.random() * 2.2,
      duration: Math.random() * 1.6 + 1.2,
    }));
  }, []);

  // Config state
  const [minLimit] = useState(1);
  const [maxLimit, setMaxLimit] = useState(500);
  const [inputMax, setInputMax] = useState('500');
  const [cutinFrequency, setCutinFrequency] = useState<'high' | 'normal' | 'low'>('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeView, setActiveView] = useState<'play' | 'match' | 'settings'>('play');
  const activeViewRef = useRef<'play' | 'match' | 'settings'>('play');
  activeViewRef.current = activeView;

  // Match Mode states
  const [playerCount, setPlayerCount] = useState<number>(3);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [matchState, setMatchState] = useState<'setup' | 'lobby' | 'playing' | 'set_summary' | 'game_over'>('setup');
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [currentSetIndex, setCurrentSetIndex] = useState<number>(1);
  const [currentRoundInSet, setCurrentRoundInSet] = useState<number>(1);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isSetSummaryOpen, setIsSetSummaryOpen] = useState<boolean>(false);
  const [totalGamesCount, setTotalGamesCount] = useState<number>(0);
  const [skillSelection, setSkillSelection] = useState<SkillSelection>({
    minus20Count: 0,
    minus40Selected: false,
    minus5Selected: false,
  });
  const [matchWinner, setMatchWinner] = useState<MatchPlayer | null>(null);
  const [isMatchDraw, setIsMatchDraw] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<MatchGameRecord[]>([]);
  const [setRecords, setSetRecords] = useState<MatchSetRecord[]>([]);
  const [lastGameRecord, setLastGameRecord] = useState<MatchGameRecord | null>(null);
  const [isSkillEffectActive, setIsSkillEffectActive] = useState<boolean>(false);
  const [skillEffectText, setSkillEffectText] = useState<string | null>(null);

  // Flying reaction stamps state
  const [flyingStamps, setFlyingStamps] = useState<{ id: string; text: string; sender: string; x: number }[]>([]);

  const handleSendStamp = (stampText: string, senderName: string, isRemote = false) => {
    playStampSound();
    const id = Math.random().toString(36).substring(2, 9);
    const x = Math.floor(Math.random() * 60) + 20;
    const stamp = { id, text: stampText, sender: senderName, x };
    setFlyingStamps((prev) => [...prev.slice(-10), stamp]);
    setTimeout(() => {
      setFlyingStamps((prev) => prev.filter((s) => s.id !== id));
    }, 2800);

    // Relay to every other device in the room (the receive path already existed,
    // but nothing was ever sending, so stamps never left the local screen).
    if (!isRemote && activeViewRef.current === 'match') {
      syncRoomStateToServer(null, {
        type: 'SEND_STAMP',
        senderId: myPlayerId,
        stampText: String(stampText).slice(0, 40),
        senderName: String(senderName).slice(0, 20),
      });
    }
  };

  // Slot System dynamic states
  const [targetValue, setTargetValue] = useState<number>(777);
  const [gameState, setGameState] = useState<SlotState>('idle');
  const gameStateRef = useRef<SlotState>('idle');

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  const [isInstant, setIsInstant] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<CutinEffect | null>(null);
  const [effectTiming, setEffectTiming] = useState<CutinTiming>('none');
  const [activeCutinVisible, setActiveCutinVisible] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [stoppedCount, setStoppedCount] = useState<number>(0);
  // Mirrors stoppedCount so reel-stop handlers can read it without a state updater.
  const stoppedCountRef = useRef<number>(0);
  const [isBlackout, setIsBlackout] = useState(false);
  const [showFreezeText, setShowFreezeText] = useState(false);

  // Dynamic lottery rewrite and mismatch states
  const [realTargetValue, setRealTargetValue] = useState<number>(777);
  const [rewriteTrigger, setRewriteTrigger] = useState<RewriteTriggerType>('none');
  const [mismatchType, setMismatchType] = useState<MismatchType>('none');
  const [isButtonLocked, setIsButtonLocked] = useState<boolean>(false);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [isZoromeWinner, setIsZoromeWinner] = useState<boolean>(false);

  const rewriteTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (rewriteTimeoutRef.current) clearTimeout(rewriteTimeoutRef.current);
    };
  }, []);

  const handleToggleSound = () => {
    const isMuted = toggleMute();
    setSoundEnabled(isMuted);
  };

  const handleMaxLimitChange = (valStr: string) => {
    setInputMax(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      setMaxLimit(parsed);
    }
  };

  const handleMaxLimitBlur = () => {
    const parsed = parseInt(inputMax, 10);
    if (isNaN(parsed) || parsed < 1) {
      setMaxLimit(1);
      setInputMax('1');
    } else if (parsed > 999) {
      setMaxLimit(999);
      setInputMax('999');
    } else {
      setMaxLimit(parsed);
    }
  };

  const setPresetLimit = (preset: number) => {
    setMaxLimit(preset);
    setInputMax(preset.toString());
  };

  const triggerCutin = (effect: CutinEffect) => {
    setActiveCutinVisible(true);
    playCutinSound(effect.level);
    setTimeout(() => {
      setActiveCutinVisible(false);
    }, 2800);
  };

  const triggerBlackoutFreeze = (result: any, startSpinningCallback?: () => void) => {
    setIsBlackout(true);
    setShowFreezeText(false);
    playPuchunSound();
    
    if (startSpinningCallback) {
      startSpinningCallback();
    }

    setTimeout(() => {
      setShowFreezeText(true);
    }, 800);

    setTimeout(() => {
      setIsBlackout(false);
      setShowFreezeText(false);
      playFreezeRevealSound();
      
      if (result.effect) {
        triggerCutin(result.effect);
      }
    }, 3800);
  };

  const [roomId, setRoomId] = useState<string>('GLOBAL_LOBBY');
  const [myPlayerId, setMyPlayerId] = useState<number>(1);
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create');
  const [customRoomInput, setCustomRoomInput] = useState<string>(() => {
    try { return localStorage.getItem('slot_last_room') || 'GLOBAL_LOBBY'; } catch { return 'GLOBAL_LOBBY'; }
  });
  const [userNameInput, setUserNameInput] = useState<string>(() => {
    try { return localStorage.getItem('slot_last_name') || 'おれ'; } catch { return 'おれ'; }
  });
  const [remoteStoppedReels, setRemoteStoppedReels] = useState<boolean[]>([false, false, false]);

  const activeSpinRef = useRef<any>(null);
  const lastProcessedSpinIdRef = useRef<number | null>(null);

  // Generate or retrieve persistent browser device ID
  const deviceId = useMemo(() => {
    try {
      // localStorage (not sessionStorage) so closing the tab or reloading keeps the
      // same identity — the server then hands back the same player slot on re-entry.
      let id = localStorage.getItem('slot_device_id') || sessionStorage.getItem('slot_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('slot_device_id', id);
      }
      return id;
    } catch {
      return 'dev_' + Math.random().toString(36).substring(2, 9);
    }
  }, []);

  // Server sync helper (persists state across all connected devices via Cloud Run API)
  const syncRoomStateToServer = useCallback((roomDataUpdates: any, broadcastEvent?: any) => {
    if (!roomId) return;
    fetch('/api/sync/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        roomData: roomDataUpdates,
        broadcastEvent,
        deviceRegistration: {
          deviceId,
          playerName: userNameInput.trim() || 'プレイヤー',
        },
      }),
    }).catch(() => {});

    // Fallback broadcast channel for same-tab
    try {
      const bc = new BroadcastChannel('slot_match_room_' + roomId);
      bc.postMessage({ roomDataUpdates, broadcastEvent, senderId: myPlayerId });
      bc.close();
    } catch {
      // ignore
    }
  }, [roomId, myPlayerId, deviceId, userNameInput]);

  // Helper to trigger identical spin animation on non-active devices
  const startRemoteSpin = useCallback((data: any) => {
    if (data.targetValue !== undefined && data.targetValue !== null) {
      setRemoteStoppedReels(data.stoppedReels || [false, false, false]);
      setIsInstant(data.isInstant || false);
      setActiveCutinVisible(false);
      setIsZoromeWinner(false);
      stoppedCountRef.current = 0;
      setStoppedCount(0);
      setTargetValue(data.targetValue);
      setRealTargetValue(data.realValue ?? data.targetValue);
      setRewriteTrigger(data.rewriteTrigger || 'none');
      setMismatchType(data.mismatchType || 'none');
      setCurrentEffect(data.effect || null);
      setEffectTiming(data.timing || 'lever_on');
      setGameState('spinning');

      if (data.effect && data.timing === 'lever_on') {
        triggerCutin(data.effect);
      }
    }
  }, []);

  const [isDisconnected, setIsDisconnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [showReconnectToast, setShowReconnectToast] = useState<boolean>(false);
  const consecutiveFailuresRef = useRef<number>(0);
  // De-duplicates round results, which can arrive via both SSE and polling.
  const lastProcessedGameIndexRef = useRef<number>(0);
  const isDisconnectedRef = useRef<boolean>(false);

  // Apply state updates received from server stream or polling
  const applyRoomState = useCallback((data: any) => {
    const { roomData, broadcastEvent } = data || {};
    const isSpinningNow = gameStateRef.current === 'spinning' || gameStateRef.current === 'stopping_1' || gameStateRef.current === 'stopping_2' || gameStateRef.current === 'rewrite_pending';

    if (roomData) {
      if (roomData.playerNames) setPlayerNames(roomData.playerNames);
      if (typeof roomData.playerCount === 'number') setPlayerCount(roomData.playerCount);
      if (roomData.matchState) setMatchState(roomData.matchState);
      
      // Only update active players and turn order when not actively spinning to prevent UI flicker/lever disappearance
      if (!isSpinningNow) {
        if (roomData.matchPlayers) setMatchPlayers(roomData.matchPlayers);
        if (typeof roomData.activePlayerIndex === 'number') setActivePlayerIndex(roomData.activePlayerIndex);
      }

      if (typeof roomData.currentSetIndex === 'number') setCurrentSetIndex(roomData.currentSetIndex);
      if (typeof roomData.currentRoundInSet === 'number') setCurrentRoundInSet(roomData.currentRoundInSet);
      if (roomData.skillSelection && !isSpinningNow) setSkillSelection(roomData.skillSelection);

      // Sync active spin state if present from roomData
      if (roomData.activeSpin) {
        const spin = roomData.activeSpin;
        if (spin.spinId && spin.spinId !== lastProcessedSpinIdRef.current) {
          lastProcessedSpinIdRef.current = spin.spinId;
          if (spin.senderId !== myPlayerId) {
            startRemoteSpin(spin);
          }
        }
        if (Array.isArray(spin.stoppedReels)) {
          setRemoteStoppedReels((prev) => {
            const next = [...prev];
            let changed = false;
            spin.stoppedReels.forEach((st: boolean, idx: number) => {
              if (st && !next[idx]) {
                next[idx] = true;
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        }
      }
    }

    if (broadcastEvent) {
      if (broadcastEvent.type === 'TRIGGER_SPIN' && broadcastEvent.senderId !== myPlayerId) {
        if (broadcastEvent.spinId !== lastProcessedSpinIdRef.current) {
          lastProcessedSpinIdRef.current = broadcastEvent.spinId;
          startRemoteSpin(broadcastEvent);
        }
      } else if (broadcastEvent.type === 'STOP_REEL') {
        const reelIdx = broadcastEvent.reelIdx;
        if (typeof reelIdx === 'number') {
          setRemoteStoppedReels((prev) => {
            const next = [...prev];
            next[reelIdx] = true;
            return next;
          });
        }
      } else if (broadcastEvent.type === 'EXECUTE_REWRITE' && broadcastEvent.senderId !== myPlayerId) {
        handleExecuteRewrite(false, true);
      } else if (broadcastEvent.type === 'SEND_STAMP' && broadcastEvent.senderId !== myPlayerId) {
        handleSendStamp(broadcastEvent.stampText, broadcastEvent.senderName, true);
      } else if (broadcastEvent.type === 'ROUND_RESULT') {
        const record = broadcastEvent.record;
        if (record && typeof record.gameIndex === 'number' && record.gameIndex !== lastProcessedGameIndexRef.current) {
          lastProcessedGameIndexRef.current = record.gameIndex;
          setTotalGamesCount(record.gameIndex);
          setLastGameRecord(record);
          setGameHistory((prev) =>
            prev.some((r) => r.gameIndex === record.gameIndex) ? prev : [record, ...prev]
          );

          const roster: MatchPlayer[] = (roomData && roomData.matchPlayers) || [];
          setIsMatchDraw(!!broadcastEvent.isDraw);
          setMatchWinner(
            broadcastEvent.isDraw ? null : roster.find((p) => p.id === broadcastEvent.winnerId) || null
          );

          if (broadcastEvent.summary === 'set') {
            setIsRoundSummaryOpen(false);
            setIsSetSummaryOpen(true);
          } else {
            setIsSetSummaryOpen(false);
            setIsRoundSummaryOpen(true);
          }
        }
      } else if (broadcastEvent.type === 'NEXT_ROUND' || broadcastEvent.type === 'NEXT_SET') {
        // Room state itself arrives through roomData; these events just dismiss
        // the summary popups so every device leaves the screen together.
        setIsRoundSummaryOpen(false);
        setIsSetSummaryOpen(false);
        setMatchWinner(null);
        setIsMatchDraw(false);
      } else if (broadcastEvent.type === 'DISBAND' && broadcastEvent.senderId !== myPlayerId) {
        handleDisbandRoom(true);
      }
    }
  }, [myPlayerId, startRemoteSpin]);

  // Manual & automatic reconnect handler that re-syncs state from server
  const fetchRoomState = useCallback(async (isManual = false) => {
    if (!roomId) return;
    setIsReconnecting(true);

    try {
      const res = await fetch(`/api/sync/state/${roomId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.roomData) {
        consecutiveFailuresRef.current = 0;
        if (isDisconnectedRef.current) {
          isDisconnectedRef.current = false;
          setIsDisconnected(false);
          setShowReconnectToast(true);
          setTimeout(() => setShowReconnectToast(false), 3000);
        }
        applyRoomState({ roomData: data.roomData });
      } else if (!data.success) {
        throw new Error('Invalid room data');
      }
      // data.success with a null room simply means "nobody has created this room yet"
    } catch (err) {
      consecutiveFailuresRef.current += 1;
      // Show the disconnect modal only after several consecutive failures
      if (consecutiveFailuresRef.current >= 3) {
        isDisconnectedRef.current = true;
        setIsDisconnected(true);
      }
    } finally {
      setIsReconnecting(false);
    }
  }, [roomId, applyRoomState]);

  // Keep latest callbacks in refs so the sync effect does not tear down on every state change
  const applyRoomStateRef = useRef(applyRoomState);
  applyRoomStateRef.current = applyRoomState;
  const fetchRoomStateRef = useRef(fetchRoomState);
  fetchRoomStateRef.current = fetchRoomState;

  // Real-time synchronization listener across all devices/tabs.
  // SSE is the primary push channel (near-instant); polling is only a safety net,
  // and it backs off automatically while the stream is healthy.
  useEffect(() => {
    if (!roomId) return;

    let closed = false;
    let eventSource: EventSource | null = null;
    let sseHealthy = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const markAlive = () => {
      consecutiveFailuresRef.current = 0;
      if (isDisconnectedRef.current) {
        isDisconnectedRef.current = false;
        setIsDisconnected(false);
        setShowReconnectToast(true);
        setTimeout(() => setShowReconnectToast(false), 3000);
      }
    };

    // 1. SSE connection (primary realtime channel)
    const openStream = () => {
      if (closed) return;
      try {
        eventSource = new EventSource(`/api/sync/stream/${encodeURIComponent(roomId)}`);
        eventSource.onopen = () => {
          sseHealthy = true;
          markAlive();
        };
        eventSource.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            sseHealthy = true;
            markAlive();
            // Heartbeat frames carry no room payload
            if (parsed && parsed.type === 'PING') return;
            applyRoomStateRef.current(parsed);
          } catch {
            // ignore malformed frames
          }
        };
        eventSource.onerror = () => {
          sseHealthy = false;
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 3) {
            isDisconnectedRef.current = true;
            setIsDisconnected(true);
          }
          // EventSource retries on its own; nothing else to do here.
        };
      } catch {
        sseHealthy = false;
      }
    };
    openStream();

    // 2. Adaptive polling: 1s while the stream is down, 5s while it is healthy
    const schedulePoll = () => {
      if (closed) return;
      pollTimer = setTimeout(async () => {
        if (closed) return;
        await fetchRoomStateRef.current();
        schedulePoll();
      }, sseHealthy ? 5000 : 1000);
    };
    schedulePoll();

    // 3. Same-tab / same-browser BroadcastChannel listener (zero latency between tabs)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('slot_match_room_' + roomId);
      bc.onmessage = (event) => {
        applyRoomStateRef.current(event.data);
      };
    } catch {
      // ignore
    }

    // 4. Re-sync immediately when the tab regains focus (mobile browsers freeze SSE in background)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRoomStateRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      closed = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (pollTimer) clearTimeout(pollTimer);
      if (eventSource) eventSource.close();
      if (bc) bc.close();
    };
  }, [roomId]);

  // Compute rotation order names for current round in set
  const turnOrderNames = useMemo(() => {
    if (matchPlayers.length === 0) return [];
    const shift = (currentRoundInSet - 1) % matchPlayers.length;
    const rotated = [...matchPlayers.slice(shift), ...matchPlayers.slice(0, shift)];
    return rotated.map((p) => p.name);
  }, [matchPlayers, currentRoundInSet]);

  // Current turn count in the set (1 to playerCount)
  const currentTurnInSet = useMemo(() => {
    if (matchPlayers.length === 0) return 1;
    const passedCount = matchPlayers.filter((p) => p.hasPassed || p.currentScore !== null).length;
    return Math.min(matchPlayers.length, passedCount + 1);
  }, [matchPlayers]);

  // Match Mode Helpers
  const activeMatchPlayer = matchPlayers[activePlayerIndex];
  const isMyTurnInMatch = activeMatchPlayer ? activeMatchPlayer.id === myPlayerId : true;

  const currentSkillCost =
    skillSelection.minus20Count * 1 +
    (skillSelection.minus40Selected ? 3 : 0) +
    (skillSelection.minus5Selected ? 1 : 0);

  const currentMinusBonus =
    skillSelection.minus20Count * 20 +
    (skillSelection.minus40Selected ? 40 : 0) +
    (skillSelection.minus5Selected || (activeMatchPlayer?.skillsActive.minus5Active) ? 5 : 0);

  // Single Global Lobby Handler
  const handleEnterOnlineLobby = async () => {
    const targetRoom = customRoomInput.trim() || 'GLOBAL_LOBBY';
    try { localStorage.setItem('slot_last_room', targetRoom); localStorage.setItem('slot_last_name', userNameInput || ''); } catch {}
    setRoomId(targetRoom);

    let currentNames: string[] = [];
    let assignedSlot = 1;
    let serverMatchState: string | null = null;
    let devices: Record<string, { slot: number; playerName: string }> | null = null;

    try {
      const res = await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: targetRoom,
          deviceRegistration: {
            deviceId,
            playerName: userNameInput.trim() || 'プレイヤー',
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.roomData) {
        serverMatchState = data.roomData.matchState || null;
        if (Array.isArray(data.roomData.playerNames)) {
          currentNames = data.roomData.playerNames.filter(Boolean);
        }
        if (data.roomData.connectedDevices) {
          devices = data.roomData.connectedDevices;
          if (devices[deviceId]) assignedSlot = devices[deviceId].slot;
        }
      }
    } catch {
      // ignore
    }

    const myName = userNameInput.trim() || `プレイヤー${assignedSlot}`;

    // The roster is derived from devices that have actually joined, so an empty
    // room shows one row (you), not a fixed set of placeholder players.
    const roster: string[] = [];
    if (devices) {
      for (const d of Object.values(devices) as Array<{ slot: number; playerName: string }>) {
        if (d && d.slot >= 1) roster[d.slot - 1] = d.playerName || `プレイヤー${d.slot}`;
      }
    }
    // Names already agreed in the room win over the device's own label.
    currentNames.forEach((n, i) => { if (n && roster[i]) roster[i] = n; });
    roster[assignedSlot - 1] = myName;

    const compactNames: string[] = [];
    for (let i = 0; i < roster.length; i++) {
      if (roster[i]) compactNames[i] = roster[i];
    }
    currentNames = compactNames;

    setMyPlayerId(assignedSlot);
    setPlayerNames(currentNames);
    setPlayerCount(Math.max(1, currentNames.filter(Boolean).length));

    // A match already in progress must not be dragged back to the lobby just
    // because somebody opened the URL. Join the running match instead.
    const matchAlreadyRunning =
      serverMatchState === 'playing' || serverMatchState === 'set_summary' || serverMatchState === 'game_over';

    if (matchAlreadyRunning) {
      setMatchState(serverMatchState as 'playing' | 'set_summary' | 'game_over');
      syncRoomStateToServer({
        roomId: targetRoom,
        playerNames: currentNames,
      });
    } else {
      setMatchState('lobby');
      syncRoomStateToServer({
        roomId: targetRoom,
        playerNames: currentNames,
        playerCount: Math.max(1, currentNames.filter(Boolean).length),
        matchState: 'lobby',
      });
    }
  };

  const handleLaunchGameFromLobby = () => {
    const validNames = playerNames.filter((n) => n && n.trim().length > 0);
    const count = Math.max(1, validNames.length);

    const initialPlayers: MatchPlayer[] = validNames.map((name, i) => ({
      id: i + 1,
      name: name.trim() || `プレイヤー${i + 1}`,
      points: 5,
      rawScore: null,
      currentScore: null,
      hasPassed: false,
      usedAll5Points: false,
      skillsActive: { minus5Active: false },
      spinCount: 0,
      history: [],
      totalMatchPoints: 0,
      winCount: 0,
    }));

    setPlayerCount(count);
    setMatchPlayers(initialPlayers);
    setActivePlayerIndex(0);
    setCurrentSetIndex(1);
    setCurrentRoundInSet(1);
    setIsRoundSummaryOpen(false);
    setIsSetSummaryOpen(false);
    setTotalGamesCount(0);
    setGameHistory([]);
    setSetRecords([]);
    setLastGameRecord(null);
    setMatchState('playing');
    setMatchWinner(null);
    setIsMatchDraw(false);
    setSkillSelection({ minus20Count: 0, minus40Selected: false, minus5Selected: false });

    syncRoomStateToServer({
      playerCount: count,
      playerNames: validNames,
      matchPlayers: initialPlayers,
      activePlayerIndex: 0,
      matchState: 'playing',
      currentSetIndex: 1,
      currentRoundInSet: 1,
    });
  };

  const handleStartMatch = () => {
    handleEnterOnlineLobby();
  };

  const handleResetMatch = () => {
    setMatchState('setup');
    setMatchPlayers([]);
    setActivePlayerIndex(0);
    setCurrentRoundInSet(1);
    setIsRoundSummaryOpen(false);
    setIsSetSummaryOpen(false);
    setMatchWinner(null);
    setIsMatchDraw(false);
    setSkillSelection({ minus20Count: 0, minus40Selected: false, minus5Selected: false });
  };

  const handleDisbandRoom = (isRemoteCall = false) => {
    if (!isRemoteCall && activeView === 'match') {
      syncRoomStateToServer(
        { matchPlayers: [], matchState: 'setup', currentSetIndex: 1, currentRoundInSet: 1 },
        { type: 'DISBAND', senderId: myPlayerId }
      );
    }
    lastProcessedGameIndexRef.current = 0;
    setMatchState('setup');
    setMatchPlayers([]);
    setActivePlayerIndex(0);
    setCurrentSetIndex(1);
    setCurrentRoundInSet(1);
    setIsRoundSummaryOpen(false);
    setIsSetSummaryOpen(false);
    setTotalGamesCount(0);
    setGameHistory([]);
    setSetRecords([]);
    setLastGameRecord(null);
    setMatchWinner(null);
    setIsMatchDraw(false);
  };

  const handleNextRound = () => {
    const nextRound = currentRoundInSet + 1;
    const resetList = matchPlayers.map((p) => ({
      ...p,
      points: 5,
      rawScore: null,
      currentScore: null,
      hasPassed: false,
      usedAll5Points: false,
      skillsActive: { minus5Active: false },
      spinCount: 0,
      hasConsumedPointsThisTurn: false,
    }));
    const shift = resetList.length > 0 ? (nextRound - 1) % resetList.length : 0;

    setCurrentRoundInSet(nextRound);
    setMatchPlayers(resetList);
    setActivePlayerIndex(shift);
    setSkillSelection({ minus20Count: 0, minus40Selected: false, minus5Selected: false });
    setIsRoundSummaryOpen(false);
    setMatchWinner(null);
    setIsMatchDraw(false);

    if (activeView === 'match') {
      syncRoomStateToServer(
        {
          matchPlayers: resetList,
          activePlayerIndex: shift,
          matchState: 'playing',
          currentRoundInSet: nextRound,
          currentSetIndex,
          skillSelection: { minus20Count: 0, minus40Selected: false, minus5Selected: false },
        },
        { type: 'NEXT_ROUND', senderId: myPlayerId }
      );
    }
  };

  const handleNextSet = () => {
    const nextSetIdx = currentSetIndex + 1;
    setCurrentSetIndex(nextSetIdx);
    setCurrentRoundInSet(1);

    const resetList = matchPlayers.map((p) => ({
      ...p,
      points: 5,
      rawScore: null,
      currentScore: null,
      hasPassed: false,
      usedAll5Points: false,
      skillsActive: { minus5Active: false },
      spinCount: 0,
    }));

    // Guard against `% 0` producing NaN if the roster is somehow empty.
    const shift = resetList.length > 0 ? (nextSetIdx - 1) % resetList.length : 0;
    setActivePlayerIndex(shift);
    setMatchPlayers(resetList);

    setMatchWinner(null);
    setIsMatchDraw(false);
    setSkillSelection({ minus20Count: 0, minus40Selected: false, minus5Selected: false });
    setIsSetSummaryOpen(false);
    setMatchState('playing');

    if (activeView === 'match') {
      syncRoomStateToServer(
        {
          matchPlayers: resetList,
          activePlayerIndex: shift,
          matchState: 'playing',
          currentSetIndex: nextSetIdx,
          currentRoundInSet: 1,
          skillSelection: { minus20Count: 0, minus40Selected: false, minus5Selected: false },
        },
        { type: 'NEXT_SET', senderId: myPlayerId }
      );
    }
  };

  // Zero-sum match calculation evaluator
  const evaluateMatchAndFinish = (playersList: MatchPlayer[]) => {
    const validPlayers = playersList.filter((p) => p.currentScore !== null);
    if (validPlayers.length === 0) return;

    const minScore = Math.min(...validPlayers.map((p) => p.currentScore!));
    const winners = validPlayers.filter((p) => p.currentScore === minScore);
    const isDraw = winners.length > 1;
    const primaryWinner = winners[0];

    const pointChanges: Record<number, { pointsEarned: number; isWinner: boolean; isZoromeBonus: boolean }> = {};

    if (isDraw) {
      playersList.forEach((p) => {
        pointChanges[p.id] = { pointsEarned: 0, isWinner: false, isZoromeBonus: false };
      });
      setIsMatchDraw(true);
      setMatchWinner(null);
    } else {
      setIsMatchDraw(false);
      setMatchWinner(primaryWinner);

      const score1 = primaryWinner.currentScore!;

      {
        let W = 2000; // 通常勝利
        if (score1 < 0) {
          W = 4000; // マイナスで勝利
        } else if (score1 <= 10) {
          W = 3000; // 10以下で勝利
        }

        const losers = playersList.filter((p) => p.id !== primaryWinner.id);
        const diffs = losers.map((p) => ({
          id: p.id,
          diff: Math.max(0, (p.currentScore ?? 999) - score1),
        }));

        const totalDiff = diffs.reduce((acc, d) => acc + d.diff, 0);

        if (totalDiff === 0) {
          playersList.forEach((p) => {
            pointChanges[p.id] = { pointsEarned: 0, isWinner: p.id === primaryWinner.id, isZoromeBonus: false };
          });
        } else {
          pointChanges[primaryWinner.id] = { pointsEarned: W, isWinner: true, isZoromeBonus: false };

          let assignedPenalty = 0;
          diffs.forEach((d, idx) => {
            if (idx === diffs.length - 1) {
              const remaining = W - assignedPenalty;
              pointChanges[d.id] = { pointsEarned: -remaining, isWinner: false, isZoromeBonus: false };
            } else {
              const pen = Math.round(W * (d.diff / totalDiff));
              assignedPenalty += pen;
              pointChanges[d.id] = { pointsEarned: -pen, isWinner: false, isZoromeBonus: false };
            }
          });
        }
      }
    }

    // ---- ゾロ目ボーナス（順位点とは完全に独立） ----
    // 順位は問わない。ゾロ目を出した人が +3000 を受け取り、原資はそれ以外の
    // 全員が等分で負担する。複数人が同時にゾロ目なら、それぞれについて
    // この精算を独立に行うため、合計は常にゼロサムになる。
    const ZOROME_BONUS = 3000;
    playersList.forEach((p) => {
      if (!pointChanges[p.id]) {
        pointChanges[p.id] = { pointsEarned: 0, isWinner: false, isZoromeBonus: false };
      }
    });

    const zoromeAchievers = playersList.filter(
      (p) => p.currentScore !== null && p.points === 0 && isZoromeVal(p.currentScore)
    );

    zoromeAchievers.forEach((achiever) => {
      const funders = playersList.filter((p) => p.id !== achiever.id);
      if (funders.length === 0) return;
      const share = Math.round(ZOROME_BONUS / funders.length);

      pointChanges[achiever.id].pointsEarned += ZOROME_BONUS;
      pointChanges[achiever.id].isZoromeBonus = true;

      let paid = 0;
      funders.forEach((f, idx) => {
        const amount = idx === funders.length - 1 ? ZOROME_BONUS - paid : share;
        paid += amount;
        pointChanges[f.id].pointsEarned -= amount;
      });
    });

    const finalPlayers = playersList.map((p) => {
      const change = pointChanges[p.id] || { pointsEarned: 0, isWinner: false, isZoromeBonus: false };
      return {
        ...p,
        totalMatchPoints: p.totalMatchPoints + change.pointsEarned,
        winCount: p.winCount + (change.isWinner ? 1 : 0),
      };
    });

    const nextGameIdx = totalGamesCount + 1;
    setTotalGamesCount(nextGameIdx);

    const record: MatchGameRecord = {
      gameIndex: nextGameIdx,
      setIndex: currentSetIndex,
      results: finalPlayers.map((p) => {
        const change = pointChanges[p.id] || { pointsEarned: 0, isWinner: false, isZoromeBonus: false };
        return {
          playerId: p.id,
          playerName: p.name,
          rawScore: p.rawScore,
          finalScore: p.currentScore,
          pointsEarned: change.pointsEarned,
          isWinner: change.isWinner,
          isZoromeBonus: change.isZoromeBonus,
        };
      }),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMatchPlayers(finalPlayers);
    setLastGameRecord(record);
    setGameHistory((prev) => [record, ...prev]);

    const roundsPerSet = playersList.length || 3;
    const isSetEnd = currentRoundInSet >= roundsPerSet;
    if (isSetEnd) {
      setIsSetSummaryOpen(true);
    } else {
      setIsRoundSummaryOpen(true);
    }

    // Without this, the accumulated points and the result popup would only ever
    // exist on the single device that ran the evaluation.
    lastProcessedGameIndexRef.current = record.gameIndex;
    if (activeView === 'match') {
      syncRoomStateToServer(
        {
          matchPlayers: finalPlayers,
          activePlayerIndex,
          matchState: isSetEnd ? 'set_summary' : 'playing',
          currentSetIndex,
          currentRoundInSet,
        },
        {
          type: 'ROUND_RESULT',
          senderId: myPlayerId,
          summary: isSetEnd ? 'set' : 'round',
          isDraw,
          winnerId: isDraw ? 0 : primaryWinner.id,
          record,
        }
      );
    }
  };

  // Two-stage confirm: the first tap arms the button, the second commits.
  const [passConfirmPending, setPassConfirmPending] = useState<boolean>(false);
  const passConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPassPlayer = () => {
    if (activeView !== 'match' || matchState !== 'playing' || !activeMatchPlayer) return;
    if (!passConfirmPending) {
      setPassConfirmPending(true);
      if (passConfirmTimerRef.current) clearTimeout(passConfirmTimerRef.current);
      passConfirmTimerRef.current = setTimeout(() => setPassConfirmPending(false), 5000);
      return;
    }
    if (passConfirmTimerRef.current) clearTimeout(passConfirmTimerRef.current);
    setPassConfirmPending(false);
    handlePassPlayer();
  };

  const handlePassPlayer = () => {
    if (activeView !== 'match' || matchState !== 'playing' || !activeMatchPlayer) return;

    const updated = matchPlayers.map((p, idx) => {
      if (idx === activePlayerIndex) {
        return { ...p, hasPassed: true, hasConsumedPointsThisTurn: false };
      }
      return p;
    });

    const allDone = updated.length > 0 && updated.every((p) => p.hasPassed);
    let nextIdx = activePlayerIndex;

    if (!allDone && updated.length > 0) {
      nextIdx = (activePlayerIndex + 1) % updated.length;
      let guard = 0;
      while (updated[nextIdx].hasPassed && guard < updated.length) {
        nextIdx = (nextIdx + 1) % updated.length;
        guard += 1;
      }
      setActivePlayerIndex(nextIdx);
    }

    setMatchPlayers(updated);

    // Sync active player change and updated player state to server for all devices
    syncRoomStateToServer({
      matchPlayers: updated,
      activePlayerIndex: nextIdx,
      matchState: 'playing',
    });

    if (allDone) {
      setTimeout(() => evaluateMatchAndFinish(updated), 50);
    }
  };

  const lastAppliedBonusRef = useRef<number>(0);

  // State A: Normal Lever ON / Manual Spin Start
  const triggerNormalSpin = () => {
    if (gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2' || gameState === 'rewrite_pending' || isBlackout) return;

    // Roll lottery first so we can sync exact target value to room
    const result = performLottery(minLimit, maxLimit, cutinFrequency);

    let appliedBonus = 0;
    if (activeView === 'match') {
      if (matchState !== 'playing' || !activeMatchPlayer || activeMatchPlayer.hasPassed) {
        return;
      }

      const totalReq = currentSkillCost + 1;
      if (activeMatchPlayer.points < totalReq) {
        return;
      }

      const nextPoints = activeMatchPlayer.points - totalReq;
      const nextMinus5Active = activeMatchPlayer.skillsActive.minus5Active || skillSelection.minus5Selected;

      // Computed from the current snapshot rather than from inside the updater:
      // React only invokes an updater eagerly when no other update is pending, so
      // reading the result out of the closure could yield an empty array and wipe
      // every player on every device.
      const nextMatchPlayers: MatchPlayer[] = matchPlayers.map((p, idx) => {
        if (idx === activePlayerIndex) {
          return {
            ...p,
            points: nextPoints,
            skillsActive: { ...p.skillsActive, minus5Active: nextMinus5Active },
            spinCount: p.spinCount + 1,
            hasConsumedPointsThisTurn: true,
          };
        }
        return p;
      });
      setMatchPlayers(nextMatchPlayers);

      appliedBonus = currentMinusBonus;
      lastAppliedBonusRef.current = appliedBonus;

      setSkillSelection({ minus20Count: 0, minus40Selected: false, minus5Selected: false });

      const spinId = Date.now();
      setRemoteStoppedReels([false, false, false]);
      const spinData = {
        spinId,
        targetValue: result.value,
        realValue: result.realValue,
        effect: result.effect,
        mismatchType: result.mismatchType,
        rewriteTrigger: result.rewriteTrigger,
        timing: result.timing,
        isInstant: false,
        stoppedReels: [false, false, false],
        senderId: myPlayerId,
        timestamp: Date.now(),
      };
      activeSpinRef.current = spinData;

      syncRoomStateToServer(
        {
          matchPlayers: nextMatchPlayers,
          activePlayerIndex,
          matchState: 'playing',
          activeSpin: spinData,
        },
        {
          type: 'TRIGGER_SPIN',
          ...spinData,
        }
      );
    } else {
      lastAppliedBonusRef.current = 0;
    }

    setIsInstant(false);
    setActiveCutinVisible(false);
    setIsZoromeWinner(false);
    stoppedCountRef.current = 0;
    setStoppedCount(0);
    setRewriteTrigger('none');
    setMismatchType('none');
    setIsButtonLocked(false);
    if (rewriteTimeoutRef.current) {
      clearTimeout(rewriteTimeoutRef.current);
      rewriteTimeoutRef.current = null;
    }

    if (result.mismatchType === 'weird_lever_sound') {
      playWeirdLeverSound();
    } else if (result.mismatchType !== 'lever_silence') {
      playLeverOn();
    }

    if (result.shouldVibrate) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([250, 150, 250]);
      }
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 800);
    }
    
    const startSpin = () => {
      setTargetValue(result.value);
      setRealTargetValue(result.realValue);
      setRewriteTrigger(result.rewriteTrigger);
      setMismatchType(result.mismatchType);
      setCurrentEffect(result.effect);
      setEffectTiming(result.timing);

      if (result.mismatchType === 'start_delay') {
        setGameState('idle');
        setTimeout(() => {
          setGameState('spinning');
        }, 800);
      } else {
        setGameState('spinning');
      }

      if (result.mismatchType === 'button_lock') {
        setIsButtonLocked(true);
      }
    };

    if (result.realValue <= 10 && result.timing === 'lever_on' && result.mismatchType === 'none' && result.rewriteTrigger === 'none') {
      triggerBlackoutFreeze(result, startSpin);
    } else {
      startSpin();
      if (result.value > 10 && result.timing === 'lever_on' && result.effect) {
        triggerCutin(result.effect);
      }
    }
  };

  // State B: Instant Simultaneous 3-digit results (MAX BET style)
  const triggerInstantSpin = () => {
    if (gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2' || gameState === 'rewrite_pending' || isBlackout) return;

    const result = performLottery(minLimit, maxLimit, cutinFrequency);

    if (activeView === 'match') {
      if (matchState !== 'playing' || !activeMatchPlayer || activeMatchPlayer.hasPassed) {
        return;
      }
      // 空回転: costs nothing, applies no skill, and never becomes a score.
      lastAppliedBonusRef.current = 0;
      const instantPlayers = matchPlayers;

      const spinId = Date.now();
      setRemoteStoppedReels([true, true, true]);
      const spinData = {
        spinId,
        targetValue: result.value,
        realValue: result.realValue,
        effect: result.effect,
        mismatchType: result.mismatchType,
        rewriteTrigger: result.rewriteTrigger,
        timing: result.timing,
        isInstant: true,
        stoppedReels: [true, true, true],
        senderId: myPlayerId,
        timestamp: Date.now(),
      };
      activeSpinRef.current = spinData;

      syncRoomStateToServer(
        {
          matchPlayers: instantPlayers,
          activePlayerIndex,
          matchState: 'playing',
          activeSpin: spinData,
        },
        {
          type: 'TRIGGER_SPIN',
          ...spinData,
        }
      );
    }

    setIsInstant(true);
    setActiveCutinVisible(false);
    setIsZoromeWinner(false);
    setRewriteTrigger('none');
    setMismatchType('none');
    setIsButtonLocked(false);
    if (rewriteTimeoutRef.current) {
      clearTimeout(rewriteTimeoutRef.current);
      rewriteTimeoutRef.current = null;
    }
    
    // Mismatch lever sound check: 'lever_silence' skips playLeverOn
    if (result.mismatchType === 'weird_lever_sound') {
      playWeirdLeverSound();
    } else if (result.mismatchType !== 'lever_silence') {
      playLeverOn();
    }

    const startSpin = () => {
      // Instant spins don't run rewrite events, they display the final real value directly
      setTargetValue(result.realValue);
      setRealTargetValue(result.realValue);
      setGameState('spinning');
    };

    if (result.realValue <= 10) {
      triggerBlackoutFreeze(result, startSpin);
    } else {
      startSpin();
      // On simultaneous show, cutins trigger either immediately or fast
      if (result.timing !== 'none' && result.effect) {
        setTimeout(() => {
          if (result.effect) triggerCutin(result.effect);
        }, 50);
      }
    }
  };

  // Callback on reel-stops to handle staggered cut-ins (stop_1, stop_2, stop_3)
  const handleReelStop = (reelIdx: number) => {
    if (isInstant) return;

    setRemoteStoppedReels((prev) => {
      if (prev[reelIdx]) return prev;
      const next = [...prev];
      next[reelIdx] = true;
      return next;
    });

    // activeSpinRef is always current, so the broadcast is built from it rather than
    // from inside a state updater (updaters must stay side-effect free).
    if (activeView === 'match') {
      const currentSpin = activeSpinRef.current;
      let updatedSpin = null;
      if (currentSpin) {
        const nextStopped = [...(currentSpin.stoppedReels || [false, false, false])];
        nextStopped[reelIdx] = true;
        updatedSpin = { ...currentSpin, stoppedReels: nextStopped };
        activeSpinRef.current = updatedSpin;
      }
      syncRoomStateToServer(
        updatedSpin ? { activeSpin: updatedSpin } : null,
        { type: 'STOP_REEL', reelIdx, senderId: myPlayerId }
      );
    }

    const nextCount = stoppedCountRef.current + 1;
    stoppedCountRef.current = nextCount;
    setStoppedCount(nextCount);

    const checkFreezeOrCutin = (timingOption: 'stop_1' | 'stop_2') => {
      if (targetValue <= 10) {
        if (effectTiming === timingOption) {
          triggerBlackoutFreeze({ effect: currentEffect });
        }
      } else {
        if (effectTiming === timingOption && currentEffect) {
          triggerCutin(currentEffect);
        }
      }
    };

    if (nextCount === 1) {
      setGameState('stopping_1');
      checkFreezeOrCutin('stop_1');
    } else if (nextCount === 2) {
      setGameState('stopping_2');
      checkFreezeOrCutin('stop_2');

      if (isZoromeVal(realTargetValue)) {
        setIsZoromeWinner(true);
        playZoromeVictorySound();
        setIsScreenShaking(true);
        setTimeout(() => setIsScreenShaking(false), 800);
      }
    }
  };

  // Callback once all reels lock in
  const handleAllStopped = () => {
    // Intercept with rewrite pending state if rewrite is triggered
    if (rewriteTrigger !== 'none') {
      setGameState('rewrite_pending');
      if (rewriteTrigger === 'dummy_99_success' || rewriteTrigger === 'dummy_99_failure') {
        playMockTriggerSound();
      } else {
        playRewriteTriggerSound();
      }
      return;
    }

    resolveFinalValue(targetValue);
  };

  // Execute the PUSH button rewrite action (triggered manually or auto after 3 seconds)
  const handleExecuteRewrite = (isAuto = false, isRemoteCall = false) => {
    if (!isRemoteCall && activeView === 'match') {
      syncRoomStateToServer(null, {
        type: 'EXECUTE_REWRITE',
        senderId: myPlayerId,
      });
    }

    if (rewriteTimeoutRef.current) {
      clearTimeout(rewriteTimeoutRef.current);
      rewriteTimeoutRef.current = null;
    }

    if (rewriteTrigger === 'dummy_99_success') {
      playRewriteSuccessSound();
      setTargetValue(realTargetValue);
      resolveFinalValue(realTargetValue);
    } else if (rewriteTrigger === 'dummy_99_failure') {
      playMockLaughSound();
      resolveFinalValue(targetValue);
    } else if (rewriteTrigger === 'success') {
      // Dynamic upgrade!
      playRewriteSuccessSound();
      setTargetValue(realTargetValue);
      resolveFinalValue(realTargetValue);
    } else {
      // Faked rewrite
      playRewriteFailureSound();
      resolveFinalValue(targetValue);
    }
  };

  const resolveFinalValue = (finalVal: number) => {
    setGameState('completed');
    setIsButtonLocked(false);

    // Play victory music depending on scale
    let winningTier: 'under_100' | 'under_50' | 'under_30' | 'under_10' | 'none' = 'none';
    if (finalVal <= 10) winningTier = 'under_10';
    else if (finalVal <= 30) winningTier = 'under_30';
    else if (finalVal <= 50) winningTier = 'under_50';
    else if (finalVal <= 100) winningTier = 'under_100';

    if (isZoromeVal(finalVal)) {
      setIsZoromeWinner(true);
      if (!isZoromeWinner) {
        playZoromeVictorySound();
      }
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 1200);
    } else {
      playWinFanfare(winningTier);
    }

    // Push into history logs only if NOT an instant spin (3桁同時)
    if (!isInstant) {
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        value: finalVal,
        maxLimit: maxLimit,
        cutinUsed: currentEffect ? currentEffect.name : undefined,
        timingUsed: effectTiming !== 'none' ? effectTiming : undefined,
        levelUsed: winningTier !== 'none' ? winningTier : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50)); // limit history size to 50
    }

    // Match Mode state update on spin resolve
    // 空回転 (⚡乱数調整) never produces a score, so the match state is left untouched.
    if (!isInstant && activeView === 'match' && matchState === 'playing' && activeMatchPlayer) {
      const bonusMinus = lastAppliedBonusRef.current;
      const rawVal = finalVal;
      // No floor: skills are allowed to push the score below zero, which is what
      // makes the "マイナス値で勝利 +4000pt" rule reachable.
      const effectiveVal = finalVal - bonusMinus;

      if (bonusMinus > 0) {
        setIsSkillEffectActive(true);
        setSkillEffectText(`⚡ スキル減算発動中！ 【${rawVal}】`);
        
        // ① リールが停止(rawVal) ➔ ② 700ms後に減算演出＆音でリールの数値をスキル適用後(effectiveVal)に変化！
        setTimeout(() => {
          playRewriteSuccessSound();
          setTargetValue(effectiveVal);
          setSkillEffectText(`⚡ スキル適用完了！ 【${rawVal}】 ➔ (-${bonusMinus}) ➔ 【${effectiveVal}】`);
        }, 700);

        setTimeout(() => {
          setIsSkillEffectActive(false);
          setSkillEffectText(null);
        }, 3200);
      }

      const updated = matchPlayers.map((p, idx) => {
        if (idx === activePlayerIndex) {
          const autoPass = p.points <= 0;
          return {
            ...p,
            rawScore: rawVal,
            currentScore: effectiveVal,
            hasPassed: p.hasPassed || autoPass,
            history: [effectiveVal, ...p.history],
          };
        }
        return p;
      });

      let nextIdx = activePlayerIndex;
      const allDone = updated.length > 0 && updated.every((p) => p.hasPassed);

      if (!allDone && updated.length > 0) {
        // Point check: if points depleted (<=0), auto pass & advance player
        const currentPlayerObj = updated[activePlayerIndex];
        if (currentPlayerObj && currentPlayerObj.points <= 0) {
          nextIdx = (activePlayerIndex + 1) % updated.length;
          let guard = 0;
          while (updated[nextIdx].hasPassed && guard < updated.length) {
            nextIdx = (nextIdx + 1) % updated.length;
            guard += 1;
          }
          setActivePlayerIndex(nextIdx);
        }
      }

      setMatchPlayers(updated);

      syncRoomStateToServer({
        matchPlayers: updated,
        activePlayerIndex: nextIdx,
        matchState: 'playing',
      });

      if (allDone) {
        setTimeout(() => evaluateMatchAndFinish(updated), 100);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-2 sm:p-6 font-sans antialiased relative overflow-x-hidden selection:bg-pink-500 selection:text-white" id="slot-rng-app">
      {/* Absolute Ambient Neon BG Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="flex justify-between items-center max-w-5xl w-full mx-auto border-b border-slate-900 pb-1.5 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-yellow-500 via-rose-500 to-indigo-600 rounded-lg shadow-lg shadow-indigo-500/10 animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400">
              数字スロット 777
            </h1>
            <p className="hidden sm:block text-[10px] uppercase font-mono tracking-widest text-amber-400/80 font-bold">
              Number Slot 777
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 mr-1 sm:mr-2">
            <button
              onClick={() => setActiveView('play')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeView === 'play'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">🎰 1人</span>
            </button>
            <button
              onClick={() => setActiveView('match')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeView === 'match'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <span className="whitespace-nowrap">⚔️ 対戦</span>
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="whitespace-nowrap">⚙️ 設定</span>
            </button>
          </div>

          {/* Quick Info Trigger */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-xl transition-all duration-200 cursor-pointer border border-slate-800"
            title="遊び方"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Preset Master sound control in header */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold select-none cursor-pointer transition-all duration-200 ${
              soundEnabled
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" /> CODE: ON
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" /> CODE: SHUT
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Game Stage Layout */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto relative z-10 py-4 sm:py-6 overflow-hidden">
        
        {/* Skill Reduction Visual Banner Overlay */}
        <AnimatePresence>
          {isSkillEffectActive && skillEffectText && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 text-white px-6 py-2.5 rounded-full font-black text-sm sm:text-base border-2 border-yellow-300 shadow-[0_0_30px_rgba(244,63,94,0.6)] flex items-center gap-2 pointer-events-none"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
              <span>{skillEffectText}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Help Panel overlay on top if toggled */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute inset-0 bg-slate-950/95 z-50 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between overflow-y-auto"
              id="help-panel-overlay"
            >
              <div>
                <h3 className="text-lg font-display font-medium text-indigo-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> SLOT RNGの遊び方 & 演出仕様
                </h3>
                
                <div className="space-y-4 text-slate-300 text-sm leading-relaxed antialiased">
                  <p>
                    <strong>1. 範囲の設定:</strong> 1から999の間で最大範囲を設定可能。当選値は「1から設定した最大値」の間で完全ランダムに選ばれます。
                  </p>
                  <p>
                    <strong>2. スタート方法:</strong>
                    「物理レバー」を下にドラッグまたはタップすることで回転スタート（通常スロット）。「3桁同時に表示」ボタンを押すると超高速で3桁を即揃え！
                  </p>
                  <p>
                    <strong>3. 停止の操作:</strong> 通常スロット時は、リール下の<strong>「左」「中」「右」</strong>ボタンを押して自分のタイミングで停止できます。
                  </p>
                  <p>
                    <strong>4. 段階別カットイン演出 (全15種):</strong>
                    数値が小さくなるほど、激しい現代スロット風の限定液晶カットインが発生！
                    <ul className="list-disc pl-5 mt-1 text-slate-400 space-y-1">
                      <li><span className="text-sky-400 font-semibold">50以下:</span> チャンスカットイン演出が出るチャンス（5種類）</li>
                      <li><span className="text-orange-400 font-semibold">30以下:</span> 激アツな演出が出るチャンス（5種類＋50以下も対象）</li>
                      <li><span className="text-rose-400 font-semibold">10以下:</span> プレミアム・レインボー演出が出る大チャンス（5種類＋全演出対象）</li>
                    </ul>
                  </p>
                  <p>
                    <strong>5. 演出発生タイミング:</strong> カットインが発生する場合、タイミングは「レバーON」「第1停止」「第2停止」「第3停止」から毎回ランダムに抽選されます。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl transition duration-150 cursor-pointer text-center"
              >
                遊び方を閉じる
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeView === 'play' || activeView === 'match' ? (
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`w-full ${
                activeView === 'match'
                  ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl'
                  : 'flex flex-col items-center justify-center max-w-md'
              }`}
            >
              {/* Slot Enclosure & Controls Column */}
              <div className={activeView === 'match' ? 'lg:col-span-7 flex flex-col items-center w-full' : 'w-full flex flex-col items-center'}>
                {/* Compact Active Info Pill */}
                <div className={`${activeView === 'match' ? 'hidden sm:flex' : 'flex'} justify-between items-center w-full px-4 mb-2.5 text-xs font-mono text-slate-400 select-none`}>
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    RANGE: <span className="text-sky-400 font-black">1 - {maxLimit}</span>
                  </span>
                  <button
                    onClick={() => setActiveView('settings')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl"
                  >
                    <Settings className="w-3 h-3" /> LIMIT CHANGE
                  </button>
                </div>

                {/* Column 2: Pure Slot machine enclosure casing (Center/Main) */}
                <section className="w-full flex flex-col items-center justify-center" id="slot-machine-casing">
                  {/* Main Slot Enclosure physical cabinet - gorgeous 3D effect */}
                  <div className={`relative w-full border-4 sm:border-8 border-slate-800 rounded-[1.5rem] sm:rounded-[3rem] p-2 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] flex flex-col gap-2 sm:gap-5 border-t-zinc-700 border-b-slate-900 transition-all duration-500 ${
                    gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'
                      ? 'casing-sweep-active'
                      : 'bg-slate-950'
                  } ${isScreenShaking ? 'animate-shake' : ''}`}>
                    {/* Ambient cabinet outer laser tubes */}
                    <div className={`absolute -inset-[3px] rounded-[1.9rem] sm:rounded-[2.9rem] border-2 pointer-events-none transition-colors duration-500 z-10 ${
                      mismatchType === 'cabinet_rainbow_flash' && (gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2')
                        ? 'animate-rainbow-flash border-transparent'
                        : gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'
                        ? 'border-orange-500 animate-[rainbow-border_1.5s_infinite]'
                        : gameState === 'completed' && targetValue <= 10
                        ? 'border-red-500 animate-[rainbow-border_1s_infinite]'
                        : gameState === 'completed' && targetValue <= 30
                        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                        : 'border-slate-800'
                    }`} />

                    {/* Zorome Luxurious Victory overlay! */}
                    <AnimatePresence>
                      {isZoromeWinner && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-40 rounded-[1.9rem] sm:rounded-[2.9rem] bg-transparent pointer-events-none overflow-hidden border-4 border-yellow-400 shadow-[0_0_50px_rgba(251,191,36,0.7),inset_0_0_30px_rgba(251,191,36,0.2)]"
                        >
                          {/* Animated star sparkles */}
                          {Array.from({ length: 18 }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ 
                                x: Math.random() * 320 - 160, 
                                y: Math.random() * 450 - 150, 
                                scale: 0,
                                opacity: 0 
                              }}
                              animate={{ 
                                y: [null, -250], 
                                scale: [0, Math.random() * 1.6 + 0.9, 0], 
                                opacity: [0, 1, 0] 
                              }}
                              transition={{ 
                                duration: Math.random() * 1.8 + 1.2, 
                                repeat: Infinity,
                                delay: Math.random() * 1.2
                              }}
                              style={{ left: '50%', top: '50%' }}
                              className="absolute text-yellow-300 text-xl font-bold select-none pointer-events-none"
                            >
                              ★
                            </motion.div>
                          ))}
                          {/* Pulsing neon banners - pinned elegantly to the top, leaving reels completely uncovered */}
                          <motion.div
                            initial={{ scale: 0.5, y: -20, x: '-50%' }}
                            animate={{ scale: [1, 1.05, 1], y: 0, x: '-50%' }}
                            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                            className="absolute top-2 left-1/2 bg-black/90 px-4 py-1.5 rounded-xl border-2 border-yellow-400 text-center shadow-[0_0_20px_rgba(251,191,36,0.6)] z-50 w-[85%] sm:w-auto"
                          >
                            <h2 className="text-sm sm:text-base font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest uppercase">
                              🎰 ゾロ目超祝福！ 🎰
                            </h2>
                            <p className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-300 mt-0.5 uppercase tracking-widest animate-pulse">
                              Zorome Triple Bonus {targetValue}
                            </p>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Cabinet Top Lights */}
                    <div className="flex justify-between px-6 py-0.5 rounded-full bg-slate-900 border border-slate-800 w-3/4 mx-auto shadow-inner relative z-10">
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${gameState === 'spinning' ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`} />
                      <div className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">Pachislot RNG V3</div>
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${gameState === 'spinning' ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`} />
                    </div>

                    {/* When in Match mode and setting up or in lobby, show ONLY the clean Match setup / lobby panel */}
                    {activeView === 'match' && (matchState === 'setup' || matchState === 'lobby') ? (
                      <div className="w-full max-w-sm mx-auto relative z-10 animate-fade-in my-auto py-4">
                        <MatchPanel
                          section="upper"
                          roomId={roomId}
                          setRoomId={setRoomId}
                          myPlayerId={myPlayerId}
                          setMyPlayerId={setMyPlayerId}
                          joinMode={joinMode}
                          setJoinMode={setJoinMode}
                          customRoomInput={customRoomInput}
                          setCustomRoomInput={setCustomRoomInput}
                          userNameInput={userNameInput}
                          setUserNameInput={setUserNameInput}
                          playerCount={playerCount}
                          setPlayerCount={setPlayerCount}
                          playerNames={playerNames}
                          setPlayerNames={setPlayerNames}
                          players={matchPlayers}
                          activePlayerIndex={activePlayerIndex}
                          turnOrderNames={turnOrderNames}
                          currentSetIndex={currentSetIndex}
                          currentTurnInSet={currentRoundInSet}
                          matchState={matchState}
                          skillSelection={skillSelection}
                          setSkillSelection={setSkillSelection}
                          onStartMatch={handleEnterOnlineLobby}
                          onCreateRoom={handleEnterOnlineLobby}
                          onJoinRoom={handleEnterOnlineLobby}
                          onLaunchGame={handleLaunchGameFromLobby}
                          onPassPlayer={requestPassPlayer}
                          onResetMatch={handleResetMatch}
                          onNextSet={handleNextSet}
                          onDisbandRoom={handleDisbandRoom}
                          isSpinning={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'}
                          totalSkillCost={currentSkillCost}
                          totalMinusBonus={currentMinusBonus}
                          winner={matchWinner}
                          isDraw={isMatchDraw}
                          lastGameRecord={lastGameRecord}
                          gameHistory={gameHistory}
                          setHistory={setRecords}
                          onSendStamp={handleSendStamp}
                          onTriggerNormalSpin={triggerNormalSpin}
                          onTriggerInstantSpin={triggerInstantSpin}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Interactive Module 1: The LCD Monitor (Only in Single Player mode) */}
                        {activeView !== 'match' && (
                          <>
                            <div className="relative z-10">
                              <SlotLCD
                                state={gameState}
                                finalValue={gameState === 'completed' ? targetValue : null}
                                currentEffect={currentEffect}
                                activeCutinVisible={activeCutinVisible}
                                minLimit={minLimit}
                                maxLimit={maxLimit}
                                soundEnabled={soundEnabled}
                                onToggleSound={handleToggleSound}
                                history={history}
                                mismatchType={mismatchType}
                              />
                            </div>

                            {/* Past 5 Spins Premium History Bar */}
                            <div className="hidden sm:block w-full max-w-sm px-4 mx-auto mb-2 relative z-10 select-none animate-fade-in" id="past-5-history-bar">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-mono font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-1">
                                  <History className="w-2.5 h-2.5 text-indigo-500 animate-spin" style={{ animationDuration: '8s' }} />
                                  過去5回の履歴 (PAST 5 RESULTS)
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">RECENT REELS</span>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-1.5 bg-slate-950 border border-slate-900 rounded-xl p-1.5 shadow-inner">
                                {Array.from({ length: 5 }).map((_, idx) => {
                                  const item = history[idx]; // history state stores newest result at index 0
                                  if (!item) {
                                    return (
                                      <div 
                                        key={idx} 
                                        className="h-9 bg-slate-900/30 border border-slate-950 rounded-lg flex flex-col justify-center items-center text-slate-700 font-mono text-xs shadow-inner"
                                      >
                                        <span className="opacity-30 font-medium">---</span>
                                        <span className="text-[6.5px] opacity-20">EMPTY</span>
                                      </div>
                                    );
                                  }

                                  const isUnder10 = item.levelUsed === 'under_10';
                                  const isUnder30 = item.levelUsed === 'under_30';
                                  const isUnder50 = item.levelUsed === 'under_50';
                                  const isUnder100 = item.levelUsed === 'under_100';

                                  let badgeColor = "border-slate-800 bg-slate-900/80 text-slate-400";
                                  let label = "NORMAL";
                                  if (isUnder10) {
                                    badgeColor = "border-pink-500 bg-pink-950/40 text-pink-400 shadow-[inset_0_0_8px_rgba(236,72,153,0.3)] font-bold";
                                    label = "極アツ";
                                  } else if (isUnder30) {
                                    badgeColor = "border-amber-500 bg-amber-950/40 text-amber-400 font-bold";
                                    label = "激アツ";
                                  } else if (isUnder50) {
                                    badgeColor = "border-indigo-500 bg-indigo-950/40 text-indigo-400";
                                    label = "好機";
                                  } else if (isUnder100) {
                                    badgeColor = "border-sky-500 bg-sky-950/40 text-sky-400";
                                    label = "好機";
                                  }

                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ scale: 0.85, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className={`h-9 rounded-lg border flex flex-col justify-center items-center font-mono relative overflow-hidden ${badgeColor}`}
                                    >
                                      {isUnder10 && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse pointer-events-none" />
                                      )}
                                      <span className="text-xs font-black tracking-tighter leading-none">
                                        {item.value.toString().padStart(3, '0')}
                                      </span>
                                      <span className="text-[6px] scale-85 leading-none mt-0.5 opacity-80 font-bold uppercase">
                                        {label}
                                      </span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}

                    {/* Match Panel Upper Status (Confirmed scores, Active turn) in Match Mode */}
                    {activeView === 'match' && (
                      <div className="mb-2 relative z-10">
                        <MatchPanel
                          section="upper"
                          roomId={roomId}
                          setRoomId={setRoomId}
                          myPlayerId={myPlayerId}
                          setMyPlayerId={setMyPlayerId}
                          joinMode={joinMode}
                          setJoinMode={setJoinMode}
                          customRoomInput={customRoomInput}
                          setCustomRoomInput={setCustomRoomInput}
                          userNameInput={userNameInput}
                          setUserNameInput={setUserNameInput}
                          playerCount={playerCount}
                          setPlayerCount={setPlayerCount}
                          playerNames={playerNames}
                          setPlayerNames={setPlayerNames}
                          players={matchPlayers}
                          activePlayerIndex={activePlayerIndex}
                          turnOrderNames={turnOrderNames}
                          currentSetIndex={currentSetIndex}
                          currentTurnInSet={currentRoundInSet}
                          matchState={matchState}
                          skillSelection={skillSelection}
                          setSkillSelection={setSkillSelection}
                          onStartMatch={handleEnterOnlineLobby}
                          onCreateRoom={handleEnterOnlineLobby}
                          onJoinRoom={handleEnterOnlineLobby}
                          onLaunchGame={handleLaunchGameFromLobby}
                          onPassPlayer={requestPassPlayer}
                          onResetMatch={handleResetMatch}
                          onNextSet={handleNextSet}
                          onDisbandRoom={handleDisbandRoom}
                          isSpinning={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'}
                          totalSkillCost={currentSkillCost}
                          totalMinusBonus={currentMinusBonus}
                          winner={matchWinner}
                          isDraw={isMatchDraw}
                          lastGameRecord={lastGameRecord}
                          gameHistory={gameHistory}
                          setHistory={setRecords}
                          onSendStamp={handleSendStamp}
                          onTriggerNormalSpin={triggerNormalSpin}
                          onTriggerInstantSpin={triggerInstantSpin}
                        />
                      </div>
                    )}

                    {/* Interactive Module 2: Liquid LCD Reel Strips */}
                    <div className="relative z-10">
                      <SlotReels
                        targetValue={targetValue}
                        isSpinning={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'}
                        isInstant={isInstant}
                        onReelStop={handleReelStop}
                        onAllStopped={handleAllStopped}
                        activeCutinVisible={activeCutinVisible}
                        currentEffect={currentEffect}
                        isButtonLocked={isButtonLocked}
                        mismatchType={mismatchType}
                        isMatchMode={activeView === 'match'}
                        onPassPlayer={requestPassPlayer}
                        passConfirmPending={passConfirmPending}
                        isMyTurn={isMyTurnInMatch}
                        activePlayerScore={activeMatchPlayer?.currentScore ?? null}
                        hasConsumedPointsThisTurn={activeMatchPlayer?.hasConsumedPointsThisTurn ?? false}
                      />

                      {/* Rewrite PUSH button overlay */}
                      {gameState === 'rewrite_pending' && (
                        <motion.div 
                          initial={{ scale: 0.3, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md rounded-2xl flex flex-col justify-center items-center p-4 border-2 ${
                            rewriteTrigger === 'dummy_99_success' || rewriteTrigger === 'dummy_99_failure'
                              ? 'border-purple-500/70 shadow-[0_0_35px_rgba(168,85,247,0.5)]'
                              : 'border-red-500/40'
                          }`}
                        >
                          {rewriteTrigger === 'dummy_99_success' || rewriteTrigger === 'dummy_99_failure' ? (
                            <>
                              <div className="text-[10px] font-mono font-black text-purple-300 bg-purple-950/90 border border-purple-600/80 px-3 py-0.5 rounded-full mb-2 uppercase tracking-widest shadow-md animate-pulse">
                                😈 99以下確定…！？ 嘲笑PUSH
                              </div>
                              <motion.button
                                onClick={() => handleExecuteRewrite(false)}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-purple-600 via-rose-700 to-slate-900 border-4 border-amber-300 text-white font-display font-black shadow-[0_0_35px_rgba(168,85,247,0.8),inset_0_4px_12px_rgba(255,255,255,0.4)] flex flex-col justify-center items-center cursor-pointer active:brightness-110 group animate-bounce"
                                style={{ animationDuration: '0.9s' }}
                                id="mock-push-btn"
                              >
                                <span className="text-3xl mb-0.5 filter drop-shadow-md">😏</span>
                                <span className="block text-xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wider">
                                  PUSH
                                </span>
                                <span className="text-[7.5px] font-mono text-amber-300 font-bold tracking-widest mt-0.5 uppercase">
                                  50% OVER 400!?
                                </span>
                              </motion.button>
                              <p className="text-[10px] sm:text-xs font-bold text-rose-300 mt-2.5 text-center font-sans animate-pulse">
                                「フッ… 99以下で満足か…？」ボタンを押せ！
                              </p>
                            </>
                          ) : (
                            <>
                              <motion.button
                                onClick={() => handleExecuteRewrite(false)}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-red-500 via-rose-600 to-red-800 border-4 border-amber-400 text-white font-display font-black text-2xl tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.8),inset_0_4px_12px_rgba(255,255,255,0.4)] flex flex-col justify-center items-center cursor-pointer active:brightness-110 group animate-pulse"
                                style={{ animationDuration: '0.8s' }}
                                id="rewrite-push-btn"
                              >
                                <span className="block text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-bold">PUSH</span>
                                <span className="text-[8px] font-mono tracking-wider opacity-90 mt-0.5">CHANCE</span>
                              </motion.button>
                              <p className="text-[10px] sm:text-xs font-bold text-amber-400 mt-3 font-sans animate-pulse">
                                ボタンプッシュで書き換えに挑戦！
                              </p>
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Interactive Module 3: Control Buttons & Triggers */}
                    <div className="mt-2 relative z-10" id="cabinet-footer-controls">
                      {activeView !== 'match' ? (
                        <div className="flex items-center justify-between gap-4 px-1">
                          {/* Physical interactive spring-lever mounted on LEFT side of cabinet */}
                          <div className="ml-2 filter drop-shadow-md">
                            <SlotLever
                              onTrigger={triggerNormalSpin}
                              disabled={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2' || gameState === 'rewrite_pending'}
                            />
                          </div>

                          {/* MAX BET / Instant Simultaneous Display button on the RIGHT side */}
                          <button
                            disabled={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2' || gameState === 'rewrite_pending'}
                            onClick={triggerInstantSpin}
                            className={`py-3.5 px-6 rounded-2xl font-display font-semibold transition-all duration-200 border border-b-4 uppercase relative text-center leading-none select-none cursor-pointer ${
                              gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2' || gameState === 'rewrite_pending'
                                ? 'bg-slate-900 border-slate-950 text-slate-600 border-b-0 translate-y-1'
                                : 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 border-indigo-700 border-b-indigo-850 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)] active:translate-y-1 active:border-b-0'
                            }`}
                            title="3桁同時にリールを即時揃えして表示する"
                            id="maxbet-instant-btn"
                          >
                            <span className="text-sm font-bold block mb-0.5 tracking-wider">3桁同時</span>
                            <span className="text-[7.5px] font-mono opacity-80 uppercase tracking-widest block font-bold mt-1">MAX BET INSTANT</span>
                          </button>
                        </div>
                      ) : (
                        /* In Match view: MatchPanel lower controls (integrated lever, skills, instant spin, confirm) */
                        <MatchPanel
                          section="lower"
                          roomId={roomId}
                          setRoomId={setRoomId}
                          myPlayerId={myPlayerId}
                          setMyPlayerId={setMyPlayerId}
                          joinMode={joinMode}
                          setJoinMode={setJoinMode}
                          customRoomInput={customRoomInput}
                          setCustomRoomInput={setCustomRoomInput}
                          userNameInput={userNameInput}
                          setUserNameInput={setUserNameInput}
                          playerCount={playerCount}
                          setPlayerCount={setPlayerCount}
                          playerNames={playerNames}
                          setPlayerNames={setPlayerNames}
                          players={matchPlayers}
                          activePlayerIndex={activePlayerIndex}
                          turnOrderNames={turnOrderNames}
                          currentSetIndex={currentSetIndex}
                          currentTurnInSet={currentRoundInSet}
                          matchState={matchState}
                          skillSelection={skillSelection}
                          setSkillSelection={setSkillSelection}
                          onStartMatch={handleEnterOnlineLobby}
                          onCreateRoom={handleEnterOnlineLobby}
                          onJoinRoom={handleEnterOnlineLobby}
                          onLaunchGame={handleLaunchGameFromLobby}
                          onPassPlayer={requestPassPlayer}
                          onResetMatch={handleResetMatch}
                          onNextSet={handleNextSet}
                          onDisbandRoom={handleDisbandRoom}
                          isSpinning={gameState === 'spinning' || gameState === 'stopping_1' || gameState === 'stopping_2'}
                          totalSkillCost={currentSkillCost}
                          totalMinusBonus={currentMinusBonus}
                          winner={matchWinner}
                          isDraw={isMatchDraw}
                          lastGameRecord={lastGameRecord}
                          gameHistory={gameHistory}
                          setHistory={setRecords}
                          onSendStamp={handleSendStamp}
                          onTriggerNormalSpin={triggerNormalSpin}
                          onTriggerInstantSpin={triggerInstantSpin}
                        />
                      )}
                    </div>
                      </>
                    )}

                  </div>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-slate-900/60 backdrop-blur-md p-5 rounded-[2rem] border border-slate-800/80 flex flex-col gap-4 justify-between shadow-2xl relative"
              id="control-panel-settings"
            >
              <div>
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800/60 pb-2">
                  <Settings className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <h2 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                    RNG LIMITS & PARAMETERS
                  </h2>
                </div>

                {/* Range Maximum Input Area */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-3 shadow-inner">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      MAX LIMIT N <span className="text-slate-500 font-normal">(1 〜 {maxLimit})</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">1〜999</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={inputMax}
                        onChange={(e) => handleMaxLimitChange(e.target.value)}
                        onBlur={handleMaxLimitBlur}
                        className="w-16 bg-slate-900 font-mono text-xs font-extrabold text-indigo-400 text-center rounded border border-slate-800 px-1 py-0.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Slider Input */}
                  <input
                    type="range"
                    min="1"
                    max="999"
                    value={maxLimit}
                    onChange={(e) => handleMaxLimitChange(e.target.value)}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-3"
                  />

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 100, 300, 999].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setPresetLimit(preset)}
                        className={`text-[10px] py-1 border rounded-lg font-mono font-bold hover:bg-slate-800 hover:text-white transition duration-150 cursor-pointer ${
                          maxLimit === preset
                            ? 'bg-indigo-950 border-indigo-500 text-indigo-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        MAX {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cut-in Occurrence frequency Selector */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                    <label className="text-xs font-semibold text-slate-300">
                      CUT-IN FREQUENCY (演出発生頻度)
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'low', label: '控えめ' },
                      { value: 'normal', label: '標準' },
                      { value: 'high', label: 'ド派手' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setCutinFrequency(item.value as any)}
                        className={`text-xs py-1.5 border rounded-lg hover:bg-slate-800 hover:text-white transition duration-150 cursor-pointer ${
                          cutinFrequency === item.value
                            ? 'bg-indigo-950 border-indigo-500 text-indigo-400 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Stats overview of limits */}
              <div className="border-t border-slate-800/80 pt-3">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-2">
                  <History className="w-3.5 h-3.5" /> RECENT RESULTS (当選履歴)
                </div>

                <div className="h-24 bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto p-2 space-y-1 shadow-inner">
                  {history.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-600 font-mono text-[10px] uppercase">
                      No records generated
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded-lg border border-slate-800 font-mono text-[10px]"
                      >
                        <div className="flex gap-1.5 items-center">
                          <span className="text-slate-500 text-[9px]">{item.timestamp}</span>
                          <span className="text-slate-400 ml-1">Limit:{item.maxLimit}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.cutinUsed && (
                            <span className={`text-[8px] px-1 py-0.5 rounded ${
                              item.levelUsed === 'under_10'
                                ? 'bg-rose-950 text-rose-400 border border-rose-900/30'
                                : item.levelUsed === 'under_30'
                                ? 'bg-orange-950 text-orange-400'
                                : item.levelUsed === 'under_50'
                                ? 'bg-indigo-950 text-indigo-400'
                                : 'bg-blue-950 text-blue-400'
                            }`}>
                              {item.cutinUsed}
                            </span>
                          )}
                          <span className={`font-black text-xs ${
                            item.levelUsed === 'under_10'
                              ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : item.levelUsed === 'under_30'
                              ? 'text-orange-400'
                              : item.levelUsed === 'under_50'
                              ? 'text-indigo-400'
                              : item.levelUsed === 'under_100'
                              ? 'text-sky-400'
                              : 'text-slate-200'
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Satisfying primary action back button */}
              <button
                onClick={() => setActiveView('play')}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 active:scale-[0.98] text-white font-black rounded-xl transition duration-150 cursor-pointer text-center shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                🎰 抽選画面へ戻る (PLAY)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer copyright */}
      <footer className="hidden sm:flex max-w-5xl w-full mx-auto text-center border-t border-slate-900 pt-4 text-[10px] font-mono text-slate-500 z-10 flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          &copy; {new Date().getFullYear()} SLOT RNG Inc. All rights reserved.
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-300">Pachislot Simulation</span>
          <span className="text-slate-800">|</span>
          <span className="hover:text-slate-300">Web Audio Core API</span>
        </div>
      </footer>

      {/* Fullscreen Blackout Freeze Overlay */}
      <AnimatePresence>
        {isBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center select-none cursor-none"
            id="slot-blackout-overlay"
          >
            <AnimatePresence>
              {showFreezeText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                >
                  {rainbowStars.map((star) => (
                    <motion.div
                      key={star.id}
                      className="absolute pointer-events-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                      style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.1 }}
                      animate={{
                        x: "-145vw",
                        y: "145vh",
                        opacity: [0, 1, 1, 0],
                        scale: [0.1, 1, 1, 0.1],
                      }}
                      transition={{
                        duration: star.duration,
                        delay: star.delay,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-full h-full">
                        <defs>
                          <linearGradient id={`rainbow-star-grad-${star.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff4b4b" />
                            <stop offset="20%" stopColor="#ff8533" />
                            <stop offset="40%" stopColor="#ffdd33" />
                            <stop offset="60%" stopColor="#33cc5a" />
                            <stop offset="80%" stopColor="#3399ff" />
                            <stop offset="100%" stopColor="#b333ff" />
                          </linearGradient>
                        </defs>
                        <path
                          fill={`url(#rainbow-star-grad-${star.id})`}
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        />
                      </svg>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round Summary Popup (3人まわったら小計ポップアップ) */}
      <RoundSummaryModal
        isOpen={isRoundSummaryOpen}
        onClose={() => setIsRoundSummaryOpen(false)}
        onNextRound={handleNextRound}
        onDisbandRoom={handleDisbandRoom}
        currentSetIndex={currentSetIndex}
        currentRoundInSet={currentRoundInSet}
        lastRoundRecord={lastGameRecord}
        players={matchPlayers}
      />

      {/* Set Summary Popup (3人が3周=1セットまわったら小計ポップアップ) */}
      <MatchStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        players={matchPlayers}
        gameHistory={gameHistory}
        setHistory={setRecords}
        currentSetIndex={currentSetIndex}
        onDisbandRoom={() => { setIsStatsOpen(false); handleDisbandRoom(); }}
      />

      <SetSummaryModal
        isOpen={isSetSummaryOpen}
        onClose={() => setIsSetSummaryOpen(false)}
        onNextSet={handleNextSet}
        onDisbandRoom={handleDisbandRoom}
        currentSetIndex={currentSetIndex}
        lastGameRecord={lastGameRecord}
        players={matchPlayers}
        winner={matchWinner}
        isDraw={isMatchDraw}
                onShowStats={() => setIsStatsOpen(true)}
        />

      {/* Flying Reaction Stamps Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <AnimatePresence>
          {flyingStamps.map((stamp) => (
            <motion.div
              key={stamp.id}
              initial={{ opacity: 0, y: '85vh', scale: 0.6 }}
              animate={{ opacity: 1, y: '25vh', scale: 1.15 }}
              exit={{ opacity: 0, y: '10vh', scale: 0.8 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              style={{ left: `${stamp.x}%` }}
              className="absolute bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.6)] border-2 border-yellow-300 flex items-center gap-2 backdrop-blur-md"
            >
              <span className="text-yellow-300 font-mono font-bold text-[10px] bg-black/50 px-2 py-0.5 rounded-lg border border-yellow-400/30">
                {stamp.sender}
              </span>
              <span className="drop-shadow">{stamp.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Connection Error Modal Overlay */}
      <AnimatePresence>
        {isDisconnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[10020] flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.4)] relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/50 rounded-full flex items-center justify-center mx-auto text-rose-400 animate-pulse">
                <WifiOff className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-rose-400 font-mono tracking-wider">
                  通信エラーが発生しました
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  サーバーとの通信が一時的に切断されました。<br />
                  「再接続」を押すと最新のリール状態・ターンを自動復元します。
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1 font-mono text-left">
                <div className="flex justify-between">
                  <span>対戦ルーム:</span>
                  <span className="text-amber-400 font-bold">{roomId}</span>
                </div>
                <div className="flex justify-between">
                  <span>状態:</span>
                  <span className="text-rose-400 font-bold">切断中</span>
                </div>
              </div>

              <button
                onClick={() => fetchRoomState(true)}
                disabled={isReconnecting}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-xl hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? '再接続中...' : '再接続して状態を復元'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reconnect Success Notification Toast */}
      <AnimatePresence>
        {showReconnectToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] bg-emerald-900/90 border-2 border-emerald-400 text-emerald-200 px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2 font-bold text-xs backdrop-blur-md"
          >
            <Wifi className="w-4 h-4 text-emerald-300 animate-bounce" />
            <span>✓ 再接続に成功しました！最新のリール状態を同期しました。</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
