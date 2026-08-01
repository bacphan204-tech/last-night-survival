import type {
  ActivePlayerSkillId,
  PlayerSkillId,
} from '../types/game'

export type PlayerSkillDefinition = {
  id: PlayerSkillId
  title: string
  maximumLevel: number
  usesActiveSlot: boolean
}

export const MAX_ACTIVE_SKILL_SLOTS = 5

export const ACTIVE_PLAYER_SKILL_IDS: ActivePlayerSkillId[] = [
  'orbiting-blades',
  'chain-lightning',
  'plasma-nova',
  'ice-lance',
  'meteor-rain',
  'gravity-well',
  'combat-drone',
  'energy-laser',
]

export const DEFAULT_WEAPON_SKILL_IDS: PlayerSkillId[] = [
  'multishot',
]

export const PLAYER_SKILL_IDS: PlayerSkillId[] = [
  ...ACTIVE_PLAYER_SKILL_IDS,
  ...DEFAULT_WEAPON_SKILL_IDS,
]

export const PLAYER_SKILL_DEFINITIONS: Record<
  PlayerSkillId,
  PlayerSkillDefinition
> = {
  'orbiting-blades': {
    id: 'orbiting-blades',
    title: 'LƯỠI DAO QUỸ ĐẠO',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'chain-lightning': {
    id: 'chain-lightning',
    title: 'SÉT DÂY CHUYỀN',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'plasma-nova': {
    id: 'plasma-nova',
    title: 'NOVA PLASMA',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'ice-lance': {
    id: 'ice-lance',
    title: 'BĂNG THƯƠNG',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'meteor-rain': {
    id: 'meteor-rain',
    title: 'MƯA THIÊN THẠCH',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'gravity-well': {
    id: 'gravity-well',
    title: 'HỐ ĐEN TRỌNG LỰC',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'combat-drone': {
    id: 'combat-drone',
    title: 'DRONE CHIẾN ĐẤU',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  'energy-laser': {
    id: 'energy-laser',
    title: 'LASER NĂNG LƯỢNG',
    maximumLevel: 5,
    usesActiveSlot: true,
  },
  multishot: {
    id: 'multishot',
    title: 'ĐẠN PHÂN KỲ',
    maximumLevel: 5,
    usesActiveSlot: false,
  },
}

export function isPlayerSkillId(id: string): id is PlayerSkillId {
  return PLAYER_SKILL_IDS.includes(id as PlayerSkillId)
}

export function isActivePlayerSkillId(
  id: string,
): id is ActivePlayerSkillId {
  return ACTIVE_PLAYER_SKILL_IDS.includes(id as ActivePlayerSkillId)
}
