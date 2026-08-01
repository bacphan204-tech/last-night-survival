import {
  ACTIVE_ABILITY_DEFINITIONS,
  ACTIVE_ABILITY_TEST_MODE,
  DEFAULT_TEST_ACTIVE_ABILITY_ID,
  getActiveAbilityDefinition,
  isActiveAbilityId,
  type ActiveAbilityDefinition,
  type ActiveAbilityId,
} from '../data/activeAbilities'
import { DailyChallengeSystem } from './DailyChallengeSystem'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'
import { hasRewardAbilityUnlock } from './RewardUnlockSystem'

const STORAGE_KEY = 'last-night-survival:active-abilities:v1'
const STORAGE_VERSION = 1

type ActiveAbilityState = {
  version: number
  unlockedIds: ActiveAbilityId[]
  selectedId: ActiveAbilityId | null
  updatedAt: number
}

export type ActiveAbilityEntry = {
  definition: ActiveAbilityDefinition
  unlocked: boolean
  selected: boolean
  canAfford: boolean
  testUnlocked: boolean
}

export type ActiveAbilitySnapshot = {
  selectedId: ActiveAbilityId | null
  unlockedCount: number
  totalCount: number
  totalNightMarks: number
  testMode: boolean
  abilities: ActiveAbilityEntry[]
}

export type ActiveAbilityActionResult = {
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
  definition: ActiveAbilityDefinition | null
  snapshot: ActiveAbilitySnapshot
}

let runtimeActiveAbilityId: ActiveAbilityId | null = null

function createDefaultState(): ActiveAbilityState {
  return {
    version: STORAGE_VERSION,
    unlockedIds: [],
    selectedId: null,
    updatedAt: Date.now(),
  }
}

function isRegularUnlocked(
  state: ActiveAbilityState,
  definition: ActiveAbilityDefinition,
) {
  return !definition.rewardOnly && state.unlockedIds.includes(definition.id)
}

function isAbilityAvailable(
  state: ActiveAbilityState,
  definition: ActiveAbilityDefinition,
) {
  if (definition.rewardOnly) {
    return hasRewardAbilityUnlock(definition.id)
  }

  return ACTIVE_ABILITY_TEST_MODE || isRegularUnlocked(state, definition)
}

export class ActiveAbilityShopSystem {
  private memoryState = createDefaultState()
  private readonly dailyChallengeSystem = new DailyChallengeSystem()

