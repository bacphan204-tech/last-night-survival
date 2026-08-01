import { GAME_CONFIG } from '../config/gameConfig'
import { getUnlockedEnemyArchetypes } from '../data/enemies'
import type {
  EnemyArchetypeId,
  EnemyEliteTrait,
  EnemyRole,
  EnemySpawnSelection,
} from '../types/game'

export type WaveKind = 'normal' | 'mini-boss' | 'boss'

type NumberMilestone = {
  wave: number
  value: number
}

type SpawnGroup = 'basic' | 'special'

const CURRENT_ACTIVE_ENEMY_CAP = 40
const MAX_ACTIVE_HEALERS = 3
const MAX_ACTIVE_SHIELDERS = 3
const MAX_ACTIVE_DEATH_BUFFERS = 4
const MAX_ACTIVE_BROOD_MOTHERS = 3
const MAX_ACTIVE_TOXIC = 4
const MAX_ACTIVE_FLAME = 4

const ENEMY_LIMIT_MILESTONES: readonly NumberMilestone[] = [
  { wave: 1, value: 10 },
  { wave: 2, value: 14 },
  { wave: 3, value: 18 },
  { wave: 5, value: 26 },
  { wave: 10, value: 40 },
  { wave: 15, value: 52 },
  { wave: 20, value: 65 },
  { wave: 30, value: 80 },
  { wave: 40, value: 100 },
]

const ELITE_CHANCE_MILESTONES: readonly NumberMilestone[] = [
  { wave: 1, value: 0 },
  { wave: 4, value: 0 },
  { wave: 5, value: 0.05 },
  { wave: 10, value: 0.08 },
  { wave: 20, value: 0.13 },
  { wave: 30, value: 0.18 },
  { wave: 45, value: 0.25 },
]

const SPECIAL_ROLES = new Set<EnemyRole>([
  'ranged',
  'support',
  'hazard',
  'summoner',
])

function interpolateMilestones(
  wave: number,
  milestones: readonly NumberMilestone[],
) {
  const safeWave = Math.max(1, wave)

  if (safeWave <= milestones[0].wave) {
    return milestones[0].value
  }

  for (let index = 1; index < milestones.length; index++) {
    const previous = milestones[index - 1]
    const current = milestones[index]

    if (safeWave > current.wave) {
      continue
    }

    const waveRange = current.wave - previous.wave
    const progress =
      waveRange <= 0
        ? 1
        : (safeWave - previous.wave) / waveRange

    return (
      previous.value +
      (current.value - previous.value) * progress
    )
  }

  return milestones[milestones.length - 1].value
}

function clampRoll(value: number) {
  return Math.min(0.999999, Math.max(0, value))
}

export class WaveSystem {
  currentWave = 0

  private nextWaveAt = 0
  private nextEnemySpawnAt = 0
  private specialSpawned = false
  private nextSpawnGroup: SpawnGroup = 'basic'
  private basicSpawnCursor = 0
  private specialSpawnCursor = 0

  reset() {
    this.currentWave = 0
    this.nextWaveAt = 0
    this.nextEnemySpawnAt = 0
    this.specialSpawned = false
    this.nextSpawnGroup = 'basic'
    this.basicSpawnCursor = 0
    this.specialSpawnCursor = 0
  }

  beginWave(now: number, wave: number) {
    this.currentWave = Math.max(1, wave)
    this.nextWaveAt = now + this.getWaveDuration()
    this.nextEnemySpawnAt = now
    this.specialSpawned = false

    // Từ đợt 10, ưu tiên sinh quái đặc biệt đầu tiên để dễ nhận biết
    // khi dùng phím N chuyển đợt để kiểm tra.
    this.nextSpawnGroup = this.currentWave >= 10 ? 'special' : 'basic'
    this.basicSpawnCursor = Math.max(0, this.currentWave - 1)
    this.specialSpawnCursor = Math.max(0, this.currentWave - 10)
  }

  shouldStartNextWave(now: number, activeSpecialEnemies: number) {
    return now >= this.nextWaveAt && activeSpecialEnemies === 0
  }

  isWaveTimeExpired(now: number) {
    return now >= this.nextWaveAt
  }

  shouldSpawn(
    now: number,
    activeNormalEnemies: number,
    activeDanger = activeNormalEnemies,
    hasActiveSpecial = false,
  ) {
    return (
      now >= this.nextEnemySpawnAt &&
      this.canSpawnNormalEnemy(
        activeNormalEnemies,
        activeDanger,
        hasActiveSpecial,
      )
    )
  }

  canSpawnNormalEnemy(
    activeNormalEnemies: number,
    activeDanger: number,
    hasActiveSpecial = false,
  ) {
    return (
      activeNormalEnemies < this.getNormalEnemyLimit(hasActiveSpecial) &&
      activeDanger < this.getDangerBudget(hasActiveSpecial)
    )
  }

