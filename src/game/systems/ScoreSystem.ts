import type { EnemyArchetypeId, EnemyUnit } from '../types/game'

export type ScoreAward = {
  points: number
  total: number
  label: string
}

const ARCHETYPE_BASE_POINTS: Record<EnemyArchetypeId, number> = {
  mutant: 70,
  crawler: 65,
  brute: 125,
  shooter: 155,
  bomber: 170,
  scatterer: 225,
  healer: 260,
  shielder: 260,
  'death-buffer': 235,
  'brood-mother': 285,
  toxic: 225,
  flame: 235,
}

const BASIC_ARCHETYPES = new Set<EnemyArchetypeId>([
  'mutant',
  'crawler',
  'brute',
])

export class ScoreSystem {
  total = 0

  reset() {
    this.total = 0
  }

  awardEnemy(enemy: EnemyUnit, wave: number): ScoreAward {
    const safeWave = Math.max(1, wave)
    const waveMultiplier = 1 + Math.min(999, safeWave - 1) * 0.055

    let basePoints = 0
    let label = 'QUÁI'

    if (enemy.rank === 'boss') {
      basePoints = 8000 + enemy.bossEncounterIndex * 900
      label = 'BOSS'
    } else if (enemy.rank === 'mini-boss') {
      basePoints = 2400 + enemy.bossEncounterIndex * 320
      label = 'MINI BOSS'
    } else {
      const archetypeId = enemy.archetypeId ?? 'mutant'
      const dangerCost = Math.max(1, enemy.dangerCost ?? 1)
      const archetypeBase = ARCHETYPE_BASE_POINTS[archetypeId]
      const dangerBonus = Math.max(0, dangerCost - 1) * 42
      const mutationBonus = BASIC_ARCHETYPES.has(archetypeId) ? 0 : 90

      basePoints = archetypeBase + dangerBonus + mutationBonus
      label = mutationBonus > 0 ? 'DỊ BIẾN' : 'QUÁI'

      if (enemy.isElite) {
        basePoints = Math.round(basePoints * 1.9 + 120)
        label = mutationBonus > 0 ? 'TINH ANH DỊ BIẾN' : 'QUÁI TINH ANH'
      }
    }

    const points = Math.max(1, Math.round(basePoints * waveMultiplier))
    this.total += points

    return {
      points,
      total: this.total,
      label,
    }
  }

  awardWave(
    wave: number,
    kind: 'normal' | 'mini-boss' | 'boss',
  ): ScoreAward {
    const safeWave = Math.max(1, wave)
    const kindBonus =
      kind === 'boss' ? 1500 : kind === 'mini-boss' ? 600 : 0
    const points = 200 + safeWave * 90 + kindBonus

    this.total += points

    return {
      points,
      total: this.total,
      label: `THƯỞNG ĐỢT ${safeWave}`,
    }
  }
}
