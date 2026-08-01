import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import type { EnemyRank } from '../types/game'
import type { WaveKind } from './WaveSystem'
import { formatTime } from '../utils/time'

type CombatHudState = {
  kills: number
  score: number
  wave: number
  waveKind: WaveKind
  activeEnemies: number
  enemyLimit: number
}

type WorldHudState = {
  elapsedSeconds: number
  playerX: number
  playerY: number
}

type BossHudState = {
  name: string
  rank: EnemyRank
  currentHealth: number
  maximumHealth: number
  phase: number
}

type ExperienceHudState = {
  level: number
  currentExperience: number
  experienceToNextLevel: number
  progressRatio: number
}

export class HudSystem {
  private readonly scene: Phaser.Scene

  private healthBar!: Phaser.GameObjects.Rectangle
  private healthText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private zoneText!: Phaser.GameObjects.Text
  private coordinateText!: Phaser.GameObjects.Text
  private damageOverlay!: Phaser.GameObjects.Rectangle
  private killsText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private enemiesText!: Phaser.GameObjects.Text
  private experienceBar!: Phaser.GameObjects.Rectangle
  private experienceText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text

  private bossPanel!: Phaser.GameObjects.Rectangle
  private bossBarBackground!: Phaser.GameObjects.Rectangle
  private bossBar!: Phaser.GameObjects.Rectangle
  private bossNameText!: Phaser.GameObjects.Text
  private bossPhaseText!: Phaser.GameObjects.Text
  private bossHealthText!: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height

    this.scene.add
      .rectangle(width / 2, 38, width, 76, 0x020617, 0.88)
      .setScrollFactor(0)
      .setDepth(10000)

    this.scene.add
      .rectangle(width / 2, 76, width, 2, 0x22d3ee, 0.25)
      .setScrollFactor(0)
      .setDepth(10001)

