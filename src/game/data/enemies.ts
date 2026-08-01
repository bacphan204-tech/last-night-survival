import { GAME_CONFIG } from '../config/gameConfig'
import {
  getBossCycle,
  getBossDefinition,
  getBossEncounterIndex,
} from './bosses'
import type {
  EnemyArchetypeId,
  EnemyAttackMode,
  EnemyEliteTrait,
  EnemyRank,
  EnemyRole,
} from '../types/game'

export type EnemyArchetypeDefinition = {
  id: EnemyArchetypeId
  role: EnemyRole
  unlockWave: number
  dangerCost: number
  spawnWeight: number
  label: string
  labelColor: string
  glowColor: number
  healthBarColor: number
  spriteTint: number
  spriteScale: number
  healthMultiplier: number
  speedMultiplier: number
  damageMultiplier: number
  scoreMultiplier: number
  projectileHitRadius: number
  contactRadius: number
  labelOffsetY: number
  healthBarOffsetY: number
  healthBarWidth: number
  shadowWidth: number
  shadowHeight: number
  glowWidth: number
  glowHeight: number
  bodyRadius: number
  bodyOffsetX: number
  bodyOffsetY: number
  knockbackForce: number
  attackMode: EnemyAttackMode
  preferredRange: number
  minimumRange: number
  rangedAttackCooldown: number
  rangedProjectileSpeed: number
  rangedProjectileDamageMultiplier: number
}

export type EnemyWaveStats = {
  rank: EnemyRank
  archetypeId: EnemyArchetypeId
  role: EnemyRole
  eliteTrait: EnemyEliteTrait | null
  dangerCost: number
  isElite: boolean
  textureKey: string
  label: string
  labelColor: string
  glowColor: number
  healthBarColor: number
  spriteTint: number
  spriteScale: number
  showLabel: boolean
  showHealthBar: boolean
  maxHealth: number
  speed: number
  contactDamage: number
  scoreValue: number
  projectileHitRadius: number
  contactRadius: number
  labelOffsetY: number
  healthBarOffsetY: number
  healthBarWidth: number
  shadowWidth: number
  shadowHeight: number
  glowWidth: number
  glowHeight: number
  bodyRadius: number
  bodyOffsetX: number
  bodyOffsetY: number
  knockbackForce: number
  attackMode: EnemyAttackMode
  preferredRange: number
  minimumRange: number
  rangedAttackCooldown: number
  rangedProjectileSpeed: number
  rangedProjectileDamage: number
}

