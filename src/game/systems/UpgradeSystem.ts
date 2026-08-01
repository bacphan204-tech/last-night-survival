import type Phaser from 'phaser'
import {
  ACTIVE_PLAYER_SKILL_IDS,
  MAX_ACTIVE_SKILL_SLOTS,
  isActivePlayerSkillId,
  isPlayerSkillId,
} from '../data/skills'
import { UPGRADE_DEFINITIONS } from '../data/upgrades'
import type {
  PlayerSkillId,
  PlayerStats,
  SkillUpgradeContext,
  UpgradeChoice,
  UpgradeDefinition,
  UpgradeId,
} from '../types/game'

export type UpgradeApplicationResult = {
  healAmount: number
  skillId: PlayerSkillId | null
  fusionAction: 'create' | 'upgrade' | null
}

export class UpgradeSystem {
  private levels = new Map<UpgradeId, number>()

  reset() {
    this.levels.clear()
  }

  getLevel(id: UpgradeId) {
    return this.levels.get(id) ?? 0
  }

  getActiveSkillCount() {
    return ACTIVE_PLAYER_SKILL_IDS.filter(
      (id) => this.getLevel(id) > 0,
    ).length
  }

  getMaximumActiveSkillSlots() {
    return MAX_ACTIVE_SKILL_SLOTS
  }

  getChoices(
    amount: number,
    rng: Phaser.Math.RandomDataGenerator,
    skillContext?: SkillUpgradeContext,
  ): UpgradeChoice[] {
    const activeSkillCount =
      skillContext?.activeSlotCount ?? this.getActiveSkillCount()
    const maximumSlots =
      skillContext?.maximumActiveSlots ?? MAX_ACTIVE_SKILL_SLOTS
    const hasFreeActiveSlot = activeSkillCount < maximumSlots
    const ownedBaseSkillIds = new Set(
      skillContext?.ownedBaseSkillIds ??
        ACTIVE_PLAYER_SKILL_IDS.filter((id) => this.getLevel(id) > 0),
    )

    const ownedActiveSkills = ACTIVE_PLAYER_SKILL_IDS
      .filter((id) => {
        const level = this.getLevel(id)
        return (
          level > 0 &&
          level < UPGRADE_DEFINITIONS[id].maxLevel
        )
      })
      .map((id) => UPGRADE_DEFINITIONS[id])

    const newActiveSkills = hasFreeActiveSlot
      ? ACTIVE_PLAYER_SKILL_IDS
          .filter((id) => !ownedBaseSkillIds.has(id))
          .map((id) => UPGRADE_DEFINITIONS[id])
      : []

    const weaponSkill =
      this.getLevel('multishot') <
      UPGRADE_DEFINITIONS.multishot.maxLevel
        ? [UPGRADE_DEFINITIONS.multishot]
        : []

    const fusionDefinitions: UpgradeDefinition[] = []

    if (skillContext?.canFuse) {
      fusionDefinitions.push(UPGRADE_DEFINITIONS['skill-fusion'])
    }

    if ((skillContext?.upgradeableFusionCount ?? 0) > 0) {
      fusionDefinitions.push(UPGRADE_DEFINITIONS['fusion-training'])
    }

    const skillDefinitions = this.shuffle(
      [
        ...this.shuffle(ownedActiveSkills, rng),
        ...weaponSkill,
        ...this.shuffle(newActiveSkills, rng),
      ],
      rng,
    )

    const supportIds: UpgradeId[] = [
      'power-core',
      'vitality',
      'armor-plating',
      'critical-core',
      'magnetism',
      'overcharge',
      'rapid-fire',
      'mobility',
      'field-repair',
    ]

    const supportDefinitions = supportIds
      .map((id) => UPGRADE_DEFINITIONS[id])
      .filter(
        (definition) =>
          this.getLevel(definition.id) < definition.maxLevel,
      )

    const fallbackIds: UpgradeId[] = [
      'combat-training',
      'reactor-tuning',
      'field-repair',
      'vitality',
      'armor-plating',
    ]

    const choices: UpgradeDefinition[] = []

    if (fusionDefinitions.length > 0) {
      choices.push(...this.shuffle(fusionDefinitions, rng).slice(0, 1))
    }
    const shuffledSkills = this.shuffle(skillDefinitions, rng)
    const shuffledSupport = this.shuffle(supportDefinitions, rng)

    const desiredSkillCount = Math.min(
      2,
      Math.max(0, amount - choices.length),
      shuffledSkills.length,
    )

    for (const definition of shuffledSkills.slice(0, desiredSkillCount)) {
      if (!choices.some((choice) => choice.id === definition.id)) {
        choices.push(definition)
      }
    }

    for (const definition of shuffledSupport) {
      if (choices.length >= amount) {
        break
      }

      if (!choices.some((choice) => choice.id === definition.id)) {
        choices.push(definition)
      }
    }

    for (const definition of shuffledSkills.slice(desiredSkillCount)) {
      if (choices.length >= amount) {
        break
      }

      if (!choices.some((choice) => choice.id === definition.id)) {
        choices.push(definition)
      }
    }

    for (const id of fallbackIds) {
      if (choices.length >= amount) {
        break
      }

      const definition = UPGRADE_DEFINITIONS[id]

      if (
        this.getLevel(id) < definition.maxLevel &&
        !choices.some((choice) => choice.id === id)
      ) {
        choices.push(definition)
      }
    }

    return choices.slice(0, amount).map((definition) => {
      const isFusionCreate = definition.id === 'skill-fusion'
      const isFusionTraining = definition.id === 'fusion-training'
      const currentLevel = isFusionCreate
        ? Math.max(0, (skillContext?.maxedFusionCount ?? 0))
        : isFusionTraining
          ? 0
          : this.getLevel(definition.id)
      const usesActiveSlot = isActivePlayerSkillId(definition.id)

      return {
        ...definition,
        currentLevel,
        nextLevel: isFusionCreate ? currentLevel + 1 : currentLevel + 1,
        isNewSkill: usesActiveSlot && currentLevel === 0,
        usesActiveSlot,
      }
    })
  }