  getSnapshot(): ActiveAbilitySnapshot {
    const state = this.loadState()
    const totalNightMarks = this.dailyChallengeSystem.getTotalNightMarks()
    const selectedId = this.resolveSelectedId(state)

    const abilities = ACTIVE_ABILITY_DEFINITIONS.map((definition) => {
      const regularUnlocked = isRegularUnlocked(state, definition)
      const rewardUnlocked =
        definition.rewardOnly && hasRewardAbilityUnlock(definition.id)
      const testUnlocked =
        ACTIVE_ABILITY_TEST_MODE &&
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
      unlockedCount: abilities.filter((ability) => ability.unlocked).length,
      totalCount: ACTIVE_ABILITY_DEFINITIONS.length,
      totalNightMarks,
      testMode: ACTIVE_ABILITY_TEST_MODE,
      abilities,
    }
  }

  unlockAndSelect(id: ActiveAbilityId): ActiveAbilityActionResult {
    const definition = getActiveAbilityDefinition(id)
    if (!definition) return this.invalidResult()

    const state = this.loadState()

    if (definition.rewardOnly) {
      if (!hasRewardAbilityUnlock(id)) {
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

    const unlockedSet = new Set(state.unlockedIds)

    if (ACTIVE_ABILITY_TEST_MODE) {
      state.selectedId = id
      state.updatedAt = Date.now()
      this.persistState(state)
      return {
        success: true,
        reason: unlockedSet.has(id) ? 'selected' : 'test-selected',
        spent: 0,
        missing: 0,
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    if (unlockedSet.has(id)) {
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

    const purchase = this.dailyChallengeSystem.spendNightMarks(
      definition.price,
    )
    if (!purchase.success) {
      return {
        success: false,
        reason: 'insufficient',
        spent: 0,
        missing: Math.max(0, definition.price - purchase.remaining),
        definition,
        snapshot: this.getSnapshot(),
      }
    }

    state.unlockedIds = [...unlockedSet, id]
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

  setSelectedId(id: ActiveAbilityId | null) {
    const state = this.loadState()

    if (id === null) {
      state.selectedId = null
      this.persistState(state)
      return null
    }

    if (!isActiveAbilityId(id)) return this.resolveSelectedId(state)
    const definition = getActiveAbilityDefinition(id)
    if (!definition || !isAbilityAvailable(state, definition)) {
      return this.resolveSelectedId(state)
    }

    state.selectedId = id
    state.updatedAt = Date.now()
    this.persistState(state)
    return id
  }

  getSelectedId() {
    return this.resolveSelectedId(this.loadState())
  }

  resolveId(id: ActiveAbilityId | string | null | undefined) {
    const state = this.loadState()
    if (isActiveAbilityId(id)) {
      const definition = getActiveAbilityDefinition(id)
      if (definition && isAbilityAvailable(state, definition)) {
        return id
      }
    }
    return this.resolveSelectedId(state)
  }

  private resolveSelectedId(
    state: ActiveAbilityState,
  ): ActiveAbilityId | null {
    if (state.selectedId && isActiveAbilityId(state.selectedId)) {
      const definition = getActiveAbilityDefinition(state.selectedId)
      if (definition && isAbilityAvailable(state, definition)) {
        return state.selectedId
      }
    }

    return ACTIVE_ABILITY_TEST_MODE ? DEFAULT_TEST_ACTIVE_ABILITY_ID : null
  }

  private invalidResult(): ActiveAbilityActionResult {
    return {
      success: false,
      reason: 'invalid',
      spent: 0,
      missing: 0,
      definition: null,
      snapshot: this.getSnapshot(),
    }
  }

  private loadState(): ActiveAbilityState {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
      if (!raw) return this.memoryState

      const value = JSON.parse(raw) as Partial<ActiveAbilityState>
      const unlockedIds = Array.isArray(value.unlockedIds)
        ? value.unlockedIds.filter((id): id is ActiveAbilityId => {
            if (!isActiveAbilityId(id)) return false
            return getActiveAbilityDefinition(id)?.rewardOnly !== true
          })
        : []
      const selectedId = isActiveAbilityId(value.selectedId)
        ? value.selectedId
        : null

      this.memoryState = {
        version: STORAGE_VERSION,
        unlockedIds: Array.from(new Set(unlockedIds)),
        selectedId,
        updatedAt:
          typeof value.updatedAt === 'number'
            ? value.updatedAt
            : Date.now(),
      }
      return this.memoryState
    } catch {
      return this.memoryState
    }
  }

  private persistState(state: ActiveAbilityState) {
    const safeUnlockedIds = state.unlockedIds.filter((id) => {
      const definition = getActiveAbilityDefinition(id)
      return definition?.rewardOnly !== true
    })

    this.memoryState = {
      ...state,
      unlockedIds: [...safeUnlockedIds],
    }

    try {
      globalThis.localStorage?.setItem(
        STORAGE_KEY,
        JSON.stringify(this.memoryState),
      )
      notifyCloudProgressChanged()
    } catch {
      // localStorage có thể bị chặn; trạng thái RAM vẫn hoạt động trong phiên hiện tại.
    }
  }
}

export function setRuntimeActiveAbilityId(id: ActiveAbilityId | null) {
  runtimeActiveAbilityId = id
}

export function getRuntimeActiveAbilityId() {
  return runtimeActiveAbilityId
}
