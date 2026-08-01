import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementDefinition,
  type CareerMetric,
} from '../data/achievements'
import type { RunRecord } from '../types/game'
import { DailyChallengeSystem } from './DailyChallengeSystem'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'

const STORAGE_KEY = 'last-night-survival:career-progress:v1'
const STORAGE_VERSION = 1
const MAXIMUM_RECENT_RUN_IDS = 100

export type CareerProgressSnapshot = Record<CareerMetric, number> & {
  version: number
  unlockedAchievementIds: string[]
  lastUnlockedAchievementIds: string[]
  recentRunIds: string[]
  updatedAt: number
}

export type CareerProgressSummary = {
  totalRuns: number
  totalKills: number
  totalBossKills: number
  highestScore: number
  highestWave: number
  highestLevel: number
  unlockedCount: number
  totalAchievements: number
  lastUnlocked: AchievementDefinition[]
}

export type CareerRunResult = {
  snapshot: CareerProgressSnapshot
  newlyUnlocked: AchievementDefinition[]
  unlockedCount: number
  totalAchievements: number
  wasAlreadyRecorded: boolean
}

function createEmptyProgress(): CareerProgressSnapshot {
  return {
    version: STORAGE_VERSION,
    totalRuns: 0,
    totalScore: 0,
    totalKills: 0,
    totalBossKills: 0,
    totalEliteKills: 0,
    totalChestsOpened: 0,
    totalFusionsCreated: 0,
    highestScore: 0,
    highestWave: 0,
    highestLevel: 0,
    highestKills: 0,
    highestSurvivalSeconds: 0,
    highestFusionTier: 0,
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    recentRunIds: [],
    updatedAt: 0,
  }
}

function safeInteger(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback
}

export class CareerProgressSystem {
  private memoryProgress = createEmptyProgress()
  private readonly dailyChallengeSystem = new DailyChallengeSystem()

  recordRun(run: RunRecord): CareerRunResult {
    const current = this.loadProgress()

    if (current.recentRunIds.includes(run.id)) {
      return {
        snapshot: this.cloneProgress(current),
        newlyUnlocked: [],
        unlockedCount: current.unlockedAchievementIds.length,
        totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
        wasAlreadyRecorded: true,
      }
    }

    const statistics = run.statistics
    const next: CareerProgressSnapshot = {
      ...current,
      version: STORAGE_VERSION,
      totalRuns: current.totalRuns + 1,
      totalScore: current.totalScore + Math.max(0, run.score),
      totalKills: current.totalKills + Math.max(0, run.kills),
      totalBossKills:
        current.totalBossKills + Math.max(0, statistics.bossKills),
      totalEliteKills:
        current.totalEliteKills + Math.max(0, statistics.eliteKills),
      totalChestsOpened:
        current.totalChestsOpened + Math.max(0, statistics.chestsOpened),
      totalFusionsCreated:
        current.totalFusionsCreated +
        Math.max(0, statistics.fusionsCreated),
      highestScore: Math.max(current.highestScore, run.score),
      highestWave: Math.max(current.highestWave, run.wave),
      highestLevel: Math.max(current.highestLevel, run.level),
      highestKills: Math.max(current.highestKills, run.kills),
      highestSurvivalSeconds: Math.max(
        current.highestSurvivalSeconds,
        run.survivalSeconds,
      ),
      highestFusionTier: Math.max(
        current.highestFusionTier,
        statistics.highestFusionTier,
      ),
      recentRunIds: [...current.recentRunIds, run.id].slice(
        -MAXIMUM_RECENT_RUN_IDS,
      ),
      updatedAt: Date.now(),
    }

    const alreadyUnlocked = new Set(current.unlockedAchievementIds)
    const newlyUnlocked = ACHIEVEMENT_DEFINITIONS.filter(
      (achievement) =>
        !alreadyUnlocked.has(achievement.id) &&
        next[achievement.metric] >= achievement.target,
    )

    next.unlockedAchievementIds = [
      ...current.unlockedAchievementIds,
      ...newlyUnlocked.map((achievement) => achievement.id),
    ]
    next.lastUnlockedAchievementIds = newlyUnlocked.map(
      (achievement) => achievement.id,
    )

    this.persistProgress(next)

    // Nhiệm vụ ngày dùng cùng RunRecord nhưng có vùng lưu riêng và tự chống
    // cộng trùng bằng run_id. Nhờ đặt ở đây, MainScene không cần sửa thêm.
    this.dailyChallengeSystem.recordRun(run)

    return {
      snapshot: this.cloneProgress(next),
      newlyUnlocked,
      unlockedCount: next.unlockedAchievementIds.length,
      totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
      wasAlreadyRecorded: false,
    }
  }