  getChestRewardId(
    rng: Phaser.Math.RandomDataGenerator,
    skillContext: SkillUpgradeContext,
    excludedIds: ReadonlySet<UpgradeId> = new Set<UpgradeId>(),
  ): UpgradeId | null {
    const weightedCandidates: UpgradeId[] = []
    const addWeighted = (id: UpgradeId, weight: number) => {
      if (excludedIds.has(id)) {
        return
      }

      for (let index = 0; index < weight; index++) {
        weightedCandidates.push(id)
      }
    }

    const hasFreeActiveSlot =
      skillContext.activeSlotCount < skillContext.maximumActiveSlots
    const ownedBaseSkillIds = new Set(skillContext.ownedBaseSkillIds)

    for (const id of ACTIVE_PLAYER_SKILL_IDS) {
      const currentLevel = this.getLevel(id)
      const maximumLevel = UPGRADE_DEFINITIONS[id].maxLevel

      if (currentLevel > 0 && currentLevel < maximumLevel) {
        addWeighted(id, 5)
      } else if (hasFreeActiveSlot && !ownedBaseSkillIds.has(id)) {
        addWeighted(id, 4)
      }
    }

    if (
      this.getLevel('multishot') <
      UPGRADE_DEFINITIONS.multishot.maxLevel
    ) {
      addWeighted('multishot', 4)
    }

    if (skillContext.upgradeableFusionCount > 0) {
      addWeighted('fusion-training', 4)
    }

    if (skillContext.canFuse) {
      addWeighted(
        'skill-fusion',
        hasFreeActiveSlot ? 3 : 9,
      )
    }

    if (weightedCandidates.length === 0) {
      return null
    }

    return weightedCandidates[
      rng.integerInRange(0, weightedCandidates.length - 1)
    ]
  }

  applyUpgrade(
    id: UpgradeId,
    stats: PlayerStats,
  ): UpgradeApplicationResult {
    const definition = UPGRADE_DEFINITIONS[id]

    if (id === 'skill-fusion') {
      return { healAmount: 0, skillId: null, fusionAction: 'create' }
    }

    if (id === 'fusion-training') {
      return { healAmount: 0, skillId: null, fusionAction: 'upgrade' }
    }

    const currentLevel = this.getLevel(id)

    if (!definition || currentLevel >= definition.maxLevel) {
      return { healAmount: 0, skillId: null, fusionAction: null }
    }

    const nextLevel = currentLevel + 1
    this.levels.set(id, nextLevel)

    if (isPlayerSkillId(id)) {
      return { healAmount: 0, skillId: id, fusionAction: null }
    }

    switch (id) {
      case 'power-core':
        stats.attackDamage *= 1.1
        break

      case 'rapid-fire':
        stats.attackInterval = Math.max(
          140,
          stats.attackInterval * 0.97,
        )
        break

      case 'mobility':
        stats.movementSpeed *= 1.025
        break

      case 'vitality':
        stats.maximumHealth += 18
        return { healAmount: 18, skillId: null, fusionAction: null }

      case 'magnetism':
        stats.pickupRadius += 24
        break

      case 'overcharge':
        stats.attackRange *= 1.025
        stats.projectileSpeed *= 1.03
        break

      case 'armor-plating': {
        const armorLevel = nextLevel
        stats.damageReduction = Math.min(
          0.82,
          (armorLevel / (armorLevel + 12)) * 0.82,
        )
        break
      }

      case 'critical-core':
        stats.criticalChance = Math.min(
          0.7,
          stats.criticalChance + 0.035,
        )
        break

      case 'combat-training':
        stats.attackDamage *= 1.05
        break

      case 'reactor-tuning':
        stats.attackInterval = Math.max(
          140,
          stats.attackInterval * 0.98,
        )
        break

      case 'field-repair':
        return { healAmount: 35, skillId: null, fusionAction: null }
    }

    return { healAmount: 0, skillId: null, fusionAction: null }
  }

  private shuffle<T>(
    values: T[],
    rng: Phaser.Math.RandomDataGenerator,
  ) {
    const shuffled = [...values]

    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = rng.integerInRange(0, index)
      const temporary = shuffled[index]
      shuffled[index] = shuffled[swapIndex]
      shuffled[swapIndex] = temporary
    }

    return shuffled
  }
}
