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
  reason: 'selected' | 'test-selected' | 'unlocked' | 'insufficient' | 'invalid'
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

export class PlayerSkinSystem {
  private memoryState = createDefaultState()
  private readonly dailyChallengeSystem = new DailyChallengeSystem()

  getSnapshot(): PlayerSkinSnapshot {
    const state = this.loadState()
    const totalNightMarks = this.dailyChallengeSystem.getTotalNightMarks()
    const unlockedSet = new Set(state.unlockedIds)
    const skins = PLAYER_SKIN_DEFINITIONS.map((definition) => {
      const testUnlocked = PLAYER_SKIN_TEST_MODE && !unlockedSet.has(definition.id)
      const unlocked = unlockedSet.has(definition.id) || testUnlocked
      return {
        definition,
        unlocked,
        selected: state.selectedId === definition.id,
        canAfford: unlocked || totalNightMarks >= definition.price,
        testUnlocked,
      }
    })

    return {
      selectedId: state.selectedId,
      unlockedCount: skins.filter((skin) => skin.unlocked).length,
      totalCount: PLAYER_SKIN_DEFINITIONS.length,
      totalNightMarks,
      testMode: PLAYER_SKIN_TEST_MODE,
      skins,
    }
  }

  getSelectedId() {
    return this.loadState().selectedId
  }

  resolveId(id: PlayerSkinId | string | null | undefined) {
    const state = this.loadState()
    if (!isPlayerSkinId(id)) return state.selectedId
    if (PLAYER_SKIN_TEST_MODE || state.unlockedIds.includes(id)) return id
    return DEFAULT_PLAYER_SKIN_ID
  }

  setSelectedId(id: PlayerSkinId | string) {
    const state = this.loadState()
    if (!isPlayerSkinId(id)) return state.selectedId
    if (!PLAYER_SKIN_TEST_MODE && !state.unlockedIds.includes(id)) return state.selectedId
    state.selectedId = id
    state.updatedAt = Date.now()
    this.persistState(state)
    return state.selectedId
  }

  unlockAndSelect(id: PlayerSkinId | string): PlayerSkinActionResult {
    const definition = getPlayerSkinDefinition(id)
    const state = this.loadState()

    if (!isPlayerSkinId(id)) {
      return { success: false, reason: 'invalid', spent: 0, missing: 0, definition, snapshot: this.getSnapshot() }
    }

    if (PLAYER_SKIN_TEST_MODE) {
      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return { success: true, reason: 'test-selected', spent: 0, missing: 0, definition, snapshot: this.getSnapshot() }
    }

    if (state.unlockedIds.includes(id)) {
      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return { success: true, reason: 'selected', spent: 0, missing: 0, definition, snapshot: this.getSnapshot() }
    }

    const available = this.dailyChallengeSystem.getTotalNightMarks()
    if (available < definition.price) {
      return { success: false, reason: 'insufficient', spent: 0, missing: definition.price - available, definition, snapshot: this.getSnapshot() }
    }

    const payment = this.dailyChallengeSystem.spendNightMarks(definition.price)
    if (!payment.success) {
      return { success: false, reason: 'insufficient', spent: 0, missing: Math.max(0, definition.price - payment.remaining), definition, snapshot: this.getSnapshot() }
    }

    state.unlockedIds = Array.from(new Set([...state.unlockedIds, id]))
    state.selectedId = id
    state.updatedAt = Date.now()
    this.persistState(state)
    return { success: true, reason: 'unlocked', spent: definition.price, missing: 0, definition, snapshot: this.getSnapshot() }
  }

  applyToStats(stats: PlayerStats, id: PlayerSkinId | string) {
    const definition = getPlayerSkinDefinition(this.resolveId(id))
    const multiplier = 1 + definition.statBonus
    stats.maximumHealth = roundStat(stats.maximumHealth * multiplier)
    stats.attackDamage = roundStat(stats.attackDamage * multiplier)
    stats.movementSpeed = roundStat(stats.movementSpeed * multiplier)
    stats.projectileSpeed = roundStat(stats.projectileSpeed * multiplier)
    stats.pickupRadius = roundStat(stats.pickupRadius * multiplier)
    stats.attackInterval = Math.max(80, Math.round(stats.attackInterval / multiplier))
    return definition
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
    const unlockedIds = Array.from(new Set([
      DEFAULT_PLAYER_SKIN_ID,
      ...(Array.isArray(source.unlockedIds) ? source.unlockedIds.filter(isPlayerSkinId) : []),
    ]))
    const selectedId =
      isPlayerSkinId(source.selectedId) && (PLAYER_SKIN_TEST_MODE || unlockedIds.includes(source.selectedId))
        ? source.selectedId
        : DEFAULT_PLAYER_SKIN_ID
    return {
      version: STORAGE_VERSION,
      unlockedIds,
      selectedId,
      updatedAt: typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt) ? Math.max(0, Math.round(source.updatedAt)) : 0,
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
    try { return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage } catch { return null }
  }
}

export function setRuntimePlayerSkinId(id: PlayerSkinId) {
  runtimePlayerSkinId = getPlayerSkinDefinition(id).id
}

export function getRuntimePlayerSkinId() {
  return runtimePlayerSkinId ?? new PlayerSkinSystem().getSelectedId()
}
