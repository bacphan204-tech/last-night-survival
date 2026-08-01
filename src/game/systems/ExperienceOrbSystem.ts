import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import type { EnemyRank, ExperienceOrbState } from '../types/game'

export class ExperienceOrbSystem {
  private readonly scene: Phaser.Scene
  private readonly rng: Phaser.Math.RandomDataGenerator
  private orbs: ExperienceOrbState[] = []
  private magnetUntil = 0

  constructor(
    scene: Phaser.Scene,
    rng: Phaser.Math.RandomDataGenerator,
  ) {
    this.scene = scene
    this.rng = rng
  }

  reset() {
    this.clear()
    this.magnetUntil = 0
  }

  activateMagnet(now: number, duration: number) {
    this.magnetUntil = Math.max(this.magnetUntil, now + duration)
  }

  cancelMagnet() {
    this.magnetUntil = 0
  }

  spawnDrops(
    x: number,
    y: number,
    rank: EnemyRank,
    wave: number,
  ) {
    const totalExperience = this.getExperienceValue(rank, wave)
    const orbCount =
      rank === 'boss'
        ? 16
        : rank === 'mini-boss'
          ? 7
          : 1

    const baseValue = Math.floor(totalExperience / orbCount)
    let remainder = totalExperience - baseValue * orbCount

    for (let index = 0; index < orbCount; index++) {
      const value = baseValue + (remainder > 0 ? 1 : 0)
      remainder = Math.max(0, remainder - 1)

      if (
        this.orbs.length >=
        GAME_CONFIG.experience.maximumOrbs
      ) {
        this.mergeExperience(value)
        continue
      }

      this.createOrb(x, y, rank, value)
    }
  }

  update(
    delta: number,
    playerX: number,
    playerY: number,
    pickupRadius: number,
    onCollect: (value: number) => void,
  ) {
    const stepSeconds = Math.min(delta, 50) / 1000

    for (let index = this.orbs.length - 1; index >= 0; index--) {
      const orb = this.orbs[index]

      if (!orb.sprite.active || orb.collected) {
        this.destroyOrb(index)
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        orb.sprite.x,
        orb.sprite.y,
        playerX,
        playerY,
      )

      if (distance <= GAME_CONFIG.experience.collectDistance) {
        const value = orb.value
        const x = orb.sprite.x
        const y = orb.sprite.y

        orb.collected = true
        this.destroyOrb(index)
        this.createCollectEffect(x, y, playerX, playerY)
        onCollect(value)
        continue
      }

      const magnetActive = this.scene.time.now < this.magnetUntil

      if (magnetActive || distance <= pickupRadius) {
        const direction = new Phaser.Math.Vector2(
          playerX - orb.sprite.x,
          playerY - orb.sprite.y,
        )

        if (direction.lengthSq() > 0) {
          direction.normalize()

          const attractionBoost = magnetActive
            ? 4.4
            : 1 +
              (1 - distance / Math.max(1, pickupRadius)) *
                1.8

          const movement = Math.min(
            distance,
            GAME_CONFIG.experience.attractionSpeed *
              attractionBoost *
              stepSeconds,
          )

          orb.sprite.x += direction.x * movement
          orb.sprite.y += direction.y * movement
        }
      }

      const pulse =
        0.13 +
        (Math.sin(this.scene.time.now / 150 + index) + 1) *
          0.045

      orb.glow
        .setPosition(orb.sprite.x, orb.sprite.y)
        .setDepth(orb.sprite.y - 2)
        .setAlpha(pulse)

      orb.sprite
        .setDepth(orb.sprite.y)
        .setRotation(orb.sprite.rotation + delta * 0.0015)
    }
  }

  clear() {
    for (const orb of this.orbs) {
      orb.sprite.destroy()
      orb.glow.destroy()
    }

    this.orbs = []
  }

  private createOrb(
    originX: number,
    originY: number,
    rank: EnemyRank,
    value: number,
  ) {
    const angle = this.rng.realInRange(0, Math.PI * 2)
    const distance = this.rng.integerInRange(
      rank === 'normal' ? 10 : 22,
      rank === 'boss' ? 105 : rank === 'mini-boss' ? 72 : 30,
    )

    const x = Phaser.Math.Clamp(
      originX + Math.cos(angle) * distance,
      24,
      GAME_CONFIG.world.width - 24,
    )

    const y = Phaser.Math.Clamp(
      originY + Math.sin(angle) * distance,
      24,
      GAME_CONFIG.world.height - 24,
    )

    const glow = this.scene.add
      .ellipse(x, y, 45, 35, 0x8b5cf6, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)

    const sprite = this.scene.add
      .image(x, y, 'experience-orb')
      .setDepth(y)
      .setScale(rank === 'boss' ? 1.05 : 0.82)

    this.orbs.push({
      sprite,
      glow,
      value,
      collected: false,
    })
  }

  private mergeExperience(value: number) {
    if (this.orbs.length === 0) {
      return
    }

    const target = this.orbs[
      this.rng.integerInRange(0, this.orbs.length - 1)
    ]

    if (!target) {
      return
    }

    target.value += value
    target.sprite.setScale(
      Math.min(1.25, target.sprite.scaleX + 0.015),
    )
  }

  private destroyOrb(index: number) {
    const orb = this.orbs[index]

    if (!orb) {
      return
    }

    orb.sprite.destroy()
    orb.glow.destroy()
    this.orbs.splice(index, 1)
  }

  private createCollectEffect(
    x: number,
    y: number,
    playerX: number,
    playerY: number,
  ) {
    const flash = this.scene.add
      .circle(x, y, 8, 0xc4b5fd, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 20)

    this.scene.tweens.add({
      targets: flash,
      x: playerX,
      y: playerY,
      alpha: 0,
      scale: 0.2,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => flash.destroy(),
    })
  }

  private getExperienceValue(rank: EnemyRank, wave: number) {
    if (rank === 'boss') {
      return GAME_CONFIG.experience.bossValue + wave * 18
    }

    if (rank === 'mini-boss') {
      return GAME_CONFIG.experience.miniBossValue + wave * 7
    }

    return (
      GAME_CONFIG.experience.normalEnemyValue +
      Math.floor(Math.max(0, wave - 1) / 3) * 2
    )
  }
}
