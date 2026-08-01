import {
  DAILY_CHALLENGE_POOLS,
  DAILY_COMPLETION_BONUS,
  getAllDailyChallengeDefinitions,
  type DailyChallengeDefinition,
  type DailyChallengeMetric,
} from '../data/dailyChallenges'
import type { RunRecord } from '../types/game'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'

const STORAGE_KEY = 'last-night-survival:daily-challenges:v1'
const STORAGE_VERSION = 1
const MAXIMUM_RECENT_RUN_IDS = 80

export type DailyChallengeEntry = {
  definition: DailyChallengeDefinition
  progress: number
  target: number
  completed: boolean
}

export type DailyChallengeSnapshot = {
  dateKey: string
  challenges: DailyChallengeEntry[]
  completedCount: number
  totalCount: number
  totalNightMarks: number
  completionBonusGranted: boolean
  completionBonus: number
  millisecondsUntilReset: number
}

export type DailyChallengeRunResult = {
  snapshot: DailyChallengeSnapshot
  newlyCompleted: DailyChallengeDefinition[]
  nightMarksEarned: number
  completionBonusEarned: number
  wasAlreadyRecorded: boolean
}

type DailyChallengeState = {
  version: number
  dateKey: string
  challengeIds: string[]
  progressById: Record<string, number>
  completedIds: string[]
  recentRunIds: string[]
  totalNightMarks: number
  completionBonusGranted: boolean
  updatedAt: number
}

const DEFINITIONS = getAllDailyChallengeDefinitions()
const DEFINITIONS_BY_ID = new Map(
  DEFINITIONS.map((definition) => [definition.id, definition]),
)

function safeInteger(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback
}

function hashText(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function getLocalDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMillisecondsUntilDailyReset(timestamp = Date.now()) {
  const now = new Date(timestamp)
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  )

  return Math.max(0, nextMidnight.getTime() - now.getTime())
}

