import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import { getBossDefinition } from '../data/bosses'
import {
  getEnemyArchetypeDefinition,
  getEnemyStatsForWave,
} from '../data/enemies'
import { PICKUP_SETTINGS } from '../data/pickups'
import { PLAYER_SKILL_DEFINITIONS, PLAYER_SKILL_IDS } from '../data/skills'
import type { StartingProtocolId } from '../data/startingProtocols'
import type { PlayerSkinId } from '../data/playerSkins'
import type { ActiveAbilityId } from '../data/activeAbilities'
import { createBasePlayerStats, UPGRADE_DEFINITIONS } from '../data/upgrades'
import { createGameTextures } from '../factories/TextureFactory'
import { RETURN_TO_MAIN_MENU_EVENT } from '../events/gameEvents'
import { AudioSystem } from '../systems/AudioSystem'
import { BossSystem } from '../systems/BossSystem'
import { ChestSystem } from '../systems/ChestSystem'
import { CareerProgressSystem } from '../systems/CareerProgressSystem'
import { ExperienceOrbSystem } from '../systems/ExperienceOrbSystem'
import { ExperienceSystem } from '../systems/ExperienceSystem'
import { EnemyDeathEffectSystem } from '../systems/EnemyDeathEffectSystem'
import { EnemyProjectileSystem } from '../systems/EnemyProjectileSystem'
import { HudSystem } from '../systems/HudSystem'
import { GameSettingsSystem } from '../systems/GameSettingsSystem'
import { PathfindingSystem } from '../systems/PathfindingSystem'
import { PauseMenuSystem } from '../systems/PauseMenuSystem'
import type { PauseMenuSkillEntry, PauseMenuSnapshot } from '../systems/PauseMenuSystem'
import { PickupSystem } from '../systems/PickupSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { RunStatsSystem } from '../systems/RunStatsSystem'
import { LocalLeaderboardSystem } from '../systems/LocalLeaderboardSystem'
import { MobileControlSystem } from '../systems/MobileControlSystem'
import { OnlineLeaderboardSystem } from '../systems/OnlineLeaderboardSystem'
import { PlayerProgressionSystem } from '../systems/PlayerProgressionSystem'
import {
  PlayerSkinSystem,
  getRuntimePlayerSkinId,
} from '../systems/PlayerSkinSystem'
import { PlayerSkinVisualSystem } from '../systems/PlayerSkinVisualSystem'
import { NightShardRewardSystem } from '../systems/NightShardRewardSystem'
import {
  ActiveAbilityShopSystem,
  getRuntimeActiveAbilityId,
} from '../systems/ActiveAbilityShopSystem'
import {
  ActiveAbilityCombatSystem,
  type AbilitySoundCue,
  type ActiveAbilityCombatContext,
  type AbilityDashResult,
} from '../systems/ActiveAbilityCombatSystem'
import { SkillSystem } from '../systems/SkillSystem'
import {
  StartingProtocolSystem,
  getRuntimeStartingProtocolId,
} from '../systems/StartingProtocolSystem'
import { SupportEnemySystem } from '../systems/SupportEnemySystem'
import { UpgradeSystem } from '../systems/UpgradeSystem'
import { WaveSystem, type WaveKind } from '../systems/WaveSystem'
import { UPGRADE_SELECTED_EVENT } from './UpgradeScene'
import type {
  BossVariant,
  EnemyArchetypeId,
  EnemyRank,
  EnemySpawnSelection,
  EnemyUnit,
  MovementKeys,
  PickupKind,
  PlayerStats,
  ProjectileState,
  RunRecord,
  UpgradeId,
} from '../types/game'
import { formatTime } from '../utils/time'
import { WorldBuilder } from '../world/WorldBuilder'

const ENEMY_FIRE_INTERVAL_MULTIPLIER = 1.3

