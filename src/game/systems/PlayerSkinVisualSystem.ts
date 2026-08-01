import Phaser from 'phaser'
import {
  getPlayerSkinDefinition,
  type PlayerSkinDefinition,
  type PlayerSkinId,
} from '../data/playerSkins'

export class PlayerSkinVisualSystem {
  private readonly scene: Phaser.Scene
  private readonly definition: PlayerSkinDefinition
  private character!: Phaser.GameObjects.Container
  private shadow!: Phaser.GameObjects.Ellipse
  private auraCore!: Phaser.GameObjects.Ellipse
  private auraRing!: Phaser.GameObjects.Ellipse
  private auraRingSecondary!: Phaser.GameObjects.Ellipse
  private auraSigil!: Phaser.GameObjects.Polygon
  private auraNodeLeft!: Phaser.GameObjects.Arc
  private auraNodeRight!: Phaser.GameObjects.Arc
  private exclusiveAuraObjects: Array<
    | Phaser.GameObjects.Ellipse
    | Phaser.GameObjects.Arc
    | Phaser.GameObjects.Polygon
  > = []
  private body!: Phaser.GameObjects.Graphics
  private facing = 1
  private defeated = false
  private nextAuraParticleAt = 0
  private nextMotionTrailAt = 0
  private lastX = 0
  private lastY = 0

  constructor(scene: Phaser.Scene, skinId: PlayerSkinId) {
    this.scene = scene
    this.definition = getPlayerSkinDefinition(skinId)
  }

  create(x: number, y: number) {
    const skin = this.definition

    this.shadow = this.scene.add
      .ellipse(x, y + 26, 70, 20, skin.darkColor, 0.58)
      .setDepth(y - 4)

    this.auraCore = this.scene.add
      .ellipse(
        x,
        y + 8,
        126 + skin.effectTier * 20,
        88 + skin.effectTier * 14,
        skin.auraColor,
        0.15 + skin.effectTier * 0.04,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 3)

    this.auraRing = this.scene.add
      .ellipse(x, y + 18, 78 + skin.effectTier * 12, 30 + skin.effectTier * 4, skin.darkColor, 0)
      .setStrokeStyle(3, skin.auraColor, 0.48 + skin.effectTier * 0.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)

    this.auraRingSecondary = this.scene.add
      .ellipse(x, y + 18, 54 + skin.effectTier * 8, 21 + skin.effectTier * 3, skin.darkColor, 0)
      .setStrokeStyle(2, skin.accentColor, 0.28 + skin.effectTier * 0.16)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)


    const sigilRadius = 42 + skin.effectTier * 5
    this.auraSigil = this.scene.add
      .polygon(
        x,
        y + 18,
        [
          0,
          -sigilRadius * 0.58,
          sigilRadius * 0.52,
          -sigilRadius * 0.28,
          sigilRadius * 0.52,
          sigilRadius * 0.28,
          0,
          sigilRadius * 0.58,
          -sigilRadius * 0.52,
          sigilRadius * 0.28,
          -sigilRadius * 0.52,
          -sigilRadius * 0.28,
        ],
        skin.auraColor,
        0.025 + skin.effectTier * 0.012,
      )
      .setStrokeStyle(2, skin.accentColor, 0.42 + skin.effectTier * 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y)

    this.auraNodeLeft = this.scene.add
      .circle(x - 42, y + 16, 4 + skin.effectTier, skin.accentColor, 0.72)
      .setStrokeStyle(1, skin.eyeColor, 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 1)

    this.auraNodeRight = this.scene.add
      .circle(x + 42, y + 16, 4 + skin.effectTier, skin.auraColor, 0.72)
      .setStrokeStyle(1, skin.eyeColor, 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 1)

    this.createExclusiveAura(x, y)

    this.lastX = x
    this.lastY = y