export function formatDailyResetTime(milliseconds: number) {
  const safeMilliseconds = Math.max(0, milliseconds)
  const totalMinutes = Math.ceil(safeMilliseconds / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) {
    return `${Math.max(1, minutes)} phút`
  }

  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`
}

function selectDailyChallenges(dateKey: string) {
  const categories = ['combat', 'survival', 'mastery'] as const

  return categories.map((category) => {
    const pool = DAILY_CHALLENGE_POOLS[category]
    const index = hashText(`${dateKey}:${category}`) % pool.length
    return pool[index]!
  })
}

function createFreshState(
  dateKey: string,
  totalNightMarks = 0,
): DailyChallengeState {
  const challenges = selectDailyChallenges(dateKey)

  return {
    version: STORAGE_VERSION,
    dateKey,
    challengeIds: challenges.map((challenge) => challenge.id),
    progressById: Object.fromEntries(
      challenges.map((challenge) => [challenge.id, 0]),
    ),
    completedIds: [],
    recentRunIds: [],
    totalNightMarks: Math.max(0, Math.round(totalNightMarks)),
    completionBonusGranted: false,
    updatedAt: Date.now(),
  }
}

function getRunMetricValue(run: RunRecord, metric: DailyChallengeMetric) {
  const statistics = run.statistics

  switch (metric) {
    case 'kills':
      return run.kills
    case 'mutatedKills':
      return statistics.mutatedKills
    case 'eliteKills':
      return statistics.eliteKills
    case 'miniBossKills':
      return statistics.miniBossKills
    case 'bossKills':
      return statistics.bossKills
    case 'pickupsCollected':
      return (
        statistics.healthPickups +
        statistics.bombPickups +
        statistics.magnetPickups
      )
    case 'chestsOpened':
      return statistics.chestsOpened
    case 'fusionsCreated':
      return statistics.fusionsCreated
    case 'wave':
      return run.wave
    case 'level':
      return run.level
    case 'survivalSeconds':
      return run.survivalSeconds
    case 'score':
      return run.score
  }
}

export class DailyChallengeSystem {
  private memoryState = createFreshState(getLocalDateKey())

  recordRun(run: RunRecord): DailyChallengeRunResult {
    const now = Date.now()
    const state = this.loadState(now)

    if (state.recentRunIds.includes(run.id)) {
      return {
        snapshot: this.createSnapshot(state, now),
        newlyCompleted: [],
        nightMarksEarned: 0,
        completionBonusEarned: 0,
        wasAlreadyRecorded: true,
      }
    }

    const completedSet = new Set(state.completedIds)
    const newlyCompleted: DailyChallengeDefinition[] = []
    let nightMarksEarned = 0

    for (const challengeId of state.challengeIds) {
      const challenge = DEFINITIONS_BY_ID.get(challengeId)

      if (!challenge || completedSet.has(challenge.id)) {
        continue
      }

      const runValue = Math.max(
        0,
        Math.round(getRunMetricValue(run, challenge.metric)),
      )
      const previousProgress = safeInteger(
        state.progressById[challenge.id],
      )
      const nextProgress =
        challenge.aggregation === 'sum'
          ? previousProgress + runValue
          : Math.max(previousProgress, runValue)

      state.progressById[challenge.id] = Math.min(
        challenge.target,
        nextProgress,
      )

      if (nextProgress >= challenge.target) {
        completedSet.add(challenge.id)
        newlyCompleted.push(challenge)
        nightMarksEarned += challenge.reward
      }
    }

    state.completedIds = state.challengeIds.filter((id) => completedSet.has(id))
    state.totalNightMarks += nightMarksEarned
    state.recentRunIds = [...state.recentRunIds, run.id].slice(
      -MAXIMUM_RECENT_RUN_IDS,
    )

    let completionBonusEarned = 0

    if (
      state.completedIds.length === state.challengeIds.length &&
      !state.completionBonusGranted
    ) {
      state.completionBonusGranted = true
      completionBonusEarned = DAILY_COMPLETION_BONUS
      state.totalNightMarks += DAILY_COMPLETION_BONUS
    }

    state.updatedAt = now
    this.persistState(state)

    return {
      snapshot: this.createSnapshot(state, now),
      newlyCompleted,
      nightMarksEarned,
      completionBonusEarned,
      wasAlreadyRecorded: false,
    }
  }

  getSnapshot(timestamp = Date.now()) {
    const state = this.loadState(timestamp)
    return this.createSnapshot(state, timestamp)
  }

  getTotalNightMarks() {
    return this.loadState(Date.now()).totalNightMarks
  }

  grantNightMarks(amount: number) {
    const reward = safeInteger(amount)
    const state = this.loadState(Date.now())

    if (reward <= 0) {
      return { granted: 0, total: state.totalNightMarks }
    }

    state.totalNightMarks += reward
    state.updatedAt = Date.now()
    this.persistState(state)

    return { granted: reward, total: state.totalNightMarks }
  }

  spendNightMarks(amount: number) {
    const cost = safeInteger(amount)
    const state = this.loadState(Date.now())

    if (cost <= 0) {
      return { success: true, spent: 0, remaining: state.totalNightMarks }
    }

    if (state.totalNightMarks < cost) {
      return {
        success: false,
        spent: 0,
        remaining: state.totalNightMarks,
      }
    }

    state.totalNightMarks -= cost
    state.updatedAt = Date.now()
    this.persistState(state)

    return {
      success: true,
      spent: cost,
      remaining: state.totalNightMarks,
    }
  }

  private createSnapshot(
    state: DailyChallengeState,
    timestamp: number,
  ): DailyChallengeSnapshot {
    const completedSet = new Set(state.completedIds)
    const challenges = state.challengeIds
      .map((id) => DEFINITIONS_BY_ID.get(id))
      .filter(
        (definition): definition is DailyChallengeDefinition =>
          definition !== undefined,
      )
      .map((definition) => ({
        definition,
        progress: Math.min(
          definition.target,
          safeInteger(state.progressById[definition.id]),
        ),
        target: definition.target,
        completed: completedSet.has(definition.id),
      }))

    return {
      dateKey: state.dateKey,
      challenges,
      completedCount: challenges.filter((challenge) => challenge.completed).length,
      totalCount: challenges.length,
      totalNightMarks: state.totalNightMarks,
      completionBonusGranted: state.completionBonusGranted,
      completionBonus: DAILY_COMPLETION_BONUS,
      millisecondsUntilReset: getMillisecondsUntilDailyReset(timestamp),
    }
  }

  private loadState(timestamp: number): DailyChallengeState {
    const dateKey = getLocalDateKey(timestamp)
    const storage = this.getStorage()

    if (!storage) {
      if (this.memoryState.dateKey !== dateKey) {
        this.memoryState = createFreshState(
          dateKey,
          this.memoryState.totalNightMarks,
        )
      }

      return this.cloneState(this.memoryState)
    }

    try {
      const rawValue = storage.getItem(STORAGE_KEY)

      if (!rawValue) {
        const fresh = createFreshState(dateKey)
        this.persistState(fresh)
        return this.cloneState(fresh)
      }

      const parsed = this.sanitizeState(JSON.parse(rawValue), dateKey)

      if (parsed.dateKey !== dateKey) {
        const fresh = createFreshState(dateKey, parsed.totalNightMarks)
        this.persistState(fresh)
        return this.cloneState(fresh)
      }

      return this.cloneState(parsed)
    } catch {
      const fresh = createFreshState(dateKey)
      this.persistState(fresh)
      return this.cloneState(fresh)
    }
  }

  private sanitizeState(
    value: unknown,
    fallbackDateKey: string,
  ): DailyChallengeState {
    if (!value || typeof value !== 'object') {
      return createFreshState(fallbackDateKey)
    }

    const source = value as Partial<DailyChallengeState>
    const dateKey =
      typeof source.dateKey === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(source.dateKey)
        ? source.dateKey
        : fallbackDateKey
    const expectedChallenges = selectDailyChallenges(dateKey)
    const expectedIds = expectedChallenges.map((challenge) => challenge.id)
    const sourceChallengeIds = Array.isArray(source.challengeIds)
      ? source.challengeIds.filter(
          (id): id is string =>
            typeof id === 'string' && DEFINITIONS_BY_ID.has(id),
        )
      : []
    const challengeIds =
      sourceChallengeIds.length === 3 &&
      sourceChallengeIds.every((id, index) => id === expectedIds[index])
        ? sourceChallengeIds
        : expectedIds
    const progressSource =
      source.progressById && typeof source.progressById === 'object'
        ? source.progressById
        : {}
    const progressById: Record<string, number> = {}

    for (const challengeId of challengeIds) {
      const definition = DEFINITIONS_BY_ID.get(challengeId)
      progressById[challengeId] = definition
        ? Math.min(
            definition.target,
            safeInteger(
              (progressSource as Record<string, unknown>)[challengeId],
            ),
          )
        : 0
    }

    const completedIds = Array.isArray(source.completedIds)
      ? Array.from(
          new Set(
            source.completedIds.filter(
              (id): id is string =>
                typeof id === 'string' && challengeIds.includes(id),
            ),
          ),
        )
      : []
    const recentRunIds = Array.isArray(source.recentRunIds)
      ? Array.from(
          new Set(
            source.recentRunIds
              .filter((id): id is string => typeof id === 'string')
              .slice(-MAXIMUM_RECENT_RUN_IDS),
          ),
        )
      : []

    return {
      version: STORAGE_VERSION,
      dateKey,
      challengeIds,
      progressById,
      completedIds,
      recentRunIds,
      totalNightMarks: safeInteger(source.totalNightMarks),
      completionBonusGranted:
        source.completionBonusGranted === true &&
        completedIds.length === challengeIds.length,
      updatedAt: safeInteger(source.updatedAt),
    }
  }

  private persistState(state: DailyChallengeState) {
    const safeState = this.sanitizeState(state, state.dateKey)
    this.memoryState = this.cloneState(safeState)
    const storage = this.getStorage()

    if (!storage) {
      return
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(safeState))
      notifyCloudProgressChanged()
    } catch {
      // localStorage có thể bị chặn. Tiến trình trong RAM vẫn hoạt động.
    }
  }

  private cloneState(state: DailyChallengeState): DailyChallengeState {
    return {
      ...state,
      challengeIds: [...state.challengeIds],
      progressById: { ...state.progressById },
      completedIds: [...state.completedIds],
      recentRunIds: [...state.recentRunIds],
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
