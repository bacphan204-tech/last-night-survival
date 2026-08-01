import {
  DEFAULT_PLAYER_SKIN_ID,
  PLAYER_SKIN_DEFINITIONS,
  PLAYER_SKIN_TEST_MODE,
  getPlayerSkinDefinition,
  isPlayerSkinId,
  type PlayerSkinDefinition,
  type PlayerSkinId,
} from '../data/playerSkins'
import type { PlayerStats } from '../types/game'
import { DailyChallengeSystem } from './DailyChallengeSystem'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'
import { hasRewardSkinUnlock } from './RewardUnlockSystem'

const STORAGE_KEY = 'last-night-survival:player-skins:v2'
const STORAGE_VERSION = 2

type PlayerSkinState = {
  version: number
  unlockedIds: PlayerSkinId[]
  selectedId: PlayerSkinId
  updatedAt: number
}

export type PlayerSkinEntry = {
  definition: PlayerSkinDefinition
  unlocked: boolean
  selected: boolean
  canAfford: boolean
  testUnlocked: boolean
}

export type PlayerSkinSnapshot = {
  selectedId: PlayerSkinId
  unlockedCount: number
  totalCount: number
  totalNightMarks: number
  testMode: boolean
  skins: PlayerSkinEntry[]
}

export type PlayerSkinActionResult = {
  success: boolean
  reason:
    | 'selected'
    | 'test-selected'
    | 'unlocked'
    | 'insufficient'
    | 'exclusive-locked'
    | 'invalid'
  spent: number
  missing: number
  definition: PlayerSkinDefinition
  snapshot: PlayerSkinSnapshot
}

let runtimePlayerSkinId: PlayerSkinId | null = null

function createDefaultState(): PlayerSkinState {
  return {
    version: STORAGE_VERSION,
    unlockedIds: [DEFAULT_PLAYER_SKIN_ID],
    selectedId: DEFAULT_PLAYER_SKIN_ID,
    updatedAt: Date.now(),
  }
}

function roundStat(value: number) {
  return Math.max(1, Math.round(value))
}

function isRegularUnlocked(
  state: PlayerSkinState,
  definition: PlayerSkinDefinition,
) {
  return !definition.rewardOnly && state.unlockedIds.includes(definition.id)
}

function isSkinAvailable(
  state: PlayerSkinState,
  definition: PlayerSkinDefinition,
) {
  if (definition.rewardOnly) {
    return hasRewardSkinUnlock(definition.id)
  }

  return PLAYER_SKIN_TEST_MODE || isRegularUnlocked(state, definition)
}

export class PlayerSkinSystem {
  private memoryState = createDefaultState()
  private readonly dailyChallengeSystem = new DailyChallengeSystem()

  getSnapshot(): PlayerSkinSnapshot {
    const state = this.loadState()
    const totalNightMarks = this.dailyChallengeSystem.getTotalNightMarks()
    const selectedId = this.resolveSelectedId(state)

    const skins = PLAYER_SKIN_DEFINITIONS.map((definition) => {
      const regularUnlocked = isRegularUnlocked(state, definition)
      const rewardUnlocked =
        definition.rewardOnly && hasRewardSkinUnlock(definition.id)
      const testUnlocked =
        PLAYER_SKIN_TEST_MODE &&
        !definition.rewardOnly &&
        !regularUnlocked
      const unlocked = regularUnlocked || rewardUnlocked || testUnlocked

      return {
        definition,
        unlocked,
        selected: selectedId === definition.id,
        canAfford:
          unlocked ||
          (!definition.rewardOnly && totalNightMarks >= definition.price),
        testUnlocked,
      }
    })

    return {
      selectedId,
      unlockedCount: skins.filter((skin) => skin.unlocked).length,
      totalCount: PLAYER_SKIN_DEFINITIONS.length,
      totalNightMarks,
      testMode: PLAYER_SKIN_TEST_MODE,
      skins,
    }
  }

  getSelectedId() {
    return this.resolveSelectedId(this.loadState())
  }

  resolveId(id: PlayerSkinId | string | null | undefined) {
    const state = this.loadState()
    if (!isPlayerSkinId(id)) return this.resolveSelectedId(state)

    const definition = getPlayerSkinDefinition(id)
    return isSkinAvailable(state, definition)
      ? id
      : this.resolveSelectedId(state)
  }

  setSelectedId(id: PlayerSkinId | string) {
    const state = this.loadState()
    if (!isPlayerSkinId(id)) return this.resolveSelectedId(state)

    const definition = getPlayerSkinDefinition(id)
    if (!isSkinAvailable(state, definition)) {
      return this.resolveSelectedId(state)
    }

    state.selectedId = id
    state.updatedAt = Date.now()
    this.persistState(state)
    return id
  }

