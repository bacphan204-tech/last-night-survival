import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import {
  getPlayerSkinDefinition,
  isPlayerSkinId,
  type PlayerSkinId,
} from '../data/playerSkins'
import {
  getActiveAbilityDefinition,
  isActiveAbilityId,
  type ActiveAbilityId,
} from '../data/activeAbilities'

export type RewardUnlockStatus =
  | 'ready'
  | 'offline'
  | 'not-configured'
  | 'error'

export type RewardUnlockSnapshot = {
  status: RewardUnlockStatus
  skinIds: PlayerSkinId[]
  abilityIds: ActiveAbilityId[]
  message: string
  refreshedAt: number
}

type RewardUnlockRow = {
  reward_type?: unknown
  reward_id?: unknown
}

const runtimeSkinUnlocks = new Set<PlayerSkinId>()
const runtimeAbilityUnlocks = new Set<ActiveAbilityId>()
let refreshedAt = 0

function readRows(value: unknown): RewardUnlockRow[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is RewardUnlockRow =>
        Boolean(item) && typeof item === 'object',
    )
  }

  if (value && typeof value === 'object') {
    const source = value as { unlocks?: unknown }
    if (Array.isArray(source.unlocks)) {
      return source.unlocks.filter(
        (item): item is RewardUnlockRow =>
          Boolean(item) && typeof item === 'object',
      )
    }
  }

  return []
}

function replaceRuntimeUnlocks(rows: RewardUnlockRow[]) {
  runtimeSkinUnlocks.clear()
  runtimeAbilityUnlocks.clear()

  for (const row of rows) {
    if (row.reward_type === 'skin' && isPlayerSkinId(row.reward_id)) {
      const definition = getPlayerSkinDefinition(row.reward_id)
      if (definition.rewardOnly) {
        runtimeSkinUnlocks.add(row.reward_id)
      }
      continue
    }

    if (
      row.reward_type === 'ability' &&
      isActiveAbilityId(row.reward_id)
    ) {
      const definition = getActiveAbilityDefinition(row.reward_id)
      if (definition?.rewardOnly) {
        runtimeAbilityUnlocks.add(row.reward_id)
      }
    }
  }

  refreshedAt = Date.now()
}

export function hasRewardSkinUnlock(id: PlayerSkinId | string) {
  return isPlayerSkinId(id) && runtimeSkinUnlocks.has(id)
}

export function hasRewardAbilityUnlock(id: ActiveAbilityId | string) {
  return isActiveAbilityId(id) && runtimeAbilityUnlocks.has(id)
}

export function getRuntimeRewardUnlockSnapshot(): RewardUnlockSnapshot {
  return {
    status: refreshedAt > 0 ? 'ready' : 'offline',
    skinIds: [...runtimeSkinUnlocks],
    abilityIds: [...runtimeAbilityUnlocks],
    message:
      refreshedAt > 0
        ? 'Đã đồng bộ phần thưởng độc quyền theo ID hồ sơ.'
        : 'Chưa đồng bộ phần thưởng độc quyền.',
    refreshedAt,
  }
}

export class RewardUnlockSystem {
  async refreshFromCloud(): Promise<RewardUnlockSnapshot> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        ...getRuntimeRewardUnlockSnapshot(),
        status: 'not-configured',
        message: 'Supabase chưa được cấu hình nên chưa thể đọc quà độc quyền.',
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        ...getRuntimeRewardUnlockSnapshot(),
        status: 'offline',
        message: 'Đang offline. Quà độc quyền sẽ đồng bộ khi có mạng.',
      }
    }

    try {
      const { data, error } = await supabase.rpc(
        'get_my_reward_unlocks_v1',
      )

      if (error) {
        return {
          ...getRuntimeRewardUnlockSnapshot(),
          status: 'error',
          message:
            error.message.includes('get_my_reward_unlocks_v1') ||
            error.message.includes('function')
              ? 'Chưa chạy SQL phần thưởng độc quyền trên Supabase.'
              : `Không thể đồng bộ quà độc quyền: ${error.message}`,
        }
      }

      replaceRuntimeUnlocks(readRows(data))
      const snapshot = getRuntimeRewardUnlockSnapshot()
      const total = snapshot.skinIds.length + snapshot.abilityIds.length

      return {
        ...snapshot,
        status: 'ready',
        message:
          total > 0
            ? `Đã đồng bộ ${total} phần thưởng độc quyền theo ID hồ sơ.`
            : 'Hồ sơ hiện chưa được trao phần thưởng độc quyền.',
      }
    } catch (error) {
      return {
        ...getRuntimeRewardUnlockSnapshot(),
        status: 'error',
        message:
          error instanceof Error
            ? `Không thể đồng bộ quà độc quyền: ${error.message}`
            : 'Không thể đồng bộ quà độc quyền.',
      }
    }
  }
}
