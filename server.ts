import express from "express";
import path from "path";
import type { Request, Response, NextFunction } from "express";

/* ------------------------------------------------------------------ *
 * Slot RNG sync server
 *
 * Holds ephemeral, in-memory match rooms and pushes state to every
 * connected device over Server-Sent Events. Nothing is persisted and
 * no user account or API key is required.
 * ------------------------------------------------------------------ */

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

// --- Resource caps (a public, unauthenticated endpoint needs hard limits) ---
const MAX_ROOMS = 500;
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;      // rooms idle for 3h are dropped
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CLIENTS_PER_ROOM = 24;
const MAX_TOTAL_CLIENTS = 400;
const HEARTBEAT_MS = 20_000;                  // keeps proxies from killing SSE
const MAX_PLAYERS = 8;
const MAX_NAME_LEN = 20;
const MAX_ROOM_ID_LEN = 32;
const RATE_LIMIT_WINDOW_MS = 10_000;
// Everyone on one home Wi-Fi shares a public IP, so a per-IP cap alone punishes a
// normal 3-player match. The per-device cap is what actually paces a client; the
// per-IP cap stays as abuse protection and is sized for a full room behind one NAT.
const RATE_LIMIT_MAX_PER_DEVICE = 60;
const RATE_LIMIT_MAX_PER_IP = 600;
// How long a player's slot survives without a write from that device. Connected
// clients re-announce every SLOT_KEEPALIVE_MS (src/App.tsx), so this only
// expires seats whose device has actually gone away.
const SLOT_RESERVATION_MS = 5 * 60 * 1000;
const MAX_HISTORY_PER_PLAYER = 20;

const ROOM_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

type MatchState = "setup" | "lobby" | "playing" | "set_summary" | "game_over";

interface ActiveSpin {
  spinId?: number;
  targetValue?: number;
  realValue?: number;
  effect?: unknown;
  mismatchType?: string;
  rewriteTrigger?: string;
  timing?: string;
  isInstant?: boolean;
  skillBonus?: number;
  isReverse?: boolean;
  isReroll?: boolean;
  gamblePending?: boolean;
  stoppedReels?: boolean[];
  senderId?: number;
  timestamp?: number;
}

interface RoomData {
  roomId: string;
  matchState: MatchState;
  playerCount: number;
  playerNames: string[];
  matchPlayers: unknown[];
  activePlayerIndex: number;
  currentSetIndex: number;
  currentRoundInSet: number;
  skillSelection: unknown;
  activeSpin: ActiveSpin | null;
  connectedDevices: Record<string, { deviceId: string; playerName: string; slot: number; inLobby: boolean; updatedAt: number }>;
  updatedAt: number;
}

const rooms = new Map<string, RoomData>();
const sseClients = new Map<string, Set<Response>>();
let totalClients = 0;

/* ----------------------------- helpers ----------------------------- */

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
};

const cleanString = (v: unknown, maxLen: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, maxLen) : "";

const VALID_MATCH_STATES: MatchState[] = ["setup", "lobby", "playing", "set_summary", "game_over"];

/**
 * Cut-in effect descriptors travel between devices and some of their fields end up
 * in CSS class names, so only known string fields are relayed and each is bounded.
 */
function sanitizeEffect(e: any): Record<string, string> | null {
  if (!e || typeof e !== "object") return null;
  return {
    id: cleanString(e.id, 40),
    name: cleanString(e.name, 40),
    level: cleanString(e.level, 20),
    text: cleanString(e.text, 40),
    subtitle: cleanString(e.subtitle, 60),
    dialog: cleanString(e.dialog, 120),
    bgGradients: cleanString(e.bgGradients, 200),
    borderColor: cleanString(e.borderColor, 200),
    soundName: cleanString(e.soundName, 40),
    animationStyle: cleanString(e.animationStyle, 20),
  };
}