const PLAYER_BALANCE = {
  maximumHealthMultiplier: 1.3,
  attackDamageMultiplier: 1.25,
  attackIntervalMultiplier: 0.82,
  movementSpeedMultiplier: 1.14,
  projectileSpeedMultiplier: 1.15,
  pickupRadiusMultiplier: 1.25,
  normalWaveHealRatio: 0.06,
  miniBossWaveHealRatio: 0.12,
  bossWaveHealRatio: 0.2,
} as const

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private playerShadow!: Phaser.GameObjects.Ellipse
  private playerGlow!: Phaser.GameObjects.Ellipse

  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private enemies: EnemyUnit[] = []
  private enemyIdCounter = 0
  private combatGeneration = 0
  private pendingPathRequests = new Map<number, string>()
  private enemySpatialBuckets = new Map<string, EnemyUnit[]>()
  private pathSearchesThisFrame = 0

  private hud!: HudSystem

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private movementKeys!: MovementKeys
  private restartKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private activeAbilityKey!: Phaser.Input.Keyboard.Key

  private rng!: Phaser.Math.RandomDataGenerator
  private pathfinding!: PathfindingSystem
  private waveSystem!: WaveSystem
  private bossSystem!: BossSystem
  private experienceOrbSystem!: ExperienceOrbSystem
  private experienceSystem!: ExperienceSystem
  private pickupSystem!: PickupSystem
  private chestSystem!: ChestSystem
  private scoreSystem!: ScoreSystem
  private runStatsSystem!: RunStatsSystem
  private localLeaderboardSystem!: LocalLeaderboardSystem
  private careerProgressSystem!: CareerProgressSystem
  private startingProtocolSystem!: StartingProtocolSystem
  private startingProtocolId: StartingProtocolId = 'survivor'
  private playerSkinId: PlayerSkinId = 'survivor'
  private playerSkinSystem!: PlayerSkinSystem
  private playerSkinVisualSystem!: PlayerSkinVisualSystem
  private nightShardRewardSystem!: NightShardRewardSystem
  private activeAbilityShopSystem!: ActiveAbilityShopSystem
  private activeAbilityId: ActiveAbilityId | null = null
  private activeAbilityCombatSystem!: ActiveAbilityCombatSystem
  private onlineLeaderboardSystem!: OnlineLeaderboardSystem
  private mobileControlSystem!: MobileControlSystem
  private gameSettingsSystem!: GameSettingsSystem
  private audioSystem!: AudioSystem
  private pauseMenuSystem!: PauseMenuSystem
  private playerProgressionSystem!: PlayerProgressionSystem
  private skillSystem!: SkillSystem
  private enemyDeathEffectSystem!: EnemyDeathEffectSystem
  private enemyProjectileSystem!: EnemyProjectileSystem
  private supportEnemySystem!: SupportEnemySystem
  private upgradeSystem!: UpgradeSystem
  private projectiles: ProjectileState[] = []
  private playerStats: PlayerStats = createBasePlayerStats()

  private readonly worldWidth = GAME_CONFIG.world.width
  private readonly worldHeight = GAME_CONFIG.world.height
  private readonly enemyStopDistance = GAME_CONFIG.enemy.stopDistance
  private readonly projectileLifetime = GAME_CONFIG.weapon.projectileLifetime
  private readonly enemySpawnMinDistance = GAME_CONFIG.enemy.spawnMinDistance
  private readonly enemySpawnMaxDistance = GAME_CONFIG.enemy.spawnMaxDistance
  private readonly pathRefreshInterval = GAME_CONFIG.navigation.pathRefreshInterval
  private readonly waypointReachDistance = GAME_CONFIG.navigation.waypointReachDistance
  private readonly stuckCheckInterval = GAME_CONFIG.navigation.stuckCheckInterval
  private readonly stuckDistanceThreshold = GAME_CONFIG.navigation.stuckDistanceThreshold
  private readonly localAvoidanceDistance = GAME_CONFIG.navigation.localAvoidanceDistance
  private readonly localAvoidanceDuration = GAME_CONFIG.navigation.localAvoidanceDuration
  private readonly enemySeparationDistance = GAME_CONFIG.enemy.separationDistance
  private readonly damageCooldown = GAME_CONFIG.player.damageCooldown
  private readonly maxPathSearchesPerFrame =
    GAME_CONFIG.navigation.maxPathSearchesPerFrame
  private readonly separationBucketSize =
    GAME_CONFIG.navigation.separationBucketSize
  private readonly specialEnemyRescueThreshold =
    GAME_CONFIG.navigation.specialEnemyRescueThreshold

  private playerHealth = 100
  private nextDamageAt = 0
  private gameStartTime = 0
  private finalSurvivalSeconds = 0
  private isGameOver = false
  private isEndingGame = false
  private nextAttackAt = 0
  private kills = 0
  private score = 0
  private isChoosingUpgrade = false
  private isPaused = false
  private finalLocalRank: number | null = null
  private finalBestScore = 0
  private finalIsNewBest = false
  private readonly lastPlayerMoveDirection = new Phaser.Math.Vector2(1, 0)

  constructor() {
    super('MainScene')
  }

  preload() {
    AudioSystem.preload(this)
  }

  create() {
    this.pathfinding = new PathfindingSystem({
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      cellSize: GAME_CONFIG.navigation.cellSize,
      padding: GAME_CONFIG.navigation.padding,
      maximumVisitedNodes:
        GAME_CONFIG.navigation.maximumVisitedNodes,
    })
    this.waveSystem = new WaveSystem()
    this.bossSystem = new BossSystem()
    this.scoreSystem = new ScoreSystem()
    this.runStatsSystem = new RunStatsSystem()
    this.localLeaderboardSystem = new LocalLeaderboardSystem()
    this.careerProgressSystem = new CareerProgressSystem()
    this.startingProtocolSystem = new StartingProtocolSystem()
    this.startingProtocolId = this.startingProtocolSystem.resolveId(
      getRuntimeStartingProtocolId(),
    )
    this.playerSkinSystem = new PlayerSkinSystem()
    this.playerSkinId = this.playerSkinSystem.resolveId(
      getRuntimePlayerSkinId(),
    )
    this.nightShardRewardSystem = new NightShardRewardSystem()
    this.activeAbilityShopSystem = new ActiveAbilityShopSystem()
    this.activeAbilityId = this.activeAbilityShopSystem.resolveId(
      getRuntimeActiveAbilityId(),
    )
    this.activeAbilityCombatSystem = new ActiveAbilityCombatSystem(
      this,
      this.activeAbilityId,
    )
    this.onlineLeaderboardSystem = new OnlineLeaderboardSystem()
    void this.onlineLeaderboardSystem.initialize()
    this.gameSettingsSystem = new GameSettingsSystem()
    this.audioSystem = new AudioSystem(
      this,
      this.gameSettingsSystem,
    )
    this.mobileControlSystem = new MobileControlSystem(this)
    this.pauseMenuSystem = new PauseMenuSystem(this, {
      onOpenRequest: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartPausedGame(),
      onReturnToMainMenu: () => this.returnToMainMenu(),
      onCycleMusicVolume: () => {
        const volume = this.gameSettingsSystem.cycleMusicVolume()
        this.audioSystem.applySettings()
        return volume
      },
      onCycleSfxVolume: () => {
        const volume = this.gameSettingsSystem.cycleSfxVolume()
        this.audioSystem.applySettings()
        return volume
      },
      onToggleScreenShake: () =>
        this.gameSettingsSystem.toggleScreenShake(),
      onToggleAutoPause: () =>
        this.gameSettingsSystem.toggleAutoPause(),
    })
    this.experienceSystem = new ExperienceSystem()
    this.playerProgressionSystem = new PlayerProgressionSystem()
    this.skillSystem = new SkillSystem(this)
    this.upgradeSystem = new UpgradeSystem()
    this.enemyDeathEffectSystem = new EnemyDeathEffectSystem(this)
    this.enemyProjectileSystem = new EnemyProjectileSystem(
      this,
      this.pathfinding,
      this.worldWidth,
      this.worldHeight,
    )
    this.supportEnemySystem = new SupportEnemySystem(this)

    this.rng = new Phaser.Math.RandomDataGenerator([
      GAME_CONFIG.world.seed,
    ])
    this.experienceOrbSystem = new ExperienceOrbSystem(this, this.rng)
    this.pickupSystem = new PickupSystem(this, this.rng)
    this.chestSystem = new ChestSystem(this, this.rng)
    this.resetGameState()

    this.cameras.main.setBackgroundColor('#02050b')

    this.physics.world.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight,
    )

    createGameTextures(this)

    this.obstacles = this.physics.add.staticGroup()
    new WorldBuilder(this, this.rng, this.obstacles, this.pathfinding).build()
    this.pathfinding.buildGrid()

    this.createPlayer()
    this.activeAbilityCombatSystem.create(this.player.x, this.player.y)
    this.setupCollisions()
    this.setupCamera()
    this.setupKeyboard()

    this.hud = new HudSystem(this)
    this.hud.create()
    this.updateHealthBar()
    this.updateCombatHud()
    this.mobileControlSystem.create()
    this.pauseMenuSystem.create()
    this.setupUpgradeEvents()
    this.setupVisibilityPause()
    this.beginWave(1, true)
    this.updateExperienceHud()
    this.audioSystem.startMusic()
  }

  update(_time: number, delta: number) {
    if (
      !this.isGameOver &&
      !this.isEndingGame &&
      !this.isChoosingUpgrade &&
      Phaser.Input.Keyboard.JustDown(this.pauseKey)
    ) {
      this.togglePauseGame()
      return
    }

    if (this.isPaused) {
      this.player.setVelocity(0, 0)
      return
    }

    if (this.isGameOver) {
      this.player.setVelocity(0, 0)

      for (const enemy of this.enemies) {
        enemy.sprite.setVelocity(0, 0)
      }

      if (
        Phaser.Input.Keyboard.JustDown(
          this.restartKey,
        )
      ) {
        this.restartGame()
      }

      return
    }

    if (this.isEndingGame) {
      this.player.setVelocity(0, 0)

      for (const enemy of this.enemies) {
        enemy.sprite.setVelocity(0, 0)
      }

      this.stopAllProjectiles()
      this.enemyProjectileSystem.stopAll()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.activeAbilityKey)) {
      this.tryActivateActiveAbility()
    }

    this.updatePlayerMovement()
    this.activeAbilityCombatSystem.update(
      this.createActiveAbilityCombatContext(),
    )
    this.updateWaveSystem()
    this.supportEnemySystem.update(
      this.time.now,
      this.enemies,
      (enemy) => this.updateEnemyHealthBar(enemy),
    )
    this.enemyDeathEffectSystem.update(
      this.time.now,
      this.player.x,
      this.player.y,
      24,
      this.enemies,
      (damage) => this.applyGroundHazardDamage(damage),
    )

    if (this.isEndingGame) {
      return
    }

    this.updateEnemies()
    this.enemyProjectileSystem.update(
      this.time.now,
      this.player.x,
      this.player.y,
      24,
      (damage, owner) => {
        if (!this.isGameOver && !this.isEndingGame) {
          this.applyDamage(damage, owner)
        }
      },
    )

    if (this.isEndingGame) {
      return
    }

    this.updateAutoAttack()
    this.updateProjectiles()
    this.skillSystem.update({
      now: this.time.now,
      playerX: this.player.x,
      playerY: this.player.y,
      enemies: this.enemies,
      stats: this.getEffectivePlayerStats(),
      damageEnemy: (enemy, damage) =>
        this.damageEnemy(enemy, damage, false),
      playSkillSound: (skillId) =>
        this.audioSystem.playSkill(skillId),
    })
    this.experienceOrbSystem.update(
      delta,
      this.player.x,
      this.player.y,
      this.playerStats.pickupRadius,
      (value) => this.collectExperience(value),
    )
    this.pickupSystem.update(
      this.time.now,
      this.player.x,
      this.player.y,
      (kind, x, y) => this.applyPickup(kind, x, y),
    )

    this.chestSystem.update(
      this.time.now,
      this.player.x,
      this.player.y,
      (rewardCount, x, y) =>
        this.applyChestRewards(rewardCount, x, y),
    )

    if (this.isChoosingUpgrade) {
      return
    }

    this.handleEnemyContact()
    this.updateVisualEffects()
    this.updateHud()
  }

  private resetGameState() {
    this.combatGeneration++
    this.playerStats = createBasePlayerStats()
    this.applyBasePlayerBalance()
    this.startingProtocolSystem.applyToStats(
      this.playerStats,
      this.startingProtocolId,
    )
    this.playerSkinSystem.applyToStats(
      this.playerStats,
      this.playerSkinId,
    )
    this.playerHealth = this.playerStats.maximumHealth
    this.nextDamageAt = 0
    this.gameStartTime = this.time.now
    this.finalSurvivalSeconds = 0
    this.isGameOver = false
    this.isEndingGame = false
    this.pathfinding.reset()
    this.waveSystem.reset()
    this.experienceSystem.reset()
    this.playerProgressionSystem.reset(
      this.experienceSystem.level,
    )
    this.skillSystem.reset()
    this.upgradeSystem.reset()
    this.projectiles = []
    this.enemyProjectileSystem.reset()
    this.supportEnemySystem.reset(this.enemies)
    this.enemyDeathEffectSystem.reset(this.enemies)
    this.experienceOrbSystem.reset()
    this.pickupSystem.reset()
    this.chestSystem.reset()
    this.scoreSystem.reset()
    this.runStatsSystem.reset()
    this.enemies = []
    this.enemyIdCounter = 0
    this.pendingPathRequests.clear()
    this.enemySpatialBuckets.clear()
    this.pathSearchesThisFrame = 0
    this.nextAttackAt = 0
    this.kills = 0
    this.score = 0
    this.isChoosingUpgrade = false
    this.isPaused = false
    this.finalLocalRank = null
    this.finalBestScore = this.localLeaderboardSystem.getBestScore()
    this.finalIsNewBest = false
    this.mobileControlSystem.reset()
    this.activeAbilityCombatSystem.reset()
    this.activeAbilityCombatSystem.setEnabled(true)
    this.lastPlayerMoveDirection.set(1, 0)
  }


  private applyBasePlayerBalance() {
    this.playerStats.maximumHealth = Math.max(
      1,
      Math.round(
        this.playerStats.maximumHealth *
          PLAYER_BALANCE.maximumHealthMultiplier,
      ),
    )
    this.playerStats.attackDamage = Math.max(
      1,
      Math.round(
        this.playerStats.attackDamage *
          PLAYER_BALANCE.attackDamageMultiplier,
      ),
    )
    this.playerStats.attackInterval = Math.max(
      80,
      Math.round(
        this.playerStats.attackInterval *
          PLAYER_BALANCE.attackIntervalMultiplier,
      ),
    )
    this.playerStats.movementSpeed = Math.max(
      1,
      Math.round(
        this.playerStats.movementSpeed *
          PLAYER_BALANCE.movementSpeedMultiplier,
      ),
    )
    this.playerStats.projectileSpeed = Math.max(
      1,
      Math.round(
        this.playerStats.projectileSpeed *
          PLAYER_BALANCE.projectileSpeedMultiplier,
      ),
    )
    this.playerStats.pickupRadius = Math.max(
      1,
      Math.round(
        this.playerStats.pickupRadius *
          PLAYER_BALANCE.pickupRadiusMultiplier,
      ),
    )
  }

  private createPlayer() {
    const startX = this.worldWidth / 2
    const startY = this.worldHeight / 2

    // Hai lớp cũ vẫn được giữ để các đoạn cập nhật hiện tại không lỗi,
    // nhưng ẩn đi vì PlayerSkinVisualSystem chịu trách nhiệm vẽ nhân vật mới.
    this.playerGlow = this.add
      .ellipse(startX, startY + 10, 140, 100, 0x2563eb, 0)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.playerShadow = this.add.ellipse(
      startX,
      startY + 25,
      58,
      19,
      0x000000,
      0,
    )

    this.player = this.physics.add.image(
      startX,
      startY,
      'player-placeholder',
    )

    this.player
      .setCircle(18, 14, 18)
      .setCollideWorldBounds(true)
      .setDepth(startY)
      .setAlpha(0.001)

    this.playerSkinVisualSystem = new PlayerSkinVisualSystem(
      this,
      this.playerSkinId,
    )
    this.playerSkinVisualSystem.create(startX, startY)
  }

  private beginWave(
    wave: number,
    isInitialWave = false,
  ) {
    this.waveSystem.beginWave(this.time.now, wave)

    const award = this.scoreSystem.awardWave(
      this.wave,
      this.waveSystem.getWaveKind(),
    )
    this.score = award.total
    this.runStatsSystem.recordScore('wave', award.points)
    this.showWaveScoreBonus(award.points)

    this.showWaveAnnouncement()
    this.audioSystem.playWaveStart(this.waveSystem.getWaveKind())

    if (this.waveSystem.needsSpecialSpawn()) {
      const specialRank: EnemyRank =
        this.waveSystem.getWaveKind() === 'boss'
          ? 'boss'
          : 'mini-boss'

      this.spawnEnemy(specialRank)
      this.waveSystem.markSpecialSpawned()
    }

    const hasActiveSpecial = this.getActiveSpecialEnemyCount() > 0
    const initialNormalEnemies = isInitialWave
      ? 6
      : this.waveSystem.getSpawnBatchSize(hasActiveSpecial)

    for (let index = 0; index < initialNormalEnemies; index++) {
      const activeNormalEnemies = this.getActiveNormalEnemyCount()
      const activeDanger = this.getActiveNormalEnemyDanger()

      if (
        !this.waveSystem.canSpawnNormalEnemy(
          activeNormalEnemies,
          activeDanger,
          hasActiveSpecial,
        )
      ) {
        break
      }

      if (!this.spawnEnemy('normal')) {
        break
      }
    }

    this.updateCombatHud()
    this.updateBossHud()
  }

  private get wave() {
    return this.waveSystem.currentWave
  }

  private updateWaveSystem() {
    const activeSpecialEnemies = this.getActiveSpecialEnemyCount()
    const hasActiveSpecial = activeSpecialEnemies > 0

    if (
      this.waveSystem.shouldStartNextWave(
        this.time.now,
        activeSpecialEnemies,
      )
    ) {
      const completedWaveKind = this.waveSystem.getWaveKind()
      this.healAfterCompletedWave(completedWaveKind)
      this.beginWave(this.wave + 1)
      return
    }

    const activeNormalEnemies = this.getActiveNormalEnemyCount()
    const activeDanger = this.getActiveNormalEnemyDanger()

    if (
      !this.waveSystem.shouldSpawn(
        this.time.now,
        activeNormalEnemies,
        activeDanger,
        hasActiveSpecial,
      )
    ) {
      return
    }

    const batchSize =
      this.waveSystem.getSpawnBatchSize(hasActiveSpecial)

    let spawned = 0

    for (let index = 0; index < batchSize; index++) {
      const currentNormalEnemies =
        this.getActiveNormalEnemyCount()
      const currentDanger =
        this.getActiveNormalEnemyDanger()

      if (
        !this.waveSystem.canSpawnNormalEnemy(
          currentNormalEnemies,
          currentDanger,
          hasActiveSpecial,
        )
      ) {
        break
      }

      if (!this.spawnEnemy('normal')) {
        break
      }

      spawned++
    }

    this.waveSystem.scheduleNextSpawn(
      this.time.now,
      hasActiveSpecial,
      spawned === 0,
    )
  }

  private healAfterCompletedWave(kind: WaveKind) {
    const healRatio =
      kind === 'boss'
        ? PLAYER_BALANCE.bossWaveHealRatio
        : kind === 'mini-boss'
          ? PLAYER_BALANCE.miniBossWaveHealRatio
          : PLAYER_BALANCE.normalWaveHealRatio

    const healAmount = Math.max(
      1,
      Math.round(this.playerStats.maximumHealth * healRatio),
    )
    const previousHealth = this.playerHealth

    this.playerHealth = Math.min(
      this.playerStats.maximumHealth,
      this.playerHealth + healAmount,
    )

    const restoredHealth = Math.max(
      0,
      Math.round(this.playerHealth - previousHealth),
    )

    this.updateHealthBar()

    if (restoredHealth <= 0) {
      return
    }

    const label =
      kind === 'boss'
        ? 'HỒI PHỤC SAU BOSS'
        : kind === 'mini-boss'
          ? 'HỒI PHỤC SAU MINI BOSS'
          : 'HỒI PHỤC SAU ĐỢT'

    const text = this.add
      .text(
        this.player.x,
        this.player.y - 64,
        `${label}  +${restoredHealth} MÁU`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#86efac',
          stroke: '#052e16',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(this.player.y + 48)

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 850,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
  }

  private getActiveSpecialEnemyCount() {
    return this.enemies.filter(
      (enemy) => enemy.alive && enemy.rank !== 'normal',
    ).length
  }

  private getActiveNormalEnemyCount() {
    return this.enemies.filter(
      (enemy) => enemy.alive && enemy.rank === 'normal',
    ).length
  }

  private getActiveNormalEnemyDanger() {
    return this.enemies.reduce(
      (total, enemy) =>
        enemy.alive && enemy.rank === 'normal'
          ? total + (enemy.dangerCost ?? 1)
          : total,
      0,
    )
  }

  private getActiveArchetypeCounts() {
    const counts: Partial<Record<EnemySpawnSelection['archetypeId'], number>> = {}

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.rank !== 'normal' || !enemy.archetypeId) {
        continue
      }

      counts[enemy.archetypeId] = (counts[enemy.archetypeId] ?? 0) + 1
    }

    return counts
  }

  private getWaveEnemyLimit() {
    return this.waveSystem.getEnemyLimit(
      this.getActiveSpecialEnemyCount() > 0,
    )
  }

  private showWaveAnnouncement() {
    const width = this.scale.width
    const height = this.scale.height
    const waveKind = this.waveSystem.getWaveKind()

    const isBoss = waveKind === 'boss'
    const isMiniBoss = waveKind === 'mini-boss'

    const titleText = isBoss
      ? `ĐỢT ${this.wave}  •  BOSS`
      : isMiniBoss
        ? `ĐỢT ${this.wave}  •  MINI BOSS`
        : `ĐỢT ${this.wave}`

    const specialDefinition = isBoss
      ? getBossDefinition('boss', this.wave)
      : isMiniBoss
        ? getBossDefinition('mini-boss', this.wave)
        : null

    const subtitleText = specialDefinition
      ? specialDefinition.label
      : 'MỨC ĐỘ ĐE DỌA ĐANG TĂNG'

    const titleColor = isBoss
      ? '#fbbf24'
      : isMiniBoss
        ? '#f0abfc'
        : '#f8fafc'

    const subtitleColor = isBoss
      ? '#fb923c'
      : isMiniBoss
        ? '#e879f9'
        : '#fca5a5'

    const title = this.add
      .text(width / 2, height / 2 - 35, titleText, {
        fontFamily: 'Arial, sans-serif',
        fontSize: isBoss ? '40px' : '38px',
        fontStyle: 'bold',
        color: titleColor,
        stroke: '#0f172a',
        strokeThickness: 7,
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25000)
      .setAlpha(0)
      .setScale(0.8)

    const subtitle = this.add
      .text(width / 2, height / 2 + 12, subtitleText, {
        fontFamily: 'Arial, sans-serif',
        fontSize: waveKind === 'normal' ? '12px' : '17px',
        fontStyle: 'bold',
        color: subtitleColor,
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25000)
      .setAlpha(0)

    if (waveKind !== 'normal') {
      this.shakeCamera(isBoss ? 420 : 260, isBoss ? 0.006 : 0.004)
    }

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 220,
      ease: 'Quad.Out',
    })

    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 260,
      ease: 'Back.Out',
    })

    this.time.delayedCall(1250, () => {
      this.tweens.add({
        targets: [title, subtitle],
        alpha: 0,
        y: '-=18',
        duration: 360,
        ease: 'Quad.In',
        onComplete: () => {
          title.destroy()
          subtitle.destroy()
        },
      })
    })
  }

  private showWaveScoreBonus(points: number) {
    const text = this.add
      .text(
        this.scale.width / 2,
        118,
        `THƯỞNG ĐỢT  +${points} ĐIỂM`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fbbf24',
          stroke: '#422006',
          strokeThickness: 5,
          letterSpacing: 1.2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24750)
      .setAlpha(0)

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 106,
      duration: 220,
      ease: 'Back.Out',
    })

    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: 92,
        duration: 280,
        ease: 'Quad.In',
        onComplete: () => text.destroy(),
      })
    })
  }

  private spawnEnemy(rank: EnemyRank = 'normal') {
    let selection: EnemySpawnSelection | null = null

    if (rank === 'normal') {
      selection = this.waveSystem.getSpawnSelection(
        this.rng.realInRange(0, 1),
        this.rng.realInRange(0, 1),
        this.rng.realInRange(0, 1),
        this.getActiveNormalEnemyDanger(),
        this.getActiveSpecialEnemyCount() > 0,
        this.getActiveArchetypeCounts(),
      )

      if (!selection) {
        return false
      }
    }

    const position = this.findEnemySpawnPosition()
    const enemy = this.createEnemyUnit(
      position.x,
      position.y,
      rank,
      selection,
    )

    this.enemies.push(enemy)
    this.updateCombatHud()
    this.updateBossHud()
    this.createEnemySpawnEffect(
      position.x,
      position.y,
      rank,
      selection,
    )

    return true
  }

  private spawnBroodChild(
    x: number,
    y: number,
    index: number,
    total: number,
  ) {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    const candidate = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, 40, this.worldWidth - 40),
      Phaser.Math.Clamp(y, 40, this.worldHeight - 40),
    )

    const nearestCell = this.pathfinding.findNearestWalkableCell(
      this.pathfinding.getNavigationCell(candidate.x, candidate.y),
      candidate,
      8,
    )

    const position = nearestCell
      ? this.pathfinding.getCellCenter(nearestCell)
      : candidate

    const selection: EnemySpawnSelection = {
      rank: 'normal',
      archetypeId: 'crawler',
      role: 'swarm',
      eliteTrait: null,
      dangerCost: 0,
    }

    const child = this.createEnemyUnit(
      position.x,
      position.y,
      'normal',
      selection,
    )

    child.sprite.setData('isBroodChild', true)
    child.sprite.setData('suppressRewards', true)
    child.sprite.setData('suppressDeathEffects', true)
    child.dangerCost = 0
    child.maxHealth = Math.max(12, Math.round(child.maxHealth * 0.38))
    child.health = child.maxHealth
    child.baseSpeed *= 1.18
    child.speed = child.baseSpeed
    child.contactDamage = Math.max(1, Math.round(child.contactDamage * 0.58))
    child.sprite.setData(
      'deathBuffBaseContactDamage',
      child.contactDamage,
    )
    child.scoreValue = 0
    child.showLabel = false
    child.showHealthBar = false
    child.label.setVisible(false)
    child.healthBarBackground.setVisible(false)
    child.healthBar.setVisible(false)
    child.sprite.setScale(0.66)
    child.glow.setScale(0.66)
    child.shadow.setScale(0.72)

    this.enemies.push(child)
    this.createEnemySpawnEffect(
      position.x,
      position.y,
      'normal',
      selection,
    )

    const text = this.add
      .text(
        position.x,
        position.y - 34,
        `QUÁI CON ${index + 1}/${total}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#f9a8d4',
          stroke: '#500724',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setDepth(position.y + 20)

    this.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })

    this.updateCombatHud()
  }

  private createEnemyUnit(
    startX: number,
    startY: number,
    rank: EnemyRank,
    selection: EnemySpawnSelection | null,
  ): EnemyUnit {
    const stats = getEnemyStatsForWave(
      this.wave,
      rank,
      selection?.archetypeId,
      selection?.eliteTrait,
    )

    const glow = this.add
      .ellipse(
        startX,
        startY + 10,
        stats.glowWidth,
        stats.glowHeight,
        stats.glowColor,
        rank === 'normal' ? 0.1 : 0.16,
      )
      .setBlendMode(Phaser.BlendModes.ADD)

    const shadow = this.add.ellipse(
      startX,
      startY + 24,
      stats.shadowWidth,
      stats.shadowHeight,
      0x000000,
      rank === 'boss' ? 0.7 : 0.58,
    )

    const sprite = this.physics.add.image(
      startX,
      startY,
      stats.textureKey,
    )

    sprite
      .setCircle(
        stats.bodyRadius,
        stats.bodyOffsetX,
        stats.bodyOffsetY,
      )
      .setCollideWorldBounds(true)
      .setScale(stats.spriteScale)
      .setDepth(startY)

    // Texture mới đã có bảng màu riêng. Chỉ giữ tint cho biến thể Tinh Anh
    // để không làm mất chi tiết riêng của từng loại quái.
    const appearanceTint = stats.isElite ? stats.spriteTint : 0xffffff

    sprite.setData('baseTint', appearanceTint)
    sprite.setData('suicideArmed', false)
    sprite.setData('suicideDetonateAt', 0)
    sprite.setData('suicideWarning', null)

    if (appearanceTint !== 0xffffff) {
      sprite.setTint(appearanceTint)
    }

    const label = this.add
      .text(
        startX,
        startY - stats.labelOffsetY,
        stats.label,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: rank === 'boss' ? '14px' : '11px',
          fontStyle: 'bold',
          color: stats.labelColor,
          stroke: rank === 'normal' ? undefined : '#020617',
          strokeThickness: rank === 'normal' ? 0 : 4,
          letterSpacing: rank === 'boss' ? 2 : 1,
        },
      )
      .setOrigin(0.5)
      .setVisible(stats.showLabel)

    const healthBarBackground = this.add
      .rectangle(
        startX,
        startY - stats.healthBarOffsetY,
        stats.healthBarWidth + 6,
        rank === 'normal' ? 10 : 13,
        0x020617,
        0.94,
      )
      .setStrokeStyle(1, stats.glowColor, 0.95)
      .setVisible(stats.showHealthBar)

    const healthBar = this.add
      .rectangle(
        startX - stats.healthBarWidth / 2,
        startY - stats.healthBarOffsetY,
        stats.healthBarWidth,
        rank === 'normal' ? 5 : 7,
        stats.healthBarColor,
        1,
      )
      .setOrigin(0, 0.5)
      .setVisible(stats.showHealthBar)

    const enemy: EnemyUnit = {
      id: ++this.enemyIdCounter,
      rank,
      archetypeId: stats.archetypeId,
      role: stats.role,
      eliteTrait: stats.eliteTrait,
      dangerCost: stats.dangerCost,
      isElite: stats.isElite,
      showLabel: stats.showLabel,
      showHealthBar: stats.showHealthBar,
      sprite,
      shadow,
      glow,
      label,
      healthBarBackground,
      healthBar,
      collider: this.physics.add.collider(sprite, this.obstacles),
      maxHealth: stats.maxHealth,
      health: stats.maxHealth,
      baseSpeed: stats.speed,
      speed: stats.speed,
      contactDamage: stats.contactDamage,
      attackMode: stats.attackMode,
      preferredRange: stats.preferredRange,
      minimumRange: stats.minimumRange,
      rangedAttackCooldown: stats.rangedAttackCooldown,
      rangedProjectileSpeed: stats.rangedProjectileSpeed,
      rangedProjectileDamage: stats.rangedProjectileDamage,
      nextRangedAttackAt:
        this.time.now +
        Math.round(
          (stats.rangedAttackCooldown * 0.55 +
            (this.enemyIdCounter % 4) * 120) *
            ENEMY_FIRE_INTERVAL_MULTIPLIER,
        ),
      scoreValue: stats.scoreValue,
      projectileHitRadius: stats.projectileHitRadius,
      contactRadius: stats.contactRadius,
      labelOffsetY: stats.labelOffsetY,
      healthBarOffsetY: stats.healthBarOffsetY,
      healthBarWidth: stats.healthBarWidth,
      knockbackForce: stats.knockbackForce,
      path: [],
      pathIndex: 0,
      nextPathUpdateAt:
        this.time.now + (this.enemyIdCounter % 5) * 70,
      lastPathTargetCellKey: '',
      lastProgressCheckAt: this.time.now,
      lastProgressPosition: new Phaser.Math.Vector2(
        startX,
        startY,
      ),
      wasTryingToMove: false,
      stuckCount: 0,
      localAvoidanceTarget: null,
      localAvoidanceUntil: 0,
      localAvoidanceDirection:
        this.enemyIdCounter % 2 === 0 ? 1 : -1,
      bossPhase: 1,
      bossVariant: null,
      bossEncounterIndex: 0,
      bossAbilityCycleIndex: 0,
      bossSplitTriggered: false,
      nextBossAbilityAt: 0,
      bossAbilityActiveUntil: 0,
      bossAbility: null,
      alive: true,
    }

    this.bossSystem.resetEnemy(enemy, this.time.now, this.wave)
    this.applyEnemyAppearance(enemy)
    this.supportEnemySystem.initializeEnemy(enemy, this.time.now)
    this.enemyDeathEffectSystem.initializeEnemy(enemy)
    this.updateEnemyHealthBar(enemy)

    return enemy
  }

  private applyEnemyAppearance(enemy: EnemyUnit) {
    const textureKey = this.getEnemyAppearanceTextureKey(enemy)

    if (this.textures.exists(textureKey)) {
      enemy.sprite.setTexture(textureKey)
    }

    const baseTint = enemy.sprite.getData('baseTint') as
      | number
      | undefined

    enemy.sprite.clearTint()

    if (baseTint !== undefined && baseTint !== 0xffffff) {
      enemy.sprite.setTint(baseTint)
    }
  }

  private getEnemyAppearanceTextureKey(enemy: EnemyUnit) {
    if (enemy.rank === 'normal') {
      switch (enemy.archetypeId) {
        case 'crawler':
          return 'enemy-crawler'
        case 'brute':
          return 'enemy-brute'
        case 'shooter':
          return 'enemy-shooter'
        case 'bomber':
          return 'enemy-bomber'
        case 'scatterer':
          return 'enemy-scatterer'
        case 'healer':
          return 'enemy-healer'
        case 'shielder':
          return 'enemy-shielder'
        case 'death-buffer':
          return 'enemy-death-buffer'
        case 'brood-mother':
          return 'enemy-brood-mother'
        case 'toxic':
          return 'enemy-toxic'
        case 'flame':
          return 'enemy-flame'
        case 'mutant':
        default:
          return 'enemy-mutant'
      }
    }

    switch (enemy.bossVariant) {
      case 'mutant-guardian':
        return 'mini-mutant-guardian'
      case 'plague-warden':
        return 'mini-plague-warden'
      case 'brood-tyrant':
        return 'mini-brood-tyrant'
      case 'infernal-executioner':
        return 'mini-infernal-executioner'
      case 'devourer':
        return 'boss-devourer'
      case 'aegis-colossus':
        return 'boss-aegis-colossus'
      case 'brood-queen':
        return 'boss-brood-queen'
      case 'infernal-engine':
        return 'boss-infernal-engine'
      default:
        return enemy.rank === 'boss'
          ? 'boss-devourer'
          : 'mini-mutant-guardian'
    }
  }

  private createEnemySpawnEffect(
    x: number,
    y: number,
    rank: EnemyRank,
    selection: EnemySpawnSelection | null,
  ) {
    const normalColor = selection?.eliteTrait
      ? 0xfacc15
      : selection?.archetypeId === 'crawler'
        ? 0xec4899
        : selection?.archetypeId === 'brute'
          ? 0xf97316
          : selection?.archetypeId === 'shooter'
            ? 0x22d3ee
            : selection?.archetypeId === 'bomber'
              ? 0xfacc15
              : selection?.archetypeId === 'scatterer'
                ? 0xc084fc
                : selection?.archetypeId === 'healer'
                  ? 0x4ade80
                  : selection?.archetypeId === 'shielder'
                    ? 0x60a5fa
                    : selection?.archetypeId === 'death-buffer'
                      ? 0xfb923c
                      : selection?.archetypeId === 'brood-mother'
                        ? 0xec4899
                        : selection?.archetypeId === 'toxic'
                          ? 0x22c55e
                          : selection?.archetypeId === 'flame'
                            ? 0xf97316
                            : 0xf87171

    const color =
      rank === 'boss'
        ? 0xf97316
        : rank === 'mini-boss'
          ? 0xd946ef
          : normalColor

    const ring = this.add
      .circle(x, y + 10, rank === 'normal' ? 18 : 30, color, 0)
      .setStrokeStyle(rank === 'boss' ? 7 : 4, color, 0.82)
      .setDepth(y + 25)

    this.tweens.add({
      targets: ring,
      scale: rank === 'boss' ? 5.2 : 3.4,
      alpha: 0,
      duration: rank === 'boss' ? 900 : 520,
      ease: 'Quad.Out',
      onComplete: () => {
        ring.destroy()
      },
    })
  }

  private findEnemySpawnPosition() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const angle = this.rng.realInRange(
        0,
        Math.PI * 2,
      )

      const distance = this.rng.integerInRange(
        this.enemySpawnMinDistance,
        this.enemySpawnMaxDistance,
      )

      const x = Phaser.Math.Clamp(
        this.player.x +
          Math.cos(angle) * distance,
        50,
        this.worldWidth - 50,
      )

      const y = Phaser.Math.Clamp(
        this.player.y +
          Math.sin(angle) * distance,
        50,
        this.worldHeight - 50,
      )

      if (!this.pathfinding.isNavigationPointWalkable(x, y)) {
        continue
      }

      const tooCloseToEnemy = this.enemies.some(
        (enemy) =>
          Phaser.Math.Distance.Between(
            enemy.sprite.x,
            enemy.sprite.y,
            x,
            y,
          ) < 100,
      )

      if (!tooCloseToEnemy) {
        return new Phaser.Math.Vector2(x, y)
      }
    }

    const fallbackPosition = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(
        this.player.x + 760,
        50,
        this.worldWidth - 50,
      ),
      Phaser.Math.Clamp(
        this.player.y + 180,
        50,
        this.worldHeight - 50,
      ),
    )

    const fallbackCell =
      this.pathfinding.findNearestWalkableCell(
        this.pathfinding.getNavigationCell(
          fallbackPosition.x,
          fallbackPosition.y,
        ),
        fallbackPosition,
        16,
      )

    return fallbackCell
      ? this.pathfinding.getCellCenter(fallbackCell)
      : fallbackPosition
  }

  private setupCollisions() {
    this.physics.add.collider(
      this.player,
      this.obstacles,
    )
  }

  private setupCamera() {
    const camera = this.cameras.main

    camera.setBounds(
      0,
      0,
      this.worldWidth,
      this.worldHeight,
    )

    camera.setZoom(1)

    camera.startFollow(
      this.player,
      true,
      0.09,
      0.09,
    )

    camera.centerOn(
      this.player.x,
      this.player.y,
    )

    camera.fadeIn(
      550,
      2,
      5,
      11,
    )
  }

  private togglePauseGame() {
    if (this.isPaused) {
      this.resumeGame()
    } else {
      this.pauseGame()
    }
  }

  private createPauseMenuSnapshot(): PauseMenuSnapshot {
    const protocol = this.startingProtocolSystem.getDefinition(
      this.startingProtocolId,
    )
    const skillContext = this.skillSystem.getUpgradeContext()
    const baseSkills: PauseMenuSkillEntry[] = []

    for (const id of PLAYER_SKILL_IDS) {
      const level = this.skillSystem.getLevel(id)

      if (level <= 0) {
        continue
      }

      const definition = PLAYER_SKILL_DEFINITIONS[id]
      baseSkills.push({
        id,
        title: definition.title,
        level,
        maximumLevel: definition.maximumLevel,
        category: definition.usesActiveSlot ? 'active' : 'weapon',
      })
    }

    const fusionSkills: PauseMenuSkillEntry[] =
      this.skillSystem.getFusionSkills().map((fusion) => ({
        id: fusion.id,
        title: fusion.title,
        level: fusion.level,
        maximumLevel: 5,
        category: 'fusion',
        tier: fusion.tier,
      }))

    const equippedAbility = this.activeAbilityCombatSystem.getDefinition()
    if (equippedAbility) {
      const cooldown =
        this.activeAbilityCombatSystem.getCooldownRemainingSeconds(this.time.now)
      baseSkills.unshift({
        id: `equipped-${equippedAbility.id}`,
        title: `TUYỆT KỸ • ${equippedAbility.name}${
          cooldown > 0 ? ` • HỒI ${cooldown}s` : ' • SẴN SÀNG'
        }`,
        level: 1,
        maximumLevel: 1,
        category: 'active',
      })
    }

    const effectiveStats = this.getEffectivePlayerStats()

    return {
      settings: this.gameSettingsSystem.getSettings(),
      protocolShortTitle: protocol.shortTitle,
      protocolTitle: protocol.title,
      protocolAdvantages: protocol.advantages,
      protocolDrawback: protocol.drawback,
      currentHealth: this.playerHealth,
      stats: effectiveStats,
      wave: this.wave,
      level: this.experienceSystem.level,
      score: this.score,
      kills: this.kills,
      activeSkillCount: skillContext.activeSlotCount,
      maximumActiveSkills: skillContext.maximumActiveSlots,
      skills: [...baseSkills, ...fusionSkills],
    }
  }

  private pauseGame() {
    if (
      this.isPaused ||
      this.isGameOver ||
      this.isEndingGame ||
      this.isChoosingUpgrade
    ) {
      return
    }

    this.isPaused = true
    this.player.setVelocity(0, 0)

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }

    this.audioSystem.pauseForGame()
    this.physics.pause()
    this.time.paused = true
    this.tweens.pauseAll()
    this.skillSystem.stopAll()
    this.mobileControlSystem.setMovementEnabled(false)
    this.activeAbilityCombatSystem.setEnabled(false)
    this.pauseMenuSystem.open(this.createPauseMenuSnapshot())
  }

  private resumeGame() {
    if (!this.isPaused || this.isGameOver) {
      return
    }

    this.isPaused = false
    this.pauseMenuSystem.close()
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
    this.audioSystem.resumeFromGame()
    this.skillSystem.resume()
    this.mobileControlSystem.setMovementEnabled(true)
    this.activeAbilityCombatSystem.setEnabled(true)
  }

  private restartPausedGame() {
    if (!this.isPaused) {
      return
    }

    this.isPaused = false
    this.pauseMenuSystem.close()
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
    this.audioSystem.stopMusic()
    this.scene.restart()
  }

  private returnToMainMenu() {
    this.isPaused = false
    this.isChoosingUpgrade = false
    this.pauseMenuSystem.close()
    this.pauseMenuSystem.setPauseButtonVisible(false)
    this.mobileControlSystem.setMovementEnabled(false)
    this.activeAbilityCombatSystem.setEnabled(false)
    this.activeAbilityCombatSystem.setVisible(false)
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.resume()
    this.audioSystem.stopMusic()
    this.game.events.emit(RETURN_TO_MAIN_MENU_EVENT)
  }

  private setupVisibilityPause() {
    if (typeof document === 'undefined') {
      return
    }

    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        this.gameSettingsSystem.isAutoPauseEnabled()
      ) {
        this.pauseGame()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    this.events.once('shutdown', () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    })
  }

  private shakeCamera(duration: number, intensity: number) {
    if (!this.gameSettingsSystem.isScreenShakeEnabled()) {
      return
    }

    this.cameras.main.shake(duration, intensity)
  }

  private setupKeyboard() {
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error(
        'Không thể khởi tạo bàn phím',
      )
    }

    this.cursors =
      keyboard.createCursorKeys()

    this.movementKeys = keyboard.addKeys(
      'W,A,S,D',
    ) as MovementKeys

    this.restartKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    )

    this.pauseKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    )

    this.activeAbilityKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q,
    )

    keyboard.addCapture(
      'W,A,S,D,Q,ESC,UP,DOWN,LEFT,RIGHT',
    )
  }

  private setupUpgradeEvents() {
    this.game.events.off(
      UPGRADE_SELECTED_EVENT,
      this.handleUpgradeSelected,
      this,
    )

    this.game.events.on(
      UPGRADE_SELECTED_EVENT,
      this.handleUpgradeSelected,
      this,
    )

    this.events.once('shutdown', () => {
      this.game.events.off(
        UPGRADE_SELECTED_EVENT,
        this.handleUpgradeSelected,
        this,
      )
    })
  }

  private openUpgradeSelection() {
    if (this.isGameOver || this.isChoosingUpgrade) {
      return
    }

    const upgradeLevel =
      this.experienceSystem.consumePendingLevelUp()

    if (upgradeLevel === null) {
      return
    }

    const choices = this.upgradeSystem.getChoices(
      3,
      this.rng,
      this.skillSystem.getUpgradeContext(),
    )

    if (choices.length === 0) {
      return
    }

    this.isChoosingUpgrade = true
    this.pauseMenuSystem.setPauseButtonVisible(false)
    this.mobileControlSystem.setMovementEnabled(false)
    this.activeAbilityCombatSystem.setEnabled(false)
    this.player.setVelocity(0, 0)

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }

    this.scene.launch('UpgradeScene', {
      level: upgradeLevel,
      choices,
      activeSkillCount:
        this.upgradeSystem.getActiveSkillCount(),
      maximumActiveSkills:
        this.upgradeSystem.getMaximumActiveSkillSlots(),
      multishotLevel:
        this.upgradeSystem.getLevel('multishot'),
    })
    this.scene.pause()
  }

  private handleUpgradeSelected(id: UpgradeId) {
    if (!this.isChoosingUpgrade || this.isGameOver) {
      return
    }

    const result = this.upgradeSystem.applyUpgrade(id, this.playerStats)
    this.startingProtocolSystem.reconcileAfterUpgrade(
      this.playerStats,
      this.startingProtocolId,
      id,
    )

    if (result.skillId) {
      this.skillSystem.applyUpgrade(result.skillId)
    }

    if (result.fusionAction === 'create') {
      const fusion = this.skillSystem.fuseRandom(this.rng)

      if (fusion) {
        this.audioSystem.playSkill('fusion')
        this.runStatsSystem.recordFusionCreated(fusion.tier)
        this.showFusionResult(fusion.title, fusion.tier)
      }
    } else if (result.fusionAction === 'upgrade') {
      const fusion = this.skillSystem.upgradeRandomFusion(this.rng)

      if (fusion) {
        this.audioSystem.playSkill('fusion')
        this.runStatsSystem.recordFusionUpgrade(fusion.tier)
        this.showFusionResult(fusion.title, fusion.tier, fusion.level)
      }
    }

    if (result.healAmount > 0) {
      this.playerHealth = Math.min(
        this.playerStats.maximumHealth,
        this.playerHealth + result.healAmount,
      )
    }

    this.nextAttackAt = Math.min(this.nextAttackAt, this.time.now + 90)
    this.isChoosingUpgrade = false

    this.scene.stop('UpgradeScene')
    this.scene.resume()
    this.mobileControlSystem.setMovementEnabled(true)
    this.activeAbilityCombatSystem.setEnabled(true)
    this.pauseMenuSystem.setPauseButtonVisible(true)

    this.updateHealthBar()
    this.updateExperienceHud()
    this.showUpgradeAppliedEffect(id)

    if (this.experienceSystem.hasPendingLevelUp()) {
      this.time.delayedCall(180, () => {
        this.openUpgradeSelection()
      })
    }
  }

  private showFusionResult(
    title: string,
    tier: number,
    level = 1,
  ) {
    const centerX = this.scale.width / 2
    const centerY = 166
    const width = Math.min(560, this.scale.width - 36)

    const glow = this.add
      .rectangle(centerX, centerY, width + 20, 92, 0xf472b6, 0.06)
      .setScrollFactor(0)
      .setDepth(24498)
      .setAlpha(0)

    const panel = this.add
      .rectangle(centerX, centerY, width, 78, 0x16081d, 0.97)
      .setStrokeStyle(3, 0xf472b6, 0.92)
      .setScrollFactor(0)
      .setDepth(24499)
      .setAlpha(0)

    const iconRing = this.add
      .circle(centerX - width / 2 + 48, centerY, 29, 0x020617, 0.96)
      .setStrokeStyle(2, 0xfef3c7, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(24500)
      .setAlpha(0)

    const icon = this.add
      .image(
        centerX - width / 2 + 48,
        centerY,
        'upgrade-icon-skill-fusion',
      )
      .setDisplaySize(58, 58)
      .setScrollFactor(0)
      .setDepth(24501)
      .setAlpha(0)

    const heading = this.add
      .text(centerX - width / 2 + 88, centerY - 20, 'DUNG HỢP HOÀN TẤT', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef3c7',
        letterSpacing: 2,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(24501)
      .setAlpha(0)

    const text = this.add
      .text(centerX - width / 2 + 88, centerY + 6, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f0abfc',
        stroke: '#4a044e',
        strokeThickness: 4,
        wordWrap: { width: width - 190 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(24501)
      .setAlpha(0)

    const badge = this.add
      .text(
        centerX + width / 2 - 20,
        centerY,
        `BẬC ${tier}
CẤP ${level}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fdf4ff',
          backgroundColor: '#86198f',
          padding: { x: 9, y: 6 },
          align: 'center',
          lineSpacing: 3,
        },
      )
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(24502)
      .setAlpha(0)

    const objects = [glow, panel, iconRing, icon, heading, text, badge]

    this.tweens.add({
      targets: objects,
      alpha: 1,
      y: '-=10',
      duration: 260,
      ease: 'Back.Out',
    })

    this.tweens.add({
      targets: iconRing,
      rotation: Math.PI * 2,
      duration: 1100,
      ease: 'Sine.InOut',
    })

    this.time.delayedCall(1450, () => {
      this.tweens.add({
        targets: objects,
        alpha: 0,
        y: '-=18',
        duration: 380,
        ease: 'Quad.In',
        onComplete: () => {
          for (const object of objects) {
            object.destroy()
          }
        },
      })
    })
  }

  private showUpgradeAppliedEffect(id: UpgradeId) {
    const definition = UPGRADE_DEFINITIONS[id]

    if (!definition) {
      return
    }

    const colorText = `#${definition.accentColor
      .toString(16)
      .padStart(6, '0')}`

    const text = this.add
      .text(
        this.scale.width / 2,
        145,
        `${definition.title}  •  ĐÃ KÍCH HOẠT`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: colorText,
          stroke: '#020617',
          strokeThickness: 5,
          letterSpacing: 1.2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24000)
      .setAlpha(0)

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 132,
      duration: 220,
      ease: 'Back.Out',
    })

    this.time.delayedCall(950, () => {
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: 115,
        duration: 320,
        ease: 'Quad.In',
        onComplete: () => text.destroy(),
      })
    })
  }

  private getEffectivePlayerStats(): PlayerStats {
    return {
      ...this.playerStats,
      attackDamage:
        this.playerStats.attackDamage *
        this.activeAbilityCombatSystem.getDamageMultiplier(this.time.now),
      attackInterval: Math.max(
        80,
        this.playerStats.attackInterval *
          this.activeAbilityCombatSystem.getAttackIntervalMultiplier(this.time.now),
      ),
      movementSpeed:
        this.playerStats.movementSpeed *
        this.activeAbilityCombatSystem.getMovementSpeedMultiplier(this.time.now),
      damageReduction: Phaser.Math.Clamp(
        this.playerStats.damageReduction +
          this.activeAbilityCombatSystem.getDamageReductionBonus(this.time.now),
        0,
        0.88,
      ),
    }
  }

  private createActiveAbilityCombatContext(): ActiveAbilityCombatContext {
    return {
      now: this.time.now,
      playerX: this.player.x,
      playerY: this.player.y,
      stats: this.playerStats,
      enemies: this.enemies,
      spawnRadialProjectiles: (count, damageMultiplier, forceNonCritical) =>
        this.spawnAbilityProjectileRing(
          count,
          damageMultiplier,
          forceNonCritical,
        ),
      damageEnemy: (enemy, damage, critical = false) =>
        this.damageEnemy(enemy, damage, critical),
      healPlayer: (amount) => this.healPlayerFromAbility(amount),
      dashPlayer: (distance) => this.performAbilityDash(distance),
      shakeCamera: (duration, intensity) =>
        this.shakeCamera(duration, intensity),
      playSound: (cue) => this.playAbilitySound(cue),
    }
  }

  private tryActivateActiveAbility() {
    if (
      this.isPaused ||
      this.isGameOver ||
      this.isEndingGame ||
      this.isChoosingUpgrade
    ) {
      return
    }

    this.activeAbilityCombatSystem.tryActivate(
      this.createActiveAbilityCombatContext(),
    )
  }

  private spawnAbilityProjectileRing(
    count: number,
    damageMultiplier: number,
    forceNonCritical: boolean,
  ) {
    const safeCount = Math.max(1, Math.round(count))
    const startAngle = -Math.PI / 2

    for (let index = 0; index < safeCount; index++) {
      const angle = startAngle + (Math.PI * 2 * index) / safeCount
      this.spawnPlayerProjectile(
        angle,
        damageMultiplier,
        forceNonCritical,
      )
    }
  }

  private healPlayerFromAbility(amount: number) {
    if (this.isGameOver || this.isEndingGame || amount <= 0) return

    const previousHealth = this.playerHealth
    this.playerHealth = Math.min(
      this.playerStats.maximumHealth,
      this.playerHealth + Math.max(0, Math.round(amount)),
    )
    const healed = Math.max(0, Math.round(this.playerHealth - previousHealth))
    this.updateHealthBar()

    if (healed <= 0) return

    const text = this.add
      .text(this.player.x, this.player.y - 58, `+${healed} MÁU`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#86efac',
        stroke: '#052e16',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(this.player.y + 45)

    this.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 650,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
  }

  private performAbilityDash(distance: number): AbilityDashResult {
    const fromX = this.player.x
    const fromY = this.player.y
    const direction = this.lastPlayerMoveDirection.clone()

    if (direction.lengthSq() <= 0.001) direction.set(1, 0)
    direction.normalize()

    let safeDistance = Math.max(0, distance)
    let toX = fromX
    let toY = fromY

    while (safeDistance >= 24) {
      const candidateX = Phaser.Math.Clamp(
        fromX + direction.x * safeDistance,
        34,
        this.worldWidth - 34,
      )
      const candidateY = Phaser.Math.Clamp(
        fromY + direction.y * safeDistance,
        40,
        this.worldHeight - 40,
      )

      if (
        this.pathfinding.isDirectPathClear(
          fromX,
          fromY,
          candidateX,
          candidateY,
        )
      ) {
        toX = candidateX
        toY = candidateY
        break
      }

      safeDistance -= 24
    }

    this.player.setPosition(toX, toY)
    this.player.setVelocity(0, 0)

    return { fromX, fromY, toX, toY }
  }

  private playAbilitySound(cue: AbilitySoundCue) {
    switch (cue) {
      case 'barrage':
        this.audioSystem.playShot(3)
        break
      case 'dash':
        this.audioSystem.playSkill('energy-laser')
        break
      case 'field':
        this.audioSystem.playSkill('gravity-well')
        break
      case 'heal':
        this.audioSystem.playPickup()
        break
      case 'explosion':
        this.audioSystem.playSkill('plasma-nova')
        break
      case 'buff':
      case 'shield':
        this.audioSystem.playSkill('fusion')
        break
      case 'lightning':
        this.audioSystem.playSkill('chain-lightning')
        break
      case 'ultimate':
        this.audioSystem.playSkill('meteor-rain')
        break
    }
  }

private updatePlayerMovement() {
    let keyboardX = 0
    let keyboardY = 0

    const moveLeft =
      this.cursors.left.isDown ||
      this.movementKeys.A.isDown

    const moveRight =
      this.cursors.right.isDown ||
      this.movementKeys.D.isDown

    const moveUp =
      this.cursors.up.isDown ||
      this.movementKeys.W.isDown

    const moveDown =
      this.cursors.down.isDown ||
      this.movementKeys.S.isDown

    if (moveLeft) {
      keyboardX -= 1
    }

    if (moveRight) {
      keyboardX += 1
    }

    if (moveUp) {
      keyboardY -= 1
    }

    if (moveDown) {
      keyboardY += 1
    }

    if (keyboardX !== 0 && keyboardY !== 0) {
      keyboardX *= Math.SQRT1_2
      keyboardY *= Math.SQRT1_2
    }

    const touchDirection =
      this.mobileControlSystem.getMovementVector()
    const usingKeyboard = keyboardX !== 0 || keyboardY !== 0
    const directionX = usingKeyboard ? keyboardX : touchDirection.x
    const directionY = usingKeyboard ? keyboardY : touchDirection.y

    if (Math.abs(directionX) > 0.02 || Math.abs(directionY) > 0.02) {
      this.lastPlayerMoveDirection.set(directionX, directionY).normalize()
    }

    const movementSpeed =
      this.playerStats.movementSpeed *
      this.activeAbilityCombatSystem.getMovementSpeedMultiplier(this.time.now)

    this.player.setVelocity(
      directionX * movementSpeed,
      directionY * movementSpeed,
    )

    this.player.setRotation(directionX * 0.045)

    if (directionX < -0.05) {
      this.player.setFlipX(true)
    } else if (directionX > 0.05) {
      this.player.setFlipX(false)
    }
  }

  private updateEnemies() {
    this.pathSearchesThisFrame = 0
    this.buildEnemySpatialBuckets()
    this.processPendingPathRequests()

    for (const enemy of this.enemies) {
      this.updateBossState(enemy)
      this.updateEnemyMovement(enemy)
    }
  }

  private buildEnemySpatialBuckets() {
    this.enemySpatialBuckets.clear()

    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const key = this.getEnemySpatialBucketKey(
        enemy.sprite.x,
        enemy.sprite.y,
      )

      const bucket = this.enemySpatialBuckets.get(key)

      if (bucket) {
        bucket.push(enemy)
      } else {
        this.enemySpatialBuckets.set(key, [enemy])
      }
    }
  }

  private getEnemySpatialBucketKey(x: number, y: number) {
    const col = Math.floor(x / this.separationBucketSize)
    const row = Math.floor(y / this.separationBucketSize)
    return `${col},${row}`
  }

  private updateBossState(enemy: EnemyUnit) {
    if (!enemy.alive || enemy.rank === 'normal') {
      return
    }

    if (
      enemy.bossAbility &&
      this.time.now >= enemy.bossAbilityActiveUntil
    ) {
      this.bossSystem.finishAbility(enemy)
    }

    const phaseChanged = this.bossSystem.updatePhase(enemy)

    if (phaseChanged) {
      this.createBossPhaseEffect(enemy)
    }

    const ability = this.bossSystem.tryStartAbility(
      enemy,
      this.time.now,
      this.wave,
    )

    if (ability === 'charge') {
      this.createBossChargeEffect(enemy)
    } else if (ability === 'shockwave') {
      this.createBossShockwaveTelegraph(enemy)
    } else if (ability === 'radial-burst') {
      this.createBossRadialBurstTelegraph(enemy)
    } else if (ability === 'spread-barrage') {
      this.createBossSpreadBarrageTelegraph(enemy)
    } else if (ability === 'summon-minions') {
      this.createBossSummonTelegraph(enemy)
    }
  }

  private createBossPhaseEffect(enemy: EnemyUnit) {
    const color = enemy.rank === 'boss' ? 0xf97316 : 0xd946ef

    const phaseText = this.add
      .text(
        enemy.sprite.x,
        enemy.sprite.y - enemy.labelOffsetY - 26,
        `GIAI ĐOẠN ${enemy.bossPhase}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: enemy.rank === 'boss' ? '19px' : '15px',
          fontStyle: 'bold',
          color: enemy.rank === 'boss' ? '#fde68a' : '#f5d0fe',
          stroke: '#020617',
          strokeThickness: 5,
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setDepth(enemy.sprite.y + 40)

    const ring = this.add
      .circle(enemy.sprite.x, enemy.sprite.y, 30, color, 0)
      .setStrokeStyle(6, color, 0.9)
      .setDepth(enemy.sprite.y + 35)

    this.shakeCamera(180, 0.004)

    this.tweens.add({
      targets: ring,
      scale: enemy.rank === 'boss' ? 5.5 : 4,
      alpha: 0,
      duration: 700,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    this.tweens.add({
      targets: phaseText,
      y: phaseText.y - 38,
      alpha: 0,
      duration: 900,
      ease: 'Quad.Out',
      onComplete: () => phaseText.destroy(),
    })
  }

  private createBossChargeEffect(enemy: EnemyUnit) {
    const color = enemy.rank === 'boss' ? 0xf97316 : 0xd946ef

    const ring = this.add
      .circle(enemy.sprite.x, enemy.sprite.y + 8, 22, color, 0)
      .setStrokeStyle(5, color, 0.9)
      .setDepth(enemy.sprite.y + 30)

    this.tweens.add({
      targets: ring,
      scale: 3.6,
      alpha: 0,
      duration: GAME_CONFIG.boss.miniBossChargeDuration,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })
  }

  private createBossShockwaveTelegraph(enemy: EnemyUnit) {
    const radius = GAME_CONFIG.boss.bossShockwaveRadius
    const delay = GAME_CONFIG.boss.bossShockwaveDelay

    const warning = this.add
      .circle(enemy.sprite.x, enemy.sprite.y, radius, 0xf97316, 0.07)
      .setStrokeStyle(5, 0xfbbf24, 0.75)
      .setDepth(enemy.sprite.y - 4)
      .setScale(0.15)

    this.tweens.add({
      targets: warning,
      scale: 1,
      alpha: 0.2,
      duration: delay,
      ease: 'Quad.Out',
    })

    this.time.delayedCall(delay, () => {
      if (warning.active) {
        warning.destroy()
      }

      if (!enemy.alive || this.isGameOver || !enemy.sprite.active) {
        if (enemy.alive) {
          this.bossSystem.finishAbility(enemy)
        }
        return
      }

      const distance = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.x,
        this.player.y,
      )

      const blast = this.add
        .circle(enemy.sprite.x, enemy.sprite.y, 36, 0xf97316, 0.2)
        .setStrokeStyle(8, 0xfbbf24, 0.9)
        .setDepth(enemy.sprite.y + 40)

      this.tweens.add({
        targets: blast,
        scale: radius / 36,
        alpha: 0,
        duration: 430,
        ease: 'Quad.Out',
        onComplete: () => blast.destroy(),
      })

      this.shakeCamera(260, 0.008)

      if (distance <= radius) {
        const damage = Math.max(
          1,
          Math.round(
            enemy.contactDamage *
              GAME_CONFIG.boss.bossShockwaveDamageMultiplier,
          ),
        )

        this.applyDamage(damage, enemy)
      }

      this.bossSystem.finishAbility(enemy)
    })
  }


  private createBossRadialBurstTelegraph(enemy: EnemyUnit) {
    const generation = this.combatGeneration
    const delay = enemy.rank === 'boss' ? 650 : 540
    const color = enemy.rank === 'boss' ? 0xf97316 : 0xd946ef
    const projectileColor =
      enemy.bossVariant === 'aegis-colossus'
        ? 0x60a5fa
        : enemy.bossVariant === 'brood-queen' ||
            enemy.bossVariant === 'brood-tyrant'
          ? 0xf472b6
          : 0xfbbf24

    const warning = this.add
      .circle(enemy.sprite.x, enemy.sprite.y, 34, color, 0.08)
      .setStrokeStyle(6, projectileColor, 0.88)
      .setDepth(enemy.sprite.y + 24)

    this.tweens.add({
      targets: warning,
      scale: enemy.rank === 'boss' ? 4.7 : 3.7,
      alpha: 0.18,
      duration: delay,
      ease: 'Quad.Out',
    })

    this.time.delayedCall(delay, () => {
      if (warning.active) {
        warning.destroy()
      }

      if (
        generation !== this.combatGeneration ||
        !enemy.alive ||
        !enemy.sprite.active ||
        this.isGameOver ||
        this.isEndingGame
      ) {
        if (enemy.alive) {
          this.bossSystem.finishAbility(enemy)
        }
        return
      }

      const projectileCount =
        enemy.rank === 'boss'
          ? 10 + enemy.bossPhase * 4 +
            Math.min(4, enemy.bossEncounterIndex)
          : 7 + enemy.bossPhase * 3

      this.enemyProjectileSystem.fireRadial({
        owner: enemy,
        speed:
          245 +
          enemy.bossPhase * 24 +
          Math.min(45, enemy.bossEncounterIndex * 4),
        damage: Math.max(
          1,
          Math.round(
            enemy.contactDamage *
              (enemy.rank === 'boss' ? 0.46 : 0.38),
          ),
        ),
        projectileCount,
        startAngle: this.time.now / 700,
        projectileColor,
        glowColor: color,
      })

      const blast = this.add
        .circle(enemy.sprite.x, enemy.sprite.y, 38, color, 0.18)
        .setStrokeStyle(7, projectileColor, 0.9)
        .setDepth(enemy.sprite.y + 35)

      this.tweens.add({
        targets: blast,
        scale: enemy.rank === 'boss' ? 4.3 : 3.3,
        alpha: 0,
        duration: 440,
        ease: 'Quad.Out',
        onComplete: () => blast.destroy(),
      })

      this.shakeCamera(
        enemy.rank === 'boss' ? 250 : 150,
        enemy.rank === 'boss' ? 0.006 : 0.0035,
      )
      this.bossSystem.finishAbility(enemy)
    })
  }

  private createBossSpreadBarrageTelegraph(enemy: EnemyUnit) {
    const generation = this.combatGeneration
    const warningDelay = enemy.rank === 'boss' ? 430 : 380
    const volleyInterval = Math.round(
      (enemy.rank === 'boss' ? 210 : 235) *
        ENEMY_FIRE_INTERVAL_MULTIPLIER,
    )
    const volleyCount =
      enemy.rank === 'boss'
        ? 2 + enemy.bossPhase
        : 1 + enemy.bossPhase
    const color =
      enemy.bossVariant === 'plague-warden'
        ? 0x84cc16
        : enemy.bossVariant === 'brood-queen' ||
            enemy.bossVariant === 'brood-tyrant'
          ? 0xec4899
          : 0xc084fc

    const warning = this.add
      .circle(enemy.sprite.x, enemy.sprite.y, 28, color, 0.1)
      .setStrokeStyle(5, color, 0.9)
      .setDepth(enemy.sprite.y + 25)

    this.tweens.add({
      targets: warning,
      scale: enemy.rank === 'boss' ? 3.8 : 3.1,
      alpha: 0.22,
      duration: warningDelay,
      ease: 'Quad.Out',
    })

    this.time.delayedCall(warningDelay, () => {
      if (warning.active) {
        warning.destroy()
      }
    })

    for (let volley = 0; volley < volleyCount; volley++) {
      this.time.delayedCall(
        warningDelay + volley * volleyInterval,
        () => {
          if (
            generation !== this.combatGeneration ||
            !enemy.alive ||
            !enemy.sprite.active ||
            enemy.bossAbility !== 'spread-barrage' ||
            this.isGameOver ||
            this.isEndingGame
          ) {
            return
          }

          const targetAngle = Phaser.Math.Angle.Between(
            enemy.sprite.x,
            enemy.sprite.y,
            this.player.x,
            this.player.y,
          )
          const sway = (volley - (volleyCount - 1) / 2) * 0.12
          const targetDistance = 600

          this.enemyProjectileSystem.fireSpread({
            owner: enemy,
            targetX:
              enemy.sprite.x +
              Math.cos(targetAngle + sway) * targetDistance,
            targetY:
              enemy.sprite.y +
              Math.sin(targetAngle + sway) * targetDistance,
            speed:
              275 +
              enemy.bossPhase * 18 +
              Math.min(35, enemy.bossEncounterIndex * 3),
            damage: Math.max(
              1,
              Math.round(
                enemy.contactDamage *
                  (enemy.rank === 'boss' ? 0.3 : 0.26),
              ),
            ),
            projectileCount:
              enemy.rank === 'boss'
                ? 5 + enemy.bossPhase * 2
                : 3 + enemy.bossPhase * 2,
            spreadRadians:
              enemy.rank === 'boss' ? 1.22 : 0.96,
            projectileColor: color,
            glowColor: color,
          })

          const flash = this.add
            .circle(enemy.sprite.x, enemy.sprite.y, 18, color, 0.5)
            .setDepth(enemy.sprite.y + 30)

          this.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 220,
            ease: 'Quad.Out',
            onComplete: () => flash.destroy(),
          })
        },
      )
    }

    this.time.delayedCall(
      warningDelay + volleyCount * volleyInterval + 80,
      () => {
        if (
          generation === this.combatGeneration &&
          enemy.alive &&
          enemy.sprite.active
        ) {
          this.bossSystem.finishAbility(enemy)
        }
      },
    )
  }

  private createBossSummonTelegraph(enemy: EnemyUnit) {
    const generation = this.combatGeneration
    const delay = enemy.rank === 'boss' ? 720 : 620
    const color =
      enemy.bossVariant === 'aegis-colossus'
        ? 0x60a5fa
        : enemy.bossVariant === 'brood-queen' ||
            enemy.bossVariant === 'brood-tyrant'
          ? 0xec4899
          : 0xf97316

    const warning = this.add
      .circle(enemy.sprite.x, enemy.sprite.y, 42, color, 0.08)
      .setStrokeStyle(6, color, 0.9)
      .setDepth(enemy.sprite.y + 22)

    const text = this.add
      .text(
        enemy.sprite.x,
        enemy.sprite.y - enemy.labelOffsetY - 28,
        'TRIỆU HỒI',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: enemy.rank === 'boss' ? '18px' : '14px',
          fontStyle: 'bold',
          color: '#f8fafc',
          stroke: '#020617',
          strokeThickness: 5,
          letterSpacing: 1.5,
        },
      )
      .setOrigin(0.5)
      .setDepth(enemy.sprite.y + 35)

    this.tweens.add({
      targets: warning,
      scale: enemy.rank === 'boss' ? 4.4 : 3.4,
      alpha: 0.2,
      duration: delay,
      ease: 'Quad.Out',
    })

    this.tweens.add({
      targets: text,
      y: text.y - 18,
      alpha: 0.35,
      duration: delay,
      ease: 'Quad.Out',
    })

    this.time.delayedCall(delay, () => {
      if (warning.active) {
        warning.destroy()
      }
      if (text.active) {
        text.destroy()
      }

      if (
        generation !== this.combatGeneration ||
        !enemy.alive ||
        !enemy.sprite.active ||
        this.isGameOver ||
        this.isEndingGame
      ) {
        if (enemy.alive) {
          this.bossSystem.finishAbility(enemy)
        }
        return
      }

      const archetypes = this.bossSystem.getSummonArchetypes(
        enemy,
        this.wave,
      )
      const summonCount = this.bossSystem.getSummonCount(enemy)

      for (let index = 0; index < summonCount; index++) {
        const archetypeId =
          archetypes[index % Math.max(1, archetypes.length)] ?? 'mutant'

        this.time.delayedCall(index * 75, () => {
          this.spawnBossMinion(
            enemy,
            archetypeId,
            index,
            summonCount,
            generation,
          )
        })
      }

      this.bossSystem.finishAbility(enemy)
    })
  }

  private spawnBossMinion(
    owner: EnemyUnit,
    archetypeId: EnemyArchetypeId,
    index: number,
    total: number,
    generation: number,
  ) {
    if (
      generation !== this.combatGeneration ||
      !owner.alive ||
      !owner.sprite.active ||
      this.isGameOver ||
      this.isEndingGame
    ) {
      return
    }

    const activeNormalEnemies = this.enemies.filter(
      (enemy) => enemy.alive && enemy.rank === 'normal',
    ).length

    if (
      activeNormalEnemies >=
      this.waveSystem.getNormalEnemyLimit(true)
    ) {
      return
    }

    const angle =
      (Math.PI * 2 * index) / Math.max(1, total) +
      Phaser.Math.FloatBetween(-0.16, 0.16)
    const distance = Phaser.Math.Between(105, 175)
    const candidate = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(
        owner.sprite.x + Math.cos(angle) * distance,
        45,
        this.worldWidth - 45,
      ),
      Phaser.Math.Clamp(
        owner.sprite.y + Math.sin(angle) * distance,
        45,
        this.worldHeight - 45,
      ),
    )

    const nearestCell = this.pathfinding.findNearestWalkableCell(
      this.pathfinding.getNavigationCell(candidate.x, candidate.y),
      candidate,
      8,
    )
    const position = nearestCell
      ? this.pathfinding.getCellCenter(nearestCell)
      : candidate
    const definition = getEnemyArchetypeDefinition(archetypeId)
    const selection: EnemySpawnSelection = {
      rank: 'normal',
      archetypeId,
      role: definition.role,
      eliteTrait: null,
      dangerCost: 0,
    }
    const minion = this.createEnemyUnit(
      position.x,
      position.y,
      'normal',
      selection,
    )

    minion.dangerCost = 0
    minion.sprite.setData('suppressRewards', true)
    minion.sprite.setData('bossSummonedMinion', true)
    this.enemies.push(minion)
    this.createEnemySpawnEffect(
      position.x,
      position.y,
      'normal',
      selection,
    )
    this.updateCombatHud()
  }

  private triggerBossSplit(enemy: EnemyUnit) {
    if (!this.bossSystem.shouldSplitOnDeath(enemy, this.wave)) {
      return false
    }

    this.bossSystem.markSplitTriggered(enemy)
    const splitCount = this.bossSystem.getSplitCount(enemy, this.wave)

    if (splitCount <= 0) {
      return false
    }

    const generation = this.combatGeneration
    const originX = enemy.sprite.x
    const originY = enemy.sprite.y
    const parentRank = enemy.rank
    const parentHealth = enemy.maxHealth
    const parentDamage = enemy.contactDamage
    const parentSpeed = enemy.baseSpeed
    const parentVariant = enemy.bossVariant

    const pulse = this.add
      .circle(originX, originY, 40, 0xec4899, 0.16)
      .setStrokeStyle(8, 0xf9a8d4, 0.95)
      .setDepth(originY + 45)

    this.tweens.add({
      targets: pulse,
      scale: parentRank === 'boss' ? 5.2 : 4,
      alpha: 0,
      duration: 680,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    })

    for (let index = 0; index < splitCount; index++) {
      this.time.delayedCall(150 + index * 110, () => {
        this.spawnBossFragment({
          originX,
          originY,
          index,
          total: splitCount,
          parentRank,
          parentHealth,
          parentDamage,
          parentSpeed,
          parentVariant,
          generation,
        })
      })
    }

    return true
  }

  private spawnBossFragment(params: {
    originX: number
    originY: number
    index: number
    total: number
    parentRank: EnemyRank
    parentHealth: number
    parentDamage: number
    parentSpeed: number
    parentVariant: BossVariant | null
    generation: number
  }) {
    if (
      params.generation !== this.combatGeneration ||
      this.isGameOver ||
      this.isEndingGame
    ) {
      return
    }

    const angle =
      (Math.PI * 2 * params.index) / Math.max(1, params.total)
    const distance = Phaser.Math.Between(85, 145)
    const candidate = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(
        params.originX + Math.cos(angle) * distance,
        55,
        this.worldWidth - 55,
      ),
      Phaser.Math.Clamp(
        params.originY + Math.sin(angle) * distance,
        55,
        this.worldHeight - 55,
      ),
    )
    const nearestCell = this.pathfinding.findNearestWalkableCell(
      this.pathfinding.getNavigationCell(candidate.x, candidate.y),
      candidate,
      10,
    )
    const position = nearestCell
      ? this.pathfinding.getCellCenter(nearestCell)
      : candidate
    const fragment = this.createEnemyUnit(
      position.x,
      position.y,
      'mini-boss',
      null,
    )
    const healthRatio = params.parentRank === 'boss' ? 0.18 : 0.15

    fragment.sprite.setData('isBossFragment', true)
    fragment.sprite.setData('disableBossAbilities', true)
    fragment.sprite.setData('suppressRewards', true)
    fragment.sprite.setData('suppressDeathEffects', true)
    fragment.bossVariant = params.parentVariant
    this.applyEnemyAppearance(fragment)
    fragment.bossSplitTriggered = true
    fragment.maxHealth = Math.max(
      60,
      Math.round(params.parentHealth * healthRatio),
    )
    fragment.health = fragment.maxHealth
    fragment.baseSpeed = Math.min(
      GAME_CONFIG.enemy.maximumSpeed,
      params.parentSpeed * 1.18,
    )
    fragment.speed = fragment.baseSpeed
    fragment.contactDamage = Math.max(
      1,
      Math.round(params.parentDamage * 0.56),
    )
    fragment.scoreValue = 0
    fragment.label.setText(
      `MẢNH VỠ ${params.index + 1}/${params.total}`,
    )
    fragment.sprite.setScale(
      params.parentRank === 'boss' ? 0.72 : 0.62,
    )
    fragment.glow.setScale(0.78)
    fragment.shadow.setScale(0.82)
    fragment.contactRadius *= 0.78
    fragment.projectileHitRadius *= 0.78
    fragment.healthBarWidth *= 0.78
    this.updateEnemyHealthBar(fragment)

    this.enemies.push(fragment)
    this.createEnemySpawnEffect(
      position.x,
      position.y,
      'mini-boss',
      null,
    )
    this.updateCombatHud()
    this.updateBossHud()
  }

  private showBossSplitAnnouncement(enemy: EnemyUnit) {
    const text = this.add
      .text(
        this.scale.width / 2,
        155,
        enemy.rank === 'boss'
          ? 'BOSS ĐÃ PHÂN TÁCH'
          : 'MINI BOSS ĐÃ TÁCH THỂ',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: enemy.rank === 'boss' ? '24px' : '19px',
          fontStyle: 'bold',
          color: '#f9a8d4',
          stroke: '#500724',
          strokeThickness: 6,
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24000)
      .setAlpha(0)

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 138,
      duration: 240,
      ease: 'Back.Out',
    })

    this.time.delayedCall(1150, () => {
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: 118,
        duration: 340,
        onComplete: () => text.destroy(),
      })
    })
  }

  private updateEnemyMovement(
    enemy: EnemyUnit,
  ) {
    if (!enemy.alive) {
      enemy.sprite.setVelocity(0, 0)
      return
    }

    if (
      enemy.bossAbility !== null &&
      enemy.bossAbility !== 'charge' &&
      this.time.now < enemy.bossAbilityActiveUntil
    ) {
      enemy.sprite.setVelocity(0, 0)
      enemy.wasTryingToMove = false
      return
    }

    this.updateEnemyStuckState(enemy)
    enemy.wasTryingToMove = false

    const distance = Phaser.Math.Distance.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      this.player.x,
      this.player.y,
    )

    const directPathIsClear =
      this.pathfinding.isDirectPathClear(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.x,
        this.player.y,
      )

    if (enemy.attackMode === 'suicide') {
      if (this.isBomberArmed(enemy)) {
        enemy.sprite.setVelocity(0, 0)
        enemy.sprite.setRotation(0)
        enemy.wasTryingToMove = false

        if (this.time.now >= this.getBomberDetonateAt(enemy)) {
          this.detonateBomber(enemy)
        }

        return
      }

      if (
        directPathIsClear &&
        distance <= enemy.preferredRange
      ) {
        this.armBomber(enemy)
        return
      }
    }

    const isDistanceKeeper =
      enemy.attackMode === 'single-shot' ||
      enemy.attackMode === 'spread-shot' ||
      enemy.attackMode === 'support'

    if (isDistanceKeeper && directPathIsClear) {
      if (distance < enemy.minimumRange) {
        this.moveRangedEnemyAway(enemy)
        return
      }

      if (distance <= enemy.preferredRange) {
        this.stopEnemyForRangedAttack(enemy)

        if (enemy.attackMode !== 'support') {
          this.tryFireRangedEnemy(enemy)
        }

        return
      }
    }

    const stopDistance = Math.max(
      this.enemyStopDistance,
      enemy.contactRadius - 12,
    )

    if (
      enemy.attackMode === 'melee' &&
      distance <= stopDistance
    ) {
      enemy.sprite.setVelocity(0, 0)
      enemy.sprite.setRotation(0)
      enemy.path = []
      enemy.pathIndex = 0
      enemy.localAvoidanceTarget = null
      enemy.localAvoidanceUntil = 0
      return
    }

    if (directPathIsClear) {
      enemy.path = []
      enemy.pathIndex = 0
      enemy.localAvoidanceTarget = null
      enemy.localAvoidanceUntil = 0

      this.moveEnemyTowards(
        enemy,
        this.player.x,
        this.player.y,
      )

      return
    }

    const targetCell = this.pathfinding.getNavigationCell(
      this.player.x,
      this.player.y,
    )

    const targetCellKey =
      this.pathfinding.getCellKey(targetCell)

    const hasPendingPathRequest =
      this.pendingPathRequests.has(enemy.id)

    const needsNewPath =
      !hasPendingPathRequest &&
      (this.time.now >= enemy.nextPathUpdateAt ||
        targetCellKey !== enemy.lastPathTargetCellKey ||
        enemy.stuckCount >= 2)

    if (needsNewPath) {
      this.requestEnemyPath(
        enemy,
        targetCellKey,
      )
    }

    const waypoint =
      this.getCurrentEnemyWaypoint(enemy)

    if (waypoint) {
      this.moveEnemyTowards(
        enemy,
        waypoint.x,
        waypoint.y,
      )
      return
    }

    this.moveEnemyWithLocalAvoidance(enemy)
  }

  private stopEnemyForRangedAttack(enemy: EnemyUnit) {
    enemy.sprite.setVelocity(0, 0)
    enemy.sprite.setRotation(0)
    enemy.path = []
    enemy.pathIndex = 0
    enemy.localAvoidanceTarget = null
    enemy.localAvoidanceUntil = 0

    const directionX = this.player.x - enemy.sprite.x

    if (directionX < -0.05) {
      enemy.sprite.setFlipX(true)
    } else if (directionX > 0.05) {
      enemy.sprite.setFlipX(false)
    }
  }

  private tryFireRangedEnemy(enemy: EnemyUnit) {
    if (
      this.time.now < enemy.nextRangedAttackAt ||
      enemy.rangedProjectileDamage <= 0 ||
      enemy.rangedProjectileSpeed <= 0
    ) {
      return
    }

    let firedCount = 0

    if (enemy.attackMode === 'spread-shot') {
      const projectileCount = enemy.isElite
        ? 7
        : this.wave >= 25
          ? 7
          : 5

      firedCount = this.enemyProjectileSystem.fireSpread({
        owner: enemy,
        targetX: this.player.x,
        targetY: this.player.y,
        speed: enemy.rangedProjectileSpeed,
        damage: enemy.rangedProjectileDamage,
        projectileCount,
        spreadRadians: this.wave >= 25 ? 1.05 : 0.82,
        projectileColor: 0xc084fc,
        glowColor: 0x9333ea,
      })
    } else {
      const fired = this.enemyProjectileSystem.fire({
        owner: enemy,
        targetX: this.player.x,
        targetY: this.player.y,
        speed: enemy.rangedProjectileSpeed,
        damage: enemy.rangedProjectileDamage,
        projectileColor: 0xfb7185,
        glowColor: 0xf43f5e,
      })

      firedCount = fired ? 1 : 0
    }

    if (firedCount <= 0) {
      enemy.nextRangedAttackAt = this.time.now + 180
      return
    }

    const eliteSpeedBonus = enemy.isElite ? 0.88 : 1

    enemy.nextRangedAttackAt =
      this.time.now +
      Math.round(
        (enemy.rangedAttackCooldown * eliteSpeedBonus +
          (enemy.id % 3) * 85) *
          ENEMY_FIRE_INTERVAL_MULTIPLIER,
      )

    const isSpreadShot = enemy.attackMode === 'spread-shot'
    const pulseColor = isSpreadShot ? 0xc084fc : 0x22d3ee
    const pulseBorder = isSpreadShot ? 0xd8b4fe : 0x67e8f9

    const pulse = this.add
      .circle(
        enemy.sprite.x,
        enemy.sprite.y,
        isSpreadShot ? 20 : 15,
        pulseColor,
        0,
      )
      .setStrokeStyle(3, pulseBorder, 0.75)
      .setDepth(enemy.sprite.y + 4)

    this.tweens.add({
      targets: pulse,
      scale: isSpreadShot ? 3 : 2.4,
      alpha: 0,
      duration: isSpreadShot ? 280 : 210,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    })
  }

  private isBomberArmed(enemy: EnemyUnit) {
    return enemy.sprite.getData('suicideArmed') === true
  }

  private getBomberDetonateAt(enemy: EnemyUnit) {
    const value = enemy.sprite.getData('suicideDetonateAt')
    return typeof value === 'number' ? value : 0
  }

  private armBomber(enemy: EnemyUnit) {
    if (!enemy.alive || this.isBomberArmed(enemy)) {
      return
    }

    enemy.sprite.setVelocity(0, 0)
    enemy.sprite.setRotation(0)
    enemy.path = []
    enemy.pathIndex = 0
    enemy.localAvoidanceTarget = null
    enemy.localAvoidanceUntil = 0
    enemy.wasTryingToMove = false

    const fuseDuration = Math.max(500, enemy.rangedAttackCooldown)
    const detonateAt = this.time.now + fuseDuration
    const explosionRadius = 145

    enemy.sprite.setData('suicideArmed', true)
    enemy.sprite.setData('suicideDetonateAt', detonateAt)

    const warning = this.add
      .circle(
        enemy.sprite.x,
        enemy.sprite.y,
        explosionRadius,
        0xfacc15,
        0.08,
      )
      .setStrokeStyle(5, 0xfde047, 0.82)
      .setDepth(enemy.sprite.y - 4)
      .setScale(0.18)

    enemy.sprite.setData('suicideWarning', warning)

    this.tweens.add({
      targets: warning,
      scale: 1,
      alpha: 0.2,
      duration: fuseDuration,
      ease: 'Quad.In',
    })

    this.tweens.add({
      targets: enemy.glow,
      alpha: 0.42,
      duration: 120,
      yoyo: true,
      repeat: Math.max(2, Math.floor(fuseDuration / 240)),
    })
  }

  private detonateBomber(enemy: EnemyUnit) {
    if (!enemy.alive || !this.isBomberArmed(enemy)) {
      return
    }

    const originX = enemy.sprite.x
    const originY = enemy.sprite.y
    const explosionRadius = 145
    const distanceToPlayer = Phaser.Math.Distance.Between(
      originX,
      originY,
      this.player.x,
      this.player.y,
    )

    this.cancelBomberWarning(enemy)

    const blast = this.add
      .circle(originX, originY, 28, 0xfacc15, 0.32)
      .setStrokeStyle(8, 0xfef08a, 0.95)
      .setDepth(originY + 50)

    this.tweens.add({
      targets: blast,
      scale: explosionRadius / 28,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => blast.destroy(),
    })

    this.shakeCamera(220, 0.007)

    if (distanceToPlayer <= explosionRadius) {
      const distanceRatio = Phaser.Math.Clamp(
        1 - distanceToPlayer / explosionRadius,
        0,
        1,
      )
      const explosionDamage = Math.max(
        1,
        Math.round(
          enemy.rangedProjectileDamage * (0.62 + distanceRatio * 0.38),
        ),
      )

      this.nextDamageAt = Math.max(
        this.nextDamageAt,
        this.time.now + 350,
      )
      this.applyDamage(explosionDamage, enemy)
    }

    this.killEnemy(enemy)
  }

  private cancelBomberWarning(enemy: EnemyUnit) {
    const warning = enemy.sprite.getData('suicideWarning') as
      | Phaser.GameObjects.Arc
      | null
      | undefined

    if (warning?.active) {
      this.tweens.killTweensOf(warning)
      warning.destroy()
    }

    enemy.sprite.setData('suicideWarning', null)
    enemy.sprite.setData('suicideArmed', false)
    enemy.sprite.setData('suicideDetonateAt', 0)
  }

  private moveRangedEnemyAway(enemy: EnemyUnit) {
    const baseDirection = new Phaser.Math.Vector2(
      enemy.sprite.x - this.player.x,
      enemy.sprite.y - this.player.y,
    )

    if (baseDirection.lengthSq() < 1) {
      baseDirection.set(1, 0)
    }

    baseDirection.normalize()

    const baseAngle = baseDirection.angle()
    const angleOffsets = [
      0,
      Math.PI / 4,
      -Math.PI / 4,
      Math.PI / 2,
      -Math.PI / 2,
    ]

    let bestTarget: Phaser.Math.Vector2 | null = null
    let bestDistanceFromPlayer = -1

    for (const offset of angleOffsets) {
      const angle = baseAngle + offset
      const target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(
          enemy.sprite.x + Math.cos(angle) * 155,
          30,
          this.worldWidth - 30,
        ),
        Phaser.Math.Clamp(
          enemy.sprite.y + Math.sin(angle) * 155,
          30,
          this.worldHeight - 30,
        ),
      )

      if (
        !this.pathfinding.isDirectPathClear(
          enemy.sprite.x,
          enemy.sprite.y,
          target.x,
          target.y,
        )
      ) {
        continue
      }

      const distanceFromPlayer =
        Phaser.Math.Distance.Between(
          target.x,
          target.y,
          this.player.x,
          this.player.y,
        )

      if (distanceFromPlayer > bestDistanceFromPlayer) {
        bestDistanceFromPlayer = distanceFromPlayer
        bestTarget = target
      }
    }

    if (bestTarget) {
      this.moveEnemyTowards(
        enemy,
        bestTarget.x,
        bestTarget.y,
      )
      return
    }

    this.moveEnemyWithLocalAvoidance(enemy)
  }

  private requestEnemyPath(
    enemy: EnemyUnit,
    targetCellKey: string,
  ) {
    if (!enemy.alive || !enemy.sprite.active) {
      return
    }

    this.pendingPathRequests.set(enemy.id, targetCellKey)

    // Không để quái đang chờ A* yêu cầu lại ở mọi frame.
    enemy.nextPathUpdateAt = Math.max(
      enemy.nextPathUpdateAt,
      this.time.now + 160,
    )
  }

  private processPendingPathRequests() {
    if (
      this.pendingPathRequests.size === 0 ||
      this.maxPathSearchesPerFrame <= 0
    ) {
      return
    }

    const candidates = this.enemies
      .filter(
        (enemy) =>
          enemy.alive &&
          enemy.sprite.active &&
          this.pendingPathRequests.has(enemy.id),
      )
      .sort((left, right) => {
        const leftSpecial = left.rank === 'normal' ? 0 : 1
        const rightSpecial = right.rank === 'normal' ? 0 : 1

        if (leftSpecial !== rightSpecial) {
          return rightSpecial - leftSpecial
        }

        if (left.stuckCount !== right.stuckCount) {
          return right.stuckCount - left.stuckCount
        }

        return left.nextPathUpdateAt - right.nextPathUpdateAt
      })

    for (const enemy of candidates) {
      if (this.pathSearchesThisFrame >= this.maxPathSearchesPerFrame) {
        break
      }

      const targetCellKey = this.pendingPathRequests.get(enemy.id)
      this.pendingPathRequests.delete(enemy.id)

      if (!targetCellKey) {
        continue
      }

      this.performEnemyPathSearch(enemy, targetCellKey)
      this.pathSearchesThisFrame++
    }

    for (const enemyId of this.pendingPathRequests.keys()) {
      const stillExists = this.enemies.some(
        (enemy) => enemy.id === enemyId && enemy.alive,
      )

      if (!stillExists) {
        this.pendingPathRequests.delete(enemyId)
      }
    }
  }

  private performEnemyPathSearch(
    enemy: EnemyUnit,
    targetCellKey: string,
  ) {
    enemy.path = this.pathfinding.findPath(
      new Phaser.Math.Vector2(
        enemy.sprite.x,
        enemy.sprite.y,
      ),
      new Phaser.Math.Vector2(
        this.player.x,
        this.player.y,
      ),
    )

    enemy.pathIndex = 0
    enemy.lastPathTargetCellKey = targetCellKey

    const rankDelay = enemy.rank === 'normal' ? 0 : -180

    enemy.nextPathUpdateAt =
      this.time.now +
      Math.max(360, this.pathRefreshInterval + rankDelay) +
      (enemy.id % 7) * 55

    if (enemy.path.length > 0) {
      enemy.stuckCount = Math.max(
        0,
        enemy.stuckCount - 1,
      )
      enemy.localAvoidanceTarget = null
      enemy.localAvoidanceUntil = 0
      return
    }

    // Khi A* chạm giới hạn hoặc không tìm thấy đường, quái vẫn thử né
    // cục bộ thay vì đứng im và gửi lại yêu cầu liên tục.
    enemy.localAvoidanceUntil = 0
    enemy.nextPathUpdateAt = Math.max(
      enemy.nextPathUpdateAt,
      this.time.now + 420,
    )
  }

  private getCurrentEnemyWaypoint(
    enemy: EnemyUnit,
  ) {
    while (enemy.pathIndex < enemy.path.length) {
      const waypoint = enemy.path[enemy.pathIndex]

      const distance =
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          waypoint.x,
          waypoint.y,
        )

      if (distance > this.waypointReachDistance) {
        return waypoint
      }

      enemy.pathIndex++
    }

    return null
  }

  private moveEnemyTowards(
    enemy: EnemyUnit,
    targetX: number,
    targetY: number,
  ) {
    const direction = new Phaser.Math.Vector2(
      targetX - enemy.sprite.x,
      targetY - enemy.sprite.y,
    )

    if (direction.lengthSq() < 1) {
      enemy.sprite.setVelocity(0, 0)
      return
    }

    direction.normalize()
    this.applyEnemySeparation(enemy, direction)

    const movementSpeed =
      enemy.speed *
      this.bossSystem.getSpeedMultiplier(enemy, this.time.now) *
      this.skillSystem.getEnemySpeedMultiplier(
        enemy,
        this.time.now,
      )

    enemy.sprite.setVelocity(
      direction.x * movementSpeed,
      direction.y * movementSpeed,
    )

    enemy.wasTryingToMove = true

    if (direction.x < -0.05) {
      enemy.sprite.setFlipX(true)
    } else if (direction.x > 0.05) {
      enemy.sprite.setFlipX(false)
    }

    enemy.sprite.setRotation(
      Phaser.Math.Clamp(
        -direction.x * 0.04,
        -0.04,
        0.04,
      ),
    )
  }

  private applyEnemySeparation(
    enemy: EnemyUnit,
    direction: Phaser.Math.Vector2,
  ) {
    // Boss và mini boss phải xuyên qua đàn tay sai thay vì bị lực tách
    // của nhiều quái nhỏ triệt tiêu hướng di chuyển.
    if (enemy.rank !== 'normal') {
      return
    }

    const separation = new Phaser.Math.Vector2()
    const centerCol = Math.floor(
      enemy.sprite.x / this.separationBucketSize,
    )
    const centerRow = Math.floor(
      enemy.sprite.y / this.separationBucketSize,
    )
    const maximumDistanceSquared =
      this.enemySeparationDistance * this.enemySeparationDistance

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const bucket = this.enemySpatialBuckets.get(
          `${centerCol + colOffset},${centerRow + rowOffset}`,
        )

        if (!bucket) {
          continue
        }

        for (const other of bucket) {
          if (other.id === enemy.id || !other.alive) {
            continue
          }

          const deltaX = enemy.sprite.x - other.sprite.x
          const deltaY = enemy.sprite.y - other.sprite.y
          const distanceSquared = deltaX * deltaX + deltaY * deltaY

          if (
            distanceSquared <= 0.01 ||
            distanceSquared > maximumDistanceSquared
          ) {
            continue
          }

          const distance = Math.sqrt(distanceSquared)
          const strength = 1 - distance / this.enemySeparationDistance

          separation.x += (deltaX / distance) * strength
          separation.y += (deltaY / distance) * strength
        }
      }
    }

    if (separation.lengthSq() > 0) {
      separation.normalize().scale(0.62)
      direction.add(separation).normalize()
    }
  }

  private moveEnemyWithLocalAvoidance(
    enemy: EnemyUnit,
  ) {
    if (
      enemy.localAvoidanceTarget &&
      this.time.now < enemy.localAvoidanceUntil
    ) {
      const distanceToTarget =
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          enemy.localAvoidanceTarget.x,
          enemy.localAvoidanceTarget.y,
        )

      if (
        distanceToTarget >
          this.waypointReachDistance &&
        this.pathfinding.isDirectPathClear(
          enemy.sprite.x,
          enemy.sprite.y,
          enemy.localAvoidanceTarget.x,
          enemy.localAvoidanceTarget.y,
        )
      ) {
        this.moveEnemyTowards(
          enemy,
          enemy.localAvoidanceTarget.x,
          enemy.localAvoidanceTarget.y,
        )
        return
      }
    }

    enemy.localAvoidanceTarget = null

    const baseAngle = Phaser.Math.Angle.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      this.player.x,
      this.player.y,
    )

    const preferredSign =
      enemy.localAvoidanceDirection

    const angleOffsets = [
      preferredSign * (Math.PI / 3),
      preferredSign * (Math.PI / 2),
      preferredSign * ((Math.PI * 2) / 3),
      -preferredSign * (Math.PI / 3),
      -preferredSign * (Math.PI / 2),
      -preferredSign * ((Math.PI * 2) / 3),
      Math.PI,
    ]

    let bestTarget: Phaser.Math.Vector2 | null =
      null
    let bestScore = Number.POSITIVE_INFINITY

    for (const offset of angleOffsets) {
      const angle = baseAngle + offset

      const target = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(
          enemy.sprite.x +
            Math.cos(angle) *
              this.localAvoidanceDistance,
          30,
          this.worldWidth - 30,
        ),
        Phaser.Math.Clamp(
          enemy.sprite.y +
            Math.sin(angle) *
              this.localAvoidanceDistance,
          30,
          this.worldHeight - 30,
        ),
      )

      if (
        !this.pathfinding.isDirectPathClear(
          enemy.sprite.x,
          enemy.sprite.y,
          target.x,
          target.y,
        )
      ) {
        continue
      }

      const deltaToPlayerX =
        target.x - this.player.x
      const deltaToPlayerY =
        target.y - this.player.y
      const score =
        deltaToPlayerX * deltaToPlayerX +
        deltaToPlayerY * deltaToPlayerY

      if (score < bestScore) {
        bestScore = score
        bestTarget = target
      }
    }

    if (bestTarget) {
      enemy.localAvoidanceTarget = bestTarget
      enemy.localAvoidanceUntil =
        this.time.now +
        this.localAvoidanceDuration

      this.moveEnemyTowards(
        enemy,
        bestTarget.x,
        bestTarget.y,
      )
      return
    }

    enemy.sprite.setVelocity(0, 0)
    enemy.nextPathUpdateAt = 0
  }

  private updateEnemyStuckState(
    enemy: EnemyUnit,
  ) {
    if (
      this.time.now - enemy.lastProgressCheckAt <
      this.stuckCheckInterval
    ) {
      return
    }

    const movedDistance =
      Phaser.Math.Distance.Between(
        enemy.lastProgressPosition.x,
        enemy.lastProgressPosition.y,
        enemy.sprite.x,
        enemy.sprite.y,
      )

    const appearsStuck =
      enemy.wasTryingToMove &&
      movedDistance < this.stuckDistanceThreshold

    if (appearsStuck) {
      enemy.stuckCount++
      enemy.path = []
      enemy.pathIndex = 0
      enemy.nextPathUpdateAt = 0
      enemy.localAvoidanceUntil = 0
      this.pendingPathRequests.delete(enemy.id)

      if (enemy.stuckCount % 2 === 0) {
        enemy.localAvoidanceDirection *= -1
      }

      if (
        enemy.rank !== 'normal' &&
        enemy.stuckCount >= this.specialEnemyRescueThreshold
      ) {
        this.rescueStuckSpecialEnemy(enemy)
      }
    } else {
      enemy.stuckCount = Math.max(
        0,
        enemy.stuckCount - 1,
      )
    }

    enemy.lastProgressPosition.set(
      enemy.sprite.x,
      enemy.sprite.y,
    )
    enemy.lastProgressCheckAt = this.time.now
  }

  private rescueStuckSpecialEnemy(enemy: EnemyUnit) {
    const baseAngle = Phaser.Math.Angle.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      this.player.x,
      this.player.y,
    )

    const offsets = [
      Math.PI / 2,
      -Math.PI / 2,
      Math.PI / 3,
      -Math.PI / 3,
      Math.PI,
      0,
    ]

    for (const distance of [120, 180, 240]) {
      for (const offset of offsets) {
        const targetX = Phaser.Math.Clamp(
          enemy.sprite.x + Math.cos(baseAngle + offset) * distance,
          40,
          this.worldWidth - 40,
        )
        const targetY = Phaser.Math.Clamp(
          enemy.sprite.y + Math.sin(baseAngle + offset) * distance,
          40,
          this.worldHeight - 40,
        )

        if (!this.pathfinding.isNavigationPointWalkable(targetX, targetY)) {
          continue
        }

        if (
          !this.pathfinding.isDirectPathClear(
            enemy.sprite.x,
            enemy.sprite.y,
            targetX,
            targetY,
          )
        ) {
          continue
        }

        enemy.localAvoidanceTarget = new Phaser.Math.Vector2(
          targetX,
          targetY,
        )
        enemy.localAvoidanceUntil = this.time.now + 1100
        enemy.nextPathUpdateAt = this.time.now + 500
        enemy.stuckCount = Math.max(1, this.specialEnemyRescueThreshold - 2)
        return
      }
    }

    // Cứu hộ cuối cùng: đưa boss về tâm ô đi được gần nhất.
    // Chỉ xảy ra sau nhiều lần xác nhận không di chuyển được.
    const currentPosition = new Phaser.Math.Vector2(
      enemy.sprite.x,
      enemy.sprite.y,
    )
    const nearestCell = this.pathfinding.findNearestWalkableCell(
      this.pathfinding.getNavigationCell(
        enemy.sprite.x,
        enemy.sprite.y,
      ),
      currentPosition,
      5,
    )

    if (nearestCell) {
      const center = this.pathfinding.getCellCenter(nearestCell)
      const rescueDistance = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        center.x,
        center.y,
      )

      if (rescueDistance <= 220) {
        enemy.sprite.setPosition(center.x, center.y)
        enemy.lastProgressPosition.set(center.x, center.y)
      }
    }

    enemy.stuckCount = 1
    enemy.nextPathUpdateAt = this.time.now + 450
  }

  private updateAutoAttack() {
    if (this.time.now < this.nextAttackAt) {
      return
    }

    const target = this.findNearestVisibleEnemy()

    if (!target) {
      return
    }

    this.nextAttackAt =
      this.time.now +
      this.playerStats.attackInterval *
        this.activeAbilityCombatSystem.getAttackIntervalMultiplier(this.time.now)

    this.fireProjectile(target)
  }

  private findNearestVisibleEnemy() {
    let nearest: EnemyUnit | null = null
    let nearestDistance: number = this.playerStats.attackRange

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue
      }

      const distance =
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          enemy.sprite.x,
          enemy.sprite.y,
        )

      if (distance >= nearestDistance) {
        continue
      }

      if (
        !this.pathfinding.isDirectPathClear(
          this.player.x,
          this.player.y,
          enemy.sprite.x,
          enemy.sprite.y,
        )
      ) {
        continue
      }

      nearest = enemy
      nearestDistance = distance
    }

    return nearest
  }

  private fireProjectile(
    target: EnemyUnit,
  ) {
    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      target.sprite.x,
      target.sprite.y,
    )

    const shotAngles = this.skillSystem.getBasicShotAngles(baseAngle)
    const damageMultiplier =
      this.skillSystem.getBasicShotDamageMultiplier()

    this.audioSystem.playShot(shotAngles.length)
    this.playerSkinVisualSystem.playAttack(baseAngle)

    for (const angle of shotAngles) {
      this.spawnPlayerProjectile(angle, damageMultiplier)
    }

    const muzzleFlash = this.add
      .circle(
        this.player.x + Math.cos(baseAngle) * 32,
        this.player.y + Math.sin(baseAngle) * 22,
        10 + Math.min(5, shotAngles.length),
        shotAngles.length > 1 ? 0xfacc15 : 0x67e8f9,
        0.72,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.player.y + 7)

    this.tweens.add({
      targets: muzzleFlash,
      alpha: 0,
      scale: 2.2,
      duration: 130,
      ease: 'Quad.Out',
      onComplete: () => {
        muzzleFlash.destroy()
      },
    })
  }

  private spawnPlayerProjectile(
    angle: number,
    damageMultiplier: number,
    forceNonCritical = false,
  ) {
    const directionX = Math.cos(angle)
    const directionY = Math.sin(angle)
    const spawnX = this.player.x + directionX * 32
    const spawnY = this.player.y + directionY * 22

    const glow = this.add
      .ellipse(
        spawnX,
        spawnY,
        34,
        24,
        damageMultiplier < 1 ? 0xfacc15 : 0x22d3ee,
        damageMultiplier < 1 ? 0.24 : 0.2,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.player.y + 6)

    const projectile = this.physics.add
      .image(
        spawnX,
        spawnY,
        'player-projectile',
      )
      .setCircle(5, 3, 3)
      .setDepth(this.player.y + 8)
      .setRotation(angle)

    projectile.setVelocity(
      directionX * this.playerStats.projectileSpeed,
      directionY * this.playerStats.projectileSpeed,
    )

    const critical =
      !forceNonCritical &&
      this.rng.realInRange(0, 1) < this.playerStats.criticalChance

    const projectileDamage = Math.max(
      1,
      Math.round(
        this.playerStats.attackDamage *
          this.activeAbilityCombatSystem.getDamageMultiplier(this.time.now) *
          damageMultiplier *
          (critical ? this.playerStats.criticalMultiplier : 1),
      ),
    )

    if (critical) {
      projectile.setTint(0xfacc15)
      glow.setFillStyle(0xfbbf24, 0.3)
    } else if (damageMultiplier < 1) {
      projectile.setTint(0xfde047)
    }

    this.playerSkinVisualSystem.decorateProjectile(
      projectile,
      glow,
      critical,
      damageMultiplier < 1,
    )

    this.projectiles.push({
      gameObject: projectile,
      glow,
      bornAt: this.time.now,
      damage: projectileDamage,
      critical,
    })
  }

  private updateProjectiles() {
    for (
      let index = this.projectiles.length - 1;
      index >= 0;
      index--
    ) {
      const state = this.projectiles[index]
      const projectile = state.gameObject

      if (!projectile.active) {
        this.projectiles.splice(index, 1)
        state.glow.destroy()
        continue
      }

      state.glow
        .setPosition(projectile.x, projectile.y)
        .setDepth(projectile.y - 1)

      projectile.setDepth(projectile.y)
      this.playerSkinVisualSystem.updateProjectile(
        projectile,
        state.glow,
        this.time.now,
      )

      const expired =
        this.time.now - state.bornAt >
        this.projectileLifetime

      const outsideWorld =
        projectile.x < 0 ||
        projectile.x > this.worldWidth ||
        projectile.y < 0 ||
        projectile.y > this.worldHeight

      if (expired || outsideWorld) {
        this.destroyProjectile(index)
        continue
      }

      if (
        this.isProjectileBlocked(
          projectile.x,
          projectile.y,
        )
      ) {
        this.createProjectileImpact(
          projectile.x,
          projectile.y,
          0x67e8f9,
        )
        this.playerSkinVisualSystem.createProjectileImpact(
          projectile.x,
          projectile.y,
          state.critical,
        )
        this.destroyProjectile(index)
        continue
      }

      let hitEnemy: EnemyUnit | null = null
      let nearestHitDistance = Number.POSITIVE_INFINITY

      for (const enemy of this.enemies) {
        if (!enemy.alive) {
          continue
        }

        const hitDistance =
          Phaser.Math.Distance.Between(
            projectile.x,
            projectile.y,
            enemy.sprite.x,
            enemy.sprite.y,
          )

        if (
          hitDistance <= enemy.projectileHitRadius &&
          hitDistance < nearestHitDistance
        ) {
          hitEnemy = enemy
          nearestHitDistance = hitDistance
        }
      }

      if (hitEnemy) {
        this.damageEnemy(
          hitEnemy,
          state.damage,
          state.critical,
        )
        this.playerSkinVisualSystem.createProjectileImpact(
          projectile.x,
          projectile.y,
          state.critical,
        )
        this.destroyProjectile(index)
      }
    }
  }

  private isProjectileBlocked(
    x: number,
    y: number,
  ) {
    return this.pathfinding.isCollisionPointBlocked(x, y, 5)
  }

  private destroyProjectile(
    index: number,
  ) {
    const state = this.projectiles[index]

    if (!state) {
      return
    }

    state.gameObject.destroy()
    state.glow.destroy()
    this.projectiles.splice(index, 1)
  }

  private stopAllProjectiles() {
    for (const state of this.projectiles) {
      if (state.gameObject.active) {
        state.gameObject.setVelocity(0, 0)
      }
    }
  }

  private clearAllProjectiles() {
    for (const state of this.projectiles) {
      state.gameObject.destroy()
      state.glow.destroy()
    }

    this.projectiles = []
  }

  private damageEnemy(
    enemy: EnemyUnit,
    amount: number,
    critical = false,
  ) {
    if (!enemy.alive) {
      return
    }

    const damageResult = this.supportEnemySystem.absorbDamage(
      enemy,
      amount,
    )
    const healthDamage = damageResult.healthDamage

    if (healthDamage <= 0) {
      this.updateEnemyHealthBar(enemy)
      this.updateBossHud()
      return
    }

    enemy.health = Math.max(0, enemy.health - healthDamage)

    enemy.sprite
      .setTint(0xffffff)
      .setTintMode(Phaser.TintModes.FILL)

    this.time.delayedCall(85, () => {
      if (enemy.alive && enemy.sprite.active) {
        const baseTint = enemy.sprite.getData('baseTint') as
          | number
          | undefined

        enemy.sprite.clearTint()

        if (baseTint !== undefined && baseTint !== 0xffffff) {
          enemy.sprite.setTint(baseTint)
        }
      }
    })

    this.createProjectileImpact(
      enemy.sprite.x,
      enemy.sprite.y,
      enemy.rank === 'boss'
        ? 0xfbbf24
        : enemy.rank === 'mini-boss'
          ? 0xe879f9
          : enemy.isElite
            ? 0xfacc15
            : enemy.archetypeId === 'crawler'
              ? 0xec4899
              : enemy.archetypeId === 'brute'
                ? 0xf97316
                : enemy.archetypeId === 'shooter'
                  ? 0x22d3ee
                  : enemy.archetypeId === 'bomber'
                    ? 0xfacc15
                    : enemy.archetypeId === 'scatterer'
                      ? 0xc084fc
                      : enemy.archetypeId === 'healer'
                        ? 0x4ade80
                        : enemy.archetypeId === 'shielder'
                          ? 0x60a5fa
                          : enemy.archetypeId === 'death-buffer'
                            ? 0xfb923c
                            : enemy.archetypeId === 'brood-mother'
                              ? 0xec4899
                              : enemy.archetypeId === 'toxic'
                                ? 0x22c55e
                                : enemy.archetypeId === 'flame'
                                  ? 0xf97316
                                  : 0xf87171,
    )

    this.createEnemyDamageNumber(enemy, healthDamage, critical)
    this.updateEnemyHealthBar(enemy)
    this.updateBossHud()

    if (enemy.health <= 0) {
      this.killEnemy(enemy)
    }
  }

  private createEnemyDamageNumber(
    enemy: EnemyUnit,
    amount: number,
    critical: boolean,
  ) {
    const isSpecial = enemy.rank !== 'normal'

    const damageText = this.add
      .text(
        enemy.sprite.x,
        enemy.sprite.y - enemy.healthBarOffsetY - 10,
        critical ? `CHÍ MẠNG  -${amount}` : `-${amount}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: critical ? '22px' : isSpecial ? '20px' : '17px',
          fontStyle: 'bold',
          color: critical
            ? '#facc15'
            : enemy.rank === 'boss'
              ? '#fef3c7'
              : '#fde68a',
          stroke: enemy.rank === 'mini-boss' ? '#701a75' : '#7f1d1d',
          strokeThickness: isSpecial ? 4 : 3,
        },
      )
      .setOrigin(0.5)
      .setDepth(enemy.sprite.y + 20)

    this.tweens.add({
      targets: damageText,
      y: damageText.y - 34,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => {
        damageText.destroy()
      },
    })
  }

  private createProjectileImpact(
    x: number,
    y: number,
    color: number,
  ) {
    for (let index = 0; index < 7; index++) {
      const angle =
        Phaser.Math.FloatBetween(
          0,
          Math.PI * 2,
        )

      const distance =
        Phaser.Math.Between(12, 30)

      const spark = this.add
        .circle(
          x,
          y,
          Phaser.Math.Between(2, 4),
          color,
          0.9,
        )
        .setDepth(y + 20)

      this.tweens.add({
        targets: spark,
        x:
          x +
          Math.cos(angle) * distance,
        y:
          y +
          Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 220,
        ease: 'Quad.Out',
        onComplete: () => {
          spark.destroy()
        },
      })
    }
  }

  private showEnemyScoreGain(
    x: number,
    y: number,
    label: string,
    points: number,
  ) {
    const text = this.add
      .text(x, y - 74, `${label}  +${points}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fbbf24',
        stroke: '#422006',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(y + 80)

    this.tweens.add({
      targets: text,
      y: text.y - 34,
      alpha: 0,
      duration: 720,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
  }

  private killEnemy(enemy: EnemyUnit) {
    if (!enemy.alive) {
      return
    }

    const suppressRewards =
      enemy.sprite.getData('suppressRewards') === true

    this.cancelBomberWarning(enemy)
    this.supportEnemySystem.clearEnemy(enemy)
    this.pendingPathRequests.delete(enemy.id)
    enemy.alive = false
    enemy.health = 0

    const didSplit = this.triggerBossSplit(enemy)

    this.enemyDeathEffectSystem.handleEnemyDeath(
      enemy,
      this.enemies,
      this.wave,
      (x, y, index, total) =>
        this.spawnBroodChild(x, y, index, total),
    )

    if (!suppressRewards) {
      this.audioSystem.playEnemyKill(enemy.rank !== 'normal')
      this.kills++

      const scoreAward = this.scoreSystem.awardEnemy(
        enemy,
        this.wave,
      )
      this.score = scoreAward.total
      this.runStatsSystem.recordEnemyKill(enemy)
      this.runStatsSystem.recordScore('enemy', scoreAward.points)

      if (enemy.rank !== 'normal' || enemy.isElite) {
        this.showEnemyScoreGain(
          enemy.sprite.x,
          enemy.sprite.y,
          scoreAward.label,
          scoreAward.points,
        )
      }

      this.experienceOrbSystem.spawnDrops(
        enemy.sprite.x,
        enemy.sprite.y,
        enemy.rank,
        this.wave,
      )
      this.pickupSystem.trySpawnDrop(
        enemy.sprite.x,
        enemy.sprite.y,
        enemy.rank,
      )
      this.chestSystem.trySpawnDrop(
        enemy.sprite.x,
        enemy.sprite.y,
        enemy.rank,
      )
    }

    this.createEnemyDeathBurst(enemy)

    if (
      enemy.rank !== 'normal' &&
      enemy.sprite.getData('isBossFragment') !== true
    ) {
      if (didSplit) {
        this.showBossSplitAnnouncement(enemy)
      } else {
        this.showSpecialEnemyDefeated(enemy)
      }
    }

    enemy.collider.destroy()
    enemy.sprite.destroy()
    enemy.shadow.destroy()
    enemy.glow.destroy()
    enemy.label.destroy()
    enemy.healthBarBackground.destroy()
    enemy.healthBar.destroy()

    this.enemies = this.enemies.filter(
      (candidate) => candidate.id !== enemy.id,
    )

    this.updateCombatHud()
    this.updateBossHud()
    this.waveSystem.expediteNextSpawn(
      this.time.now,
      enemy.rank === 'normal' ? 280 : 650,
    )
  }

  private applyPickup(
    kind: PickupKind,
    x: number,
    y: number,
  ) {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    this.runStatsSystem.recordPickup(kind)
    this.audioSystem.playPickup()

    if (kind === 'health') {
      const healAmount = Math.max(
        1,
        Math.round(this.playerStats.maximumHealth * 0.2),
      )
      const previousHealth = this.playerHealth
      this.playerHealth = Math.min(
        this.playerStats.maximumHealth,
        this.playerHealth + healAmount,
      )
      const restored = Math.max(0, this.playerHealth - previousHealth)
      this.updateHealthBar()
      this.showPickupResult(
        restored > 0 ? `HỒI ${restored} MÁU` : 'MÁU ĐÃ ĐẦY',
        0x4ade80,
      )
      return
    }

    if (kind === 'bomb') {
      const damage = Math.max(
        60,
        Math.round(this.playerStats.attackDamage * 4.5),
      )
      const radius = PICKUP_SETTINGS.bombRadius
      let hitCount = 0

      for (const enemy of [...this.enemies]) {
        if (!enemy.alive || !enemy.sprite.active) {
          continue
        }

        const distance = Phaser.Math.Distance.Between(
          x,
          y,
          enemy.sprite.x,
          enemy.sprite.y,
        )

        if (distance > radius) {
          continue
        }

        hitCount++
        this.damageEnemy(enemy, damage, false)
      }

      this.createPickupBombEffect(x, y, radius)
      this.showPickupResult(
        `BOM XUNG KÍCH • ${hitCount} MỤC TIÊU`,
        0xfbbf24,
      )
      return
    }

    this.experienceOrbSystem.activateMagnet(
      this.time.now,
      PICKUP_SETTINGS.magnetDuration,
    )
    this.showPickupResult('NAM CHÂM XP ĐÃ KÍCH HOẠT', 0x67e8f9)
  }

  private applyChestRewards(
    rewardCount: number,
    x: number,
    y: number,
  ) {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    this.audioSystem.playPickup()

    const rewardTitles: string[] = []
    const excludedIds = new Set<UpgradeId>()

    for (let index = 0; index < rewardCount; index++) {
      const context = this.skillSystem.getUpgradeContext()
      let id = this.upgradeSystem.getChestRewardId(
        this.rng,
        context,
        excludedIds,
      )

      if (!id && excludedIds.size > 0) {
        id = this.upgradeSystem.getChestRewardId(
          this.rng,
          context,
        )
      }

      if (!id) {
        break
      }

      excludedIds.add(id)
      const result = this.upgradeSystem.applyUpgrade(
        id,
        this.playerStats,
      )
      let rewardTitle = UPGRADE_DEFINITIONS[id].title

      if (result.skillId) {
        this.skillSystem.applyUpgrade(result.skillId)
        rewardTitle = `${rewardTitle} • CẤP ${this.skillSystem.getLevel(
          result.skillId,
        )}`
      }

      if (result.fusionAction === 'create') {
        const fusion = this.skillSystem.fuseRandom(this.rng)

        if (fusion) {
          this.runStatsSystem.recordFusionCreated(fusion.tier)
          rewardTitle = `${fusion.title} • CẤP ${fusion.level}`
        }
      } else if (result.fusionAction === 'upgrade') {
        const fusion = this.skillSystem.upgradeRandomFusion(this.rng)

        if (fusion) {
          this.runStatsSystem.recordFusionUpgrade(fusion.tier)
          rewardTitle = `${fusion.title} • CẤP ${fusion.level}`
        }
      }

      if (result.healAmount > 0) {
        this.playerHealth = Math.min(
          this.playerStats.maximumHealth,
          this.playerHealth + result.healAmount,
        )
      }

      rewardTitles.push(rewardTitle)
    }

    this.runStatsSystem.recordChestOpened(rewardTitles.length)

    this.nextAttackAt = Math.min(
      this.nextAttackAt,
      this.time.now + 90,
    )
    this.updateHealthBar()
    this.updateExperienceHud()
    this.showChestRewardResult(rewardTitles, x, y)
  }

  private showChestRewardResult(
    rewardTitles: string[],
    x: number,
    y: number,
  ) {
    const actualCount = rewardTitles.length
    const titleValue =
      actualCount > 0
        ? `RƯƠNG KỸ NĂNG • ${actualCount} PHẦN THƯỞNG`
        : 'RƯƠNG KHÔNG CÒN NÂNG CẤP PHÙ HỢP'
    const detailValue =
      actualCount > 0
        ? rewardTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')
        : 'Toàn bộ kỹ năng hiện tại đã đạt trạng thái giới hạn.'

    const panelHeight = 82 + Math.max(1, actualCount) * 25
    const panel = this.add
      .rectangle(
        this.scale.width / 2,
        188,
        520,
        panelHeight,
        0x0b1220,
        0.97,
      )
      .setStrokeStyle(3, 0xfacc15, 0.95)
      .setScrollFactor(0)
      .setDepth(24800)
      .setAlpha(0)

    const title = this.add
      .text(this.scale.width / 2, 160, titleValue, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#fde68a',
        stroke: '#422006',
        strokeThickness: 5,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24801)
      .setAlpha(0)

    const detail = this.add
      .text(this.scale.width / 2, 199, detailValue, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        lineSpacing: 7,
        wordWrap: { width: 470 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(24801)
      .setAlpha(0)

    this.tweens.add({
      targets: [panel, title, detail],
      alpha: 1,
      duration: 220,
      ease: 'Quad.Out',
    })

    const worldRing = this.add
      .circle(x, y, 28, 0xfacc15, 0)
      .setStrokeStyle(6, 0xfef3c7, 0.9)
      .setDepth(y + 60)

    this.tweens.add({
      targets: worldRing,
      scale: 4.5,
      alpha: 0,
      duration: 620,
      ease: 'Quad.Out',
      onComplete: () => worldRing.destroy(),
    })

    this.time.delayedCall(1750, () => {
      this.tweens.add({
        targets: [panel, title, detail],
        alpha: 0,
        y: '-=14',
        duration: 320,
        ease: 'Quad.In',
        onComplete: () => {
          panel.destroy()
          title.destroy()
          detail.destroy()
        },
      })
    })
  }

  private createPickupBombEffect(
    x: number,
    y: number,
    radius: number,
  ) {
    const blast = this.add
      .circle(x, y, 30, 0xf97316, 0.3)
      .setStrokeStyle(8, 0xfbbf24, 0.95)
      .setDepth(y + 80)

    this.tweens.add({
      targets: blast,
      scale: radius / 30,
      alpha: 0,
      duration: 430,
      ease: 'Quad.Out',
      onComplete: () => blast.destroy(),
    })

    this.shakeCamera(180, 0.006)
  }

  private showPickupResult(textValue: string, color: number) {
    const colorText = `#${color.toString(16).padStart(6, '0')}`
    const text = this.add
      .text(this.scale.width / 2, 178, textValue, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: colorText,
        stroke: '#020617',
        strokeThickness: 5,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24500)
      .setAlpha(0)

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 164,
      duration: 180,
      ease: 'Back.Out',
    })

    this.time.delayedCall(760, () => {
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: 146,
        duration: 260,
        ease: 'Quad.In',
        onComplete: () => text.destroy(),
      })
    })
  }

  private collectExperience(value: number) {
    const result = this.experienceSystem.addExperience(value)

    if (result.levelsGained > 0) {
      this.audioSystem.playLevelUp()
      this.applyPlayerLevelProgression()
    }

    this.updateExperienceHud()

    if (result.levelsGained > 0) {
      this.openUpgradeSelection()
    }
  }

  private applyPlayerLevelProgression() {
    const result =
      this.playerProgressionSystem.applyThroughLevel(
        this.experienceSystem.level,
        this.playerStats,
      )

    if (result.levelsApplied <= 0) {
      return
    }

    if (result.healAmount > 0) {
      this.playerHealth = Math.min(
        this.playerStats.maximumHealth,
        this.playerHealth + result.healAmount,
      )
    }

    this.nextAttackAt = Math.min(
      this.nextAttackAt,
      this.time.now + 90,
    )

    this.updateHealthBar()
  }

  private updateExperienceHud() {
    this.hud.updateExperience({
      level: this.experienceSystem.level,
      currentExperience: this.experienceSystem.currentExperience,
      experienceToNextLevel: this.experienceSystem.experienceToNextLevel,
      progressRatio: this.experienceSystem.getProgressRatio(),
    })
  }

  private showSpecialEnemyDefeated(enemy: EnemyUnit) {
    const isBoss = enemy.rank === 'boss'
    const width = this.scale.width
    const text = this.add
      .text(
        width / 2,
        155,
        isBoss ? 'BOSS ĐÃ BỊ TIÊU DIỆT' : 'MINI BOSS ĐÃ BỊ HẠ',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: isBoss ? '25px' : '20px',
          fontStyle: 'bold',
          color: isBoss ? '#fbbf24' : '#f0abfc',
          stroke: '#020617',
          strokeThickness: 6,
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(24000)
      .setAlpha(0)

    this.shakeCamera(isBoss ? 520 : 300, isBoss ? 0.01 : 0.006)

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 140,
      duration: 240,
      ease: 'Back.Out',
    })

    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: 120,
        duration: 360,
        onComplete: () => text.destroy(),
      })
    })
  }

  private createEnemyDeathBurst(
    enemy: EnemyUnit,
  ) {
    const isBoss = enemy.rank === 'boss'
    const isMiniBoss = enemy.rank === 'mini-boss'
    const originX = enemy.sprite.x
    const originY = enemy.sprite.y
    const fragmentCount = isBoss ? 54 : isMiniBoss ? 32 : 18
    const maximumDistance = isBoss ? 150 : isMiniBoss ? 108 : 78

    this.shakeCamera(
      isBoss ? 430 : isMiniBoss ? 220 : 90,
      isBoss ? 0.009 : isMiniBoss ? 0.005 : 0.0025,
    )

    for (let index = 0; index < fragmentCount; index++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.Between(28, maximumDistance)

      const color = isBoss
        ? index % 3 === 0
          ? 0xfef3c7
          : 0xf97316
        : isMiniBoss
          ? index % 3 === 0
            ? 0xf5d0fe
            : 0xd946ef
          : enemy.isElite
            ? index % 3 === 0
              ? 0xfef3c7
              : 0xfacc15
            : enemy.archetypeId === 'crawler'
              ? index % 3 === 0
                ? 0xfbcfe8
                : 0xec4899
              : enemy.archetypeId === 'brute'
                ? index % 3 === 0
                  ? 0xfed7aa
                  : 0xf97316
                : enemy.archetypeId === 'shooter'
                  ? index % 3 === 0
                    ? 0xcffafe
                    : 0x22d3ee
                  : enemy.archetypeId === 'bomber'
                    ? index % 3 === 0
                      ? 0xfef08a
                      : 0xfacc15
                    : enemy.archetypeId === 'scatterer'
                      ? index % 3 === 0
                        ? 0xe9d5ff
                        : 0xc084fc
                      : enemy.archetypeId === 'healer'
                        ? index % 3 === 0
                          ? 0xbbf7d0
                          : 0x4ade80
                        : enemy.archetypeId === 'shielder'
                          ? index % 3 === 0
                            ? 0xbfdbfe
                            : 0x60a5fa
                          : enemy.archetypeId === 'death-buffer'
                            ? index % 3 === 0
                              ? 0xfed7aa
                              : 0xfb923c
                            : enemy.archetypeId === 'brood-mother'
                              ? index % 3 === 0
                                ? 0xfbcfe8
                                : 0xec4899
                              : enemy.archetypeId === 'toxic'
                                ? index % 3 === 0
                                  ? 0xbbf7d0
                                  : 0x22c55e
                                : enemy.archetypeId === 'flame'
                                  ? index % 3 === 0
                                    ? 0xfed7aa
                                    : 0xf97316
                                  : index % 3 === 0
                                    ? 0xfbbf24
                                    : 0xef4444

      const fragment = this.add
        .circle(
          originX,
          originY,
          Phaser.Math.Between(3, isBoss ? 9 : 6),
          color,
          0.95,
        )
        .setDepth(originY + 30)

      this.tweens.add({
        targets: fragment,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(320, isBoss ? 760 : 560),
        ease: 'Quad.Out',
        onComplete: () => {
          fragment.destroy()
        },
      })
    }
  }

  private updateEnemyHealthBar(
    enemy: EnemyUnit,
  ) {
    const ratio = Phaser.Math.Clamp(
      enemy.health / enemy.maxHealth,
      0,
      1,
    )

    const barHeight = enemy.rank === 'normal' ? 5 : 7

    enemy.healthBar
      .setDisplaySize(
        Math.max(enemy.healthBarWidth * ratio, 0.01),
        barHeight,
      )
      .setVisible(
        enemy.alive && ratio > 0 && enemy.showHealthBar === true,
      )

    if (enemy.rank === 'boss') {
      enemy.healthBar.setFillStyle(
        enemy.bossPhase >= 3 ? 0xdc2626 : 0xf97316,
        1,
      )
    } else if (enemy.rank === 'mini-boss') {
      enemy.healthBar.setFillStyle(
        enemy.bossPhase >= 2 ? 0xc026d3 : 0xe879f9,
        1,
      )
    } else if (ratio > 0.5) {
      enemy.healthBar.setFillStyle(0xef4444, 1)
    } else if (ratio > 0.25) {
      enemy.healthBar.setFillStyle(0xf97316, 1)
    } else {
      enemy.healthBar.setFillStyle(0xfbbf24, 1)
    }
  }

  private updateCombatHud() {
    this.hud.updateCombat({
      kills: this.kills,
      score: this.score,
      wave: this.wave,
      waveKind: this.waveSystem.getWaveKind(),
      activeEnemies: this.enemies.length,
      enemyLimit: this.getWaveEnemyLimit(),
    })
  }

  private updateBossHud() {
    const specialEnemy = this.enemies
      .filter((enemy) => enemy.alive && enemy.rank !== 'normal')
      .sort((left, right) => {
        if (left.rank === right.rank) {
          return right.maxHealth - left.maxHealth
        }

        return left.rank === 'boss' ? -1 : 1
      })[0]

    if (!specialEnemy) {
      this.hud.hideBoss()
      return
    }

    this.hud.updateBoss({
      name: specialEnemy.label.text,
      rank: specialEnemy.rank,
      currentHealth: specialEnemy.health,
      maximumHealth: specialEnemy.maxHealth,
      phase: specialEnemy.bossPhase,
    })
  }

  private updateHealthBar() {
    this.hud.updateHealth(this.playerHealth, this.playerStats.maximumHealth)
  }

  private updateHud() {
    const elapsedSeconds = Math.floor(
      (this.time.now - this.gameStartTime) / 1000,
    )

    this.hud.updateWorld({
      elapsedSeconds,
      playerX: this.player.x,
      playerY: this.player.y,
    })

    this.updateCombatHud()
    this.updateBossHud()
  }

  private handleEnemyContact() {
    if (this.time.now < this.nextDamageAt) {
      return
    }

    let sourceEnemy: EnemyUnit | null = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (
        distance <= enemy.contactRadius &&
        distance < nearestDistance
      ) {
        sourceEnemy = enemy
        nearestDistance = distance
      }
    }

    if (!sourceEnemy) {
      return
    }

    this.nextDamageAt = this.time.now + this.damageCooldown
    this.applyDamage(sourceEnemy.contactDamage, sourceEnemy)
  }

  private applyGroundHazardDamage(amount: number) {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    if (this.activeAbilityCombatSystem.isInvulnerable(this.time.now)) {
      return
    }

    const totalDamageReduction = Phaser.Math.Clamp(
      this.playerStats.damageReduction +
        this.activeAbilityCombatSystem.getDamageReductionBonus(this.time.now),
      0,
      0.88,
    )
    const reducedAmount = Math.max(
      1,
      Math.round(amount * (1 - totalDamageReduction)),
    )

    this.playerHealth = Math.max(
      0,
      this.playerHealth - reducedAmount,
    )

    const lethalHit = this.playerHealth <= 0
    this.audioSystem.playPlayerDamage(lethalHit)

    this.player
      .setTint(0x84cc16)
      .setTintMode(Phaser.TintModes.FILL)

    if (!lethalHit) {
      this.time.delayedCall(90, () => {
        if (!this.isGameOver && !this.isEndingGame) {
          this.player.clearTint()
        }
      })
    }

    this.hud.flashDamage()
    this.shakeCamera(lethalHit ? 150 : 70, lethalHit ? 0.008 : 0.003)
    this.createDamageBurst()
    this.updateHealthBar()

    if (lethalHit) {
      this.beginGameOverTransition()
    }
  }

  private applyDamage(
    amount: number,
    sourceEnemy: EnemyUnit,
  ) {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    if (this.activeAbilityCombatSystem.isInvulnerable(this.time.now)) {
      return
    }

    const totalDamageReduction = Phaser.Math.Clamp(
      this.playerStats.damageReduction +
        this.activeAbilityCombatSystem.getDamageReductionBonus(this.time.now),
      0,
      0.88,
    )
    const reducedAmount = Math.max(
      1,
      Math.round(amount * (1 - totalDamageReduction)),
    )

    this.playerHealth = Math.max(
      0,
      this.playerHealth - reducedAmount,
    )

    const lethalHit = this.playerHealth <= 0
    this.audioSystem.playPlayerDamage(lethalHit)

    this.player
      .setTint(0xff5c5c)
      .setTintMode(Phaser.TintModes.FILL)

    if (!lethalHit) {
      this.time.delayedCall(110, () => {
        if (!this.isGameOver && !this.isEndingGame) {
          this.player.clearTint()
        }
      })
    }

    this.hud.flashDamage()
    this.shakeCamera(lethalHit ? 180 : 120, lethalHit ? 0.009 : 0.006)
    this.updateHealthBar()

    if (lethalHit) {
      this.beginGameOverTransition()
      return
    }

    this.pushPlayerAway(sourceEnemy)
    this.createDamageBurst()
  }

  private beginGameOverTransition() {
    if (this.isGameOver || this.isEndingGame) {
      return
    }

    this.isEndingGame = true
    this.player.setVelocity(0, 0)

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }

    this.stopAllProjectiles()
    this.enemyProjectileSystem.stopAll()
    this.skillSystem.stopAll()
    this.activeAbilityCombatSystem.setEnabled(false)

    // Chuyển sang game over ở lượt xử lý kế tiếp. Không dọn mảng đạn
    // ngay bên trong callback va chạm vì callback đó có thể đang duyệt mảng.
    this.time.delayedCall(1, () => {
      this.endGame()
    })
  }

  private pushPlayerAway(
    sourceEnemy: EnemyUnit,
  ) {
    const direction = new Phaser.Math.Vector2(
      this.player.x - sourceEnemy.sprite.x,
      this.player.y - sourceEnemy.sprite.y,
    )

    if (direction.lengthSq() === 0) {
      direction.set(1, 0)
    }

    direction.normalize().scale(sourceEnemy.knockbackForce)

    const newX = Phaser.Math.Clamp(
      this.player.x + direction.x,
      32,
      this.worldWidth - 32,
    )

    const newY = Phaser.Math.Clamp(
      this.player.y + direction.y,
      38,
      this.worldHeight - 38,
    )

    this.player.setPosition(newX, newY)
  }

  private createDamageBurst() {
    for (
      let index = 0;
      index < 8;
      index++
    ) {
      const angle =
        Phaser.Math.FloatBetween(
          0,
          Math.PI * 2,
        )

      const distance =
        Phaser.Math.Between(20, 45)

      const particle = this.add
        .circle(
          this.player.x,
          this.player.y,
          Phaser.Math.Between(2, 4),
          0xff6b6b,
          0.9,
        )
        .setDepth(
          this.player.y + 50,
        )

      this.tweens.add({
        targets: particle,
        x:
          this.player.x +
          Math.cos(angle) *
            distance,
        y:
          this.player.y +
          Math.sin(angle) *
            distance,
        alpha: 0,
        scale: 0.2,
        duration: 260,
        ease: 'Quad.Out',
        onComplete: () => {
          particle.destroy()
        },
      })
    }
  }

  private updateVisualEffects() {
    this.playerShadow
      .setPosition(this.player.x, this.player.y + 25)
      .setDepth(this.player.y - 2)

    this.playerGlow
      .setPosition(this.player.x, this.player.y + 10)
      .setDepth(this.player.y - 3)

    this.player.setDepth(this.player.y)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerSkinVisualSystem.update(
      this.time.now,
      this.player.x,
      this.player.y,
      playerBody.velocity.x,
      playerBody.velocity.y,
      this.player.y,
    )

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue
      }

      enemy.shadow
        .setPosition(enemy.sprite.x, enemy.sprite.y + 24)
        .setDepth(enemy.sprite.y - 2)

      enemy.glow
        .setPosition(enemy.sprite.x, enemy.sprite.y + 10)
        .setDepth(enemy.sprite.y - 3)

      enemy.sprite.setDepth(enemy.sprite.y)

      enemy.label
        .setPosition(
          enemy.sprite.x,
          enemy.sprite.y - enemy.labelOffsetY,
        )
        .setDepth(enemy.sprite.y + 2)

      enemy.healthBarBackground
        .setPosition(
          enemy.sprite.x,
          enemy.sprite.y - enemy.healthBarOffsetY,
        )
        .setDepth(enemy.sprite.y + 2)

      enemy.healthBar
        .setPosition(
          enemy.sprite.x - enemy.healthBarWidth / 2,
          enemy.sprite.y - enemy.healthBarOffsetY,
        )
        .setDepth(enemy.sprite.y + 3)

      const baseAlpha = enemy.rank === 'normal' ? 0.08 : 0.14
      const pulseStrength = enemy.rank === 'boss' ? 0.08 : 0.045
      const phaseBoost = (enemy.bossPhase - 1) * 0.035
      const enemyPulse =
        baseAlpha +
        phaseBoost +
        (Math.sin(this.time.now / 180 + enemy.id) + 1) *
          pulseStrength

      enemy.glow.setAlpha(enemyPulse)
    }

    this.playerGlow.setAlpha(0)
  }

  private restartGame() {
    if (!this.isGameOver) {
      return
    }

    this.physics.resume()
    this.scene.restart()
  }

  private endGame() {
    if (this.isGameOver) {
      return
    }

    this.isGameOver = true
    this.isEndingGame = false
    this.audioSystem.stopMusic()
    this.audioSystem.playGameOver()
    this.pauseMenuSystem.close()
    this.pauseMenuSystem.setPauseButtonVisible(false)
    this.mobileControlSystem.setMovementEnabled(false)

    this.finalSurvivalSeconds = Math.floor(
      (this.time.now - this.gameStartTime) / 1000,
    )

    const runRecord = this.runStatsSystem.createRunRecord({
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      level: this.experienceSystem.level,
      survivalSeconds: this.finalSurvivalSeconds,
    })
    const leaderboardResult =
      this.localLeaderboardSystem.saveRun(runRecord)
    const careerResult = this.careerProgressSystem.recordRun(runRecord)
    this.nightShardRewardSystem.awardRun(runRecord)
    this.playerSkinVisualSystem.setDefeated()
    this.finalLocalRank = leaderboardResult.rank
    this.finalBestScore = leaderboardResult.bestScore
    this.finalIsNewBest = leaderboardResult.isNewBest
    const finalStatistics = runRecord.statistics

    this.player.setVelocity(0, 0)

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
      enemy.sprite.setRotation(0)
    }

    this.physics.pause()

    this.player
      .clearTint()
      .setTint(0x475569)
      .setAlpha(0.55)

    const width = this.scale.width
    const height = this.scale.height
    const panelWidth = Math.min(610, width - 34)
    const panelHeight = Math.min(430, height - 28)
    const panelTop = height / 2 - panelHeight / 2
    const centerX = width / 2

    this.add
      .rectangle(
        centerX,
        height / 2,
        width,
        height,
        0x020617,
        0.78,
      )
      .setScrollFactor(0)
      .setDepth(30000)

    this.add
      .rectangle(
        centerX,
        height / 2,
        panelWidth,
        panelHeight,
        0x0b1220,
        0.97,
      )
      .setStrokeStyle(2, 0x7f1d1d, 1)
      .setScrollFactor(0)
      .setDepth(30001)

    this.add
      .text(centerX, panelTop + 31, 'NHIỆM VỤ THẤT BẠI', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#f87171',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    const localRankText =
      this.finalLocalRank === null
        ? 'Ngoài Top 10 cục bộ'
        : `Hạng cục bộ #${this.finalLocalRank}`
    const recordText = this.finalIsNewBest ? '  •  KỶ LỤC MỚI' : ''

    this.add
      .text(
        centerX,
        panelTop + 72,
        `TỔNG ĐIỂM  ${this.score}${recordText}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fbbf24',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    this.add
      .text(
        centerX,
        panelTop + 103,
        `${localRankText}  •  Kỷ lục ${this.finalBestScore}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#67e8f9',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    const onlineStatusText = this.add
      .text(
        centerX,
        panelTop + 132,
        this.onlineLeaderboardSystem.isConfigured()
          ? `ONLINE: ĐANG ĐỒNG BỘ  •  ${this.onlineLeaderboardSystem.getDisplayName()}`
          : 'ONLINE: CHƯA CẤU HÌNH',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: this.onlineLeaderboardSystem.isConfigured()
            ? '#a7f3d0'
            : '#94a3b8',
          align: 'center',
          wordWrap: { width: panelWidth - 50 },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    this.add
      .text(
        centerX,
        panelTop + 169,
        `Đợt ${this.wave}  •  Cấp ${this.experienceSystem.level}  •  Hạ gục ${this.kills}  •  ${formatTime(this.finalSurvivalSeconds)}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#c4b5fd',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    this.add
      .text(
        centerX,
        panelTop + 198,
        `Boss ${finalStatistics.bossKills}  •  Mini boss ${finalStatistics.miniBossKills}  •  Tinh anh ${finalStatistics.eliteKills}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          color: '#fda4af',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    const achievementSummary =
      careerResult.newlyUnlocked.length > 0
        ? `THÀNH TỰU MỚI: ${careerResult.newlyUnlocked
            .slice(0, 2)
            .map((achievement) => achievement.title)
            .join(' • ')}${
            careerResult.newlyUnlocked.length > 2
              ? ` • +${careerResult.newlyUnlocked.length - 2}`
              : ''
          }`
        : `THÀNH TỰU ${careerResult.unlockedCount}/${careerResult.totalAchievements}`

    this.add
      .text(centerX, panelTop + 222, achievementSummary, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color:
          careerResult.newlyUnlocked.length > 0
            ? '#fbbf24'
            : '#94a3b8',
        align: 'center',
        wordWrap: { width: panelWidth - 60 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    this.add
      .text(centerX, panelTop + 247, 'TOP 3 ONLINE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f0abfc',
        letterSpacing: 1.2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)

    const onlineTopText = this.add
      .text(
        centerX,
        panelTop + 269,
        this.onlineLeaderboardSystem.isConfigured()
          ? 'Đang tải bảng xếp hạng...'
          : 'Bảng xếp hạng online đang tắt.',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#e2e8f0',
          align: 'left',
          lineSpacing: 5,
          wordWrap: { width: panelWidth - 70 },
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(30002)

    const gameOverButtonY = panelTop + panelHeight - 34
    const gameOverButtonWidth = Math.min(250, panelWidth * 0.42)
    const gameOverButtonGap = Math.min(140, panelWidth * 0.24)

    const restartPrompt = this.add
      .text(
        centerX - gameOverButtonGap,
        gameOverButtonY,
        this.mobileControlSystem.isTouchControlEnabled()
          ? 'CHƠI LẠI'
          : 'CHƠI LẠI  [R]',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: panelWidth < 480 ? '12px' : '14px',
          fontStyle: 'bold',
          color: '#67e8f9',
          backgroundColor: '#0f172a',
          fixedWidth: gameOverButtonWidth,
          align: 'center',
          padding: { x: 10, y: 9 },
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)
      .setInteractive({ useHandCursor: true })

    const mainMenuPrompt = this.add
      .text(centerX + gameOverButtonGap, gameOverButtonY, 'MENU CHÍNH', {
        fontFamily: 'Arial, sans-serif',
        fontSize: panelWidth < 480 ? '12px' : '14px',
        fontStyle: 'bold',
        color: '#f0abfc',
        backgroundColor: '#241331',
        fixedWidth: gameOverButtonWidth,
        align: 'center',
        padding: { x: 10, y: 9 },
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30002)
      .setInteractive({ useHandCursor: true })

    restartPrompt.on('pointerup', () => {
      this.restartGame()
    })

    mainMenuPrompt.on('pointerup', () => {
      this.returnToMainMenu()
    })

    if (this.onlineLeaderboardSystem.isConfigured()) {
      void this.submitOnlineRun(
        runRecord,
        onlineStatusText,
        onlineTopText,
      )
    }

    this.time.delayedCall(40, () => {
      this.clearAllProjectiles()
      this.enemyProjectileSystem.clear()
      this.supportEnemySystem.clearAll(this.enemies)
      this.enemyDeathEffectSystem.reset(this.enemies)
      this.experienceOrbSystem.clear()
      this.pickupSystem.clear()
      this.chestSystem.clear()
    })
  }

  private async submitOnlineRun(
    runRecord: RunRecord,
    statusText: Phaser.GameObjects.Text,
    topText: Phaser.GameObjects.Text,
  ) {
    const result = await this.onlineLeaderboardSystem.submitRun(runRecord)

    if (
      !this.isGameOver ||
      !statusText.active ||
      !topText.active
    ) {
      return
    }

    if (result.status === 'disabled') {
      statusText
        .setText('ONLINE: CHƯA CẤU HÌNH')
        .setColor('#94a3b8')
      topText.setText('Bảng xếp hạng online đang tắt.')
      return
    }

    if (result.status === 'error') {
      const rawError =
        result.errorMessage ||
        this.onlineLeaderboardSystem.getLastErrorMessage() ||
        'Lỗi không xác định.'
      const wrappedError =
        rawError.match(/.{1,64}(?:\s|$)/g)?.join('\n') ?? rawError

      statusText
        .setText('ONLINE: ĐỒNG BỘ THẤT BẠI  •  ĐÃ LƯU CỤC BỘ')
        .setColor('#fca5a5')
      topText
        .setText(`LỖI SUPABASE:\n${wrappedError}`)
        .setColor('#fca5a5')
      return
    }

    const rankText =
      result.rank === null
        ? 'Ngoài bảng xếp hạng'
        : `Hạng #${result.rank}`

    statusText
      .setText(
        `ONLINE: ${rankText}  •  ${result.displayName}  •  Top 1: ${result.bestScore}`,
      )
      .setColor('#86efac')

    if (result.records.length === 0) {
      topText.setText('Chưa có dữ liệu xếp hạng online.')
      return
    }

    const lines = result.records.slice(0, 3).map((entry, index) => {
      const position = `${index + 1}.`.padEnd(3, ' ')
      const name = entry.displayName.slice(0, 15).padEnd(15, ' ')
      const score = `${entry.score}`.padStart(7, ' ')
      return `${position} ${name} ${score}  W${entry.wave}`
    })

    topText.setText(lines.join('\n'))
  }


}
