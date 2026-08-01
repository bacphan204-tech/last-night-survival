import Phaser from 'phaser'
import type { PlayerStats } from '../types/game'
import type { GameSettings } from './GameSettingsSystem'

export type PauseMenuSkillEntry = {
  id: string
  title: string
  level: number
  maximumLevel: number
  category: 'active' | 'weapon' | 'fusion'
  tier?: number
}

export type PauseMenuSnapshot = {
  settings: Readonly<GameSettings>
  protocolShortTitle: string
  protocolTitle: string
  protocolAdvantages: string
  protocolDrawback: string
  currentHealth: number
  stats: Readonly<PlayerStats>
  wave: number
  level: number
  score: number
  kills: number
  activeSkillCount: number
  maximumActiveSkills: number
  skills: PauseMenuSkillEntry[]
}

type PauseMenuCallbacks = {
  onOpenRequest: () => void
  onResume: () => void
  onRestart: () => void
  onReturnToMainMenu: () => void
  onCycleMusicVolume: () => number
  onCycleSfxVolume: () => number
  onToggleScreenShake: () => boolean
  onToggleAutoPause: () => boolean
}

type MenuButton = {
  background: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

export class PauseMenuSystem {
  private readonly scene: Phaser.Scene
  private readonly callbacks: PauseMenuCallbacks
  private pauseButtonBackground: Phaser.GameObjects.Arc | null = null
  private pauseButtonBars: Phaser.GameObjects.Rectangle[] = []
  private overlayObjects: Phaser.GameObjects.GameObject[] = []
  private musicButton: MenuButton | null = null
  private sfxButton: MenuButton | null = null
  private shakeButton: MenuButton | null = null
  private autoPauseButton: MenuButton | null = null
  private fullscreenButton: MenuButton | null = null

  constructor(scene: Phaser.Scene, callbacks: PauseMenuCallbacks) {
    this.scene = scene
    this.callbacks = callbacks
  }

  create() {
    if (this.pauseButtonBackground) {
      return
    }

    const x = this.scene.scale.width - 32
    const y = 30
    const background = this.scene.add
      .circle(x, y, 21, 0x0f172a, 0.9)
      .setStrokeStyle(2, 0x67e8f9, 0.8)
      .setScrollFactor(0)
      .setDepth(28950)
      .setInteractive(
        new Phaser.Geom.Circle(21, 21, 21),
        Phaser.Geom.Circle.Contains,
      )

    const leftBar = this.scene.add
      .rectangle(x - 5, y, 4, 16, 0xe0f2fe)
      .setScrollFactor(0)
      .setDepth(28951)
    const rightBar = this.scene.add
      .rectangle(x + 5, y, 4, 16, 0xe0f2fe)
      .setScrollFactor(0)
      .setDepth(28951)

    background.on('pointerover', () => {
      background.setFillStyle(0x164e63, 0.98).setScale(1.06)
    })
    background.on('pointerout', () => {
      background.setFillStyle(0x0f172a, 0.9).setScale(1)
    })
    background.on('pointerup', this.callbacks.onOpenRequest)

    this.pauseButtonBackground = background
    this.pauseButtonBars = [leftBar, rightBar]
    this.scene.events.once('shutdown', () => this.destroy())
  }

  open(snapshot: PauseMenuSnapshot) {
    if (this.overlayObjects.length > 0) {
      return
    }

    this.setPauseButtonVisible(false)

    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const panelWidth = Math.min(870, width - 18)
    const panelHeight = Math.min(516, height - 10)
    const centerX = width / 2
    const centerY = height / 2
    const top = centerY - panelHeight / 2
    const left = centerX - panelWidth / 2
    const innerPadding = 20
    const innerWidth = panelWidth - innerPadding * 2
    const columnGap = 14
    const columnWidth = (innerWidth - columnGap) / 2
    const contentTop = top + 96
    const contentHeight = Math.max(246, panelHeight - 224)
    const contentCenterY = contentTop + contentHeight / 2

    const backdrop = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x020617, 0.84)
      .setScrollFactor(0)
      .setDepth(31990)

    const outerGlow = this.scene.add
      .rectangle(centerX, centerY, panelWidth + 6, panelHeight + 6, 0x0891b2, 0.11)
      .setScrollFactor(0)
      .setDepth(31998)

    const panel = this.scene.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x07111f, 0.995)
      .setStrokeStyle(2, 0x22d3ee, 0.82)
      .setScrollFactor(0)
      .setDepth(32000)

    const headerAccent = this.scene.add
      .rectangle(centerX, top + 4, panelWidth - 8, 4, 0x22d3ee, 0.88)
      .setScrollFactor(0)
      .setDepth(32001)

    const title = this.scene.add
      .text(left + innerPadding, top + 19, 'TẠM DỪNG', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#f8fafc',
        letterSpacing: 3,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32002)

    const protocolText = this.scene.add
      .text(
        left + innerPadding,
        top + 51,
        `${snapshot.protocolShortTitle}  •  ${snapshot.protocolTitle}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#67e8f9',
          letterSpacing: 0.9,
        },
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32002)

    const instruction = this.scene.add
      .text(
        left + panelWidth - innerPadding,
        top + 26,
        'ESC để tiếp tục',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          color: '#94a3b8',
        },
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(32002)

    this.overlayObjects.push(
      backdrop,
      outerGlow,
      panel,
      headerAccent,
      title,
      protocolText,
      instruction,
    )

    this.createSummaryCards(snapshot, left + innerPadding, top + 68, innerWidth)

    const statsCardX = left + innerPadding + columnWidth / 2
    const skillsCardX = statsCardX + columnWidth + columnGap

    this.createStatsCard(
      snapshot,
      statsCardX,
      contentCenterY,
      columnWidth,
      contentHeight,
    )
    this.createSkillsCard(
      snapshot,
      skillsCardX,
      contentCenterY,
      columnWidth,
      contentHeight,
    )

    const settingsY = top + panelHeight - 82
    const actionsY = top + panelHeight - 39
    const buttonGap = 8
    const buttonWidth = (innerWidth - buttonGap * 3) / 4
    const buttonHeight = 30
    const firstButtonX = left + innerPadding + buttonWidth / 2

    this.musicButton = this.createButton(
      firstButtonX,
      settingsY,
      buttonWidth,
      buttonHeight,
      this.volumeLabel('NHẠC', snapshot.settings.musicVolume),
      0x111c2f,
      () => {
        const volume = this.callbacks.onCycleMusicVolume()
        this.musicButton?.label.setText(this.volumeLabel('NHẠC', volume))
      },
    )

    this.sfxButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap),
      settingsY,
      buttonWidth,
      buttonHeight,
      this.volumeLabel('HIỆU ỨNG', snapshot.settings.sfxVolume),
      0x111c2f,
      () => {
        const volume = this.callbacks.onCycleSfxVolume()
        this.sfxButton?.label.setText(this.volumeLabel('HIỆU ỨNG', volume))
      },
    )

    this.shakeButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap) * 2,
      settingsY,
      buttonWidth,
      buttonHeight,
      this.shakeLabel(snapshot.settings.screenShakeEnabled),
      0x111c2f,
      () => {
        const enabled = this.callbacks.onToggleScreenShake()
        this.shakeButton?.label.setText(this.shakeLabel(enabled))
      },
    )

    this.autoPauseButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap) * 3,
      settingsY,
      buttonWidth,
      buttonHeight,
      this.autoPauseLabel(snapshot.settings.autoPauseEnabled),
      0x111c2f,
      () => {
        const enabled = this.callbacks.onToggleAutoPause()
        this.autoPauseButton?.label.setText(this.autoPauseLabel(enabled))
      },
    )

    const resumeButton = this.createButton(
      firstButtonX,
      actionsY,
      buttonWidth,
      34,
      'TIẾP TỤC',
      0x0e7490,
      this.callbacks.onResume,
      true,
    )

    this.fullscreenButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap),
      actionsY,
      buttonWidth,
      34,
      this.fullscreenLabel(),
      0x17304a,
      () => this.toggleFullscreen(),
    )

    const restartButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap) * 2,
      actionsY,
      buttonWidth,
      34,
      'CHƠI LẠI',
      0x7f1d1d,
      this.callbacks.onRestart,
    )

    const mainMenuButton = this.createButton(
      firstButtonX + (buttonWidth + buttonGap) * 3,
      actionsY,
      buttonWidth,
      34,
      'MENU CHÍNH',
      0x4c1d45,
      this.callbacks.onReturnToMainMenu,
    )

    const buttons = [
      this.musicButton,
      this.sfxButton,
      this.shakeButton,
      this.autoPauseButton,
      resumeButton,
      this.fullscreenButton,
      restartButton,
      mainMenuButton,
    ]

    for (const button of buttons) {
      if (button) {
        this.overlayObjects.push(button.background, button.label)
      }
    }
  }

  close() {
    for (const gameObject of this.overlayObjects) {
      gameObject.destroy()
    }

    this.overlayObjects = []
    this.musicButton = null
    this.sfxButton = null
    this.shakeButton = null
    this.autoPauseButton = null
    this.fullscreenButton = null
    this.setPauseButtonVisible(true)
  }

  setPauseButtonVisible(visible: boolean) {
    this.pauseButtonBackground?.setVisible(visible)

    for (const bar of this.pauseButtonBars) {
      bar.setVisible(visible)
    }
  }

  private createSummaryCards(
    snapshot: PauseMenuSnapshot,
    x: number,
    y: number,
    totalWidth: number,
  ) {
    const gap = 8
    const cardWidth = (totalWidth - gap * 3) / 4
    const entries = [
      ['ĐỢT', `${snapshot.wave}`],
      ['CẤP', `${snapshot.level}`],
      ['ĐIỂM', this.formatInteger(snapshot.score)],
      ['HẠ GỤC', this.formatInteger(snapshot.kills)],
    ] as const

    entries.forEach(([label, value], index) => {
      const cardX = x + cardWidth / 2 + index * (cardWidth + gap)
      const background = this.scene.add
        .rectangle(cardX, y, cardWidth, 32, 0x0d1a2b, 0.98)
        .setStrokeStyle(1, 0x1e7490, 0.64)
        .setScrollFactor(0)
        .setDepth(32003)
      const labelText = this.scene.add
        .text(cardX - cardWidth / 2 + 10, y, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#7dd3fc',
          letterSpacing: 0.7,
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(32004)
      const valueText = this.scene.add
        .text(cardX + cardWidth / 2 - 10, y, value, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#f8fafc',
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(32004)

      this.overlayObjects.push(background, labelText, valueText)
    })
  }

  private createStatsCard(
    snapshot: PauseMenuSnapshot,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const background = this.scene.add
      .rectangle(x, y, width, height, 0x0a1525, 0.98)
      .setStrokeStyle(1, 0x334155, 0.9)
      .setScrollFactor(0)
      .setDepth(32003)

    const heading = this.scene.add
      .text(x - width / 2 + 14, y - height / 2 + 13, 'CHỈ SỐ HIỆN TẠI', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e0f2fe',
        letterSpacing: 1.2,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32004)

    const divider = this.scene.add
      .rectangle(x, y - height / 2 + 37, width - 24, 1, 0x334155, 0.95)
      .setScrollFactor(0)
      .setDepth(32004)

    this.overlayObjects.push(background, heading, divider)

    const stats = snapshot.stats
    const leftEntries: Array<[string, string, string?]> = [
      [
        'MÁU',
        `${Math.round(snapshot.currentHealth)} / ${Math.round(stats.maximumHealth)}`,
        '#fb7185',
      ],
      ['SÁT THƯƠNG', this.formatDecimal(stats.attackDamage), '#fdba74'],
      ['TỐC ĐỘ BẮN', `${this.formatDecimal(1000 / stats.attackInterval, 2)}/s • ${Math.round(stats.attackInterval)}ms`, '#67e8f9'],
      ['DI CHUYỂN', `${Math.round(stats.movementSpeed)}`, '#86efac'],
      ['GIẢM SÁT THƯƠNG', this.formatPercent(stats.damageReduction), '#cbd5e1'],
    ]

    const rightEntries: Array<[string, string, string?]> = [
      ['TẦM BẮN', `${Math.round(stats.attackRange)}`, '#93c5fd'],
      ['TỐC ĐỘ ĐẠN', `${Math.round(stats.projectileSpeed)}`, '#7dd3fc'],
      ['PHẠM VI HÚT', `${Math.round(stats.pickupRadius)}`, '#c4b5fd'],
      ['CHÍ MẠNG', this.formatPercent(stats.criticalChance), '#fde047'],
      ['SÁT THƯƠNG CHÍ MẠNG', `${this.formatDecimal(stats.criticalMultiplier, 1)}×`, '#facc15'],
    ]

    const innerLeft = x - width / 2 + 14
    const middle = x + 2
    const rowStartY = y - height / 2 + 53
    const rowGap = 29
    const statColumnWidth = width / 2 - 21

    leftEntries.forEach((entry, index) => {
      this.createStatRow(
        innerLeft,
        rowStartY + index * rowGap,
        statColumnWidth,
        entry[0],
        entry[1],
        entry[2],
      )
    })

    rightEntries.forEach((entry, index) => {
      this.createStatRow(
        middle,
        rowStartY + index * rowGap,
        statColumnWidth,
        entry[0],
        entry[1],
        entry[2],
      )
    })

    const protocolBoxY = y + height / 2 - 45
    const protocolBox = this.scene.add
      .rectangle(x, protocolBoxY, width - 24, 54, 0x07101d, 0.96)
      .setStrokeStyle(1, 0x155e75, 0.72)
      .setScrollFactor(0)
      .setDepth(32004)
    const advantage = this.scene.add
      .text(
        x - width / 2 + 22,
        protocolBoxY - 16,
        `LỢI THẾ  ${snapshot.protocolAdvantages}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#86efac',
          wordWrap: { width: width - 44 },
        },
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(32005)
    const drawback = this.scene.add
      .text(
        x - width / 2 + 22,
        protocolBoxY + 12,
        `ĐÁNH ĐỔI  ${snapshot.protocolDrawback}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#fda4af',
          wordWrap: { width: width - 44 },
        },
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(32005)

    this.overlayObjects.push(protocolBox, advantage, drawback)
  }

  private createStatRow(
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    valueColor = '#f8fafc',
  ) {
    const labelText = this.scene.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: '#64748b',
        letterSpacing: 0.4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32005)

    const valueText = this.scene.add
      .text(x, y + 11, value, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: valueColor,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32005)

    const underline = this.scene.add
      .rectangle(x + width / 2, y + 27, width, 1, 0x1e293b, 0.9)
      .setScrollFactor(0)
      .setDepth(32004)

    this.overlayObjects.push(labelText, valueText, underline)
  }

  private createSkillsCard(
    snapshot: PauseMenuSnapshot,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const background = this.scene.add
      .rectangle(x, y, width, height, 0x0a1525, 0.98)
      .setStrokeStyle(1, 0x334155, 0.9)
      .setScrollFactor(0)
      .setDepth(32003)

    const heading = this.scene.add
      .text(x - width / 2 + 14, y - height / 2 + 13, 'KỸ NĂNG ĐANG SỞ HỮU', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e0f2fe',
        letterSpacing: 1.1,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(32004)

    const slotText = this.scene.add
      .text(
        x + width / 2 - 14,
        y - height / 2 + 14,
        `Ô CHỦ ĐỘNG ${snapshot.activeSkillCount}/${snapshot.maximumActiveSkills}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#67e8f9',
        },
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(32004)

    const divider = this.scene.add
      .rectangle(x, y - height / 2 + 37, width - 24, 1, 0x334155, 0.95)
      .setScrollFactor(0)
      .setDepth(32004)

    this.overlayObjects.push(background, heading, slotText, divider)

    if (snapshot.skills.length === 0) {
      const empty = this.scene.add
        .text(x, y - 8, 'CHƯA CÓ KỸ NĂNG\nHãy lên cấp để mở khóa kỹ năng đầu tiên.', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#64748b',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(32004)

      this.overlayObjects.push(empty)
      return
    }

    const maximumVisible = Math.max(5, Math.floor((height - 54) / 31))
    const visibleSkills = snapshot.skills.slice(0, maximumVisible)
    const rowStartY = y - height / 2 + 51
    const rowHeight = 30

    visibleSkills.forEach((skill, index) => {
      const rowY = rowStartY + index * rowHeight
      const isFusion = skill.category === 'fusion'
      const accentColor = isFusion
        ? 0xd946ef
        : skill.category === 'weapon'
          ? 0xeab308
          : 0x0891b2
      const backgroundColor = isFusion ? 0x24102a : 0x0d1a2b

      const rowBackground = this.scene.add
        .rectangle(x, rowY + 12, width - 24, 25, backgroundColor, 0.96)
        .setStrokeStyle(1, accentColor, isFusion ? 0.65 : 0.36)
        .setScrollFactor(0)
        .setDepth(32004)
      const marker = this.scene.add
        .rectangle(x - width / 2 + 19, rowY + 12, 4, 15, accentColor, 0.95)
        .setScrollFactor(0)
        .setDepth(32005)
      const iconKey = skill.id.startsWith('equipped-')
        ? `active-icon-${skill.id.replace('equipped-', '')}`
        : isFusion
          ? 'upgrade-icon-skill-fusion'
          : `upgrade-icon-${skill.id}`
      const icon = this.scene.add
        .image(x - width / 2 + 33, rowY + 12, iconKey)
        .setDisplaySize(22, 22)
        .setScrollFactor(0)
        .setDepth(32006)
      const titleText = this.scene.add
        .text(x - width / 2 + 49, rowY + 12, this.shortenText(skill.title, isFusion ? 30 : 26), {
          fontFamily: 'Arial, sans-serif',
          fontSize: isFusion ? '9px' : '10px',
          fontStyle: 'bold',
          color: isFusion ? '#f5d0fe' : '#e2e8f0',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(32005)

      const levelLabel = isFusion
        ? `BẬC ${skill.tier ?? 1} • CẤP ${skill.level}`
        : `CẤP ${skill.level}/${skill.maximumLevel}`
      const levelText = this.scene.add
        .text(x + width / 2 - 19, rowY + 12, levelLabel, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: isFusion ? '#f0abfc' : '#7dd3fc',
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(32005)

      this.overlayObjects.push(
        rowBackground,
        marker,
        icon,
        titleText,
        levelText,
      )
    })

    if (snapshot.skills.length > visibleSkills.length) {
      const remaining = snapshot.skills.length - visibleSkills.length
      const moreText = this.scene.add
        .text(
          x,
          y + height / 2 - 16,
          `+ ${remaining} kỹ năng khác`,
          {
            fontFamily: 'Arial, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#94a3b8',
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(32005)

      this.overlayObjects.push(moreText)
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fillColor: number,
    onClick: () => void,
    strong = false,
  ): MenuButton {
    const background = this.scene.add
      .rectangle(x, y, width, height, fillColor, 0.99)
      .setStrokeStyle(1, strong ? 0x67e8f9 : 0x475569, strong ? 0.95 : 0.75)
      .setScrollFactor(0)
      .setDepth(32010)
      .setInteractive({ useHandCursor: true })
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: height <= 30 ? '9px' : '10px',
        fontStyle: 'bold',
        color: strong ? '#ecfeff' : '#e2e8f0',
        letterSpacing: 0.5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(32011)

    background.on('pointerover', () => {
      background.setFillStyle(strong ? 0x0e7490 : 0x1e3a4a, 1).setScale(1.012)
      label.setScale(1.012)
    })
    background.on('pointerout', () => {
      background.setFillStyle(fillColor, 0.99).setScale(1)
      label.setScale(1)
    })
    background.on('pointerup', onClick)

    return { background, label }
  }

  private toggleFullscreen() {
    if (this.scene.scale.isFullscreen) {
      this.scene.scale.stopFullscreen()
    } else {
      this.scene.scale.startFullscreen()
    }

    this.scene.time.delayedCall(80, () => {
      this.fullscreenButton?.label.setText(this.fullscreenLabel())
    })
  }


  private shortenText(value: string, maximumLength: number) {
    if (value.length <= maximumLength) {
      return value
    }

    return `${value.slice(0, Math.max(1, maximumLength - 1)).trim()}…`
  }

  private formatInteger(value: number) {
    return Math.max(0, Math.round(value)).toLocaleString('vi-VN')
  }

  private formatDecimal(value: number, digits = 1) {
    const rounded = Number(value.toFixed(digits))
    return rounded.toLocaleString('vi-VN', {
      maximumFractionDigits: digits,
    })
  }

  private formatPercent(value: number) {
    return `${this.formatDecimal(value * 100, 1)}%`
  }

  private volumeLabel(title: string, volume: number) {
    const percentage = Math.round(volume * 100)
    return `${title} ${percentage === 0 ? 'TẮT' : `${percentage}%`}`
  }

  private shakeLabel(enabled: boolean) {
    return `RUNG ${enabled ? 'BẬT' : 'TẮT'}`
  }

  private autoPauseLabel(enabled: boolean) {
    return `RỜI TAB ${enabled ? 'BẬT' : 'TẮT'}`
  }

  private fullscreenLabel() {
    return this.scene.scale.isFullscreen
      ? 'THOÁT TOÀN MÀN'
      : 'TOÀN MÀN HÌNH'
  }

  private destroy() {
    this.close()
    this.pauseButtonBackground?.destroy()

    for (const bar of this.pauseButtonBars) {
      bar.destroy()
    }

    this.pauseButtonBackground = null
    this.pauseButtonBars = []
  }
}