/** Player records are relayed as-is apart from bounded names and numeric fields. */
function sanitizePlayer(p: any): Record<string, unknown> | null {
  if (!p || typeof p !== "object") return null;
  return {
    id: clampInt(p.id, 0, MAX_PLAYERS, 0),
    name: cleanString(p.name, MAX_NAME_LEN) || "プレイヤー",
    points: clampInt(p.points, -999, 999, 0),
    rawScore: p.rawScore === null ? null : clampInt(p.rawScore, -999, 999, 0),
    currentScore: p.currentScore === null ? null : clampInt(p.currentScore, -999, 999, 0),
    hasPassed: Boolean(p.hasPassed),
    usedAll5Points: Boolean(p.usedAll5Points),
    skillsActive: { minus5Active: Boolean(p.skillsActive?.minus5Active) },
    spinCount: clampInt(p.spinCount, 0, 9999, 0),
    reverseUsedThisTurn: Boolean(p.reverseUsedThisTurn),
    // Kept short on purpose: the roster is re-broadcast on every reel stop, and
    // a 100-entry log per player was a third of each frame for data no screen
    // reads. Phones on a weak link feel that.
    history: Array.isArray(p.history) ? p.history.slice(0, MAX_HISTORY_PER_PLAYER).map((v: unknown) => clampInt(v, -999, 999, 0)) : [],
    totalMatchPoints: clampInt(p.totalMatchPoints, -9_999_999, 9_999_999, 0),
    winCount: clampInt(p.winCount, 0, 9999, 0),
    hasConsumedPointsThisTurn: Boolean(p.hasConsumedPointsThisTurn),
  };
}

function emptyRoom(roomId: string): RoomData {
  return {
    roomId,
    matchState: "setup",
    playerCount: 0,
    playerNames: [],
    matchPlayers: [],
    activePlayerIndex: 0,
    currentSetIndex: 1,
    currentRoundInSet: 1,
    skillSelection: { minus20Count: 0, minus40Selected: false, minus5Selected: false, gambleSelected: false, reverseSelected: false, rerollSelected: false },
    activeSpin: null,
    connectedDevices: {},
    updatedAt: Date.now(),
  };
}

