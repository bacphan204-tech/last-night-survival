import Phaser from 'phaser'
import type { UpgradeChoice, UpgradeId } from '../types/game'

export const UPGRADE_SELECTED_EVENT = 'last-night-upgrade-selected'

type UpgradeSceneData = {
  level: number
  choices: UpgradeChoice[]
  activeSkillCount?: number
  maximumActiveSkills?: number
  multishotLevel?: number
}

type CardVisual = {
  panel: Phaser.GameObjects.Rectangle
  glow: Phaser.GameObjects.Rectangle
  icon: Phaser.GameObjects.Image
  iconRing: Phaser.GameObjects.Arc
  cornerGraphics: Phaser.GameObjects.Graphics
}

export class UpgradeScene extends Phaser.Scene {
  private choices: UpgradeChoice[] = []
  private selectionLocked = false
  private numberKeys: Phaser.Input.Keyboard.Key[] = []
  private cardVisuals: CardVisual[] = []

  constructor() {
    super('UpgradeScene')
  }

  create(data: UpgradeSceneData) {
    this.choices = data.choices
    this.selectionLocked = false
    this.cardVisuals = []

    const width = this.scale.width
    const height = this.scale.height

    this.createBackdrop(width, height)
    this.createHeader(data, width)

    const gap = width < 900 ? 12 : 22
    const cardWidth = Phaser.Math.Clamp(
      (width - 54 - gap * Math.max(0, this.choices.length - 1)) /
        Math.max(1, this.choices.length),
      198,
      292,
    )
    const cardHeight = Phaser.Math.Clamp(height - 292, 270, 338)
    const totalWidth =
      this.choices.length * cardWidth +
      Math.max(0, this.choices.length - 1) * gap
    const startX = width / 2 - totalWidth / 2 + cardWidth / 2
    const centerY = height / 2 + 54

    this.choices.forEach((choice, index) => {
      this.createChoiceCard(
        startX + index * (cardWidth + gap),
        centerY,
        cardWidth,
        cardHeight,
        choice,
        index,
      )
    })

    this.add
      .text(
        width / 2,
        height - 26,
        'PHÍM 1 / 2 / 3  •  NHẤP CHUỘT ĐỂ XÁC NHẬN',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#64748b',
          letterSpacing: 1.7,
        },
      )
      .setOrigin(0.5)

    const keyboard = this.input.keyboard

