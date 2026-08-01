import type { EnemyRank } from '../types/game'

export const CHEST_DROP_CHANCES: Record<EnemyRank, number> = {
  normal: 0,
  'mini-boss': 0.05,
  boss: 0.1,
}

export const CHEST_SETTINGS = {
  lifetime: 30000,
  collectDistance: 62,
  maximumActiveChests: 6,
}

export function rollChestRewardCount(roll: number) {
  if (roll < 0.9) {
    return 1
  }

  if (roll < 0.99) {
    return 2
  }

  return 3
}