  scheduleNextSpawn(
    now: number,
    hasActiveSpecial = false,
    failedToSpawn = false,
  ) {
    const delay = failedToSpawn
      ? 180
      : this.getSpawnInterval(hasActiveSpecial)

    this.nextEnemySpawnAt = now + delay
  }

  expediteNextSpawn(now: number, delay: number) {
    this.nextEnemySpawnAt = Math.min(
      this.nextEnemySpawnAt,
      now + delay,
    )
  }

  needsSpecialSpawn() {
    return this.getWaveKind() !== 'normal' && !this.specialSpawned
  }

  markSpecialSpawned() {
    this.specialSpawned = true
  }

  getDesignedEnemyLimit(wave = this.currentWave) {
    return Math.round(
      interpolateMilestones(wave, ENEMY_LIMIT_MILESTONES),
    )
  }

  getNormalEnemyLimit(hasActiveSpecial = false) {
    const fullLimit = Math.min(
      this.getDesignedEnemyLimit(),
      CURRENT_ACTIVE_ENEMY_CAP,
    )

    if (!hasActiveSpecial) {
      return fullLimit
    }

    const kind = this.getWaveKind()
    const ratio = kind === 'boss' ? 0.4 : 0.32
    const minimumMinions = kind === 'boss' ? 12 : 8

    return Math.min(
      fullLimit,
      Math.max(minimumMinions, Math.round(fullLimit * ratio)),
    )
  }

  getEnemyLimit(hasActiveSpecial = false) {
    return (
      this.getNormalEnemyLimit(hasActiveSpecial) +
      (hasActiveSpecial ? 1 : 0)
    )
  }

  getDangerBudget(hasActiveSpecial = false) {
    const normalEnemyLimit = Math.max(
      1,
      this.getNormalEnemyLimit(hasActiveSpecial),
    )

    // Quái đặc biệt tốn 2-3 điểm nguy hiểm. Ngân sách được nâng
    // để tỉ lệ theo SỐ LƯỢNG có thể tiến gần 50% cơ bản / 50% đặc biệt.
    let dangerMultiplier = 1.55

    if (this.currentWave >= 10) {
      dangerMultiplier = 1.9
    }

    if (this.currentWave >= 15) {
      dangerMultiplier = 2.2
    }

    if (this.currentWave >= 20) {
      dangerMultiplier = 2.35
    }

    if (this.currentWave >= 25) {
      dangerMultiplier = 2.5
    }

    return Math.round(normalEnemyLimit * dangerMultiplier)
  }

  getSpawnBatchSize(hasActiveSpecial = false) {
    let batchSize = 2

    if (this.currentWave >= 2) {
      batchSize = 3
    }

    if (this.currentWave >= 5) {
      batchSize = 4
    }

    if (this.currentWave >= 10) {
      batchSize = 5
    }

    if (this.currentWave >= 20) {
      batchSize = 6
    }

    if (hasActiveSpecial) {
      return Math.max(1, batchSize - 2)
    }

    return batchSize
  }

  getSpawnInterval(hasActiveSpecial = false) {
    const scaledInterval =
      GAME_CONFIG.wave.baseSpawnInterval *
      Math.pow(
        GAME_CONFIG.wave.spawnIntervalMultiplierPerWave,
        Math.max(0, this.currentWave - 1),
      )

    const crowdAdjustment = Math.max(
      0.72,
      1 - Math.max(0, this.currentWave - 1) * 0.012,
    )

    const specialAdjustment = hasActiveSpecial ? 1.55 : 1

    return Math.max(
      GAME_CONFIG.wave.minimumSpawnInterval,
      Math.round(
        scaledInterval * crowdAdjustment * specialAdjustment,
      ),
    )
  }

  getEliteChance(wave = this.currentWave) {
    return interpolateMilestones(
      wave,
      ELITE_CHANCE_MILESTONES,
    )
  }

