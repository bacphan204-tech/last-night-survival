import type { PlayerStats } from '../types/game'

export type StartingProtocolId =
  | 'survivor'
  | 'assault'
  | 'guardian'
  | 'scout'

export type StartingProtocolModifiers = {
  maximumHealthMultiplier: number
  attackDamageMultiplier: number
  attackSpeedMultiplier: number
  movementSpeedMultiplier: number
  projectileSpeedMultiplier: number
  pickupRadiusBonus: number
  damageReductionBonus: number
}

export type StartingProtocolDefinition = {
  id: StartingProtocolId
  title: string
  shortTitle: string
  description: string
  advantages: string
  drawback: string
  modifiers: StartingProtocolModifiers
}

export const DEFAULT_STARTING_PROTOCOL_ID: StartingProtocolId = 'survivor'

const BASE_MODIFIERS: StartingProtocolModifiers = {
  maximumHealthMultiplier: 1,
  attackDamageMultiplier: 1,
  attackSpeedMultiplier: 1,
  movementSpeedMultiplier: 1,
  projectileSpeedMultiplier: 1,
  pickupRadiusBonus: 0,
  damageReductionBonus: 0,
}

export const STARTING_PROTOCOL_DEFINITIONS: readonly StartingProtocolDefinition[] = [
  {
    id: 'survivor',
    title: 'GIAO THỨC SINH TỒN',
    shortTitle: 'CÂN BẰNG',
    description: 'Chỉ số tiêu chuẩn, phù hợp để làm quen và thử mọi hướng nâng cấp.',
    advantages: 'Không có điểm yếu cố định',
    drawback: 'Không có lợi thế chuyên biệt',
    modifiers: { ...BASE_MODIFIERS },
  },
  {
    id: 'assault',
    title: 'GIAO THỨC XUNG KÍCH',
    shortTitle: 'HỎA LỰC',
    description: 'Tấn công nhanh và mạnh hơn, đổi lại khả năng chịu đòn thấp hơn.',
    advantages: '+18% sát thương • +9% tốc độ bắn',
    drawback: '-12% máu tối đa',
    modifiers: {
      ...BASE_MODIFIERS,
      maximumHealthMultiplier: 0.88,
      attackDamageMultiplier: 1.18,
      attackSpeedMultiplier: 1.09,
    },
  },
  {
    id: 'guardian',
    title: 'GIAO THỨC PHÁO ĐÀI',
    shortTitle: 'PHÒNG THỦ',
    description: 'Chống chịu tốt để sống lâu trong vòng vây, nhưng di chuyển chậm hơn.',
    advantages: '+28% máu • giảm thêm 10% sát thương',
    drawback: '-10% tốc độ di chuyển',
    modifiers: {
      ...BASE_MODIFIERS,
      maximumHealthMultiplier: 1.28,
      movementSpeedMultiplier: 0.9,
      damageReductionBonus: 0.1,
    },
  },
  {
    id: 'scout',
    title: 'GIAO THỨC TRINH SÁT',
    shortTitle: 'CƠ ĐỘNG',
    description: 'Cơ động, nhặt kinh nghiệm rộng và đạn bay nhanh hơn, nhưng hỏa lực thấp.',
    advantages: '+15% tốc độ • +60 phạm vi hút • +10% tốc độ đạn',
    drawback: '-12% sát thương',
    modifiers: {
      ...BASE_MODIFIERS,
      attackDamageMultiplier: 0.88,
      movementSpeedMultiplier: 1.15,
      projectileSpeedMultiplier: 1.1,
      pickupRadiusBonus: 60,
    },
  },
]

const PROTOCOL_IDS = new Set<StartingProtocolId>(
  STARTING_PROTOCOL_DEFINITIONS.map((definition) => definition.id),
)

export function isStartingProtocolId(
  value: unknown,
): value is StartingProtocolId {
  return typeof value === 'string' && PROTOCOL_IDS.has(value as StartingProtocolId)
}

export function normalizeStartingProtocolId(
  value: unknown,
): StartingProtocolId {
  return isStartingProtocolId(value)
    ? value
    : DEFAULT_STARTING_PROTOCOL_ID
}

export function getStartingProtocolDefinition(
  id: StartingProtocolId,
): StartingProtocolDefinition {
  return (
    STARTING_PROTOCOL_DEFINITIONS.find(
      (definition) => definition.id === id,
    ) ?? STARTING_PROTOCOL_DEFINITIONS[0]!
  )
}

export function combineDamageReduction(
  currentReduction: number,
  additionalReduction: number,
) {
  const current = Math.min(0.82, Math.max(0, currentReduction))
  const additional = Math.min(0.82, Math.max(0, additionalReduction))
  return Math.min(0.82, 1 - (1 - current) * (1 - additional))
}

export function applyStartingProtocolToStats(
  stats: PlayerStats,
  id: StartingProtocolId,
) {
  const modifiers = getStartingProtocolDefinition(id).modifiers

  stats.maximumHealth = Math.max(
    1,
    Math.round(stats.maximumHealth * modifiers.maximumHealthMultiplier),
  )
  stats.attackDamage = Math.max(
    1,
    stats.attackDamage * modifiers.attackDamageMultiplier,
  )
  stats.attackInterval = Math.max(
    90,
    stats.attackInterval / modifiers.attackSpeedMultiplier,
  )
  stats.movementSpeed = Math.max(
    80,
    stats.movementSpeed * modifiers.movementSpeedMultiplier,
  )
  stats.projectileSpeed = Math.max(
    100,
    stats.projectileSpeed * modifiers.projectileSpeedMultiplier,
  )
  stats.pickupRadius = Math.max(
    24,
    stats.pickupRadius + modifiers.pickupRadiusBonus,
  )
  stats.damageReduction = combineDamageReduction(
    stats.damageReduction,
    modifiers.damageReductionBonus,
  )
}