/** Only known fields are copied across, each one range-checked. */
function mergeRoomData(target: RoomData, incoming: any): RoomData {
  if (!incoming || typeof incoming !== "object") return target;

  if (Array.isArray(incoming.playerNames)) {
    target.playerNames = incoming.playerNames
      .slice(0, MAX_PLAYERS)
      .map((n: unknown, i: number) => cleanString(n, MAX_NAME_LEN) || `プレイヤー${i + 1}`);
  }
  if (incoming.playerCount !== undefined) {
    target.playerCount = clampInt(incoming.playerCount, 1, MAX_PLAYERS, target.playerCount);
  }
  if (typeof incoming.matchState === "string" && VALID_MATCH_STATES.includes(incoming.matchState)) {
    target.matchState = incoming.matchState;
  }
  if (Array.isArray(incoming.matchPlayers)) {
    target.matchPlayers = incoming.matchPlayers
      .slice(0, MAX_PLAYERS)
      .map(sanitizePlayer)
      .filter(Boolean);
  }
  if (incoming.activePlayerIndex !== undefined) {
    target.activePlayerIndex = clampInt(incoming.activePlayerIndex, 0, MAX_PLAYERS - 1, target.activePlayerIndex);
  }
  if (incoming.currentSetIndex !== undefined) {
    target.currentSetIndex = clampInt(incoming.currentSetIndex, 1, 999, target.currentSetIndex);
  }
  if (incoming.currentRoundInSet !== undefined) {
    target.currentRoundInSet = clampInt(incoming.currentRoundInSet, 1, 999, target.currentRoundInSet);
  }
  if (incoming.skillSelection && typeof incoming.skillSelection === "object") {
    target.skillSelection = {
      minus20Count: clampInt((incoming.skillSelection as any).minus20Count, 0, 2, 0),
      minus40Selected: Boolean((incoming.skillSelection as any).minus40Selected),
      minus5Selected: Boolean((incoming.skillSelection as any).minus5Selected),
      gambleSelected: Boolean((incoming.skillSelection as any).gambleSelected),
      reverseSelected: Boolean((incoming.skillSelection as any).reverseSelected),
      rerollSelected: Boolean((incoming.skillSelection as any).rerollSelected),
    };
  }
  // `activeSpin: null` is a meaningful value (clears the spin), so check for
  // explicit presence rather than truthiness.
  if ("activeSpin" in incoming) {
    const s = incoming.activeSpin;
    target.activeSpin = s && typeof s === "object"
      ? {
          spinId: clampInt(s.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
          targetValue: clampInt(s.targetValue, -999, 999, 0),
          realValue: clampInt(s.realValue, -999, 999, 0),
          effect: sanitizeEffect(s.effect),
          mismatchType: cleanString(s.mismatchType, 40) || "none",
          rewriteTrigger: cleanString(s.rewriteTrigger, 40) || "none",
          timing: cleanString(s.timing, 20) || "none",
          isInstant: Boolean(s.isInstant),
          // Skill subtraction the acting device will apply to this result, so
          // every screen animates to the same final number.
          skillBonus: clampInt(s.skillBonus, -999, 999, 0),
          isReverse: Boolean(s.isReverse),
          isReroll: Boolean(s.isReroll),
          gamblePending: Boolean(s.gamblePending),
          stoppedReels: Array.isArray(s.stoppedReels)
            ? s.stoppedReels.slice(0, 3).map(Boolean)
            : [false, false, false],
          senderId: clampInt(s.senderId, 0, MAX_PLAYERS, 0),
          timestamp: Date.now(),
        }
      : null;
  }
  return target;
}

/** Per-game result records are relayed so every device shows the same popup. */
function sanitizeRecord(r: any): Record<string, unknown> | null {
  if (!r || typeof r !== "object") return null;
  const results = Array.isArray(r.results) ? r.results.slice(0, MAX_PLAYERS) : [];
  return {
    gameIndex: clampInt(r.gameIndex, 0, 999_999, 0),
    setIndex: clampInt(r.setIndex, 0, 9999, 0),
    roundInSet: clampInt(r.roundInSet, 0, MAX_PLAYERS, 0),
    timestamp: cleanString(r.timestamp, 16),
    results: results.map((x: any) => ({
      playerId: clampInt(x?.playerId, 0, MAX_PLAYERS, 0),
      playerName: cleanString(x?.playerName, MAX_NAME_LEN) || "プレイヤー",
      rawScore: x?.rawScore === null || x?.rawScore === undefined ? null : clampInt(x.rawScore, -999, 999, 0),
      finalScore: x?.finalScore === null || x?.finalScore === undefined ? null : clampInt(x.finalScore, -999, 999, 0),
      pointsEarned: clampInt(x?.pointsEarned, -9_999_999, 9_999_999, 0),
      isWinner: Boolean(x?.isWinner),
      isZoromeBonus: Boolean(x?.isZoromeBonus),
    })),
  };
}

/** Broadcast events are relayed verbatim-ish, but size and shape bounded. */
function sanitizeBroadcast(ev: any): any | null {
  if (!ev || typeof ev !== "object") return null;
  const type = cleanString(ev.type, 32);
  if (!type) return null;
  const base: any = { type, senderId: clampInt(ev.senderId, 0, MAX_PLAYERS, 0) };

  switch (type) {
    case "TRIGGER_SPIN":
      return {
        ...base,
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
        targetValue: clampInt(ev.targetValue, -999, 999, 0),
        realValue: clampInt(ev.realValue, -999, 999, 0),
        effect: sanitizeEffect(ev.effect),
        mismatchType: cleanString(ev.mismatchType, 40) || "none",
        rewriteTrigger: cleanString(ev.rewriteTrigger, 40) || "none",
        timing: cleanString(ev.timing, 20) || "none",
        isInstant: Boolean(ev.isInstant),
        skillBonus: clampInt(ev.skillBonus, -999, 999, 0),
        isReverse: Boolean(ev.isReverse),
        isReroll: Boolean(ev.isReroll),
        gamblePending: Boolean(ev.gamblePending),
        stoppedReels: Array.isArray(ev.stoppedReels) ? ev.stoppedReels.slice(0, 3).map(Boolean) : [false, false, false],
      };
    // spinId travels with every spin-scoped event so a device can tell a message
    // about the spin it is running from a late one about the previous spin.
    case "STOP_REEL":
      return {
        ...base,
        reelIdx: clampInt(ev.reelIdx, 0, 2, 0),
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    // Authoritative end-of-spin. STOP_REEL is three separate messages and any one
    // of them going missing used to leave a spectator's reels spinning forever;
    // this single message carries everything needed to land on the same result.
    case "SPIN_RESULT":
      return {
        ...base,
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
        finalValue: clampInt(ev.finalValue, -999, 999, 0),
        skillBonus: clampInt(ev.skillBonus, -999, 999, 0),
      };
    case "EXECUTE_REWRITE":
      return { ...base, spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0) };
    // Which reel was re-rolled and what it landed on. Decided once by the acting
    // device so every screen shows the same digit.
    // The ±100 gamble is revealed by a PUSH, and the outcome was drawn when the
    // spin started — it is relayed so every screen reveals the same thing.
    case "EXECUTE_GAMBLE":
      return {
        ...base,
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
        outcome: clampInt(ev.outcome, -999, 999, 0),
      };
    case "REROLL_START":
      return {
        ...base,
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
        reelIdx: clampInt(ev.reelIdx, 0, 2, 0),
      };
    case "REROLL_REEL":
      return {
        ...base,
        spinId: clampInt(ev.spinId, 0, Number.MAX_SAFE_INTEGER, 0),
        reelIdx: clampInt(ev.reelIdx, 0, 2, 0),
        newDigit: clampInt(ev.newDigit, 0, 9, 0),
        newValue: clampInt(ev.newValue, -999, 999, 0),
      };
    case "SEND_STAMP":
      return { ...base, stampText: cleanString(ev.stampText, 40), senderName: cleanString(ev.senderName, MAX_NAME_LEN) };
    case "ROUND_RESULT":
      return {
        ...base,
        summary: ev.summary === "set" ? "set" : "round",
        isDraw: Boolean(ev.isDraw),
        winnerId: clampInt(ev.winnerId, 0, MAX_PLAYERS, 0),
        record: sanitizeRecord(ev.record),
      };
    case "SKILL_CUTIN":
      return {
        ...base,
        skillText: cleanString(ev.skillText, 24),
        skillBonus: clampInt(ev.skillBonus, -999, 999, 0),
      };
    // Opening the result screen is a table-wide action, not a per-device one.
    case "SHOW_RESULT":
      return { ...base, summary: ev.summary === "set" ? "set" : "round" };
    case "NEXT_ROUND":
    case "NEXT_SET":
    case "DISBAND":
      return base;
    default:
      return base;
  }
}

function notifyRoomClients(roomId: string, data: unknown) {
  const clients = sseClients.get(roomId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // client vanished mid-write; the close handler will clean it up
    }
  }
}