  getSummary(): CareerProgressSummary {
    const progress = this.loadProgress()
    const definitionsById = new Map(
      ACHIEVEMENT_DEFINITIONS.map((definition) => [
        definition.id,
        definition,
      ]),
    )

    return {
      totalRuns: progress.totalRuns,
      totalKills: progress.totalKills,
      totalBossKills: progress.totalBossKills,
      highestScore: progress.highestScore,
      highestWave: progress.highestWave,
      highestLevel: progress.highestLevel,
      unlockedCount: progress.unlockedAchievementIds.length,
      totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
      lastUnlocked: progress.lastUnlockedAchievementIds
        .map((id) => definitionsById.get(id))
        .filter(
          (definition): definition is AchievementDefinition =>
            definition !== undefined,
        ),
    }
  }

  getProgress() {
    return this.cloneProgress(this.loadProgress())
  }

  getAchievementProgress(achievementId: string) {
    const achievement = ACHIEVEMENT_DEFINITIONS.find(
      (definition) => definition.id === achievementId,
    )

    if (!achievement) {
      return null
    }

    const progress = this.loadProgress()
    const current = Math.min(
      achievement.target,
      progress[achievement.metric],
    )

    return {
      achievement,
      current,
      target: achievement.target,
      unlocked: progress.unlockedAchievementIds.includes(achievement.id),
    }
  }

  private loadProgress(): CareerProgressSnapshot {
    const storage = this.getStorage()

    if (!storage) {
      return this.cloneProgress(this.memoryProgress)
    }

    try {
      const rawValue = storage.getItem(STORAGE_KEY)

      if (!rawValue) {
        return createEmptyProgress()
      }

      return this.sanitizeProgress(JSON.parse(rawValue))
    } catch {
      return createEmptyProgress()
    }
  }

  private persistProgress(progress: CareerProgressSnapshot) {
    const safeProgress = this.sanitizeProgress(progress)
    this.memoryProgress = this.cloneProgress(safeProgress)
    const storage = this.getStorage()

    if (!storage) {
      return
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(safeProgress))
      notifyCloudProgressChanged()
    } catch {
      // localStorage có thể bị chặn. Tiến trình tạm trong RAM vẫn hoạt động.
    }
  }

  private sanitizeProgress(value: unknown): CareerProgressSnapshot {
    if (!value || typeof value !== 'object') {
      return createEmptyProgress()
    }

    const source = value as Partial<CareerProgressSnapshot>
    const validAchievementIds = new Set(
      ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id),
    )
    const sanitizeStringArray = (input: unknown, maximum: number) =>
      Array.isArray(input)
        ? input
            .filter((item): item is string => typeof item === 'string')
            .slice(-maximum)
        : []

    const unlockedAchievementIds = Array.from(
      new Set(
        sanitizeStringArray(source.unlockedAchievementIds, 200).filter(
          (id) => validAchievementIds.has(id),
        ),
      ),
    )
    const unlockedSet = new Set(unlockedAchievementIds)
    const lastUnlockedAchievementIds = sanitizeStringArray(
      source.lastUnlockedAchievementIds,
      ACHIEVEMENT_DEFINITIONS.length,
    ).filter((id) => unlockedSet.has(id))

    return {
      version: STORAGE_VERSION,
      totalRuns: safeInteger(source.totalRuns),
      totalScore: safeInteger(source.totalScore),
      totalKills: safeInteger(source.totalKills),
      totalBossKills: safeInteger(source.totalBossKills),
      totalEliteKills: safeInteger(source.totalEliteKills),
      totalChestsOpened: safeInteger(source.totalChestsOpened),
      totalFusionsCreated: safeInteger(source.totalFusionsCreated),
      highestScore: safeInteger(source.highestScore),
      highestWave: safeInteger(source.highestWave),
      highestLevel: safeInteger(source.highestLevel),
      highestKills: safeInteger(source.highestKills),
      highestSurvivalSeconds: safeInteger(
        source.highestSurvivalSeconds,
      ),
      highestFusionTier: safeInteger(source.highestFusionTier),
      unlockedAchievementIds,
      lastUnlockedAchievementIds,
      recentRunIds: Array.from(
        new Set(
          sanitizeStringArray(
            source.recentRunIds,
            MAXIMUM_RECENT_RUN_IDS,
          ),
        ),
      ),
      updatedAt: safeInteger(source.updatedAt),
    }
  }

  private cloneProgress(
    progress: CareerProgressSnapshot,
  ): CareerProgressSnapshot {
    return {
      ...progress,
      unlockedAchievementIds: [...progress.unlockedAchievementIds],
      lastUnlockedAchievementIds: [
        ...progress.lastUnlockedAchievementIds,
      ],
      recentRunIds: [...progress.recentRunIds],
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
}
