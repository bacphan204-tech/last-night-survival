import { GAME_CONFIG } from '../config/gameConfig'
import {
  getBossDefinition,
  getBossEncounterIndex,
} from '../data/bosses'
import type {
  BossAbility,
  EnemyArchetypeId,
  EnemyUnit,
} from '../types/game'

const ENEMY_FIRE_INTERVAL_MULTIPLIER = 1.3

export class BossSystem {
  resetEnemy(enemy: EnemyUnit, now: number, wave: number) {
    enemy.bossPhase = 1
    enemy.bossAbilityCycleIndex = 0
    enemy.bossSplitTriggered = false
    enemy.nextBossAbilityAt = 0
    enemy.bossAbilityActiveUntil = 0
    enemy.bossAbility = null

    if (enemy.rank === 'normal') {
      enemy.bossVariant = null
      enemy.bossEncounterIndex = 0
      return
    }

    const definition = getBossDefinition(enemy.rank, wave)
    enemy.bossVariant = definition.id
    enemy.bossEncounterIndex = getBossEncounterIndex(enemy.rank, wave)
    enemy.nextBossAbilityAt = now + this.getInitialAbilityDelay(enemy)
  }

  updatePhase(enemy: EnemyUnit) {
    if (enemy.rank === 'normal') {
      enemy.bossPhase = 1
      return false
    }

    const healthRatio = enemy.health / enemy.maxHealth
    const previousPhase = enemy.bossPhase

    if (enemy.rank === 'mini-boss') {
      enemy.bossPhase = healthRatio <= 0.5 ? 2 : 1
    } else if (healthRatio <= 0.3) {
      enemy.bossPhase = 3
    } else if (healthRatio <= 0.65) {
      enemy.bossPhase = 2
    } else {
      enemy.bossPhase = 1
    }

    return enemy.bossPhase !== previousPhase
  }

  tryStartAbility(
    enemy: EnemyUnit,
    now: number,
    wave: number,
  ): BossAbility | null {
    if (
      enemy.rank === 'normal' ||
      !enemy.alive ||
      enemy.sprite.getData('disableBossAbilities') === true ||
      now < enemy.nextBossAbilityAt ||
      now < enemy.bossAbilityActiveUntil
    ) {
      return null
    }

    const definition = getBossDefinition(enemy.rank, wave)
    const phaseIndex = Math.min(
      definition.abilitiesByPhase.length - 1,
      Math.max(0, enemy.bossPhase - 1),
    )
    const abilities = definition.abilitiesByPhase[phaseIndex]

    if (!abilities || abilities.length === 0) {
      return null
    }

    const ability =
      abilities[enemy.bossAbilityCycleIndex % abilities.length]

    enemy.bossAbilityCycleIndex++
    enemy.bossAbility = ability
    enemy.bossAbilityActiveUntil =
      now + this.getAbilityDuration(enemy, ability)
    enemy.nextBossAbilityAt =
      now + this.getAbilityCooldown(enemy, ability)

    return ability
  }

  finishAbility(enemy: EnemyUnit) {
    enemy.bossAbility = null
    enemy.bossAbilityActiveUntil = 0
  }

  getSpeedMultiplier(enemy: EnemyUnit, now: number) {
    let multiplier = 1

    if (enemy.rank === 'mini-boss' && enemy.bossPhase >= 2) {
      multiplier *= 1.12
    }

    if (enemy.rank === 'boss') {
      if (enemy.bossPhase === 2) {
        multiplier *= 1.13
      } else if (enemy.bossPhase === 3) {
        multiplier *= 1.28
      }
    }

    if (
      enemy.bossAbility === 'charge' &&
      now < enemy.bossAbilityActiveUntil
    ) {
      multiplier *= GAME_CONFIG.boss.miniBossChargeMultiplier
    }

    return multiplier
  }

  getSummonArchetypes(enemy: EnemyUnit, wave: number) {
    if (enemy.rank === 'normal') {
      return [] as readonly EnemyArchetypeId[]
    }

    return getBossDefinition(enemy.rank, wave).summonArchetypes
  }

  getSummonCount(enemy: EnemyUnit) {
    const phaseBonus = Math.max(0, enemy.bossPhase - 1)

    if (enemy.rank === 'boss') {
      return Math.min(7, 4 + phaseBonus)
    }

    return Math.min(5, 2 + phaseBonus)
  }

  shouldSplitOnDeath(enemy: EnemyUnit, wave: number) {
    if (
      enemy.rank === 'normal' ||
      enemy.bossSplitTriggered ||
      enemy.sprite.getData('isBossFragment') === true
    ) {
      return false
    }

    return getBossDefinition(enemy.rank, wave).splitsOnDeath
  }

  markSplitTriggered(enemy: EnemyUnit) {
    enemy.bossSplitTriggered = true
  }

  getSplitCount(enemy: EnemyUnit, wave: number) {
    if (enemy.rank === 'normal') {
      return 0
    }

    return getBossDefinition(enemy.rank, wave).splitCount
  }


  private getInitialAbilityDelay(enemy: EnemyUnit) {
    const encounterAcceleration = Math.min(
      520,
      enemy.bossEncounterIndex * 90,
    )

    return Math.max(850, 1500 - encounterAcceleration)
  }

  private getAbilityDuration(
    enemy: EnemyUnit,
    ability: BossAbility,
  ) {
    switch (ability) {
      case 'charge':
        return GAME_CONFIG.boss.miniBossChargeDuration
      case 'shockwave':
        return GAME_CONFIG.boss.bossShockwaveDelay + 180
      case 'radial-burst':
        return enemy.rank === 'boss' ? 1050 : 900
      case 'spread-barrage':
        return Math.round(
          (enemy.rank === 'boss' ? 1900 : 1550) *
            ENEMY_FIRE_INTERVAL_MULTIPLIER,
        )
      case 'summon-minions':
        return enemy.rank === 'boss' ? 1150 : 960
    }
  }

  private getAbilityCooldown(
    enemy: EnemyUnit,
    ability: BossAbility,
  ) {
    const baseCooldown =
      enemy.rank === 'boss'
        ? GAME_CONFIG.boss.bossAbilityCooldown
        : GAME_CONFIG.boss.miniBossAbilityCooldown

    const phaseReduction = (enemy.bossPhase - 1) * 420
    const encounterReduction = Math.min(
      1100,
      enemy.bossEncounterIndex * 90,
    )

    const currentCooldown = Math.max(
      2350,
      baseCooldown - phaseReduction - encounterReduction,
    )

    const projectileAbilityMultiplier =
      ability === 'radial-burst' || ability === 'spread-barrage'
        ? ENEMY_FIRE_INTERVAL_MULTIPLIER
        : 1

    return Math.round(
      currentCooldown * projectileAbilityMultiplier,
    )
  }
}
