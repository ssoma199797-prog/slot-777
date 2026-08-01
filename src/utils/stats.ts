import { MatchGameRecord } from '../types';

/**
 * Per-set totals derived from the game log.
 *
 * The set screens used to show `totalMatchPoints`, which is the running session
 * total — so "第Nセットの結果" repeated the whole session's standings and the
 * "セット勝者" was really just whoever won the last game of the set. Deriving the
 * numbers from `gameHistory` keeps them correct without a second source of truth
 * that could drift out of sync between devices.
 */
export interface SetAggregate {
  setIndex: number;
  gameCount: number;
  /** playerId -> points gained/lost inside this set */
  pointsByPlayer: Record<number, number>;
  /** playerId -> games won inside this set */
  winsByPlayer: Record<number, number>;
  /** playerId -> display name last seen in this set */
  namesByPlayer: Record<number, string>;
}

function emptyAggregate(setIndex: number): SetAggregate {
  return { setIndex, gameCount: 0, pointsByPlayer: {}, winsByPlayer: {}, namesByPlayer: {} };
}

/** Totals for one set. */
export function aggregateSet(gameHistory: MatchGameRecord[], setIndex: number): SetAggregate {
  const out = emptyAggregate(setIndex);
  for (const game of gameHistory) {
    if (game.setIndex !== setIndex) continue;
    out.gameCount += 1;
    for (const res of game.results) {
      out.pointsByPlayer[res.playerId] = (out.pointsByPlayer[res.playerId] ?? 0) + res.pointsEarned;
      out.winsByPlayer[res.playerId] = (out.winsByPlayer[res.playerId] ?? 0) + (res.isWinner ? 1 : 0);
      out.namesByPlayer[res.playerId] = res.playerName;
    }
  }
  return out;
}

/** Every set present in the log, newest set first. */
export function aggregateAllSets(gameHistory: MatchGameRecord[]): SetAggregate[] {
  const bySet = new Map<number, SetAggregate>();
  for (const game of gameHistory) {
    if (!bySet.has(game.setIndex)) bySet.set(game.setIndex, emptyAggregate(game.setIndex));
    const agg = bySet.get(game.setIndex)!;
    agg.gameCount += 1;
    for (const res of game.results) {
      agg.pointsByPlayer[res.playerId] = (agg.pointsByPlayer[res.playerId] ?? 0) + res.pointsEarned;
      agg.winsByPlayer[res.playerId] = (agg.winsByPlayer[res.playerId] ?? 0) + (res.isWinner ? 1 : 0);
      agg.namesByPlayer[res.playerId] = res.playerName;
    }
  }
  return [...bySet.values()].sort((a, b) => b.setIndex - a.setIndex);
}

/** Ranking within a set: most points first. */
export function rankSet(agg: SetAggregate): { playerId: number; name: string; points: number; wins: number }[] {
  return Object.keys(agg.pointsByPlayer)
    .map((key) => {
      const playerId = Number(key);
      return {
        playerId,
        name: agg.namesByPlayer[playerId] ?? `プレイヤー${playerId}`,
        points: agg.pointsByPlayer[playerId] ?? 0,
        wins: agg.winsByPlayer[playerId] ?? 0,
      };
    })
    .sort((a, b) => b.points - a.points);
}

/** One round (周) inside a set, with whoever won it. */
export interface RoundResult {
  roundInSet: number;
  gameIndex: number;
  winnerName: string | null;
  winnerPoints: number;
  isDraw: boolean;
}

/**
 * The rounds of a set in playing order.
 *
 * `roundInSet` is recorded on each game, but older records predate that field, so
 * position within the set is used as a fallback.
 */
export function roundsOfSet(gameHistory: MatchGameRecord[], setIndex: number): RoundResult[] {
  return gameHistory
    .filter((game) => game.setIndex === setIndex)
    .sort((a, b) => a.gameIndex - b.gameIndex)
    .map((game, position) => {
      const winners = game.results.filter((r) => r.isWinner);
      const winner = winners[0] ?? null;
      return {
        roundInSet: game.roundInSet || position + 1,
        gameIndex: game.gameIndex,
        winnerName: winner ? winner.playerName : null,
        winnerPoints: winner ? winner.pointsEarned : 0,
        // Nobody is flagged as winner when the round was a draw.
        isDraw: winners.length === 0,
      };
    });
}

/**
 * Session totals — by definition the sum of every set, so it is summed from the
 * same game log the per-set tables use and cannot disagree with them.
 */
export function aggregateSession(gameHistory: MatchGameRecord[]): SetAggregate {
  const out = emptyAggregate(0);
  for (const game of gameHistory) {
    out.gameCount += 1;
    for (const res of game.results) {
      out.pointsByPlayer[res.playerId] = (out.pointsByPlayer[res.playerId] ?? 0) + res.pointsEarned;
      out.winsByPlayer[res.playerId] = (out.winsByPlayer[res.playerId] ?? 0) + (res.isWinner ? 1 : 0);
      out.namesByPlayer[res.playerId] = res.playerName;
    }
  }
  return out;
}

/** Medal for a 0-based rank; plain numbers past third place. */
export function rankLabel(rank: number): string {
  if (rank === 0) return '🥇 1位';
  if (rank === 1) return '🥈 2位';
  if (rank === 2) return '🥉 3位';
  return `${rank + 1}位`;
}
