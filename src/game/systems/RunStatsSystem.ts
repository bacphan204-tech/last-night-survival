import type {
  EnemyUnit,
  PickupKind,
  RunRecord,
  RunStatistics,
  ScoreSource,
} from '../types/game'

const BASIC_ARCHETYPES = new Set([
  'mutant',
  'crawler',
  'brute',
])

function createEmptyStatistics(): RunStatistics {
  return {
    totalKills: 0,
    normalKills: 0,
    mutatedKills: 0,
    eliteKills: 0,
    miniBossKills: 0,
    bossKills: 0,
    healthPickups: 0,
    bombPickups: 0,
    magnetPickups: 0,
    chestsOpened: 0,
    chestRewardsReceived: 0,
    fusionsCreated: 0,
    fusionUpgrades: 0,
    highestFusionTier: 0,
    scoreFromEnemies: 0,
    scoreFromWaves: 0,
  }
}

export class RunStatsSystem {
  private statistics = createEmptyStatistics()

  reset() {
    this.statistics = createEmptyStatistics()
  }

  recordEnemyKill(enemy: EnemyUnit) {
    this.statistics.totalKills++

    if (enemy.rank === 'boss') {
      this.statistics.bossKills++
      return
    }

    if (enemy.rank === 'mini-boss') {
      this.statistics.miniBossKills++
      return
    }

    this.statistics.normalKills++

    if (enemy.isElite) {
      this.statistics.eliteKills++
    }

    const archetypeId = enemy.archetypeId ?? 'mutant'

    if (!BASIC_ARCHETYPES.has(archetypeId)) {
      this.statistics.mutatedKills++
    }
  }

  recordPickup(kind: PickupKind) {
    if (kind === 'health') {
      this.statistics.healthPickups++
    } else if (kind === 'bomb') {
      this.statistics.bombPickups++
    } else {
      this.statistics.magnetPickups++
    }
  }

  recordChestOpened(rewardCount: number) {
    this.statistics.chestsOpened++
    this.statistics.chestRewardsReceived += Math.max(0, rewardCount)
  }

  recordFusionCreated(tier: number) {
    this.statistics.fusionsCreated++
    this.statistics.highestFusionTier = Math.max(
      this.statistics.highestFusionTier,
      Math.max(1, tier),
    )
  }

  recordFusionUpgrade(tier: number) {
    this.statistics.fusionUpgrades++
    this.statistics.highestFusionTier = Math.max(
      this.statistics.highestFusionTier,
      Math.max(1, tier),
    )
  }

  recordScore(source: ScoreSource, points: number) {
    const safePoints = Math.max(0, Math.round(points))

    if (source === 'enemy') {
      this.statistics.scoreFromEnemies += safePoints
    } else {
      this.statistics.scoreFromWaves += safePoints
    }
  }

  getSnapshot(): RunStatistics {
    return { ...this.statistics }
  }

  createRunRecord(params: {
    score: number
    wave: number
    kills: number
    level: number
    survivalSeconds: number
  }): RunRecord {
    const createdAt = Date.now()
    const randomPart = Math.random().toString(36).slice(2, 10)

    return {
      id: `run-${createdAt}-${randomPart}`,
      createdAt,
      score: Math.max(0, Math.round(params.score)),
      wave: Math.max(1, Math.round(params.wave)),
      kills: Math.max(0, Math.round(params.kills)),
      level: Math.max(1, Math.round(params.level)),
      survivalSeconds: Math.max(0, Math.round(params.survivalSeconds)),
      statistics: this.getSnapshot(),
    }
  }
}
