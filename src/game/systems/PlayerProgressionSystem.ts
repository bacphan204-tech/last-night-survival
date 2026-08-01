import type { PlayerStats } from '../types/game'

export type PlayerProgressionResult = {
  levelsApplied: number
  fromLevel: number
  toLevel: number
  healAmount: number
  healthGained: number
  milestoneLevels: number[]
}

export class PlayerProgressionSystem {
  private appliedLevel = 1

  reset(startLevel = 1) {
    this.appliedLevel = Math.max(1, Math.floor(startLevel))
  }

  applyThroughLevel(
    targetLevel: number,
    stats: PlayerStats,
  ): PlayerProgressionResult {
    const normalizedTargetLevel = Math.max(
      1,
      Math.floor(targetLevel),
    )

    const fromLevel = this.appliedLevel

    if (normalizedTargetLevel <= this.appliedLevel) {
      return {
        levelsApplied: 0,
        fromLevel,
        toLevel: this.appliedLevel,
        healAmount: 0,
        healthGained: 0,
        milestoneLevels: [],
      }
    }

    let healAmount = 0
    let healthGained = 0
    const milestoneLevels: number[] = []

    for (
      let level = this.appliedLevel + 1;
      level <= normalizedTargetLevel;
      level++
    ) {
      stats.attackDamage *= 1.03
      stats.attackInterval = Math.max(
        140,
        stats.attackInterval * 0.985,
      )
      stats.maximumHealth += 2
      stats.movementSpeed *= 1.005
      healthGained += 2

      if (level % 5 === 0) {
        stats.pickupRadius *= 1.05
        healAmount += Math.max(
          1,
          Math.round(stats.maximumHealth * 0.08),
        )
        milestoneLevels.push(level)
      }
    }

    this.appliedLevel = normalizedTargetLevel

    return {
      levelsApplied: normalizedTargetLevel - fromLevel,
      fromLevel,
      toLevel: normalizedTargetLevel,
      healAmount,
      healthGained,
      milestoneLevels,
    }
  }
}