  getSpawnSelection(
    archetypeRoll: number,
    eliteRoll: number,
    eliteTraitRoll: number,
    activeDanger: number,
    hasActiveSpecial = false,
    activeArchetypeCounts: Partial<Record<EnemyArchetypeId, number>> = {},
  ): EnemySpawnSelection | null {
    const remainingDanger = Math.max(
      0,
      this.getDangerBudget(hasActiveSpecial) - activeDanger,
    )

    if (remainingDanger < 1) {
      return null
    }

    const affordable = getUnlockedEnemyArchetypes(
      this.currentWave,
    ).filter((definition) => {
      if (definition.dangerCost > remainingDanger) {
        return false
      }

      if (
        definition.id === 'healer' &&
        (activeArchetypeCounts.healer ?? 0) >= MAX_ACTIVE_HEALERS
      ) {
        return false
      }

      if (
        definition.id === 'shielder' &&
        (activeArchetypeCounts.shielder ?? 0) >= MAX_ACTIVE_SHIELDERS
      ) {
        return false
      }

      if (
        definition.id === 'death-buffer' &&
        (activeArchetypeCounts['death-buffer'] ?? 0) >=
          MAX_ACTIVE_DEATH_BUFFERS
      ) {
        return false
      }

      if (
        definition.id === 'brood-mother' &&
        (activeArchetypeCounts['brood-mother'] ?? 0) >=
          MAX_ACTIVE_BROOD_MOTHERS
      ) {
        return false
      }

      if (
        definition.id === 'toxic' &&
        (activeArchetypeCounts.toxic ?? 0) >= MAX_ACTIVE_TOXIC
      ) {
        return false
      }

      if (
        definition.id === 'flame' &&
        (activeArchetypeCounts.flame ?? 0) >= MAX_ACTIVE_FLAME
      ) {
        return false
      }

      return true
    })

    if (affordable.length === 0) {
      return null
    }

    const basicCandidates = affordable.filter(
      (definition) => !SPECIAL_ROLES.has(definition.role),
    )

    const specialCandidates = affordable.filter(
      (definition) => SPECIAL_ROLES.has(definition.role),
    )

    const spawnGroup = this.chooseSpawnGroup(
      basicCandidates.length > 0,
      specialCandidates.length > 0,
    )

    const candidates =
      spawnGroup === 'special'
        ? specialCandidates
        : basicCandidates

    const fallbackCandidates =
      candidates.length > 0 ? candidates : affordable

    const selected = this.selectEvenly(
      fallbackCandidates,
      spawnGroup,
      archetypeRoll,
    )

    const eliteTrait =
      eliteRoll < this.getEliteChance()
        ? this.selectEliteTrait(eliteTraitRoll)
        : null

    const eliteDangerMultiplier = eliteTrait ? 2 : 1
    const dangerCost = selected.dangerCost * eliteDangerMultiplier

    if (dangerCost > remainingDanger) {
      return {
        rank: 'normal',
        archetypeId: selected.id,
        role: selected.role,
        eliteTrait: null,
        dangerCost: selected.dangerCost,
      }
    }

    return {
      rank: 'normal',
      archetypeId: selected.id,
      role: selected.role,
      eliteTrait,
      dangerCost,
    }
  }

  getWaveDuration() {
    const kind = this.getWaveKind()

    if (kind === 'boss') {
      return GAME_CONFIG.wave.bossDuration
    }

    if (kind === 'mini-boss') {
      return GAME_CONFIG.wave.miniBossDuration
    }

    return GAME_CONFIG.wave.normalDuration
  }

  getWaveKind(wave = this.currentWave): WaveKind {
    if (wave > 0 && wave % 10 === 0) {
      return 'boss'
    }

    if (wave > 0 && wave % 5 === 0) {
      return 'mini-boss'
    }

    return 'normal'
  }

  private chooseSpawnGroup(
    hasBasicCandidates: boolean,
    hasSpecialCandidates: boolean,
  ): SpawnGroup {
    if (!hasSpecialCandidates) {
      this.nextSpawnGroup = 'basic'
      return 'basic'
    }

    if (!hasBasicCandidates) {
      this.nextSpawnGroup = 'special'
      return 'special'
    }

    const selectedGroup = this.nextSpawnGroup
    this.nextSpawnGroup =
      selectedGroup === 'basic' ? 'special' : 'basic'

    return selectedGroup
  }

  private selectEvenly<
    T extends {
      id: EnemyArchetypeId
    },
  >(
    candidates: readonly T[],
    group: SpawnGroup,
    roll: number,
  ) {
    const cursor =
      group === 'special'
        ? this.specialSpawnCursor
        : this.basicSpawnCursor

    // Cursor đảm bảo mọi loại trong cùng nhóm lần lượt đều xuất hiện,
    // không bị RNG bỏ quên. Roll vẫn được nhận để giữ nguyên API cũ.
    void roll
    const index = cursor % candidates.length

    if (group === 'special') {
      this.specialSpawnCursor++
    } else {
      this.basicSpawnCursor++
    }

    return candidates[index]
  }

  private selectEliteTrait(roll: number): EnemyEliteTrait {
    const traits: EnemyEliteTrait[] = [
      'swift',
      'armored',
      'berserker',
    ]

    if (this.currentWave >= 12) {
      traits.push('vampiric')
    }

    if (this.currentWave >= 18) {
      traits.push('regenerator')
    }

    const index = Math.min(
      traits.length - 1,
      Math.floor(clampRoll(roll) * traits.length),
    )

    return traits[index]
  }
}
