import type {
  BossAbility,
  BossVariant,
  EnemyArchetypeId,
  EnemyRank,
} from '../types/game'

export type BossDefinition = {
  id: BossVariant
  rank: Exclude<EnemyRank, 'normal'>
  label: string
  labelColor: string
  glowColor: number
  healthBarColor: number
  spriteTint: number
  healthMultiplier: number
  damageMultiplier: number
  speedMultiplier: number
  abilitiesByPhase: readonly (readonly BossAbility[])[]
  summonArchetypes: readonly EnemyArchetypeId[]
  splitsOnDeath: boolean
  splitCount: number
}

const MINI_BOSSES: readonly BossDefinition[] = [
  {
    id: 'mutant-guardian',
    rank: 'mini-boss',
    label: 'KẺ CANH GIỮ ĐỘT BIẾN',
    labelColor: '#f0abfc',
    glowColor: 0xc026d3,
    healthBarColor: 0xd946ef,
    spriteTint: 0xffffff,
    healthMultiplier: 1,
    damageMultiplier: 1,
    speedMultiplier: 1,
    abilitiesByPhase: [
      ['charge'],
      ['charge', 'shockwave'],
    ],
    summonArchetypes: ['crawler', 'mutant'],
    splitsOnDeath: false,
    splitCount: 0,
  },
  {
    id: 'plague-warden',
    rank: 'mini-boss',
    label: 'KẺ GIEO DỊCH',
    labelColor: '#bef264',
    glowColor: 0x65a30d,
    healthBarColor: 0x84cc16,
    spriteTint: 0xd9f99d,
    healthMultiplier: 1.12,
    damageMultiplier: 1.08,
    speedMultiplier: 0.96,
    abilitiesByPhase: [
      ['spread-barrage', 'charge'],
      ['spread-barrage', 'summon-minions', 'charge'],
    ],
    summonArchetypes: ['toxic', 'crawler'],
    splitsOnDeath: false,
    splitCount: 0,
  },
  {
    id: 'brood-tyrant',
    rank: 'mini-boss',
    label: 'BẠO CHÚA Ổ MẸ',
    labelColor: '#f9a8d4',
    glowColor: 0xdb2777,
    healthBarColor: 0xec4899,
    spriteTint: 0xfbcfe8,
    healthMultiplier: 1.22,
    damageMultiplier: 1.05,
    speedMultiplier: 0.94,
    abilitiesByPhase: [
      ['summon-minions', 'charge'],
      ['summon-minions', 'radial-burst', 'charge'],
    ],
    summonArchetypes: ['brood-mother', 'crawler'],
    splitsOnDeath: true,
    splitCount: 3,
  },
  {
    id: 'infernal-executioner',
    rank: 'mini-boss',
    label: 'ĐAO PHỦ HỎA NGỤC',
    labelColor: '#fdba74',
    glowColor: 0xea580c,
    healthBarColor: 0xf97316,
    spriteTint: 0xfed7aa,
    healthMultiplier: 1.32,
    damageMultiplier: 1.18,
    speedMultiplier: 1.03,
    abilitiesByPhase: [
      ['radial-burst', 'charge'],
      ['spread-barrage', 'radial-burst', 'charge'],
    ],
    summonArchetypes: ['flame', 'bomber'],
    splitsOnDeath: false,
    splitCount: 0,
  },
]

const BOSSES: readonly BossDefinition[] = [
  {
    id: 'devourer',
    rank: 'boss',
    label: 'THE DEVOURER',
    labelColor: '#fde68a',
    glowColor: 0xf97316,
    healthBarColor: 0xf97316,
    spriteTint: 0xffffff,
    healthMultiplier: 1,
    damageMultiplier: 1,
    speedMultiplier: 1,
    abilitiesByPhase: [
      ['shockwave'],
      ['shockwave', 'charge'],
      ['radial-burst', 'charge', 'shockwave'],
    ],
    summonArchetypes: ['mutant', 'brute'],
    splitsOnDeath: false,
    splitCount: 0,
  },
  {
    id: 'aegis-colossus',
    rank: 'boss',
    label: 'AEGIS COLOSSUS',
    labelColor: '#bfdbfe',
    glowColor: 0x2563eb,
    healthBarColor: 0x60a5fa,
    spriteTint: 0xdbeafe,
    healthMultiplier: 1.17,
    damageMultiplier: 1.08,
    speedMultiplier: 0.93,
    abilitiesByPhase: [
      ['radial-burst', 'shockwave'],
      ['summon-minions', 'radial-burst', 'shockwave'],
      ['spread-barrage', 'radial-burst', 'shockwave'],
    ],
    summonArchetypes: ['shielder', 'brute'],
    splitsOnDeath: false,
    splitCount: 0,
  },
  {
    id: 'brood-queen',
    rank: 'boss',
    label: 'BROOD QUEEN',
    labelColor: '#f9a8d4',
    glowColor: 0xbe185d,
    healthBarColor: 0xec4899,
    spriteTint: 0xfce7f3,
    healthMultiplier: 1.28,
    damageMultiplier: 1.12,
    speedMultiplier: 0.96,
    abilitiesByPhase: [
      ['summon-minions', 'spread-barrage'],
      ['summon-minions', 'radial-burst', 'spread-barrage'],
      ['radial-burst', 'spread-barrage', 'summon-minions'],
    ],
    summonArchetypes: ['brood-mother', 'crawler', 'toxic'],
    splitsOnDeath: true,
    splitCount: 2,
  },
  {
    id: 'infernal-engine',
    rank: 'boss',
    label: 'INFERNAL ENGINE',
    labelColor: '#fed7aa',
    glowColor: 0xdc2626,
    healthBarColor: 0xef4444,
    spriteTint: 0xffedd5,
    healthMultiplier: 1.42,
    damageMultiplier: 1.24,
    speedMultiplier: 1.02,
    abilitiesByPhase: [
      ['spread-barrage', 'shockwave'],
      ['radial-burst', 'spread-barrage', 'shockwave'],
      ['spread-barrage', 'radial-burst', 'summon-minions'],
    ],
    summonArchetypes: ['flame', 'bomber', 'scatterer'],
    splitsOnDeath: false,
    splitCount: 0,
  },
]

function getEncounterIndex(rank: Exclude<EnemyRank, 'normal'>, wave: number) {
  if (rank === 'boss') {
    return Math.max(0, Math.floor(Math.max(10, wave) / 10) - 1)
  }

  return Math.max(0, Math.floor((Math.max(5, wave) - 5) / 10))
}

export function getBossDefinition(
  rank: Exclude<EnemyRank, 'normal'>,
  wave: number,
) {
  const definitions = rank === 'boss' ? BOSSES : MINI_BOSSES
  const encounterIndex = getEncounterIndex(rank, wave)
  return definitions[encounterIndex % definitions.length]
}

export function getBossEncounterIndex(
  rank: Exclude<EnemyRank, 'normal'>,
  wave: number,
) {
  return getEncounterIndex(rank, wave)
}

export function getBossCycle(
  rank: Exclude<EnemyRank, 'normal'>,
  wave: number,
) {
  const definitions = rank === 'boss' ? BOSSES : MINI_BOSSES
  return Math.floor(getEncounterIndex(rank, wave) / definitions.length)
}
