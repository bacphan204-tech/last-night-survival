import Phaser from 'phaser'
import {
  getActiveAbilityDefinition,
  type ActiveAbilityDefinition,
  type ActiveAbilityId,
} from '../data/activeAbilities'
import type { EnemyUnit, PlayerStats } from '../types/game'

export type AbilitySoundCue =
  | 'barrage'
  | 'dash'
  | 'field'
  | 'heal'
  | 'explosion'
  | 'buff'
  | 'shield'
  | 'lightning'
  | 'ultimate'

export type AbilityDashResult = {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export type ActiveAbilityCombatContext = {
  now: number
  playerX: number
  playerY: number
  stats: Readonly<PlayerStats>
  enemies: EnemyUnit[]
  spawnRadialProjectiles: (
    count: number,
    damageMultiplier: number,
    forceNonCritical: boolean,
  ) => void
  damageEnemy: (enemy: EnemyUnit, damage: number, critical?: boolean) => void
  healPlayer: (amount: number) => void
  dashPlayer: (distance: number) => AbilityDashResult
  shakeCamera: (duration: number, intensity: number) => void
  playSound: (cue: AbilitySoundCue) => void
}

type AbilityObject =
  | Phaser.GameObjects.Arc
  | Phaser.GameObjects.Polygon
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Graphics
type AbilityObjects = AbilityObject[]

export class ActiveAbilityCombatSystem {
  private readonly scene: Phaser.Scene
  private readonly definition: ActiveAbilityDefinition | null
  private latestContext: ActiveAbilityCombatContext | null = null
  private enabled = true
  private nextReadyAt = 0

  private overheadOuter: Phaser.GameObjects.Arc | null = null
  private overheadInner: Phaser.GameObjects.Arc | null = null
  private overheadIcon: Phaser.GameObjects.Image | null = null
  private overheadTitle: Phaser.GameObjects.Text | null = null
  private overheadCooldown: Phaser.GameObjects.Text | null = null

  private buttonOuter: Phaser.GameObjects.Arc | null = null
  private buttonInner: Phaser.GameObjects.Arc | null = null
  private buttonIcon: Phaser.GameObjects.Image | null = null
  private buttonCooldown: Phaser.GameObjects.Text | null = null
  private buttonHint: Phaser.GameObjects.Text | null = null
  private buttonName: Phaser.GameObjects.Text | null = null

  private magneticFieldUntil = 0
  private nextMagneticTickAt = 0
  private magneticObjects: AbilityObjects = []

  private regenerationUntil = 0
  private nextRegenerationTickAt = 0

  private overdriveUntil = 0
  private fortressUntil = 0
  private invulnerableUntil = 0
  private apocalypseUntil = 0
  private nextApocalypseTickAt = 0
  private nextApocalypseVisualAt = 0
  private nextDurationParticleAt = 0
  private buffObjects: AbilityObjects = []
  private shieldObjects: AbilityObjects = []
  private apocalypseObjects: AbilityObjects = []

  private voidDominionUntil = 0
  private nextVoidDominionTickAt = 0
  private voidDominionCenterX = 0
  private voidDominionCenterY = 0
  private voidDominionObjects: AbilityObjects = []

  constructor(scene: Phaser.Scene, abilityId: ActiveAbilityId | null) {
    this.scene = scene
    this.definition = getActiveAbilityDefinition(abilityId)
  }

  create(playerX: number, playerY: number) {
    if (!this.definition || this.buttonOuter) return

    const color = this.definition.color
    const secondary = this.definition.secondaryColor

    if (this.definition.honorTitle) {
      this.overheadTitle = this.scene.add
        .text(playerX, playerY - 78, this.definition.honorTitle, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: this.toCssColor(secondary),
          stroke: '#020617',
          strokeThickness: 5,
          letterSpacing: 1.1,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(playerY + 29)
        .setShadow(0, 0, this.toCssColor(color), 9, true, true)

      this.overheadCooldown = this.scene.add
        .text(playerX, playerY - 60, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '8px',
          fontStyle: 'bold',
          color: '#f8fafc',
          stroke: '#020617',
          strokeThickness: 3,
          letterSpacing: 0.5,
        })
        .setOrigin(0.5)
        .setDepth(playerY + 29)
    } else {
      this.overheadOuter = this.scene.add
        .circle(playerX, playerY - 72, 16, 0x020617, 0.42)
        .setStrokeStyle(3, color, 0.92)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(playerY + 25)

      this.overheadInner = this.scene.add
        .circle(playerX, playerY - 72, 10, color, 0.18)
        .setStrokeStyle(1, secondary, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(playerY + 26)

      this.overheadIcon = this.scene.add
        .image(
          playerX,
          playerY - 72,
          `active-icon-${this.definition.id}`,
        )
        .setDisplaySize(30, 30)
        .setDepth(playerY + 27)

      this.overheadCooldown = this.scene.add
        .text(playerX, playerY - 50, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#f8fafc',
          stroke: '#020617',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(playerY + 27)
    }

    const x = this.scene.scale.width - 84
    const y = this.scene.scale.height - 86

    this.buttonOuter = this.scene.add
      .circle(x, y, 45, 0x07111f, 0.94)
      .setStrokeStyle(4, color, 0.92)
      .setScrollFactor(0)
      .setDepth(28820)
      .setInteractive(new Phaser.Geom.Circle(45, 45, 45), Phaser.Geom.Circle.Contains)

    this.buttonInner = this.scene.add
      .circle(x, y, 35, color, 0.16)
      .setStrokeStyle(2, secondary, 0.74)
      .setScrollFactor(0)
      .setDepth(28821)

    this.buttonIcon = this.scene.add
      .image(x, y - 2, `active-icon-${this.definition.id}`)
      .setDisplaySize(62, 62)
      .setScrollFactor(0)
      .setDepth(28822)

    this.buttonCooldown = this.scene.add
      .text(x, y + 1, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(28824)

    const touchEnabled = this.isTouchDevice()
    this.buttonHint = this.scene.add
      .text(x, y + 57, touchEnabled ? 'CHẠM ĐỂ DÙNG' : 'CLICK HOẶC [Q]', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 0.6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(28822)

    this.buttonName = this.scene.add
      .text(x, y - 58, this.definition.name.toUpperCase(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: this.toCssColor(secondary),
        stroke: '#020617',
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: 130 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(28822)

    this.buttonOuter.on('pointerover', () => {
      if (this.enabled && this.getCooldownRemainingSeconds(this.scene.time.now) <= 0) {
        this.buttonOuter?.setScale(1.06)
        this.buttonInner?.setScale(1.06)
      }
    })
    this.buttonOuter.on('pointerout', () => {
      this.buttonOuter?.setScale(1)
      this.buttonInner?.setScale(1)
    })
    this.buttonOuter.on('pointerup', () => {
      if (this.latestContext) this.tryActivate(this.latestContext)
    })

    this.scene.events.once('shutdown', () => this.destroy())
  }

  reset() {
    this.nextReadyAt = 0
    this.magneticFieldUntil = 0
    this.nextMagneticTickAt = 0
    this.regenerationUntil = 0
    this.nextRegenerationTickAt = 0
    this.overdriveUntil = 0
    this.fortressUntil = 0
    this.invulnerableUntil = 0
    this.apocalypseUntil = 0
    this.nextApocalypseTickAt = 0
    this.nextApocalypseVisualAt = 0
    this.nextDurationParticleAt = 0
    this.voidDominionUntil = 0
    this.nextVoidDominionTickAt = 0
    this.voidDominionCenterX = 0
    this.voidDominionCenterY = 0
    this.clearObjects(this.magneticObjects)
    this.clearObjects(this.buffObjects)
    this.clearObjects(this.shieldObjects)
    this.clearObjects(this.apocalypseObjects)
    this.clearObjects(this.voidDominionObjects)
  }

  update(context: ActiveAbilityCombatContext) {
    this.latestContext = context
    if (!this.definition) return

    this.updateRegeneration(context)
    this.updateMagneticField(context)
    this.updateApocalypse(context)
    this.updateVoidDominion(context)
    this.updateDurationVisuals(context)
    this.updateHalo(context)
    this.updateButton(context.now)
  }

  tryActivate(context: ActiveAbilityCombatContext) {
    if (
      !this.definition ||
      !this.enabled ||
      context.now < this.nextReadyAt
    ) {
      return false
    }

    this.latestContext = context
    this.nextReadyAt = context.now + this.definition.cooldownSeconds * 1000

    switch (this.definition.id) {
      case 'bullet-crown':
        this.activateBulletCrown(context)
        break
      case 'phase-dash':
        this.activatePhaseDash(context)
        break
      case 'magnetic-field':
        this.activateMagneticField(context)
        break
      case 'renewal-pulse':
        this.activateRenewalPulse(context)
        break
      case 'plasma-detonation':
        this.activatePlasmaDetonation(context)
        break
      case 'war-overdrive':
        this.activateWarOverdrive(context)
        break
      case 'aegis-fortress':
        this.activateAegisFortress(context)
        break
      case 'rift-step':
        this.activateRiftStep(context)
        break
      case 'heaven-judgment':
        this.activateHeavenJudgment(context)
        break
      case 'eternal-apocalypse':
        this.activateEternalApocalypse(context)
        break
      case 'supreme-starfall':
        this.activateSupremeStarfall(context)
        break
      case 'void-dominion':
        this.activateVoidDominion(context)
        break
      case 'last-night-verdict':
        this.activateLastNightVerdict(context)
        break
    }

    this.showActivationBanner(context)
    return true
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.updateInteractivity()
  }

  setVisible(visible: boolean) {
    const objects = [
      this.overheadOuter,
      this.overheadInner,
      this.overheadIcon,
      this.overheadTitle,
      this.overheadCooldown,
      this.buttonOuter,
      this.buttonInner,
      this.buttonIcon,
      this.buttonCooldown,
      this.buttonHint,
      this.buttonName,
    ]
    for (const object of objects) object?.setVisible(visible)
  }

  getDefinition() {
    return this.definition
  }

  getCooldownRemainingSeconds(now: number) {
    return Math.max(0, Math.ceil((this.nextReadyAt - now) / 1000))
  }

  getDamageMultiplier(now: number) {
    if (now < this.overdriveUntil) return 1.45
    if (now < this.apocalypseUntil) return 1.3
    return 1
  }

  getAttackIntervalMultiplier(now: number) {
    if (now < this.overdriveUntil) return 0.68
    if (now < this.apocalypseUntil) return 0.75
    return 1
  }

  getMovementSpeedMultiplier(now: number) {
    if (now < this.overdriveUntil) return 1.18
    if (now < this.apocalypseUntil) return 1.15
    return 1
  }

  getDamageReductionBonus(now: number) {
    if (now < this.fortressUntil) return 0.65
    if (now < this.apocalypseUntil) return 0.25
    return 0
  }

  isInvulnerable(now: number) {
    return now < this.invulnerableUntil
  }

  private activateBulletCrown(context: ActiveAbilityCombatContext) {
    context.spawnRadialProjectiles(10, 1, true)
    context.playSound('barrage')
    context.shakeCamera(130, 0.004)
    this.createBulletCrownVisual(context.playerX, context.playerY)
    this.createBurst(context.playerX, context.playerY, 120, this.definition!.color, 12)
  }

  private activatePhaseDash(context: ActiveAbilityCombatContext) {
    this.invulnerableUntil = Math.max(this.invulnerableUntil, context.now + 450)
    const result = context.dashPlayer(360)
    this.createDashTrail(result, this.definition!.color)
    this.createDashImpact(result.toX, result.toY, 125, this.definition!.color)
    this.damageArea(context, result.toX, result.toY, 125, 1.8)
    context.playSound('dash')
    context.shakeCamera(90, 0.003)
  }

  private activateMagneticField(context: ActiveAbilityCombatContext) {
    this.magneticFieldUntil = context.now + 10_000
    this.nextMagneticTickAt = context.now
    this.clearObjects(this.magneticObjects)

    const outer = this.scene.add
      .circle(context.playerX, context.playerY, 190, this.definition!.color, 0.055)
      .setStrokeStyle(5, this.definition!.color, 0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 5)
    const inner = this.scene.add
      .circle(context.playerX, context.playerY, 142, this.definition!.secondaryColor, 0.035)
      .setStrokeStyle(3, this.definition!.secondaryColor, 0.54)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 4)
    const core = this.scene.add
      .circle(context.playerX, context.playerY, 62, this.definition!.color, 0.08)
      .setStrokeStyle(2, this.definition!.secondaryColor, 0.64)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 3)
    this.magneticObjects.push(outer, inner, core)

    for (let index = 0; index < 6; index++) {
      const angle = (Math.PI * 2 * index) / 6
      const node = this.scene.add
        .circle(
          context.playerX + Math.cos(angle) * 164,
          context.playerY + Math.sin(angle) * 86,
          7,
          index % 2 === 0 ? this.definition!.color : this.definition!.secondaryColor,
          0.82,
        )
        .setStrokeStyle(2, 0xffffff, 0.58)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(context.playerY - 2)
      this.magneticObjects.push(node)
    }
    context.playSound('field')
  }

  private activateRenewalPulse(context: ActiveAbilityCombatContext) {
    context.healPlayer(context.stats.maximumHealth * 0.35)
    this.regenerationUntil = context.now + 5000
    this.nextRegenerationTickAt = context.now + 1000
    this.createRenewalVisual(context.playerX, context.playerY)
    this.createBurst(context.playerX, context.playerY, 150, this.definition!.color, 16)
    context.playSound('heal')
  }

  private activatePlasmaDetonation(context: ActiveAbilityCombatContext) {
    this.damageArea(context, context.playerX, context.playerY, 330, 6)
    this.createPlasmaDetonationVisual(context.playerX, context.playerY, 330)
    this.createBurst(context.playerX, context.playerY, 330, this.definition!.color, 24)
    context.playSound('explosion')
    context.shakeCamera(260, 0.012)
  }

  private activateWarOverdrive(context: ActiveAbilityCombatContext) {
    this.overdriveUntil = context.now + 12_000
    this.clearObjects(this.buffObjects)
    const ring = this.scene.add
      .circle(context.playerX, context.playerY, 68, this.definition!.color, 0.1)
      .setStrokeStyle(5, this.definition!.secondaryColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 5)
    const core = this.scene.add
      .circle(context.playerX, context.playerY, 38, this.definition!.color, 0.18)
      .setStrokeStyle(2, 0xfef3c7, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 4)
    const sigil = this.scene.add
      .polygon(
        context.playerX,
        context.playerY,
        [0, -52, 18, -18, 52, 0, 18, 18, 0, 52, -18, 18, -52, 0, -18, -18],
        this.definition!.color,
        0.045,
      )
      .setStrokeStyle(3, this.definition!.secondaryColor, 0.66)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 6)
    this.buffObjects.push(ring, core, sigil)
    context.playSound('buff')
  }

  private activateAegisFortress(context: ActiveAbilityCombatContext) {
    context.healPlayer(context.stats.maximumHealth * 0.2)
    this.fortressUntil = context.now + 10_000
    this.clearObjects(this.shieldObjects)
    const shield = this.scene.add
      .circle(context.playerX, context.playerY, 72, this.definition!.color, 0.1)
      .setStrokeStyle(6, this.definition!.secondaryColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 8)
    const hex = this.scene.add
      .polygon(
        context.playerX,
        context.playerY,
        [0, -62, 54, -31, 54, 31, 0, 62, -54, 31, -54, -31],
        this.definition!.color,
        0.05,
      )
      .setStrokeStyle(3, this.definition!.color, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 7)
    const innerHex = this.scene.add
      .polygon(
        context.playerX,
        context.playerY,
        [0, -42, 36, -21, 36, 21, 0, 42, -36, 21, -36, -21],
        this.definition!.secondaryColor,
        0.035,
      )
      .setStrokeStyle(2, this.definition!.secondaryColor, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY + 9)
    this.shieldObjects.push(shield, hex, innerHex)
    context.playSound('shield')
  }

  private activateRiftStep(context: ActiveAbilityCombatContext) {
    this.invulnerableUntil = Math.max(this.invulnerableUntil, context.now + 1000)
    const result = context.dashPlayer(600)
    this.createRiftPortals(result)
    this.createDashTrail(result, this.definition!.color, 9)
    this.damageArea(context, result.toX, result.toY, 220, 4.5)
    this.createDashImpact(result.toX, result.toY, 220, this.definition!.color)
    this.createBurst(result.toX, result.toY, 220, this.definition!.color, 20)
    context.playSound('dash')
    context.shakeCamera(170, 0.008)
  }

  private activateHeavenJudgment(context: ActiveAbilityCombatContext) {
    const targets = context.enemies
      .filter((enemy) => enemy.alive && enemy.sprite.active)
      .sort((left, right) => {
        const rankWeight = (enemy: EnemyUnit) =>
          enemy.rank === 'boss' ? 3 : enemy.rank === 'mini-boss' ? 2 : enemy.isElite ? 1 : 0
        const rankDifference = rankWeight(right) - rankWeight(left)
        if (rankDifference !== 0) return rankDifference
        return right.maxHealth - left.maxHealth
      })
      .slice(0, 12)

    for (const enemy of targets) {
      this.createLightningStrike(
        enemy.sprite.x + Phaser.Math.Between(-70, 70),
        enemy.sprite.y - Phaser.Math.Between(420, 560),
        enemy.sprite.x,
        enemy.sprite.y,
      )
      context.damageEnemy(enemy, Math.max(1, Math.round(context.stats.attackDamage * 9)), true)
    }

    context.playSound('lightning')
    context.shakeCamera(320, 0.014)
  }

  private activateEternalApocalypse(context: ActiveAbilityCombatContext) {
    this.apocalypseUntil = context.now + 8000
    this.nextApocalypseTickAt = context.now
    this.nextApocalypseVisualAt = context.now
    this.clearObjects(this.apocalypseObjects)

    const outer = this.scene.add
      .circle(context.playerX, context.playerY, 850, this.definition!.color, 0.04)
      .setStrokeStyle(8, this.definition!.color, 0.48)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 8)
    const middle = this.scene.add
      .circle(context.playerX, context.playerY, 520, 0x7c3aed, 0.03)
      .setStrokeStyle(4, 0xc4b5fd, 0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 7)
    const inner = this.scene.add
      .circle(context.playerX, context.playerY, 240, this.definition!.secondaryColor, 0.055)
      .setStrokeStyle(5, this.definition!.secondaryColor, 0.68)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(context.playerY - 6)
    const overlay = this.scene.add
      .rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        0x3b0718,
        0.08,
      )
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(28750)
    this.apocalypseObjects.push(outer, middle, inner, overlay)
    context.playSound('ultimate')
    context.shakeCamera(480, 0.018)
  }

  private activateSupremeStarfall(context: ActiveAbilityCombatContext) {
    const targets = context.enemies
      .filter((enemy) => enemy.alive && enemy.sprite.active)
      .sort((left, right) => {
        const rankWeight = (enemy: EnemyUnit) =>
          enemy.rank === 'boss'
            ? 4
            : enemy.rank === 'mini-boss'
              ? 3
              : enemy.isElite
                ? 2
                : 1
        const rankDifference = rankWeight(right) - rankWeight(left)
        if (rankDifference !== 0) return rankDifference
        return right.maxHealth - left.maxHealth
      })
      .slice(0, 9)

    if (targets.length === 0) {
      this.createSupremeMeteor(
        context,
        context.playerX,
        context.playerY - 120,
        0,
        null,
      )
    } else {
      targets.forEach((enemy, index) => {
        this.createSupremeMeteor(
          context,
          enemy.sprite.x,
          enemy.sprite.y,
          index,
          enemy,
        )
      })
    }

    context.playSound('ultimate')
    context.shakeCamera(420, 0.014)
  }

  private activateVoidDominion(context: ActiveAbilityCombatContext) {
    const nearby = context.enemies
      .filter((enemy) => enemy.alive && enemy.sprite.active)
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Between(
          context.playerX,
          context.playerY,
          left.sprite.x,
          left.sprite.y,
        )
        const rightDistance = Phaser.Math.Distance.Between(
          context.playerX,
          context.playerY,
          right.sprite.x,
          right.sprite.y,
        )
        return leftDistance - rightDistance
      })
      .slice(0, 12)

    if (nearby.length > 0) {
      this.voidDominionCenterX =
        nearby.reduce((sum, enemy) => sum + enemy.sprite.x, 0) /
        nearby.length
      this.voidDominionCenterY =
        nearby.reduce((sum, enemy) => sum + enemy.sprite.y, 0) /
        nearby.length
    } else {
      this.voidDominionCenterX = context.playerX
      this.voidDominionCenterY = context.playerY
    }

    this.voidDominionUntil = context.now + 7000
    this.nextVoidDominionTickAt = context.now
    this.clearObjects(this.voidDominionObjects)

    const x = this.voidDominionCenterX
    const y = this.voidDominionCenterY
    const outer = this.scene.add
      .circle(x, y, 320, this.definition!.color, 0.045)
      .setStrokeStyle(7, this.definition!.secondaryColor, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 8)
    const middle = this.scene.add
      .circle(x, y, 218, 0x6d28d9, 0.055)
      .setStrokeStyle(4, this.definition!.color, 0.68)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 7)
    const core = this.scene.add
      .circle(x, y, 82, 0x020617, 0.88)
      .setStrokeStyle(5, this.definition!.secondaryColor, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 8)
    const sigil = this.scene.add
      .polygon(
        x,
        y,
        [0, -120, 54, -54, 120, 0, 54, 54, 0, 120, -54, 54, -120, 0, -54, -54],
        this.definition!.color,
        0.045,
      )
      .setStrokeStyle(4, this.definition!.secondaryColor, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 5)
    this.voidDominionObjects.push(outer, middle, core, sigil)

    this.createBurst(x, y, 320, this.definition!.secondaryColor, 20)
    context.playSound('field')
    context.shakeCamera(230, 0.008)
  }

  private activateLastNightVerdict(context: ActiveAbilityCombatContext) {
    const centerX = context.playerX
    const centerY = context.playerY

    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      this.scene.time.delayedCall(waveIndex * 190, () => {
        this.damageArea(context, centerX, centerY, 440, 3.2, 35)
        this.createVerdictWave(centerX, centerY, waveIndex)
        context.playSound(waveIndex === 2 ? 'ultimate' : 'explosion')
        context.shakeCamera(150 + waveIndex * 40, 0.006 + waveIndex * 0.002)
      })
    }
  }

  private updateRegeneration(context: ActiveAbilityCombatContext) {
    if (context.now > this.regenerationUntil) return
    while (context.now >= this.nextRegenerationTickAt && this.nextRegenerationTickAt <= this.regenerationUntil) {
      context.healPlayer(context.stats.maximumHealth * 0.03)
      this.nextRegenerationTickAt += 1000
      this.createBurst(context.playerX, context.playerY, 78, 0x22c55e, 8)
    }
  }

  private updateMagneticField(context: ActiveAbilityCombatContext) {
    if (context.now > this.magneticFieldUntil) {
      this.clearObjects(this.magneticObjects)
      return
    }

    const [outer, inner, core, ...nodes] = this.magneticObjects
    outer?.setPosition(context.playerX, context.playerY).setDepth(context.playerY - 5)
    inner?.setPosition(context.playerX, context.playerY).setDepth(context.playerY - 4)
    core?.setPosition(context.playerX, context.playerY).setDepth(context.playerY - 3)

    if (outer instanceof Phaser.GameObjects.Arc) {
      outer.setRotation(context.now / 750).setScale(1 + Math.sin(context.now / 190) * 0.025)
    }
    if (inner instanceof Phaser.GameObjects.Arc) {
      inner.setRotation(-context.now / 520).setScale(1 + Math.cos(context.now / 170) * 0.03)
    }
    if (core instanceof Phaser.GameObjects.Arc) {
      core.setScale(0.94 + Math.sin(context.now / 130) * 0.08)
    }

    nodes.forEach((node, index) => {
      const angle = context.now / 620 + (Math.PI * 2 * index) / Math.max(1, nodes.length)
      node
        .setPosition(
          context.playerX + Math.cos(angle) * 164,
          context.playerY + Math.sin(angle) * 86,
        )
        .setDepth(context.playerY + (Math.sin(angle) > 0 ? 3 : -2))
        .setScale(0.86 + (Math.sin(context.now / 120 + index) + 1) * 0.12)
    })

    while (
      context.now >= this.nextMagneticTickAt &&
      this.nextMagneticTickAt <= this.magneticFieldUntil
    ) {
      this.damageArea(context, context.playerX, context.playerY, 190, 1)
      this.nextMagneticTickAt += 1000
      this.createBurst(context.playerX, context.playerY, 190, this.definition!.color, 10)
    }
  }

  private updateApocalypse(context: ActiveAbilityCombatContext) {
    if (context.now > this.apocalypseUntil) {
      this.clearObjects(this.apocalypseObjects)
      return
    }

    const [outer, middle, inner] = this.apocalypseObjects
    outer
      ?.setPosition(context.playerX, context.playerY)
      .setDepth(context.playerY - 8)
      .setRotation(context.now / 1500)
    middle
      ?.setPosition(context.playerX, context.playerY)
      .setDepth(context.playerY - 7)
      .setRotation(-context.now / 1050)
    inner
      ?.setPosition(context.playerX, context.playerY)
      .setDepth(context.playerY - 6)
      .setRotation(context.now / 720)

    while (
      context.now >= this.nextApocalypseTickAt &&
      this.nextApocalypseTickAt <= this.apocalypseUntil
    ) {
      this.damageArea(context, context.playerX, context.playerY, 850, 2.5, 40)
      this.nextApocalypseTickAt += 500
      this.createBurst(context.playerX, context.playerY, 420, this.definition!.color, 14)
    }

    if (context.now >= this.nextApocalypseVisualAt) {
      this.nextApocalypseVisualAt = context.now + 170
      const angle = Math.random() * Math.PI * 2
      const distance = Phaser.Math.FloatBetween(110, 720)
      const targetX = context.playerX + Math.cos(angle) * distance
      const targetY = context.playerY + Math.sin(angle) * distance * 0.62
      this.createApocalypseMeteor(targetX, targetY)
    }
  }

  private updateVoidDominion(context: ActiveAbilityCombatContext) {
    if (this.voidDominionUntil <= 0) return

    if (context.now > this.voidDominionUntil) {
      this.damageArea(
        context,
        this.voidDominionCenterX,
        this.voidDominionCenterY,
        320,
        4.5,
        40,
      )
      this.createBurst(
        this.voidDominionCenterX,
        this.voidDominionCenterY,
        360,
        this.definition!.secondaryColor,
        30,
      )
      context.playSound('ultimate')
      context.shakeCamera(320, 0.013)
      this.voidDominionUntil = 0
      this.clearObjects(this.voidDominionObjects)
      return
    }

    const [outer, middle, core, sigil] = this.voidDominionObjects
    outer
      ?.setRotation(context.now / 1450)
      .setScale(1 + Math.sin(context.now / 210) * 0.025)
    middle
      ?.setRotation(-context.now / 960)
      .setScale(1 + Math.cos(context.now / 180) * 0.04)
    core
      ?.setRotation(context.now / 560)
      .setScale(0.9 + Math.sin(context.now / 120) * 0.1)
    sigil
      ?.setRotation(-context.now / 1200)
      .setScale(0.96 + Math.cos(context.now / 230) * 0.04)

    while (
      context.now >= this.nextVoidDominionTickAt &&
      this.nextVoidDominionTickAt <= this.voidDominionUntil
    ) {
      this.damageArea(
        context,
        this.voidDominionCenterX,
        this.voidDominionCenterY,
        320,
        1.5,
        40,
      )
      this.nextVoidDominionTickAt += 700
      this.createBurst(
        this.voidDominionCenterX,
        this.voidDominionCenterY,
        240,
        this.definition!.color,
        12,
      )
    }
  }

  private updateDurationVisuals(context: ActiveAbilityCombatContext) {
    if (context.now > this.overdriveUntil) {
      this.clearObjects(this.buffObjects)
    }

    this.buffObjects.forEach((object, index) => {
      object
        .setPosition(context.playerX, context.playerY)
        .setDepth(context.playerY + 5 + index)
        .setRotation((index % 2 === 0 ? 1 : -1) * context.now / (520 + index * 180))
    })

    if (context.now > this.fortressUntil) {
      this.clearObjects(this.shieldObjects)
    }

    this.shieldObjects.forEach((object, index) => {
      object
        .setPosition(context.playerX, context.playerY)
        .setDepth(context.playerY + 8 + index)
        .setRotation((index % 2 === 0 ? 1 : -1) * context.now / (1450 + index * 240))
    })

    if (
      context.now >= this.nextDurationParticleAt &&
      (context.now < this.overdriveUntil || context.now < this.fortressUntil)
    ) {
      this.nextDurationParticleAt = context.now + 90
      this.emitDurationParticle(
        context.playerX,
        context.playerY,
        context.now < this.fortressUntil
          ? 0x93c5fd
          : this.definition?.color ?? 0xef4444,
      )
    }
  }

  private updateHalo(context: ActiveAbilityCombatContext) {
    const remaining = this.getCooldownRemainingSeconds(context.now)
    const ready = remaining <= 0 && this.enabled
    const y = context.playerY - 72
    const depth = context.playerY + 28
    const pulse = 1 + Math.sin(context.now / 180) * 0.06

    if (this.definition?.honorTitle) {
      this.overheadTitle
        ?.setPosition(context.playerX, y - 8)
        .setDepth(depth + 2)
        .setScale(ready ? 1 + Math.sin(context.now / 220) * 0.035 : 0.98)
        .setAlpha(ready ? 1 : 0.58)
      this.overheadCooldown
        ?.setPosition(context.playerX, y + 11)
        .setDepth(depth + 2)
        .setText(remaining > 0 ? `HỒI ${remaining}s` : 'SẴN SÀNG')
        .setAlpha(ready ? 0.9 : 0.68)
      return
    }

    this.overheadOuter
      ?.setPosition(context.playerX, y)
      .setDepth(depth)
      .setScale(ready ? pulse : 0.92)
      .setAlpha(ready ? 0.95 : 0.32)
      .setRotation(context.now / 900)
    this.overheadInner
      ?.setPosition(context.playerX, y)
      .setDepth(depth + 1)
      .setScale(ready ? 1 : 0.88)
      .setAlpha(ready ? 0.82 : 0.22)
      .setRotation(-context.now / 650)
    this.overheadIcon
      ?.setPosition(context.playerX, y - 1)
      .setDepth(depth + 2)
      .setAlpha(ready ? 1 : 0.42)
    this.overheadCooldown
      ?.setPosition(context.playerX, y + 23)
      .setDepth(depth + 2)
      .setText(remaining > 0 ? `${remaining}s` : '')
  }

  private updateButton(now: number) {
    const remaining = this.getCooldownRemainingSeconds(now)
    const ready = remaining <= 0 && this.enabled
    const pulse = 1 + Math.sin(now / 170) * 0.035

    this.buttonOuter?.setAlpha(ready ? 1 : 0.52).setScale(ready ? pulse : 1)
    this.buttonInner?.setAlpha(ready ? 1 : 0.3).setScale(ready ? pulse : 1)
    this.buttonIcon?.setAlpha(ready ? 1 : 0.22)
    this.buttonCooldown?.setText(remaining > 0 ? `${remaining}` : '')
    this.buttonHint?.setAlpha(this.enabled ? 1 : 0.35)
    this.buttonName?.setAlpha(this.enabled ? 1 : 0.42)
    this.updateInteractivity()
  }

  private updateInteractivity() {
    if (!this.buttonOuter) return
    const ready = this.enabled && this.getCooldownRemainingSeconds(this.scene.time.now) <= 0
    if (ready) {
      this.buttonOuter.setInteractive(new Phaser.Geom.Circle(45, 45, 45), Phaser.Geom.Circle.Contains)
    } else {
      this.buttonOuter.disableInteractive()
    }
  }

  private damageArea(
    context: ActiveAbilityCombatContext,
    x: number,
    y: number,
    radius: number,
    multiplier: number,
    maximumTargets = Number.POSITIVE_INFINITY,
    excludedEnemy: EnemyUnit | null = null,
  ) {
    const targets = context.enemies
      .filter((enemy) => {
        if (enemy === excludedEnemy) return false
        if (!enemy.alive || !enemy.sprite.active) return false
        return Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <= radius
      })
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Between(x, y, left.sprite.x, left.sprite.y)
        const rightDistance = Phaser.Math.Distance.Between(x, y, right.sprite.x, right.sprite.y)
        return leftDistance - rightDistance
      })
      .slice(0, maximumTargets)

    const damage = Math.max(1, Math.round(context.stats.attackDamage * multiplier))
    for (const enemy of targets) context.damageEnemy(enemy, damage, false)
  }

  private createSupremeMeteor(
    context: ActiveAbilityCombatContext,
    targetX: number,
    targetY: number,
    index: number,
    target: EnemyUnit | null,
  ) {
    const delay = index * 95
    const warning = this.scene.add
      .circle(targetX, targetY, 54, this.definition!.color, 0.07)
      .setStrokeStyle(4, this.definition!.secondaryColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(targetY + 32)
    const rune = this.scene.add
      .polygon(
        targetX,
        targetY,
        [0, -40, 15, -15, 40, 0, 15, 15, 0, 40, -15, 15, -40, 0, -15, -15],
        this.definition!.color,
        0.04,
      )
      .setStrokeStyle(2, this.definition!.secondaryColor, 0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(targetY + 33)
    const meteor = this.scene.add
      .image(targetX - 150, targetY - 430, 'skill-meteor')
      .setScale(0.82)
      .setTint(this.definition!.secondaryColor)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(targetY + 40)
      .setAlpha(0)

    this.scene.tweens.add({
      targets: [warning, rune],
      scale: 1.25,
      alpha: 0.22,
      yoyo: true,
      repeat: 1,
      delay,
      duration: 130,
    })
    this.scene.tweens.add({
      targets: meteor,
      alpha: 1,
      x: targetX,
      y: targetY,
      rotation: 1.2,
      delay: delay + 80,
      duration: 310,
      ease: 'Cubic.In',
      onComplete: () => {
        meteor.destroy()
        warning.destroy()
        rune.destroy()

        const impactX = target?.alive ? target.sprite.x : targetX
        const impactY = target?.alive ? target.sprite.y : targetY
        if (target?.alive) {
          context.damageEnemy(
            target,
            Math.max(1, Math.round(context.stats.attackDamage * 7.5)),
            true,
          )
        }
        this.damageArea(
          context,
          impactX,
          impactY,
          120,
          1.8,
          10,
          target,
        )
        this.createBurst(
          impactX,
          impactY,
          150,
          this.definition!.secondaryColor,
          18,
        )
        this.createLightningStrike(
          impactX + Phaser.Math.Between(-40, 40),
          impactY - 360,
          impactX,
          impactY,
        )
      },
    })
  }

  private createVerdictWave(x: number, y: number, waveIndex: number) {
    const radius = 180 + waveIndex * 74
    const ring = this.scene.add
      .circle(x, y, radius, this.definition!.color, 0.035)
      .setStrokeStyle(8 - waveIndex, this.definition!.secondaryColor, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 46 + waveIndex)
      .setScale(0.45)
    const reverseRing = this.scene.add
      .circle(x, y, radius * 0.78, this.definition!.secondaryColor, 0.025)
      .setStrokeStyle(4, this.definition!.color, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 45 + waveIndex)
      .setScale(0.4)

    for (let slashIndex = 0; slashIndex < 4; slashIndex++) {
      const angle = (Math.PI * slashIndex) / 4 + waveIndex * 0.38
      const length = radius * 1.55
      const slash = this.scene.add
        .line(
          0,
          0,
          x - Math.cos(angle) * length,
          y - Math.sin(angle) * length * 0.56,
          x + Math.cos(angle) * length,
          y + Math.sin(angle) * length * 0.56,
          slashIndex % 2 === 0
            ? this.definition!.color
            : this.definition!.secondaryColor,
          0.75,
        )
        .setOrigin(0, 0)
        .setLineWidth(12, 2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 50 + slashIndex)

      this.scene.tweens.add({
        targets: slash,
        alpha: 0,
        scaleX: 1.12,
        duration: 420,
        ease: 'Quad.Out',
        onComplete: () => slash.destroy(),
      })
    }

    this.scene.tweens.add({
      targets: [ring, reverseRing],
      scale: 1.42,
      alpha: 0,
      rotation: waveIndex % 2 === 0 ? 0.7 : -0.7,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => {
        ring.destroy()
        reverseRing.destroy()
      },
    })

    this.createBurst(x, y, 440, this.definition!.color, 20)
  }

  private createBulletCrownVisual(x: number, y: number) {
    const count = 10

    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count
      const startRadius = 26
      const endRadius = 116
      const bullet = this.scene.add
        .image(
          x + Math.cos(angle) * startRadius,
          y + Math.sin(angle) * startRadius,
          'player-projectile',
        )
        .setRotation(angle)
        .setTint(this.definition!.secondaryColor)
        .setScale(0.92)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 46)

      const tracer = this.scene.add
        .line(
          0,
          0,
          x + Math.cos(angle) * startRadius,
          y + Math.sin(angle) * startRadius,
          x + Math.cos(angle) * endRadius,
          y + Math.sin(angle) * endRadius,
          this.definition!.color,
          0.36,
        )
        .setOrigin(0, 0)
        .setLineWidth(4, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 45)

      this.scene.tweens.add({
        targets: bullet,
        x: x + Math.cos(angle) * endRadius,
        y: y + Math.sin(angle) * endRadius,
        alpha: 0,
        scale: 1.18,
        duration: 250,
        ease: 'Cubic.Out',
        onComplete: () => bullet.destroy(),
      })

      this.scene.tweens.add({
        targets: tracer,
        alpha: 0,
        duration: 300,
        onComplete: () => tracer.destroy(),
      })
    }
  }

  private createDashImpact(
    x: number,
    y: number,
    radius: number,
    color: number,
  ) {
    const ring = this.scene.add
      .circle(x, y, 14, color, 0.12)
      .setStrokeStyle(5, this.definition!.secondaryColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 35)

    this.scene.tweens.add({
      targets: ring,
      scale: radius / 14,
      alpha: 0,
      duration: 320,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    for (let index = 0; index < 7; index++) {
      const angle = (Math.PI * 2 * index) / 7
      const slash = this.scene.add
        .line(
          0,
          0,
          x + Math.cos(angle) * 12,
          y + Math.sin(angle) * 12,
          x + Math.cos(angle) * radius * 0.78,
          y + Math.sin(angle) * radius * 0.48,
          index % 2 === 0 ? color : this.definition!.secondaryColor,
          0.76,
        )
        .setOrigin(0, 0)
        .setLineWidth(3, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 36)

      this.scene.tweens.add({
        targets: slash,
        alpha: 0,
        duration: 260,
        onComplete: () => slash.destroy(),
      })
    }
  }

  private createRenewalVisual(x: number, y: number) {
    const vertical = this.scene.add
      .rectangle(x, y, 18, 92, this.definition!.secondaryColor, 0.52)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40)
    const horizontal = this.scene.add
      .rectangle(x, y, 92, 18, this.definition!.secondaryColor, 0.52)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40)
    const core = this.scene.add
      .circle(x, y, 22, this.definition!.color, 0.58)
      .setStrokeStyle(4, this.definition!.secondaryColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 41)

    this.scene.tweens.add({
      targets: [vertical, horizontal, core],
      scale: 1.7,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => {
        vertical.destroy()
        horizontal.destroy()
        core.destroy()
      },
    })

    for (let index = 0; index < 12; index++) {
      const angle = (Math.PI * 2 * index) / 12
      const mote = this.scene.add
        .circle(
          x + Math.cos(angle) * 58,
          y + Math.sin(angle) * 34,
          3,
          index % 2 === 0 ? this.definition!.color : this.definition!.secondaryColor,
          0.86,
        )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 42)

      this.scene.tweens.add({
        targets: mote,
        x,
        y: y - 34,
        alpha: 0,
        scale: 0.25,
        duration: 420 + index * 18,
        ease: 'Sine.In',
        onComplete: () => mote.destroy(),
      })
    }
  }

  private createPlasmaDetonationVisual(
    x: number,
    y: number,
    radius: number,
  ) {
    const implosion = this.scene.add
      .circle(x, y, radius * 0.72, this.definition!.color, 0.035)
      .setStrokeStyle(6, this.definition!.secondaryColor, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 38)

    const core = this.scene.add
      .circle(x, y, 28, 0xfef3c7, 0.88)
      .setStrokeStyle(5, this.definition!.color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 39)

    this.scene.tweens.add({
      targets: implosion,
      scale: 0.08,
      alpha: 0.8,
      duration: 150,
      ease: 'Cubic.In',
      onComplete: () => {
        this.scene.tweens.add({
          targets: implosion,
          scale: radius / Math.max(1, implosion.radius),
          alpha: 0,
          duration: 360,
          ease: 'Cubic.Out',
          onComplete: () => implosion.destroy(),
        })
      },
    })

    this.scene.tweens.add({
      targets: core,
      scale: 7.5,
      alpha: 0,
      duration: 330,
      ease: 'Quad.Out',
      onComplete: () => core.destroy(),
    })
  }

  private createRiftPortals(result: AbilityDashResult) {
    const createPortal = (x: number, y: number, delay: number) => {
      const outer = this.scene.add
        .ellipse(x, y, 44, 88, this.definition!.color, 0.12)
        .setStrokeStyle(5, this.definition!.secondaryColor, 0.92)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 32)
      const inner = this.scene.add
        .ellipse(x, y, 22, 64, 0x020617, 0.92)
        .setStrokeStyle(2, this.definition!.color, 0.72)
        .setDepth(y + 33)

      this.scene.tweens.add({
        targets: [outer, inner],
        scaleX: 0.08,
        alpha: 0,
        delay,
        duration: 420,
        ease: 'Cubic.In',
        onComplete: () => {
          outer.destroy()
          inner.destroy()
        },
      })
    }

    createPortal(result.fromX, result.fromY, 70)
    createPortal(result.toX, result.toY, 190)
  }

  private createApocalypseMeteor(x: number, y: number) {
    const warning = this.scene.add
      .circle(x, y, 34, 0xf43f5e, 0.08)
      .setStrokeStyle(3, 0xfda4af, 0.72)
      .setDepth(y + 30)
    const meteor = this.scene.add
      .image(x - 90, y - 250, 'skill-meteor')
      .setScale(0.58)
      .setTint(0xf43f5e)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 34)

    this.scene.tweens.add({
      targets: warning,
      scale: 1.35,
      alpha: 0,
      duration: 300,
      onComplete: () => warning.destroy(),
    })

    this.scene.tweens.add({
      targets: meteor,
      x,
      y,
      rotation: 0.8,
      duration: 300,
      ease: 'Cubic.In',
      onComplete: () => {
        meteor.destroy()
        this.createBurst(x, y, 82, this.definition!.color, 7)
      },
    })
  }

  private emitDurationParticle(
    x: number,
    y: number,
    color: number,
  ) {
    const angle = Math.random() * Math.PI * 2
    const radius = Phaser.Math.FloatBetween(34, 70)
    const particle = this.scene.add
      .rectangle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 0.45,
        5,
        10,
        color,
        0.78,
      )
      .setRotation(angle + Math.PI / 4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 14)

    this.scene.tweens.add({
      targets: particle,
      x,
      y: y - 24,
      rotation: angle + Math.PI,
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(360, 560),
      ease: 'Sine.In',
      onComplete: () => particle.destroy(),
    })
  }

  private createDashTrail(
    result: AbilityDashResult,
    color: number,
    count = 6,
  ) {
    const angle = Phaser.Math.Angle.Between(
      result.fromX,
      result.fromY,
      result.toX,
      result.toY,
    )

    const lane = this.scene.add
      .line(
        0,
        0,
        result.fromX,
        result.fromY,
        result.toX,
        result.toY,
        color,
        0.32,
      )
      .setOrigin(0, 0)
      .setLineWidth(14, 3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(result.fromY, result.toY) + 28)

    this.scene.tweens.add({
      targets: lane,
      alpha: 0,
      duration: 300,
      onComplete: () => lane.destroy(),
    })

    for (let index = 0; index < count; index++) {
      const progress = count <= 1 ? 1 : index / (count - 1)
      const x = Phaser.Math.Linear(result.fromX, result.toX, progress)
      const y = Phaser.Math.Linear(result.fromY, result.toY, progress)
      const ghost = this.scene.add
        .triangle(
          x,
          y,
          -22,
          -13,
          24,
          0,
          -22,
          13,
          color,
          0.28 * (1 - progress * 0.42),
        )
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 30)

      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 0.55,
        duration: 260 + index * 22,
        ease: 'Quad.Out',
        onComplete: () => ghost.destroy(),
      })
    }
  }

  private createLightningStrike(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    const graphics = this.scene.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(toY + 45)

    const points: Phaser.Math.Vector2[] = [
      new Phaser.Math.Vector2(fromX, fromY),
    ]
    const segments = 9

    for (let index = 1; index < segments; index++) {
      const progress = index / segments
      points.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(fromX, toX, progress) + Phaser.Math.Between(-26, 26),
          Phaser.Math.Linear(fromY, toY, progress) + Phaser.Math.Between(-14, 14),
        ),
      )
    }
    points.push(new Phaser.Math.Vector2(toX, toY))

    graphics.lineStyle(12, this.definition!.color, 0.24)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    graphics.lineStyle(5, this.definition!.secondaryColor, 0.96)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    graphics.lineStyle(2, 0xffffff, 1)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    const impact = this.scene.add
      .circle(toX, toY, 14, this.definition!.secondaryColor, 0.82)
      .setStrokeStyle(5, this.definition!.color, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(toY + 46)

    const groundRing = this.scene.add
      .ellipse(toX, toY + 8, 42, 18, this.definition!.color, 0.18)
      .setStrokeStyle(3, this.definition!.secondaryColor, 0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(toY + 44)

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 260,
      onComplete: () => graphics.destroy(),
    })

    this.scene.tweens.add({
      targets: impact,
      scale: 3.4,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => impact.destroy(),
    })

    this.scene.tweens.add({
      targets: groundRing,
      scale: 2.2,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => groundRing.destroy(),
    })
  }

  private createBurst(
    x: number,
    y: number,
    radius: number,
    color: number,
    particleCount: number,
  ) {
    const ring = this.scene.add
      .circle(x, y, Math.max(8, radius * 0.08), color, 0.08)
      .setStrokeStyle(Math.max(2, Math.min(7, radius / 55)), color, 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40)

    this.scene.tweens.add({
      targets: ring,
      scale: radius / Math.max(8, radius * 0.08),
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    for (let index = 0; index < particleCount; index++) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.18
      const distance = radius * Phaser.Math.FloatBetween(0.45, 1)
      const particle = this.scene.add
        .circle(x, y, Phaser.Math.FloatBetween(2, 5), color, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 41)
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(260, 520),
        ease: 'Quad.Out',
        onComplete: () => particle.destroy(),
      })
    }
  }

  private showActivationBanner(context: ActiveAbilityCombatContext) {
    const text = this.scene.add
      .text(
        this.scene.scale.width / 2,
        112,
        `${this.definition!.name.toUpperCase()}  •  ĐÃ KÍCH HOẠT`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: this.toCssColor(this.definition!.secondaryColor),
          stroke: '#020617',
          strokeThickness: 6,
          letterSpacing: 1.2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(28900)
      .setAlpha(0)

    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      y: 98,
      duration: 180,
      ease: 'Back.Out',
    })
    this.scene.time.delayedCall(900, () => {
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        y: 82,
        duration: 260,
        ease: 'Quad.In',
        onComplete: () => text.destroy(),
      })
    })

    this.buttonOuter?.setScale(1.14)
    this.buttonInner?.setScale(1.14)
    this.scene.tweens.add({
      targets: [this.buttonOuter, this.buttonInner].filter(Boolean),
      scale: 1,
      duration: 180,
      ease: 'Back.Out',
    })

    // Giữ tham số context để API hiển thị có thể mở rộng theo vị trí người chơi.
    void context
  }

  private clearObjects(objects: AbilityObjects) {
    for (const object of objects) object.destroy()
    objects.length = 0
  }

  private isTouchDevice() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia?.('(pointer: coarse)').matches === true ||
      this.scene.sys.game.device.input.touch
    )
  }

  private toCssColor(value: number) {
    return `#${value.toString(16).padStart(6, '0')}`
  }

  private destroy() {
    this.clearObjects(this.magneticObjects)
    this.clearObjects(this.buffObjects)
    this.clearObjects(this.shieldObjects)
    this.clearObjects(this.apocalypseObjects)
    this.clearObjects(this.voidDominionObjects)

    const objects = [
      this.overheadOuter,
      this.overheadInner,
      this.overheadIcon,
      this.overheadTitle,
      this.overheadCooldown,
      this.buttonOuter,
      this.buttonInner,
      this.buttonIcon,
      this.buttonCooldown,
      this.buttonHint,
      this.buttonName,
    ]
    for (const object of objects) object?.destroy()

    this.overheadOuter = null
    this.overheadInner = null
    this.overheadIcon = null
    this.overheadTitle = null
    this.overheadCooldown = null
    this.buttonOuter = null
    this.buttonInner = null
    this.buttonIcon = null
    this.buttonCooldown = null
    this.buttonHint = null
    this.buttonName = null
    this.latestContext = null
  }
}