    this.scene.add
      .text(28, 17, 'ĐÊM CUỐI CÙNG', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setScrollFactor(0)
      .setDepth(10002)

    this.scene.add
      .text(28, 44, 'GIAO THỨC SINH TỒN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#22d3ee',
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(10002)

    const barX = 220
    const barY = 33

    this.scene.add
      .rectangle(barX, barY, 214, 24, 0x050b16, 0.95)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x334155, 1)
      .setScrollFactor(0)
      .setDepth(10002)

    this.healthBar = this.scene.add
      .rectangle(
        barX + 7,
        barY,
        GAME_CONFIG.hud.healthBarMaxWidth,
        12,
        0x16a34a,
        1,
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10003)

    this.healthText = this.scene.add
      .text(barX + 107, barY, 'HP 100 / 100', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004)

    this.zoneText = this.scene.add
      .text(width / 2, 24, 'TRẠM TRUNG TÂM', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#67e8f9',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004)

    this.coordinateText = this.scene.add
      .text(width / 2, 49, 'X 2500  •  Y 1500', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#64748b',
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004)

    this.killsText = this.scene.add
      .text(width - 218, 17, 'HẠ GỤC  0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fca5a5',
        letterSpacing: 1,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10004)

    this.scoreText = this.scene.add
      .text(width - 218, 43, 'ĐIỂM  000000', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fbbf24',
        letterSpacing: 1,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10004)

    this.waveText = this.scene.add
      .text(28, height - 29, 'ĐỢT  1', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#c084fc',
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10004)

    this.enemiesText = this.scene.add
      .text(width - 28, height - 29, 'DỊ THỂ  0 / 3', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fca5a5',
        letterSpacing: 1,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(10004)

    this.timerText = this.scene.add
      .text(width - 28, 16, '00:00', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10004)

    this.scene.add
      .text(width - 28, 47, 'THỜI GIAN SINH TỒN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#64748b',
        letterSpacing: 1.2,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10004)

    this.scene.add
      .rectangle(width / 2, height - 61, 430, 24, 0x020617, 0.9)
      .setStrokeStyle(1, 0x6d28d9, 0.85)
      .setScrollFactor(0)
      .setDepth(10000)

    this.experienceBar = this.scene.add
      .rectangle(width / 2 - 204, height - 61, 408, 10, 0x8b5cf6, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10002)
      .setDisplaySize(0.01, 10)

    this.levelText = this.scene.add
      .text(width / 2 - 220, height - 61, 'LV 1', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ddd6fe',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(10003)

    this.experienceText = this.scene.add
      .text(width / 2, height - 61, 'XP 0 / 70', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003)

    this.scene.add
      .rectangle(width / 2, height - 23, 430, 30, 0x020617, 0.76)
      .setStrokeStyle(1, 0x334155, 0.8)
      .setScrollFactor(0)
      .setDepth(10000)

    this.scene.add
      .text(
        width / 2,
        height - 23,
        'WASD: DI CHUYỂN  •  N: ĐỢT KẾ  •  L: +100 XP (TEST)',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#94a3b8',
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)

    this.createBossHud(width)

    this.damageOverlay = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width,
        height,
        0xef4444,
        0,
      )
      .setScrollFactor(0)
      .setDepth(20000)
  }

  updateHealth(current: number, maximum: number) {
    const ratio = current / maximum

    this.healthBar
      .setDisplaySize(
        Math.max(
          GAME_CONFIG.hud.healthBarMaxWidth * ratio,
          0.01,
        ),
        12,
      )
      .setVisible(ratio > 0)

    if (ratio > 0.5) {
      this.healthBar.setFillStyle(0x16a34a, 1)
    } else if (ratio > 0.25) {
      this.healthBar.setFillStyle(0xf59e0b, 1)
    } else {
      this.healthBar.setFillStyle(0xdc2626, 1)
    }

    this.healthText.setText(`HP ${current} / ${maximum}`)
  }

  updateCombat(state: CombatHudState) {
    this.killsText.setText(`HẠ GỤC  ${state.kills}`)
    this.scoreText.setText(
      `ĐIỂM  ${state.score.toString().padStart(6, '0')}`,
    )

    const waveSuffix =
      state.waveKind === 'boss'
        ? '  •  BOSS'
        : state.waveKind === 'mini-boss'
          ? '  •  MINI BOSS'
          : ''

    this.waveText.setText(`ĐỢT  ${state.wave}${waveSuffix}`)
    this.enemiesText.setText(
      `DỊ THỂ  ${state.activeEnemies} / ${state.enemyLimit}`,
    )
  }

  updateWorld(state: WorldHudState) {
    this.timerText.setText(formatTime(state.elapsedSeconds))
    this.zoneText.setText(
      this.getCurrentZone(state.playerX, state.playerY),
    )
    this.coordinateText.setText(
      `X ${Math.round(state.playerX)}  •  Y ${Math.round(state.playerY)}`,
    )
  }

  updateExperience(state: ExperienceHudState) {
    const ratio = Phaser.Math.Clamp(state.progressRatio, 0, 1)

    this.experienceBar.setDisplaySize(
      Math.max(408 * ratio, 0.01),
      10,
    )

    this.levelText.setText(`LV ${state.level}`)
    this.experienceText.setText(
      `XP ${state.currentExperience} / ${state.experienceToNextLevel}`,
    )
  }

  updateBoss(state: BossHudState) {
    const ratio = Phaser.Math.Clamp(
      state.currentHealth / state.maximumHealth,
      0,
      1,
    )

    const isLargeBoss = state.rank === 'boss'
    const color = isLargeBoss ? 0xf97316 : 0xd946ef
    const rankText = isLargeBoss ? 'BOSS' : 'MINI BOSS'

    this.setBossHudVisible(true)
    this.bossPanel.setStrokeStyle(2, color, 0.9)
    this.bossBar.setFillStyle(color, 1)
    this.bossBar.setDisplaySize(Math.max(486 * ratio, 0.01), 13)
    this.bossNameText.setText(`${rankText}  •  ${state.name}`)
    this.bossPhaseText.setText(`GIAI ĐOẠN ${state.phase}`)
    this.bossHealthText.setText(
      `${Math.ceil(state.currentHealth)} / ${state.maximumHealth}`,
    )
  }

  hideBoss() {
    this.setBossHudVisible(false)
  }

  flashDamage() {
    this.damageOverlay.setAlpha(0.22)
    this.scene.tweens.killTweensOf(this.damageOverlay)
    this.scene.tweens.add({
      targets: this.damageOverlay,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
    })
  }

  private createBossHud(width: number) {
    const y = 105

    this.bossPanel = this.scene.add
      .rectangle(width / 2, y, 530, 52, 0x020617, 0.92)
      .setStrokeStyle(2, 0xf97316, 0.9)
      .setScrollFactor(0)
      .setDepth(11000)

    this.bossNameText = this.scene.add
      .text(width / 2 - 244, y - 17, 'BOSS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f8fafc',
        letterSpacing: 1.2,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(11002)

    this.bossPhaseText = this.scene.add
      .text(width / 2 + 244, y - 17, 'GIAI ĐOẠN 1', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fbbf24',
        letterSpacing: 1,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(11002)

    this.bossBarBackground = this.scene.add
      .rectangle(width / 2, y + 7, 494, 19, 0x0f172a, 1)
      .setStrokeStyle(1, 0x475569, 1)
      .setScrollFactor(0)
      .setDepth(11001)

    this.bossBar = this.scene.add
      .rectangle(width / 2 - 243, y + 7, 486, 13, 0xf97316, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(11002)

    this.bossHealthText = this.scene.add
      .text(width / 2, y + 7, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11003)

    this.setBossHudVisible(false)
  }

  private setBossHudVisible(visible: boolean) {
    this.bossPanel.setVisible(visible)
    this.bossBarBackground.setVisible(visible)
    this.bossBar.setVisible(visible)
    this.bossNameText.setVisible(visible)
    this.bossPhaseText.setVisible(visible)
    this.bossHealthText.setVisible(visible)
  }

  private getCurrentZone(x: number, y: number) {
    const centerX = GAME_CONFIG.world.width / 2
    const centerY = GAME_CONFIG.world.height / 2

    if (
      Math.abs(y - centerY) < 150 ||
      Math.abs(x - centerX) < 160
    ) {
      return 'TRẠM TRUNG TÂM'
    }

    if (x < centerX && y < centerY) {
      return 'RỪNG CHẾT'
    }

    if (x >= centerX && y < centerY) {
      return 'NHÀ MÁY BỎ HOANG'
    }

    if (x < centerX && y >= centerY) {
      return 'PHẾ TÍCH THÀNH PHỐ'
    }

    return 'VÙNG LÂY NHIỄM'
  }
}
