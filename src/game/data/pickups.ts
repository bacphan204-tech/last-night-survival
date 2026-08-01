import type { EnemyRank, PickupKind } from '../types/game'

export type PickupDefinition = {
  kind: PickupKind
  title: string
  color: number
  glowColor: number
  symbol: string
}

export const PICKUP_DEFINITIONS: Record<PickupKind, PickupDefinition> = {
  health: {
    kind: 'health',
    title: 'BÌNH HỒI PHỤC',
    color: 0xef4444,
    glowColor: 0xfb7185,
    symbol: '+',
  },
  bomb: {
    kind: 'bomb',
    title: 'BOM XUNG KÍCH',
    color: 0xf97316,
    glowColor: 0xfbbf24,
    symbol: '✹',
  },
  magnet: {
    kind: 'magnet',
    title: 'NAM CHÂM KINH NGHIỆM',
    color: 0x2563eb,
    glowColor: 0x67e8f9,
    symbol: 'U',
  },
}

export const PICKUP_DROP_CHANCES: Record<EnemyRank, number> = {
  normal: 0.01,
  'mini-boss': 0.1,
  boss: 0.2,
}

export const PICKUP_SETTINGS = {
  maximumActivePickups: 24,
  lifetime: 18000,
  collectDistance: 42,
  bombRadius: 260,
  magnetDuration: 7000,
} as const
