import { GAME_CONFIG } from '../config/gameConfig'

export type ExperienceGainResult = {
  levelsGained: number
}

export class ExperienceSystem {
  level = 1
  currentExperience = 0
  experienceToNextLevel = GAME_CONFIG.experience.baseRequirement
  pendingLevelUps = 0

  reset() {
    this.level = 1
    this.currentExperience = 0
    this.experienceToNextLevel = this.getRequirementForLevel(1)
    this.pendingLevelUps = 0
  }

  addExperience(amount: number): ExperienceGainResult {
    this.currentExperience += Math.max(0, Math.round(amount))

    let levelsGained = 0

    while (this.currentExperience >= this.experienceToNextLevel) {
      this.currentExperience -= this.experienceToNextLevel
      this.level++
      levelsGained++
      this.pendingLevelUps++
      this.experienceToNextLevel = this.getRequirementForLevel(this.level)
    }

    return { levelsGained }
  }

  consumePendingLevelUp(): number | null {
    if (this.pendingLevelUps <= 0) {
      return null
    }

    const upgradeLevel =
      this.level - this.pendingLevelUps + 1

    this.pendingLevelUps--
    return upgradeLevel
  }

  hasPendingLevelUp() {
    return this.pendingLevelUps > 0
  }

  getExperienceNeededForNextLevel() {
    return Math.max(
      1,
      this.experienceToNextLevel - this.currentExperience,
    )
  }

  grantOneLevelForTesting(): ExperienceGainResult {
    return this.addExperience(
      this.getExperienceNeededForNextLevel(),
    )
  }

  getProgressRatio() {
    return Math.min(
      1,
      this.currentExperience / Math.max(1, this.experienceToNextLevel),
    )
  }

  private getRequirementForLevel(level: number) {
    return Math.round(
      GAME_CONFIG.experience.baseRequirement *
        Math.pow(
          GAME_CONFIG.experience.requirementGrowth,
          Math.max(0, level - 1),
        ),
    )
  }
}