/* --------------------------- housekeeping --------------------------- */

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS && !sseClients.has(id)) {
      rooms.delete(id);
    }
  }
}, SWEEP_INTERVAL_MS).unref?.();

// SSE heartbeat: without periodic traffic, hosting proxies close idle streams.
setInterval(() => {
  for (const [roomId] of sseClients) {
    notifyRoomClients(roomId, { type: "PING", t: Date.now() });
  }
}, HEARTBEAT_MS).unref?.();

/* ------------------------------- app -------------------------------- */

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "64kb" }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), interest-cohort=()");
    next();
  });

  // Simple in-memory rate limiter for write traffic.
  const writeHits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of writeHits) if (rec.resetAt < now) writeHits.delete(ip);
  }, RATE_LIMIT_WINDOW_MS).unref?.();

  /** Counts a hit against `key`, returning false once it exceeds `limit`. */
  const withinLimit = (key: string, limit: number, now: number): boolean => {
    const rec = writeHits.get(key);
    if (!rec || rec.resetAt < now) {
      writeHits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    rec.count += 1;
    return rec.count <= limit;
  };

  const rateLimit = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || "unknown";
    const deviceId = cleanString(req.body?.deviceRegistration?.deviceId, 40);
    const deviceOk = deviceId ? withinLimit(`dev:${deviceId}`, RATE_LIMIT_MAX_PER_DEVICE, now) : true;
    const ipOk = withinLimit(`ip:${ip}`, RATE_LIMIT_MAX_PER_IP, now);
    if (!deviceOk || !ipOk) {
      // Retry-After lets the client back off instead of silently losing the write.
      res.setHeader("Retry-After", "1");
      return res.status(429).json({ success: false, message: "リクエストが多すぎます" });
    }
    next();
  };

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", rooms: rooms.size, clients: totalClients });
  });

  // ---- SSE stream: the primary realtime channel ----
  app.get("/api/sync/stream/:roomId", (req, res) => {
    const roomId = String(req.params.roomId);
    if (!ROOM_ID_RE.test(roomId)) {
      return res.status(400).end();
    }

    const roomClients = sseClients.get(roomId) ?? new Set<Response>();
    if (roomClients.size >= MAX_CLIENTS_PER_ROOM || totalClients >= MAX_TOTAL_CLIENTS) {
      return res.status(503).end();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    // Tell EventSource to retry quickly if the stream drops.
    res.write("retry: 2000\n\n");

    sseClients.set(roomId, roomClients);
    roomClients.add(res);
    totalClients += 1;

    const existing = rooms.get(roomId);
    if (existing) {
      res.write(`data: ${JSON.stringify({ type: "FULL_STATE", roomData: existing })}\n\n`);
    }

    const cleanup = () => {
      if (!roomClients.has(res)) return;
      roomClients.delete(res);
      totalClients -= 1;
      if (roomClients.size === 0) sseClients.delete(roomId);
    };
    req.on("close", cleanup);
    res.on("error", cleanup);
  });

  // ---- Push a state update and fan it out to the room ----
  app.post("/api/sync/state", rateLimit, (req, res) => {
    const roomId = cleanString(req.body?.roomId, MAX_ROOM_ID_LEN);
    if (!ROOM_ID_RE.test(roomId)) {
      return res.status(400).json({ success: false, message: "ルームIDが不正です" });
    }

    let room = rooms.get(roomId);
    if (!room) {
      if (rooms.size >= MAX_ROOMS) {
        // Evict the least recently touched idle room instead of refusing service.
        let oldestId: string | null = null;
        let oldestAt = Infinity;
        for (const [id, r] of rooms) {
          if (!sseClients.has(id) && r.updatedAt < oldestAt) {
            oldestAt = r.updatedAt;
            oldestId = id;
          }
        }
        if (oldestId) rooms.delete(oldestId);
        else return res.status(503).json({ success: false, message: "サーバーが混雑しています" });
      }
      room = emptyRoom(roomId);
    }

    const broadcastEvent = sanitizeBroadcast(req.body?.broadcastEvent);

    // Ending a session has to clear the seats too. Resetting only the match state
    // left every device still registered, so the next session opened with the old
    // line-up already in it.
    if (broadcastEvent?.type === "DISBAND") {
      const emptied = emptyRoom(roomId);
      rooms.set(roomId, emptied);
      notifyRoomClients(roomId, { type: "DISBAND", roomData: emptied, broadcastEvent });
      return res.json({ success: true, roomData: emptied });
    }

    room = mergeRoomData(room, req.body?.roomData);

    const reg = req.body?.deviceRegistration;
    if (reg && typeof reg === "object") {
      const deviceId = cleanString(reg.deviceId, 40);
      if (deviceId) {
        const devices = room.connectedDevices;
        // Short reservation: a player who leaves frees their slot within a few
        // minutes, so returning players land back on the lowest free number.
        const cutoff = Date.now() - SLOT_RESERVATION_MS;
        for (const [k, v] of Object.entries(devices)) {
          if (v.updatedAt < cutoff) delete devices[k];
        }
        const existingDevice = devices[deviceId];
        const usedSlots = new Set(Object.values(devices).map((d) => d.slot));
        let slot = existingDevice?.slot ?? 1;
        if (!existingDevice) {
          slot = 1;
          while (usedSlots.has(slot) && slot < MAX_PLAYERS) slot += 1;
        }
        devices[deviceId] = {
          deviceId,
          playerName: cleanString(reg.playerName, MAX_NAME_LEN) || `プレイヤー${slot}`,
          slot,
          // Whether this device is sitting on the lobby screen right now, so the
          // start button can wait until everyone who joined is actually there.
          inLobby: Boolean(reg.inLobby),
          updatedAt: Date.now(),
        };
      }
    }

    // The roster is rebuilt from the registered devices on every write, so a
    // device owns its own name and nobody can clobber anyone else's. Slots with
    // no device stay empty rather than becoming placeholder players.
    {
      const devs = Object.values(room.connectedDevices);
      if (devs.length > 0) {
        const maxSlot = Math.max(...devs.map((d) => d.slot));
        const names: string[] = new Array(maxSlot).fill("");
        for (const d of devs) names[d.slot - 1] = d.playerName;
        room.playerNames = names;
        room.playerCount = devs.length;
      }
    }

    room.updatedAt = Date.now();
    rooms.set(roomId, room);

    const payload = {
      type: broadcastEvent?.type || "STATE_UPDATED",
      roomData: room,
      broadcastEvent,
    };

    notifyRoomClients(roomId, payload);
    res.json({ success: true, roomData: room });
  });

  // ---- Polling fallback ----
  app.get("/api/sync/state/:roomId", (req, res) => {
    const roomId = String(req.params.roomId);
    if (!ROOM_ID_RE.test(roomId)) {
      return res.status(400).json({ success: false, message: "ルームIDが不正です" });
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, roomData: rooms.get(roomId) ?? null });
  });

  // ---- Static client / dev middleware ----
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const clientDir = path.join(process.cwd(), "dist", "client");
    // Hashed asset filenames are immutable, so they can be cached hard.
    app.use(
      "/assets",
      express.static(path.join(clientDir, "assets"), {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.use(express.static(clientDir, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Slot RNG server listening on port ${PORT} (${IS_PROD ? "production" : "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