  unlockAndSelect(id: PlayerSkinId | string): PlayerSkinActionResult {
    const definition = getPlayerSkinDefinition(id)
    const state = this.loadState()

    if (!isPlayerSkinId(id)) {
      return {
        success: false,
        reason: 'invalid',
        spent: 0,
        missing: 0,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    if (definition.rewardOnly) {
      if (!hasRewardSkinUnlock(id)) {
        return {
          success: false,
          reason: 'exclusive-locked',
          spent: 0,
          missing: 0,
          definition,
          snapshot: this.getSnapshot(),
        }
      }

      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return {
        success: true,
        reason: 'selected',
        spent: 0,
        missing: 0,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    if (PLAYER_SKIN_TEST_MODE) {
      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return {
        success: true,
        reason: state.unlockedIds.includes(id)
          ? 'selected'
          : 'test-selected',
        spent: 0,
        missing: 0,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    if (state.unlockedIds.includes(id)) {
      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return {
        success: true,
        reason: 'selected',
        spent: 0,
        missing: 0,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    const available = this.dailyChallengeSystem.getTotalNightMarks()
    if (available < definition.price) {
      return {
        success: false,
        reason: 'insufficient',
        spent: 0,
        missing: definition.price - available,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    const payment = this.dailyChallengeSystem.spendNightMarks(
      definition.price,
    )
    if (!payment.success) {
      return {
        success: false,
        reason: 'insufficient',
        spent: 0,
        missing: Math.max(0, definition.price - payment.remaining),
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    state.unlockedIds = Array.from(new Set([...state.unlockedIds, id]))
    state.selectedId = id
    state.updatedAt = Date.now()
    this.persistState(state)
    return {
      success: true,
      reason: 'unlocked',
      spent: definition.price,
      missing: 0,
      definition,
      snapshot: this.getSnapshot(),
    }
  }

  applyToStats(stats: PlayerStats, id: PlayerSkinId | string) {
    const definition = getPlayerSkinDefinition(this.resolveId(id))
    const multiplier = 1 + definition.statBonus
    stats.maximumHealth = roundStat(stats.maximumHealth * multiplier)
    stats.attackDamage = roundStat(stats.attackDamage * multiplier)
    stats.movementSpeed = roundStat(stats.movementSpeed * multiplier)
    stats.projectileSpeed = roundStat(stats.projectileSpeed * multiplier)
    stats.pickupRadius = roundStat(stats.pickupRadius * multiplier)
    stats.attackInterval = Math.max(
      80,
      Math.round(stats.attackInterval / multiplier),
    )
    return definition
  }

  private resolveSelectedId(state: PlayerSkinState): PlayerSkinId {
    const selectedDefinition = getPlayerSkinDefinition(state.selectedId)
    return isSkinAvailable(state, selectedDefinition)
      ? selectedDefinition.id
      : DEFAULT_PLAYER_SKIN_ID
  }

  private loadState(): PlayerSkinState {
    const storage = this.getStorage()
    if (!storage) return this.cloneState(this.memoryState)

    try {
      const rawValue = storage.getItem(STORAGE_KEY)
      if (!rawValue) {
        const fresh = createDefaultState()
        this.persistState(fresh)
        return this.cloneState(fresh)
      }
      return this.sanitizeState(JSON.parse(rawValue))
    } catch {
      const fresh = createDefaultState()
      this.persistState(fresh)
      return this.cloneState(fresh)
    }
  }

  private sanitizeState(value: unknown): PlayerSkinState {
    if (!value || typeof value !== 'object') return createDefaultState()
    const source = value as Partial<PlayerSkinState>

    const unlockedIds = Array.from(
      new Set([
        DEFAULT_PLAYER_SKIN_ID,
        ...(Array.isArray(source.unlockedIds)
          ? source.unlockedIds.filter((id): id is PlayerSkinId => {
              if (!isPlayerSkinId(id)) return false
              return !getPlayerSkinDefinition(id).rewardOnly
            })
          : []),
      ]),
    )

    const selectedId = isPlayerSkinId(source.selectedId)
      ? source.selectedId
      : DEFAULT_PLAYER_SKIN_ID

    return {
      version: STORAGE_VERSION,
      unlockedIds,
      selectedId,
      updatedAt:
        typeof source.updatedAt === 'number' &&
        Number.isFinite(source.updatedAt)
          ? Math.max(0, Math.round(source.updatedAt))
          : 0,
    }
  }

  private persistState(state: PlayerSkinState) {
    const safeState = this.sanitizeState(state)
    this.memoryState = this.cloneState(safeState)
    const storage = this.getStorage()
    if (!storage) return

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(safeState))
      notifyCloudProgressChanged()
    } catch {
      /* RAM fallback */
    }
  }

  private cloneState(state: PlayerSkinState): PlayerSkinState {
    return { ...state, unlockedIds: [...state.unlockedIds] }
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

export function setRuntimePlayerSkinId(id: PlayerSkinId) {
  runtimePlayerSkinId = getPlayerSkinDefinition(id).id
}

export function getRuntimePlayerSkinId() {
  return runtimePlayerSkinId ?? new PlayerSkinSystem().getSelectedId()
}