export const ENEMY_ARCHETYPES: readonly EnemyArchetypeDefinition[] = [
  {
    id: 'mutant',
    role: 'chaser',
    unlockWave: 1,
    dangerCost: 1,
    spawnWeight: 52,
    label: 'DỊ THỂ BÓNG TỐI',
    labelColor: '#fca5a5',
    glowColor: 0xdc2626,
    healthBarColor: 0xef4444,
    spriteTint: 0xffffff,
    spriteScale: 1,
    healthMultiplier: 1,
    speedMultiplier: 1,
    damageMultiplier: 1,
    scoreMultiplier: 1,
    projectileHitRadius: 31,
    contactRadius: GAME_CONFIG.player.contactDistance,
    labelOffsetY: 66,
    healthBarOffsetY: 48,
    healthBarWidth: 70,
    shadowWidth: 54,
    shadowHeight: 18,
    glowWidth: 110,
    glowHeight: 80,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 28,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'crawler',
    role: 'swarm',
    unlockWave: 1,
    dangerCost: 1,
    spawnWeight: 31,
    label: 'KẺ BÒ BÓNG ĐÊM',
    labelColor: '#f9a8d4',
    glowColor: 0xdb2777,
    healthBarColor: 0xec4899,
    spriteTint: 0xf9a8d4,
    spriteScale: 0.82,
    healthMultiplier: 0.64,
    speedMultiplier: 1.3,
    damageMultiplier: 0.72,
    scoreMultiplier: 0.85,
    projectileHitRadius: 25,
    contactRadius: 46,
    labelOffsetY: 56,
    healthBarOffsetY: 40,
    healthBarWidth: 56,
    shadowWidth: 44,
    shadowHeight: 14,
    glowWidth: 88,
    glowHeight: 62,
    bodyRadius: 17,
    bodyOffsetX: 15,
    bodyOffsetY: 19,
    knockbackForce: 22,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'brute',
    role: 'tank',
    unlockWave: 2,
    dangerCost: 2,
    spawnWeight: 17,
    label: 'DỊ THỂ LỰC SĨ',
    labelColor: '#fdba74',
    glowColor: 0xea580c,
    healthBarColor: 0xf97316,
    spriteTint: 0xfdba74,
    spriteScale: 1.22,
    healthMultiplier: 2.15,
    speedMultiplier: 0.72,
    damageMultiplier: 1.58,
    scoreMultiplier: 1.8,
    projectileHitRadius: 39,
    contactRadius: 65,
    labelOffsetY: 80,
    healthBarOffsetY: 59,
    healthBarWidth: 86,
    shadowWidth: 69,
    shadowHeight: 22,
    glowWidth: 140,
    glowHeight: 100,
    bodyRadius: 19,
    bodyOffsetX: 13,
    bodyOffsetY: 17,
    knockbackForce: 38,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'shooter',
    role: 'ranged',
    unlockWave: 10,
    dangerCost: 2,
    spawnWeight: 18,
    label: 'XẠ THỦ DỊ THỂ',
    labelColor: '#67e8f9',
    glowColor: 0x0891b2,
    healthBarColor: 0x22d3ee,
    spriteTint: 0x67e8f9,
    spriteScale: 0.94,
    healthMultiplier: 0.88,
    speedMultiplier: 0.84,
    damageMultiplier: 0.62,
    scoreMultiplier: 1.65,
    projectileHitRadius: 29,
    contactRadius: 44,
    labelOffsetY: 64,
    healthBarOffsetY: 47,
    healthBarWidth: 66,
    shadowWidth: 50,
    shadowHeight: 16,
    glowWidth: 104,
    glowHeight: 74,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 24,
    attackMode: 'single-shot',
    preferredRange: 390,
    minimumRange: 215,
    rangedAttackCooldown: 1650,
    rangedProjectileSpeed: 315,
    rangedProjectileDamageMultiplier: 0.82,
  },
  {
    id: 'bomber',
    role: 'hazard',
    unlockWave: 15,
    dangerCost: 2,
    spawnWeight: 14,
    label: 'DỊ THỂ TỰ HỦY',
    labelColor: '#fde047',
    glowColor: 0xeab308,
    healthBarColor: 0xfacc15,
    spriteTint: 0xfde047,
    spriteScale: 0.9,
    healthMultiplier: 0.72,
    speedMultiplier: 1.18,
    damageMultiplier: 0.55,
    scoreMultiplier: 1.8,
    projectileHitRadius: 27,
    contactRadius: 43,
    labelOffsetY: 60,
    healthBarOffsetY: 43,
    healthBarWidth: 60,
    shadowWidth: 47,
    shadowHeight: 15,
    glowWidth: 100,
    glowHeight: 72,
    bodyRadius: 17,
    bodyOffsetX: 15,
    bodyOffsetY: 19,
    knockbackForce: 20,
    attackMode: 'suicide',
    preferredRange: 120,
    minimumRange: 0,
    rangedAttackCooldown: 900,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 2.4,
  },
  {
    id: 'scatterer',
    role: 'ranged',
    unlockWave: 15,
    dangerCost: 3,
    spawnWeight: 9,
    label: 'PHÁO THỦ CHÙM',
    labelColor: '#d8b4fe',
    glowColor: 0x9333ea,
    healthBarColor: 0xc084fc,
    spriteTint: 0xd8b4fe,
    spriteScale: 1.02,
    healthMultiplier: 1.05,
    speedMultiplier: 0.78,
    damageMultiplier: 0.6,
    scoreMultiplier: 2.4,
    projectileHitRadius: 32,
    contactRadius: 46,
    labelOffsetY: 69,
    healthBarOffsetY: 51,
    healthBarWidth: 72,
    shadowWidth: 56,
    shadowHeight: 18,
    glowWidth: 118,
    glowHeight: 86,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 25,
    attackMode: 'spread-shot',
    preferredRange: 440,
    minimumRange: 245,
    rangedAttackCooldown: 2450,
    rangedProjectileSpeed: 290,
    rangedProjectileDamageMultiplier: 0.58,
  },

  {
    id: 'healer',
    role: 'support',
    unlockWave: 20,
    dangerCost: 4,
    spawnWeight: 10,
    label: 'DỊ THỂ HỒI SỨC',
    labelColor: '#86efac',
    glowColor: 0x16a34a,
    healthBarColor: 0x4ade80,
    spriteTint: 0x86efac,
    spriteScale: 0.98,
    healthMultiplier: 1.12,
    speedMultiplier: 0.82,
    damageMultiplier: 0.52,
    scoreMultiplier: 2.8,
    projectileHitRadius: 31,
    contactRadius: 46,
    labelOffsetY: 68,
    healthBarOffsetY: 50,
    healthBarWidth: 72,
    shadowWidth: 54,
    shadowHeight: 17,
    glowWidth: 122,
    glowHeight: 88,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 24,
    attackMode: 'support',
    preferredRange: 360,
    minimumRange: 220,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'shielder',
    role: 'support',
    unlockWave: 20,
    dangerCost: 4,
    spawnWeight: 10,
    label: 'DỊ THỂ HỘ VỆ',
    labelColor: '#93c5fd',
    glowColor: 0x2563eb,
    healthBarColor: 0x60a5fa,
    spriteTint: 0x93c5fd,
    spriteScale: 1.05,
    healthMultiplier: 1.34,
    speedMultiplier: 0.76,
    damageMultiplier: 0.58,
    scoreMultiplier: 3.1,
    projectileHitRadius: 34,
    contactRadius: 49,
    labelOffsetY: 72,
    healthBarOffsetY: 53,
    healthBarWidth: 78,
    shadowWidth: 60,
    shadowHeight: 19,
    glowWidth: 132,
    glowHeight: 94,
    bodyRadius: 19,
    bodyOffsetX: 13,
    bodyOffsetY: 17,
    knockbackForce: 28,
    attackMode: 'support',
    preferredRange: 345,
    minimumRange: 205,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },

  {
    id: 'death-buffer',
    role: 'support',
    unlockWave: 25,
    dangerCost: 3,
    spawnWeight: 9,
    label: 'DỊ THỂ TỬ SĨ',
    labelColor: '#fdba74',
    glowColor: 0xea580c,
    healthBarColor: 0xfb923c,
    spriteTint: 0xfdba74,
    spriteScale: 1.02,
    healthMultiplier: 0.94,
    speedMultiplier: 1.04,
    damageMultiplier: 0.86,
    scoreMultiplier: 2.45,
    projectileHitRadius: 31,
    contactRadius: 48,
    labelOffsetY: 69,
    healthBarOffsetY: 51,
    healthBarWidth: 72,
    shadowWidth: 56,
    shadowHeight: 18,
    glowWidth: 122,
    glowHeight: 88,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 26,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'brood-mother',
    role: 'summoner',
    unlockWave: 25,
    dangerCost: 4,
    spawnWeight: 8,
    label: 'DỊ THỂ Ổ MẸ',
    labelColor: '#f9a8d4',
    glowColor: 0xbe185d,
    healthBarColor: 0xec4899,
    spriteTint: 0xf9a8d4,
    spriteScale: 1.18,
    healthMultiplier: 1.82,
    speedMultiplier: 0.72,
    damageMultiplier: 1.05,
    scoreMultiplier: 3.35,
    projectileHitRadius: 39,
    contactRadius: 62,
    labelOffsetY: 79,
    healthBarOffsetY: 59,
    healthBarWidth: 88,
    shadowWidth: 70,
    shadowHeight: 22,
    glowWidth: 146,
    glowHeight: 104,
    bodyRadius: 20,
    bodyOffsetX: 12,
    bodyOffsetY: 16,
    knockbackForce: 34,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'toxic',
    role: 'hazard',
    unlockWave: 25,
    dangerCost: 3,
    spawnWeight: 9,
    label: 'DỊ THỂ ĐỘC BỆNH',
    labelColor: '#86efac',
    glowColor: 0x15803d,
    healthBarColor: 0x22c55e,
    spriteTint: 0x86efac,
    spriteScale: 0.98,
    healthMultiplier: 1.02,
    speedMultiplier: 0.94,
    damageMultiplier: 0.82,
    scoreMultiplier: 2.55,
    projectileHitRadius: 31,
    contactRadius: 48,
    labelOffsetY: 68,
    healthBarOffsetY: 50,
    healthBarWidth: 72,
    shadowWidth: 55,
    shadowHeight: 18,
    glowWidth: 124,
    glowHeight: 90,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 25,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
  {
    id: 'flame',
    role: 'hazard',
    unlockWave: 25,
    dangerCost: 3,
    spawnWeight: 9,
    label: 'DỊ THỂ HỎA TÁNG',
    labelColor: '#fdba74',
    glowColor: 0xdc2626,
    healthBarColor: 0xf97316,
    spriteTint: 0xfdba74,
    spriteScale: 0.96,
    healthMultiplier: 0.86,
    speedMultiplier: 1.12,
    damageMultiplier: 0.96,
    scoreMultiplier: 2.65,
    projectileHitRadius: 30,
    contactRadius: 47,
    labelOffsetY: 66,
    healthBarOffsetY: 48,
    healthBarWidth: 68,
    shadowWidth: 53,
    shadowHeight: 17,
    glowWidth: 118,
    glowHeight: 84,
    bodyRadius: 18,
    bodyOffsetX: 14,
    bodyOffsetY: 18,
    knockbackForce: 25,
    attackMode: 'melee',
    preferredRange: 0,
    minimumRange: 0,
    rangedAttackCooldown: 0,
    rangedProjectileSpeed: 0,
    rangedProjectileDamageMultiplier: 0,
  },
]

const HEALTH_GROWTH_PER_WAVE = 0.045
const DAMAGE_GROWTH_PER_WAVE = 0.025
const SPEED_GROWTH_PER_WAVE = 0.005

function getNormalBaseStats(wave: number) {
  const waveOffset = Math.max(1, wave) - 1
  const healthMultiplier = Math.pow(
    1 + HEALTH_GROWTH_PER_WAVE,
    waveOffset,
  )
  const damageMultiplier = Math.pow(
    1 + DAMAGE_GROWTH_PER_WAVE,
    waveOffset,
  )
  const speedMultiplier = Math.pow(
    1 + SPEED_GROWTH_PER_WAVE,
    waveOffset,
  )

  return {
    maxHealth: Math.round(
      GAME_CONFIG.enemy.baseHealth * healthMultiplier,
    ),
    speed: Math.min(
      GAME_CONFIG.enemy.baseSpeed * speedMultiplier,
      GAME_CONFIG.enemy.maximumSpeed,
    ),
    contactDamage: Math.max(
      1,
      Math.round(
        GAME_CONFIG.enemy.baseContactDamage * damageMultiplier,
      ),
    ),
  }
}

export function getEnemyArchetypeDefinition(
  archetypeId: EnemyArchetypeId,
) {
  return (
    ENEMY_ARCHETYPES.find(
      (definition) => definition.id === archetypeId,
    ) ?? ENEMY_ARCHETYPES[0]
  )
}

export function getUnlockedEnemyArchetypes(wave: number) {
  return ENEMY_ARCHETYPES.filter(
    (definition) => wave >= definition.unlockWave,
  )
}

function getEliteMultipliers(trait: EnemyEliteTrait | null) {
  switch (trait) {
    case 'swift':
      return {
        health: 1.12,
        speed: 1.22,
        damage: 1.12,
        score: 2.25,
        glowColor: 0x22d3ee,
        healthBarColor: 0x06b6d4,
        label: 'NHANH NHẸN',
      }

    case 'armored':
      return {
        health: 1.7,
        speed: 0.94,
        damage: 1.12,
        score: 2.7,
        glowColor: 0x94a3b8,
        healthBarColor: 0xcbd5e1,
        label: 'BỌC GIÁP',
      }

    case 'berserker':
      return {
        health: 1.28,
        speed: 1.08,
        damage: 1.38,
        score: 2.55,
        glowColor: 0xf43f5e,
        healthBarColor: 0xfb7185,
        label: 'CUỒNG NỘ',
      }

    case 'vampiric':
      return {
        health: 1.4,
        speed: 1.04,
        damage: 1.22,
        score: 2.8,
        glowColor: 0x7c3aed,
        healthBarColor: 0xa78bfa,
        label: 'HÚT MÁU',
      }

    case 'regenerator':
      return {
        health: 1.52,
        speed: 0.98,
        damage: 1.15,
        score: 2.8,
        glowColor: 0x16a34a,
        healthBarColor: 0x4ade80,
        label: 'HỒI PHỤC',
      }

    default:
      return {
        health: 1,
        speed: 1,
        damage: 1,
        score: 1,
        glowColor: 0,
        healthBarColor: 0,
        label: '',
      }
  }
}

export function getEnemyStatsForWave(
  wave: number,
  rank: EnemyRank = 'normal',
  archetypeId: EnemyArchetypeId = 'mutant',
  eliteTrait: EnemyEliteTrait | null = null,
): EnemyWaveStats {
  const normal = getNormalBaseStats(wave)

  if (rank === 'mini-boss' || rank === 'boss') {
    const definition = getBossDefinition(rank, wave)
    const encounterIndex = getBossEncounterIndex(rank, wave)
    const cycle = getBossCycle(rank, wave)
    const cycleHealthMultiplier = 1 + cycle * 0.34
    const cycleDamageMultiplier = 1 + cycle * 0.16
    const cycleSpeedMultiplier = Math.min(1.12, 1 + cycle * 0.035)
    const isBoss = rank === 'boss'

    const baseHealthMultiplier = isBoss
      ? GAME_CONFIG.boss.bossHealthMultiplier
      : GAME_CONFIG.boss.miniBossHealthMultiplier

    const baseDamageMultiplier = isBoss
      ? GAME_CONFIG.boss.bossDamageMultiplier
      : GAME_CONFIG.boss.miniBossDamageMultiplier

    const baseSpeedMultiplier = isBoss
      ? GAME_CONFIG.boss.bossSpeedMultiplier
      : GAME_CONFIG.boss.miniBossSpeedMultiplier

    return {
      rank,
      archetypeId: 'mutant',
      role: 'boss',
      eliteTrait: null,
      dangerCost: 0,
      isElite: false,
      textureKey: isBoss
        ? 'boss-placeholder'
        : 'mini-boss-placeholder',
      label:
        cycle > 0
          ? `${definition.label} • CƯỜNG HÓA ${cycle + 1}`
          : definition.label,
      labelColor: definition.labelColor,
      glowColor: definition.glowColor,
      healthBarColor: definition.healthBarColor,
      spriteTint: definition.spriteTint,
      spriteScale: isBoss ? 1 : 1,
      showLabel: true,
      showHealthBar: true,
      maxHealth: Math.round(
        normal.maxHealth *
          baseHealthMultiplier *
          definition.healthMultiplier *
          cycleHealthMultiplier,
      ),
      speed: Math.min(
        GAME_CONFIG.enemy.maximumSpeed,
        normal.speed *
          baseSpeedMultiplier *
          definition.speedMultiplier *
          cycleSpeedMultiplier,
      ),
      contactDamage: Math.max(
        1,
        Math.round(
          normal.contactDamage *
            baseDamageMultiplier *
            definition.damageMultiplier *
            cycleDamageMultiplier,
        ),
      ),
      scoreValue:
        (isBoss
          ? GAME_CONFIG.boss.bossScore + wave * 180
          : GAME_CONFIG.boss.miniBossScore + wave * 80) +
        encounterIndex * (isBoss ? 900 : 350),
      projectileHitRadius: isBoss ? 61 : 43,
      contactRadius: isBoss ? 94 : 72,
      labelOffsetY: isBoss ? 114 : 88,
      healthBarOffsetY: isBoss ? 91 : 68,
      healthBarWidth: isBoss ? 144 : 112,
      shadowWidth: isBoss ? 112 : 82,
      shadowHeight: isBoss ? 31 : 24,
      glowWidth: isBoss ? 230 : 170,
      glowHeight: isBoss ? 165 : 120,
      bodyRadius: isBoss ? 25 : 22,
      bodyOffsetX: isBoss ? 39 : 26,
      bodyOffsetY: isBoss ? 48 : 31,
      knockbackForce: isBoss ? 58 : 42,
      attackMode: 'melee',
      preferredRange: 0,
      minimumRange: 0,
      rangedAttackCooldown: 0,
      rangedProjectileSpeed: 0,
      rangedProjectileDamage: 0,
    }
  }

  const archetype = getEnemyArchetypeDefinition(archetypeId)
  const elite = getEliteMultipliers(eliteTrait)
  const isElite = eliteTrait !== null

  const speed = Math.min(
    normal.speed * archetype.speedMultiplier * elite.speed,
    GAME_CONFIG.enemy.maximumSpeed,
  )

  return {
    rank,
    archetypeId: archetype.id,
    role: archetype.role,
    eliteTrait,
    dangerCost: archetype.dangerCost * (isElite ? 2 : 1),
    isElite,
    textureKey: 'enemy-placeholder',
    label: isElite
      ? `TINH ANH ${elite.label} • ${archetype.label}`
      : archetype.label,
    labelColor: isElite ? '#fef3c7' : archetype.labelColor,
    glowColor: isElite ? elite.glowColor : archetype.glowColor,
    healthBarColor: isElite
      ? elite.healthBarColor
      : archetype.healthBarColor,
    spriteTint: archetype.spriteTint,
    spriteScale: archetype.spriteScale * (isElite ? 1.08 : 1),
    showLabel:
      isElite ||
      archetype.role === 'ranged' ||
      archetype.role === 'hazard' ||
      archetype.role === 'support' ||
      archetype.role === 'summoner',
    showHealthBar:
      isElite ||
      archetype.role === 'tank' ||
      archetype.role === 'ranged' ||
      archetype.role === 'hazard' ||
      archetype.role === 'support' ||
      archetype.role === 'summoner',
    maxHealth: Math.round(
      normal.maxHealth *
        archetype.healthMultiplier *
        elite.health,
    ),
    speed,
    contactDamage: Math.max(
      1,
      Math.round(
        normal.contactDamage *
          archetype.damageMultiplier *
          elite.damage,
      ),
    ),
    scoreValue: Math.round(
      (100 + wave * 20) *
        archetype.scoreMultiplier *
        elite.score,
    ),
    projectileHitRadius:
      archetype.projectileHitRadius * (isElite ? 1.08 : 1),
    contactRadius:
      archetype.contactRadius * (isElite ? 1.06 : 1),
    labelOffsetY:
      archetype.labelOffsetY * (isElite ? 1.08 : 1),
    healthBarOffsetY:
      archetype.healthBarOffsetY * (isElite ? 1.08 : 1),
    healthBarWidth:
      archetype.healthBarWidth * (isElite ? 1.12 : 1),
    shadowWidth:
      archetype.shadowWidth * (isElite ? 1.08 : 1),
    shadowHeight:
      archetype.shadowHeight * (isElite ? 1.08 : 1),
    glowWidth:
      archetype.glowWidth * (isElite ? 1.22 : 1),
    glowHeight:
      archetype.glowHeight * (isElite ? 1.22 : 1),
    bodyRadius: archetype.bodyRadius,
    bodyOffsetX: archetype.bodyOffsetX,
    bodyOffsetY: archetype.bodyOffsetY,
    knockbackForce:
      archetype.knockbackForce * (isElite ? 1.12 : 1),
    attackMode: archetype.attackMode,
    preferredRange: archetype.preferredRange,
    minimumRange: archetype.minimumRange,
    rangedAttackCooldown: archetype.rangedAttackCooldown,
    rangedProjectileSpeed: archetype.rangedProjectileSpeed,
    rangedProjectileDamage: Math.max(
      0,
      Math.round(
        normal.contactDamage *
          archetype.rangedProjectileDamageMultiplier *
          elite.damage,
      ),
    ),
  }
}
