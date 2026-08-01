import type { RunRecord } from '../types/game'
import { DailyChallengeSystem } from './DailyChallengeSystem'
import { notifyCloudProgressChanged } from './PlayerProfileSystem'

const STORAGE_KEY = 'last-night-survival:night-shard-rewards:v1'
const MAXIMUM_RECORDED_RUN_IDS = 160

const WAVE_MILESTONES = [
  { wave: 5, reward: 100 },
  { wave: 10, reward: 250 },
  { wave: 20, reward: 600 },
  { wave: 30, reward: 1000 },
  { wave: 40, reward: 1600 },
  { wave: 50, reward: 2500 },
  { wave: 75, reward: 4500 },
  { wave: 100, reward: 7000 },
  { wave: 150, reward: 12000 },
  { wave: 200, reward: 20000 },
] as const

type RewardState = {
  recordedRunIds: string[]
  claimedMilestones: number[]
}

export type NightShardRewardResult = {
  earned: number
  baseReward: number
  milestoneReward: number
  wasAlreadyRecorded: boolean
  breakdown: string[]
}

export class NightShardRewardSystem {
  private readonly dailyChallengeSystem = new DailyChallengeSystem()

  awardRun(run: RunRecord): NightShardRewardResult {
    const state = this.loadState()
    if (state.recordedRunIds.includes(run.id)) {
      return {
        earned: 0,
        baseReward: 0,
        milestoneReward: 0,
        wasAlreadyRecorded: true,
        breakdown: [],
      }
    }

    const stats = run.statistics
    const waveReward = Math.max(0, run.wave) * 8
    const killReward = Math.floor(Math.max(0, stats.totalKills) / 6)
    const eliteReward = Math.max(0, stats.eliteKills) * 6
    const miniBossReward = Math.max(0, stats.miniBossKills) * 30
    const bossReward = Math.max(0, stats.bossKills) * 120
    const survivalReward = Math.floor(Math.max(0, run.survivalSeconds) / 60) * 8
    const chestReward = Math.max(0, stats.chestsOpened) * 8
    const fusionReward = Math.max(0, stats.fusionsCreated) * 35
    const fusionUpgradeReward = Math.max(0, stats.fusionUpgrades) * 15
    const scoreReward = Math.floor(Math.max(0, run.score) / 1000)

    const breakdown: string[] = []
    const parts: Array<[string, number]> = [
      ['Wave', waveReward],
      ['Hạ gục', killReward],
      ['Tinh anh', eliteReward],
      ['Mini boss', miniBossReward],
      ['Boss', bossReward],
      ['Sinh tồn', survivalReward],
      ['Rương', chestReward],
      ['Dung hợp', fusionReward],
      ['Nâng dung hợp', fusionUpgradeReward],
      ['Điểm số', scoreReward],
    ]

    for (const [label, amount] of parts) {
      if (amount > 0) breakdown.push(`${label} +${amount}`)
    }

    const baseReward = parts.reduce((sum, [, amount]) => sum + amount, 0)
    let milestoneReward = 0
    const claimed = new Set(state.claimedMilestones)

    for (const milestone of WAVE_MILESTONES) {
      if (run.wave >= milestone.wave && !claimed.has(milestone.wave)) {
        claimed.add(milestone.wave)
        milestoneReward += milestone.reward
        breakdown.push(`Mốc Wave ${milestone.wave} +${milestone.reward}`)
      }
    }

    const earned = baseReward + milestoneReward
    if (earned > 0) this.dailyChallengeSystem.grantNightMarks(earned)

    state.recordedRunIds = [...state.recordedRunIds, run.id].slice(
      -MAXIMUM_RECORDED_RUN_IDS,
    )
    state.claimedMilestones = Array.from(claimed).sort((a, b) => a - b)
    this.persistState(state)

    return {
      earned,
      baseReward,
      milestoneReward,
      wasAlreadyRecorded: false,
      breakdown,
    }
  }

  private loadState(): RewardState {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
      if (!raw) return { recordedRunIds: [], claimedMilestones: [] }
      const value = JSON.parse(raw) as Partial<RewardState>
      return {
        recordedRunIds: Array.isArray(value.recordedRunIds)
          ? value.recordedRunIds
              .filter((id): id is string => typeof id === 'string')
              .slice(-MAXIMUM_RECORDED_RUN_IDS)
          : [],
        claimedMilestones: Array.isArray(value.claimedMilestones)
          ? value.claimedMilestones.filter(
              (wave): wave is number =>
                typeof wave === 'number' && Number.isFinite(wave),
            )
          : [],
      }
    } catch {
      return { recordedRunIds: [], claimedMilestones: [] }
    }
  }

  private persistState(state: RewardState) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
      notifyCloudProgressChanged()
    } catch {
      // Không có localStorage thì chỉ bỏ qua lưu vĩnh viễn.
    }
  }
}
