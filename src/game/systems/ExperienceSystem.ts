import { GAME_CONFIG } from '../config/gameConfig'

const EXPERIENCE_REQUIREMENT_MULTIPLIER = 0.8

// Giữ nhịp lên cấp ở late game mà không làm đầu game tăng quá nhanh.
// Mốc 150 quái cơ bản tương đương 1.800 XP; chỉ khi yêu cầu cấp
// vượt mốc này, XP nhận được mới bắt đầu được nhân dần theo cấp.
const EXPERIENCE_GAIN_REFERENCE =
  GAME_CONFIG.experience.normalEnemyValue * 150
const EXPERIENCE_GAIN_SCALING_POWER = 0.85

export type ExperienceGainResult = {
  levelsGained: number
}

export class ExperienceSystem {
  level = 1
  currentExperience = 0
  experienceToNextLevel = Math.max(
    1,
    Math.round(
      GAME_CONFIG.experience.baseRequirement *
        EXPERIENCE_REQUIREMENT_MULTIPLIER,
    ),
  )
  pendingLevelUps = 0

  reset() {
    this.level = 1
    this.currentExperience = 0
    this.experienceToNextLevel = this.getRequirementForLevel(1)
    this.pendingLevelUps = 0
  }

  addExperience(amount: number): ExperienceGainResult {
    const gainMultiplier = this.getExperienceGainMultiplier()

    this.currentExperience += Math.max(
      0,
      Math.round(amount * gainMultiplier),
    )

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

  getExperienceGainMultiplier() {
    const requirementRatio =
      this.experienceToNextLevel /
      Math.max(1, EXPERIENCE_GAIN_REFERENCE)

    return Math.max(
      1,
      Math.pow(
        requirementRatio,
        EXPERIENCE_GAIN_SCALING_POWER,
      ),
    )
  }

  getExperienceNeededForNextLevel() {
    return Math.max(
      1,
      this.experienceToNextLevel - this.currentExperience,
    )
  }


  getProgressRatio() {
    return Math.min(
      1,
      this.currentExperience / Math.max(1, this.experienceToNextLevel),
    )
  }

  private getRequirementForLevel(level: number) {
    return Math.max(
      1,
      Math.round(
        GAME_CONFIG.experience.baseRequirement *
          Math.pow(
            GAME_CONFIG.experience.requirementGrowth,
            Math.max(0, level - 1),
          ) *
          EXPERIENCE_REQUIREMENT_MULTIPLIER,
      ),
    )
  }
}
