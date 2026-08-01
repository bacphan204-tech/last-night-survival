import type {
  LocalLeaderboardSaveResult,
  RunRecord,
  RunStatistics,
} from '../types/game'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'

const STORAGE_KEY = 'last-night-survival:local-leaderboard:v1'
const MAXIMUM_RECORDS = 10

function createEmptyStatistics(): RunStatistics {
  return {
    totalKills: 0,
    normalKills: 0,
    mutatedKills: 0,
    eliteKills: 0,
    miniBossKills: 0,
    bossKills: 0,
    healthPickups: 0,
    bombPickups: 0,
    magnetPickups: 0,
    chestsOpened: 0,
    chestRewardsReceived: 0,
    fusionsCreated: 0,
    fusionUpgrades: 0,
    highestFusionTier: 0,
    scoreFromEnemies: 0,
    scoreFromWaves: 0,
  }
}

export class LocalLeaderboardSystem {
  private memoryRecords: RunRecord[] = []

  saveRun(record: RunRecord): LocalLeaderboardSaveResult {
    const previousRecords = this.loadRecords()
    const previousBest = previousRecords[0]?.score ?? 0
    const records = this.sortRecords([...previousRecords, record]).slice(
      0,
      MAXIMUM_RECORDS,
    )

    this.persistRecords(records)

    const rankIndex = records.findIndex((item) => item.id === record.id)
    const bestScore = records[0]?.score ?? record.score

    return {
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      isNewBest:
        previousRecords.length === 0 || record.score > previousBest,
      bestScore,
      records,
    }
  }

  getRecords() {
    return this.loadRecords()
  }

  getBestScore() {
    return this.loadRecords()[0]?.score ?? 0
  }

  private loadRecords(): RunRecord[] {
    const storage = this.getStorage()

    if (!storage) {
      return this.sortRecords([...this.memoryRecords])
    }

    try {
      const rawValue = storage.getItem(STORAGE_KEY)

      if (!rawValue) {
        return []
      }

      const parsed = JSON.parse(rawValue)

      if (!Array.isArray(parsed)) {
        return []
      }

      return this.sortRecords(
        parsed
          .map((value) => this.sanitizeRecord(value))
          .filter((value): value is RunRecord => value !== null),
      ).slice(0, MAXIMUM_RECORDS)
    } catch {
      return []
    }
  }

  private persistRecords(records: RunRecord[]) {
    this.memoryRecords = [...records]
    const storage = this.getStorage()

    if (!storage) {
      return
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records))
      notifyCloudProgressChanged()
    } catch {
      // Trình duyệt có thể chặn localStorage. Bảng điểm tạm trong RAM vẫn hoạt động.
    }
  }

  private getStorage(): Storage | null {
    try {
      return typeof globalThis.localStorage === 'undefined'
        ? null
        : globalThis.localStorage
    } catch {
      return null
    }
  }

  private sortRecords(records: RunRecord[]) {
    return records.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (right.wave !== left.wave) {
        return right.wave - left.wave
      }

      if (right.kills !== left.kills) {
        return right.kills - left.kills
      }

      if (right.level !== left.level) {
        return right.level - left.level
      }

      return left.createdAt - right.createdAt
    })
  }

  private sanitizeRecord(value: unknown): RunRecord | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const record = value as Partial<RunRecord>

    if (typeof record.id !== 'string' || record.id.length === 0) {
      return null
    }

    const safeNumber = (input: unknown, minimum: number) =>
      typeof input === 'number' && Number.isFinite(input)
        ? Math.max(minimum, Math.round(input))
        : minimum

    const statisticsSource =
      record.statistics && typeof record.statistics === 'object'
        ? record.statistics
        : createEmptyStatistics()
    const empty = createEmptyStatistics()
    const statistics = Object.fromEntries(
      Object.keys(empty).map((key) => [
        key,
        safeNumber(
          (statisticsSource as unknown as Record<string, unknown>)[key],
          0,
        ),
      ]),
    ) as RunStatistics

    return {
      id: record.id,
      createdAt: safeNumber(record.createdAt, 0),
      score: safeNumber(record.score, 0),
      wave: safeNumber(record.wave, 1),
      kills: safeNumber(record.kills, 0),
      level: safeNumber(record.level, 1),
      survivalSeconds: safeNumber(record.survivalSeconds, 0),
      statistics,
    }
  }
}