    this.body = this.scene.add.graphics()
    this.drawCharacter()
    this.character = this.scene.add.container(x, y, [this.body]).setDepth(y + 2)
  }

  update(
    now: number,
    x: number,
    y: number,
    velocityX: number,
    _velocityY: number,
    depth: number,
  ) {
    const speed = Math.hypot(velocityX, _velocityY)
    if (Math.abs(velocityX) > 5) this.facing = velocityX < 0 ? -1 : 1

    const bob = this.defeated ? 0 : Math.sin(now / (speed > 10 ? 95 : 180)) * (speed > 10 ? 2.3 : 1.15)
    const lean = this.defeated ? -0.68 : Phaser.Math.Clamp(velocityX / 1800, -0.11, 0.11)
    const pulse = 1 + (Math.sin(now / 220) + 1) * 0.035

    this.shadow
      .setPosition(x, y + 27)
      .setDepth(depth - 4)
      .setScale(Phaser.Math.Clamp(1 + speed / 950, 1, 1.16), Phaser.Math.Clamp(1 - speed / 1800, 0.84, 1))

    this.auraCore
      .setPosition(x, y + 9)
      .setDepth(depth - 3)
      .setScale(pulse)
      .setAlpha(this.defeated ? 0.02 : 0.16 + this.definition.effectTier * 0.045)

    this.auraRing
      .setPosition(x, y + 18)
      .setDepth(depth - 2)
      .setRotation(now / 1300)
      .setScale(1 + Math.sin(now / 300) * 0.045)

    this.auraRingSecondary
      .setPosition(x, y + 18)
      .setDepth(depth - 1)
      .setRotation(-now / 900)
      .setScale(1 + Math.cos(now / 260) * 0.04)


    this.auraSigil
      .setPosition(x, y + 18)
      .setDepth(depth)
      .setRotation(now / 1750)
      .setScale(1 + Math.sin(now / 340) * 0.045)
      .setAlpha(this.defeated ? 0.03 : 0.34 + this.definition.effectTier * 0.08)

    const orbitRadiusX = 43 + this.definition.effectTier * 4
    const orbitRadiusY = 15 + this.definition.effectTier * 2
    const orbitAngle = now / 760

    this.auraNodeLeft
      .setPosition(
        x + Math.cos(orbitAngle) * orbitRadiusX,
        y + 17 + Math.sin(orbitAngle) * orbitRadiusY,
      )
      .setDepth(depth + (Math.sin(orbitAngle) > 0 ? 2 : -1))
      .setAlpha(this.defeated ? 0.05 : 0.62 + this.definition.effectTier * 0.08)

    this.auraNodeRight
      .setPosition(
        x + Math.cos(orbitAngle + Math.PI) * orbitRadiusX,
        y + 17 + Math.sin(orbitAngle + Math.PI) * orbitRadiusY,
      )
      .setDepth(depth + (Math.sin(orbitAngle + Math.PI) > 0 ? 2 : -1))
      .setAlpha(this.defeated ? 0.05 : 0.62 + this.definition.effectTier * 0.08)

    this.updateExclusiveAura(now, x, y, depth)

    this.character
      .setPosition(x, y - bob)
      .setDepth(depth + 2)
      .setRotation(lean)
      .setScale(this.facing, 1)

    if (
      !this.defeated &&
      speed > 115 &&
      now >= this.nextMotionTrailAt
    ) {
      this.nextMotionTrailAt = now + Math.max(55, 105 - this.definition.effectTier * 12)
      this.emitMotionTrail(this.lastX, this.lastY, speed)
    }

    this.lastX = x
    this.lastY = y

    if (!this.defeated && this.definition.effectTier > 0 && now >= this.nextAuraParticleAt) {
      this.nextAuraParticleAt = now + Math.max(
        this.definition.rewardOnly ? 48 : 85,
        210 - this.definition.effectTier * 35,
      )
      this.emitAuraParticle(x, y)
      if (this.definition.rewardOnly) {
        this.emitAuraParticle(x, y)
      }
    }
  }

  playAttack(angle: number) {
    if (this.defeated) return
    if (Math.abs(Math.cos(angle)) > 0.15) this.facing = Math.cos(angle) < 0 ? -1 : 1

    const flash = this.scene.add
      .circle(
        this.character.x + Math.cos(angle) * 30,
        this.character.y + Math.sin(angle) * 18,
        8 + this.definition.effectTier * 2,
        this.definition.projectileCoreColor,
        0.82,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.character.depth + 5)

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.4 + this.definition.effectTier * 0.25,
      duration: 110,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    })
  }

  setDefeated() {
    this.defeated = true
    this.character.setAlpha(0.5).setRotation(-0.68).setScale(this.facing * 0.92, 0.82)
    this.auraRing.setAlpha(0.08)
    this.auraRingSecondary.setAlpha(0.04)
    this.auraSigil.setAlpha(0.03)
    this.auraNodeLeft.setAlpha(0.04)
    this.auraNodeRight.setAlpha(0.04)
    for (const object of this.exclusiveAuraObjects) {
      object.setAlpha(0.04)
    }
  }

  decorateProjectile(
    projectile: Phaser.Physics.Arcade.Image,
    glow: Phaser.GameObjects.Ellipse,
    critical: boolean,
    reducedDamageShot: boolean,
  ) {
    const skin = this.definition
    const projectileColor = critical
      ? 0xfef08a
      : reducedDamageShot
        ? skin.accentColor
        : skin.projectileColor
    const glowColor = critical ? 0xfbbf24 : skin.trailColor

    projectile
      .clearTint()
      .setTint(projectileColor)
      .setScale(1 + skin.effectTier * 0.12, 1 + skin.effectTier * 0.04)

    glow
      .setFillStyle(glowColor, 0.22 + skin.effectTier * 0.055)
      .setDisplaySize(34 + skin.effectTier * 11, 24 + skin.effectTier * 7)

    if (skin.effectTier >= 2) projectile.setBlendMode(Phaser.BlendModes.ADD)
    projectile.setData('skinTrailAt', 0)
  }

  updateProjectile(
    projectile: Phaser.Physics.Arcade.Image,
    glow: Phaser.GameObjects.Ellipse,
    now: number,
  ) {
    const tier = this.definition.effectTier
    if (tier <= 0 || !projectile.active) return

    glow.setRotation(-projectile.rotation + now / 700)
    const nextTrailAt = Number(projectile.getData('skinTrailAt') ?? 0)
    if (now < nextTrailAt) return
    projectile.setData('skinTrailAt', now + Math.max(62, 112 - tier * 14))

    const trail = this.scene.add
      .circle(projectile.x, projectile.y, 4 + tier * 1.5, this.definition.trailColor, 0.48 + tier * 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(projectile.depth - 1)

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.15,
      duration: 180 + tier * 40,
      ease: 'Quad.Out',
      onComplete: () => trail.destroy(),
    })
  }

  createProjectileImpact(x: number, y: number, critical = false) {
    const tier = this.definition.effectTier
    const color = critical ? 0xfef08a : this.definition.impactColor
    const ring = this.scene.add
      .circle(x, y, 5 + tier * 2, color, 0.16)
      .setStrokeStyle(2 + tier, color, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 12)

    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.1 + tier * 0.45,
      duration: 170 + tier * 45,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    if (tier < 1) return
    const particleCount = 3 + tier * 2
    for (let index = 0; index < particleCount; index++) {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.35
      const distance = 15 + Math.random() * (16 + tier * 5)
      const particle = this.scene.add
        .circle(x, y, 1.5 + Math.random() * 2, color, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 13)

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 180 + Math.random() * 120,
        ease: 'Quad.Out',
        onComplete: () => particle.destroy(),
      })
    }
  }

  private createExclusiveAura(x: number, y: number) {
    const skin = this.definition
    if (!skin.rewardOnly || !skin.auraStyle) {
      return
    }

    const outer = this.scene.add
      .ellipse(x, y + 17, 168, 60, skin.darkColor, 0)
      .setStrokeStyle(5, skin.auraColor, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)

    const inner = this.scene.add
      .ellipse(x, y + 17, 116, 42, skin.darkColor, 0)
      .setStrokeStyle(3, skin.accentColor, 0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)

    const radius = skin.auraStyle === 'void' ? 68 : 61
    const points =
      skin.auraStyle === 'royal'
        ? [0, -radius, 18, -24, 54, -34, 30, 0, 56, 34, 18, 24, 0, radius, -18, 24, -56, 34, -30, 0, -54, -34, -18, -24]
        : skin.auraStyle === 'nightfire'
          ? [0, -radius, 14, -30, 34, -52, 31, -16, 60, 0, 30, 16, 36, 52, 12, 30, 0, radius, -12, 30, -36, 52, -30, 16, -60, 0, -31, -16, -34, -52, -14, -30]
          : [0, -radius, 42, -42, radius, 0, 42, 42, 0, radius, -42, 42, -radius, 0, -42, -42]

    const sigil = this.scene.add
      .polygon(x, y + 17, points, skin.auraColor, 0.035)
      .setStrokeStyle(3, skin.accentColor, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y)

    const halo = this.scene.add
      .circle(x, y - 7, 55, skin.auraColor, 0.045)
      .setStrokeStyle(4, skin.eyeColor, 0.46)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 3)

    this.exclusiveAuraObjects.push(outer, inner, sigil, halo)
  }

  private updateExclusiveAura(
    now: number,
    x: number,
    y: number,
    depth: number,
  ) {
    if (this.exclusiveAuraObjects.length === 0) {
      return
    }

    const [outer, inner, sigil, halo] = this.exclusiveAuraObjects
    const pulse = 1 + Math.sin(now / 155) * 0.055

    outer
      ?.setPosition(x, y + 17)
      .setDepth(depth - 2)
      .setRotation(now / 980)
      .setScale(pulse)
      .setAlpha(this.defeated ? 0.04 : 0.86)
    inner
      ?.setPosition(x, y + 17)
      .setDepth(depth - 1)
      .setRotation(-now / 720)
      .setScale(1 + Math.cos(now / 185) * 0.05)
      .setAlpha(this.defeated ? 0.03 : 0.8)
    sigil
      ?.setPosition(x, y + 17)
      .setDepth(depth)
      .setRotation(now / 1350)
      .setScale(1 + Math.sin(now / 240) * 0.045)
      .setAlpha(this.defeated ? 0.03 : 0.66)
    halo
      ?.setPosition(x, y - 7)
      .setDepth(depth - 3)
      .setRotation(-now / 1150)
      .setScale(1 + Math.sin(now / 175) * 0.08)
      .setAlpha(this.defeated ? 0.02 : 0.34)
  }

  private emitAuraParticle(x: number, y: number) {
    const tier = this.definition.effectTier
    const angle = Math.random() * Math.PI * 2
    const radius = 22 + Math.random() * (18 + tier * 5)
    const particle = this.scene.add
      .circle(
        x + Math.cos(angle) * radius,
        y + 10 + Math.sin(angle) * radius * 0.45,
        2 + Math.random() * (1.4 + tier * 0.7),
        Math.random() > 0.55 ? this.definition.auraColor : this.definition.accentColor,
        0.62 + tier * 0.08,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 1)

    this.scene.tweens.add({
      targets: particle,
      x,
      y: y - 28 - tier * 3,
      alpha: 0,
      scale: 0.35,
      duration: 520 + Math.random() * 260,
      ease: 'Sine.In',
      onComplete: () => particle.destroy(),
    })
  }


  private emitMotionTrail(
    x: number,
    y: number,
    speed: number,
  ) {
    const tier = this.definition.effectTier
    const trail = this.scene.add
      .ellipse(
        x,
        y + 8,
        58 + tier * 12,
        38 + tier * 8,
        this.definition.auraColor,
        0.16 + tier * 0.035,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setScale(Phaser.Math.Clamp(0.8 + speed / 900, 0.8, 1.2), 0.82)

    const ring = this.scene.add
      .ellipse(
        x,
        y + 18,
        44 + tier * 8,
        18 + tier * 4,
        this.definition.darkColor,
        0,
      )
      .setStrokeStyle(2, this.definition.accentColor, 0.38 + tier * 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)

    this.scene.tweens.add({
      targets: [trail, ring],
      alpha: 0,
      scaleX: '+=0.45',
      scaleY: '+=0.25',
      duration: 260 + tier * 40,
      ease: 'Quad.Out',
      onComplete: () => {
        trail.destroy()
        ring.destroy()
      },
    })
  }

  private drawCharacter() {
    const g = this.body
    const skin = this.definition
    g.clear()

    // Áo choàng / năng lượng phía sau.
    g.fillStyle(skin.darkColor, 0.78)
    if (skin.archetype === 'assassin') {
      g.fillTriangle(-20, -22, -40, 21, -7, 27)
      g.fillTriangle(19, -20, 38, 19, 7, 25)
    } else if (skin.archetype === 'eclipse' || skin.archetype === 'calamity') {
      g.fillTriangle(-18, -20, -43, 26, -4, 18)
      g.fillTriangle(18, -20, 43, 26, 4, 18)
    } else {
      g.fillTriangle(-17, -18, -29, 28, -3, 20)
      g.fillTriangle(17, -18, 29, 28, 3, 20)
    }

    // Chân.
    g.fillStyle(skin.darkColor, 1)
    g.fillRoundedRect(-14, 10, 11, 27, 4)
    g.fillRoundedRect(3, 10, 11, 27, 4)
    g.fillStyle(skin.secondaryColor, 0.94)
    g.fillRoundedRect(-15, 22, 12, 12, 3)
    g.fillRoundedRect(3, 22, 12, 12, 3)

    // Thân giáp.
    g.fillStyle(skin.primaryColor, 1)
    g.fillRoundedRect(-22, -20, 44, 40, 10)
    g.fillStyle(skin.secondaryColor, 0.9)
    g.fillTriangle(-20, -15, 0, 13, 20, -15)
    g.fillStyle(skin.darkColor, 0.95)
    g.fillRoundedRect(-18, 12, 36, 8, 3)

    // Vai và tay.
    g.fillStyle(skin.secondaryColor, 1)
    g.fillCircle(-23, -10, 8)
    g.fillCircle(23, -10, 8)
    g.fillStyle(skin.primaryColor, 1)
    g.fillRoundedRect(-31, -7, 10, 27, 4)
    g.fillRoundedRect(21, -7, 10, 27, 4)
    g.fillStyle(skin.accentColor, 0.95)
    g.fillRoundedRect(-31, 11, 10, 7, 3)
    g.fillRoundedRect(21, 11, 10, 7, 3)

    // Đầu và mặt nạ.
    g.fillStyle(skin.darkColor, 1)
    g.fillRoundedRect(-16, -42, 32, 27, 10)
    g.fillStyle(skin.primaryColor, 1)
    g.fillRoundedRect(-14, -40, 28, 23, 9)
    g.fillStyle(skin.eyeColor, 1)
    g.fillTriangle(-10, -32, -2, -35, -3, -27)
    g.fillTriangle(10, -32, 2, -35, 3, -27)

    // Lõi năng lượng.
    g.fillStyle(skin.accentColor, 0.98)
    g.fillCircle(0, -4, 7)
    g.fillStyle(skin.eyeColor, 0.98)
    g.fillCircle(0, -4, 3)

    // Chi tiết riêng theo mẫu.
    g.lineStyle(2, skin.accentColor, 0.86)
    if (skin.archetype === 'weaver') {
      g.lineBetween(-13, -37, 13, -20)
      g.lineBetween(13, -37, -13, -20)
      g.strokeCircle(0, -3, 13)
    }
    if (skin.archetype === 'thunder') {
      g.beginPath()
      g.moveTo(-5, -12)
      g.lineTo(3, -4)
      g.lineTo(-2, 1)
      g.lineTo(8, 10)
      g.strokePath()
    }
    if (skin.archetype === 'trickster') {
      g.lineStyle(5, skin.accentColor, 0.95)
      g.lineBetween(-35, 18, 34, -24)
      g.fillStyle(skin.accentColor, 1)
      g.fillCircle(-35, 18, 5)
      g.fillCircle(34, -24, 5)
    }
    if (skin.archetype === 'void' || skin.archetype === 'calamity') {
      g.fillStyle(skin.accentColor, 0.92)
      g.fillTriangle(-14, -39, -23, -56, -5, -42)
      g.fillTriangle(14, -39, 23, -56, 5, -42)
    }
    if (skin.archetype === 'frost') {
      g.fillStyle(skin.accentColor, 0.95)
      g.fillTriangle(-10, -40, -5, -55, 0, -41)
      g.fillTriangle(0, -41, 5, -57, 10, -40)
    }
    if (skin.archetype === 'champion') {
      g.fillStyle(skin.accentColor, 1)
      g.fillTriangle(-15, -40, -10, -59, -3, -42)
      g.fillTriangle(-6, -42, 0, -64, 6, -42)
      g.fillTriangle(3, -42, 10, -59, 15, -40)
      g.lineStyle(3, skin.secondaryColor, 0.92)
      g.strokeCircle(0, -4, 14)
    }
    if (skin.archetype === 'astral') {
      g.fillStyle(skin.accentColor, 0.3)
      g.fillTriangle(-19, -17, -48, -6, -24, 13)
      g.fillTriangle(19, -17, 48, -6, 24, 13)
      g.lineStyle(3, skin.accentColor, 0.82)
      g.lineBetween(-24, -10, -46, -2)
      g.lineBetween(24, -10, 46, -2)
    }
    if (skin.archetype === 'overlord') {
      g.fillStyle(skin.accentColor, 0.96)
      g.fillTriangle(-15, -39, -22, -58, -6, -44)
      g.fillTriangle(15, -39, 22, -58, 6, -44)
      g.lineStyle(3, skin.secondaryColor, 0.88)
      g.lineBetween(-18, -13, 0, 13)
      g.lineBetween(18, -13, 0, 13)
    }
  }
}