    if (keyboard) {
      this.numberKeys = [
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      ]
    }
  }

  update(time: number) {
    if (this.selectionLocked) {
      return
    }

    this.cardVisuals.forEach((visual, index) => {
      visual.iconRing.setRotation(time / 1250 + index * 0.7)
      visual.glow.setAlpha(0.035 + (Math.sin(time / 260 + index) + 1) * 0.025)
    })

    for (let index = 0; index < this.numberKeys.length; index++) {
      if (
        Phaser.Input.Keyboard.JustDown(this.numberKeys[index]) &&
        this.choices[index]
      ) {
        this.selectUpgrade(this.choices[index].id)
        return
      }
    }
  }

  private createBackdrop(width: number, height: number) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.93)

    const glow = this.add
      .ellipse(width / 2, height * 0.43, width * 0.9, height * 0.72, 0x0e7490, 0.045)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: glow,
      scaleX: 1.08,
      scaleY: 1.04,
      alpha: 0.075,
      yoyo: true,
      repeat: -1,
      duration: 1800,
      ease: 'Sine.InOut',
    })

    const grid = this.add.graphics()
    grid.lineStyle(1, 0x38bdf8, 0.055)

    for (let x = 0; x <= width; x += 72) {
      grid.lineBetween(x, 0, x, height)
    }

    for (let y = 0; y <= height; y += 72) {
      grid.lineBetween(0, y, width, y)
    }

    const vignette = this.add.graphics()
    vignette.lineStyle(18, 0x020617, 0.72)
    vignette.strokeRect(8, 8, width - 16, height - 16)
  }

  private createHeader(data: UpgradeSceneData, width: number) {
    const activeSkillCount = data.activeSkillCount ?? 0
    const maximumActiveSkills = data.maximumActiveSkills ?? 5
    const multishotLevel = data.multishotLevel ?? 0

    const headerPanel = this.add
      .rectangle(width / 2, 86, Math.min(720, width - 32), 118, 0x07111f, 0.92)
      .setStrokeStyle(2, 0x164e63, 0.9)

    this.add
      .rectangle(width / 2, 30, Math.min(360, width * 0.46), 4, 0x22d3ee, 0.88)

    this.add
      .text(width / 2, 58, `NÂNG CẤP HỆ THỐNG  •  CẤP ${data.level}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 6,
        letterSpacing: 2.5,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 89, 'CHỌN MỘT MÔ-ĐUN ĐỂ TÍCH HỢP', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#67e8f9',
        letterSpacing: 2.1,
      })
      .setOrigin(0.5)

    const slotColor =
      activeSkillCount >= maximumActiveSkills ? '#fbbf24' : '#86efac'

    this.add
      .text(
        width / 2,
        116,
        `Ô KỸ NĂNG ${activeSkillCount}/${maximumActiveSkills}   •   ĐẠN PHÂN KỲ ${multishotLevel}/5`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: slotColor,
          letterSpacing: 1.1,
        },
      )
      .setOrigin(0.5)

    this.add
      .text(
        width / 2,
        140,
        data.level % 5 === 0
          ? `MỐC CẤP ${data.level}: +5% HÚT XP  •  HỒI 8% MÁU`
          : 'TỰ ĐỘNG: +3% SÁT THƯƠNG  •  +1,5% TỐC ĐỘ BẮN  •  +2 MÁU',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: data.level % 5 === 0 ? '#4ade80' : '#94a3b8',
          letterSpacing: 0.65,
        },
      )
      .setOrigin(0.5)

    void headerPanel
  }

  private createChoiceCard(
    x: number,
    y: number,
    width: number,
    height: number,
    choice: UpgradeChoice,
    index: number,
  ) {
    const accent = choice.accentColor
    const accentCss = this.toCssColor(accent)
    const isFusion =
      choice.id === 'skill-fusion' || choice.id === 'fusion-training'
    const isSkill = choice.usesActiveSlot || this.isWeaponSkill(choice.id)
    const categoryLabel = isFusion
      ? 'DUNG HỢP'
      : choice.isNewSkill
        ? 'KỸ NĂNG MỚI'
        : isSkill
          ? 'NÂNG CẤP KỸ NĂNG'
          : 'MÔ-ĐUN CHỈ SỐ'

    const glow = this.add
      .rectangle(x, y, width + 12, height + 12, accent, 0.04)
      .setStrokeStyle(1, accent, 0.2)

    const panel = this.add
      .rectangle(x, y, width, height, 0x08111f, 0.985)
      .setStrokeStyle(2, accent, 0.82)
      .setInteractive({ useHandCursor: true })

    this.add
      .rectangle(x, y - height / 2 + 3, width - 2, 5, accent, 0.9)

    const cornerGraphics = this.createCornerBrackets(x, y, width, height, accent)

    const keyBadge = this.add
      .rectangle(x - width / 2 + 26, y - height / 2 + 26, 30, 30, 0x020617, 0.98)
      .setStrokeStyle(2, accent, 0.9)

    this.add
      .text(keyBadge.x, keyBadge.y, `${index + 1}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: accentCss,
      })
      .setOrigin(0.5)

    this.add
      .text(x + width / 2 - 15, y - height / 2 + 16, categoryLabel, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: isFusion ? '#fdf4ff' : '#e2e8f0',
        backgroundColor: isFusion ? '#86198f' : '#0f172a',
        padding: { x: 7, y: 4 },
        letterSpacing: 0.8,
      })
      .setOrigin(1, 0)

    const iconRing = this.add
      .circle(x, y - height / 2 + 82, 42, 0x020617, 0.9)
      .setStrokeStyle(2, accent, 0.58)
      .setBlendMode(Phaser.BlendModes.ADD)

    const iconKey = `upgrade-icon-${choice.id}`
    const icon = this.add
      .image(x, y - height / 2 + 82, iconKey)
      .setDisplaySize(70, 70)
      .setDepth(panel.depth + 3)

    this.add
      .text(x, y - height / 2 + 132, choice.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: width < 225 ? '14px' : '16px',
        fontStyle: 'bold',
        color: accentCss,
        align: 'center',
        wordWrap: { width: width - 28 },
        lineSpacing: 2,
      })
      .setOrigin(0.5)

    this.add
      .text(x, y - height / 2 + 166, this.getRarityLabel(choice.rarity), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        color: accentCss,
        letterSpacing: 1.8,
      })
      .setOrigin(0.5)

    this.add
      .rectangle(x, y - height / 2 + 180, width - 34, 1, accent, 0.25)

    this.add
      .text(x, y - 1, choice.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: width < 225 ? '11px' : '12px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: width - 32 },
        lineSpacing: 4,
      })
      .setOrigin(0.5)

    const statusY = y + height / 2 - 53
    this.createLevelDisplay(x, statusY - 13, choice, width, accent)

    this.add
      .text(x, statusY + 18, this.getStatusText(choice), {
        fontFamily: 'Arial, sans-serif',
        fontSize: width < 225 ? '9px' : '10px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: width - 26 },
        letterSpacing: 0.45,
      })
      .setOrigin(0.5)

    panel.on('pointerover', () => {
      if (this.selectionLocked) {
        return
      }

      panel.setFillStyle(0x101d31, 1)
      panel.setStrokeStyle(3, accent, 1)
      glow.setAlpha(0.13)
      icon.setScale(1.08)
      iconRing.setScale(1.08).setAlpha(1)
      cornerGraphics.setAlpha(1)
      this.tweens.killTweensOf([panel, icon, iconRing])
      this.tweens.add({
        targets: [panel, icon, iconRing],
        y: '-=5',
        duration: 110,
        ease: 'Quad.Out',
      })
    })

    panel.on('pointerout', () => {
      panel.setFillStyle(0x08111f, 0.985)
      panel.setStrokeStyle(2, accent, 0.82)
      glow.setAlpha(0.04)
      icon.setScale(1)
      iconRing.setScale(1).setAlpha(1)
      cornerGraphics.setAlpha(0.72)
      this.tweens.killTweensOf([panel, icon, iconRing])
      panel.setY(y)
      icon.setY(y - height / 2 + 82)
      iconRing.setY(y - height / 2 + 82)
    })

    panel.on('pointerdown', () => {
      this.selectUpgrade(choice.id)
    })

    this.cardVisuals.push({
      panel,
      glow,
      icon,
      iconRing,
      cornerGraphics,
    })
  }

  private createLevelDisplay(
    x: number,
    y: number,
    choice: UpgradeChoice,
    width: number,
    accent: number,
  ) {
    if (
      choice.id === 'skill-fusion' ||
      choice.id === 'fusion-training' ||
      choice.maxLevel > 20
    ) {
      const label = choice.id === 'skill-fusion'
        ? 'HỢP NHẤT HAI LÕI CẤP 5'
        : choice.id === 'fusion-training'
          ? 'TĂNG CẤP DUNG HỢP'
          : `CẤP ${choice.currentLevel}  →  ${choice.nextLevel}`

      this.add
        .text(x, y, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: this.toCssColor(accent),
          letterSpacing: 0.8,
        })
        .setOrigin(0.5)
      return
    }

    const pipCount = Math.min(5, choice.maxLevel)
    const pipWidth = Math.min(30, (width - 52) / pipCount - 5)
    const totalWidth = pipCount * pipWidth + (pipCount - 1) * 5
    const startX = x - totalWidth / 2 + pipWidth / 2

    for (let index = 0; index < pipCount; index++) {
      const filled = index < choice.nextLevel
      this.add
        .rectangle(
          startX + index * (pipWidth + 5),
          y,
          pipWidth,
          7,
          filled ? accent : 0x1e293b,
          filled ? 0.95 : 0.72,
        )
        .setStrokeStyle(1, accent, filled ? 0.8 : 0.25)
    }
  }

  private createCornerBrackets(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ) {
    const graphics = this.add.graphics().setAlpha(0.72)
    const left = x - width / 2
    const right = x + width / 2
    const top = y - height / 2
    const bottom = y + height / 2
    const length = 18

    graphics.lineStyle(3, color, 0.86)
    graphics.lineBetween(left, top + length, left, top)
    graphics.lineBetween(left, top, left + length, top)
    graphics.lineBetween(right - length, top, right, top)
    graphics.lineBetween(right, top, right, top + length)
    graphics.lineBetween(left, bottom - length, left, bottom)
    graphics.lineBetween(left, bottom, left + length, bottom)
    graphics.lineBetween(right - length, bottom, right, bottom)
    graphics.lineBetween(right, bottom, right, bottom - length)

    return graphics
  }

  private getStatusText(choice: UpgradeChoice) {
    if (choice.id === 'skill-fusion') {
      return 'GIỮ TOÀN BỘ CƠ CHẾ  •  GIẢI PHÓNG 1 Ô'
    }

    if (choice.id === 'fusion-training') {
      return 'CƯỜNG HÓA MỘT DUNG HỢP NGẪU NHIÊN'
    }

    if (choice.usesActiveSlot && choice.isNewSkill) {
      return `MỞ KỸ NĂNG  •  CHIẾM 1 Ô  •  CẤP 1/${choice.maxLevel}`
    }

    return `CẤP ${choice.currentLevel}  →  ${choice.nextLevel} / ${choice.maxLevel}`
  }

  private isWeaponSkill(id: UpgradeId) {
    return id === 'multishot'
  }

  private selectUpgrade(id: UpgradeId) {
    if (this.selectionLocked) {
      return
    }

    this.selectionLocked = true

    for (const visual of this.cardVisuals) {
      visual.panel.disableInteractive()
    }

    this.game.events.emit(UPGRADE_SELECTED_EVENT, id)
  }

  private getRarityLabel(rarity: UpgradeChoice['rarity']) {
    if (rarity === 'epic') {
      return 'SỬ THI'
    }

    if (rarity === 'rare') {
      return 'HIẾM'
    }

    return 'THƯỜNG'
  }

  private toCssColor(value: number) {
    return `#${value.toString(16).padStart(6, '0')}`
  }
}
