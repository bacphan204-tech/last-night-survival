import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import {
  CHEST_DROP_CHANCES,
  CHEST_SETTINGS,
  rollChestRewardCount,
} from '../data/chests'
import type { ChestState, EnemyRank } from '../types/game'

type ChestCollectHandler = (
  rewardCount: number,
  x: number,
  y: number,
) => void

export class ChestSystem {
  private readonly scene: Phaser.Scene
  private readonly rng: Phaser.Math.RandomDataGenerator
  private chests: ChestState[] = []
  private idCounter = 0

  constructor(
    scene: Phaser.Scene,
    rng: Phaser.Math.RandomDataGenerator,
  ) {
    this.scene = scene
    this.rng = rng
  }

  reset() {
    this.clear()
    this.idCounter = 0
  }

  trySpawnDrop(x: number, y: number, rank: EnemyRank) {
    const chance = CHEST_DROP_CHANCES[rank]

    if (chance <= 0 || this.rng.realInRange(0, 1) >= chance) {
      return false
    }

    this.spawn(x, y)
    return true
  }

  spawnTestChest(x: number, y: number) {
    this.spawn(x, y)
  }

  update(
    now: number,
    playerX: number,
    playerY: number,
    onCollect: ChestCollectHandler,
  ) {
    for (let index = this.chests.length - 1; index >= 0; index--) {
      const chest = this.chests[index]

      if (
        chest.collected ||
        !chest.base.active ||
        now >= chest.expiresAt
      ) {
        this.destroyChest(index)
        continue
      }

      const hover = Math.sin(now / 260 + chest.id) * 3
      const pulse =
        0.17 +
        (Math.sin(now / 190 + chest.id * 0.8) + 1) * 0.07

      chest.base
        .setPosition(chest.x, chest.y + hover + 4)
        .setDepth(chest.y + 5)
      chest.lid
        .setPosition(chest.x, chest.y + hover - 10)
        .setDepth(chest.y + 7)
      chest.lock
        .setPosition(chest.x, chest.y + hover + 1)
        .setDepth(chest.y + 9)
      chest.glow
        .setPosition(chest.x, chest.y + hover)
        .setDepth(chest.y + 2)
        .setAlpha(pulse)
      chest.shadow
        .setPosition(chest.x, chest.y + 27)
        .setDepth(chest.y - 2)

      const distanceSquared =
        (playerX - chest.x) * (playerX - chest.x) +
        (playerY - chest.y) * (playerY - chest.y)

      if (
        distanceSquared >
        CHEST_SETTINGS.collectDistance * CHEST_SETTINGS.collectDistance
      ) {
        continue
      }

      chest.collected = true
      const x = chest.x
      const y = chest.y
      const rewardCount = rollChestRewardCount(
        this.rng.realInRange(0, 1),
      )

      this.destroyChest(index)
      this.createOpenEffect(x, y, rewardCount)
      onCollect(rewardCount, x, y)
    }
  }

  clear() {
    for (const chest of this.chests) {
      chest.base.destroy()
      chest.lid.destroy()
      chest.lock.destroy()
      chest.glow.destroy()
      chest.shadow.destroy()
    }

    this.chests = []
  }

  private spawn(originX: number, originY: number) {
    if (this.chests.length >= CHEST_SETTINGS.maximumActiveChests) {
      this.destroyChest(0)
    }

    const angle = this.rng.realInRange(0, Math.PI * 2)
    const distance = this.rng.integerInRange(24, 54)
    const x = Phaser.Math.Clamp(
      originX + Math.cos(angle) * distance,
      35,
      GAME_CONFIG.world.width - 35,
    )
    const y = Phaser.Math.Clamp(
      originY + Math.sin(angle) * distance,
      35,
      GAME_CONFIG.world.height - 35,
    )

    const shadow = this.scene.add.ellipse(
      x,
      y + 27,
      58,
      16,
      0x000000,
      0.58,
    )

    const glow = this.scene.add
      .ellipse(x, y, 86, 68, 0xfacc15, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)

    const base = this.scene.add
      .rectangle(x, y + 4, 46, 30, 0x92400e, 1)
      .setStrokeStyle(3, 0xf59e0b, 1)

    const lid = this.scene.add
      .rectangle(x, y - 10, 50, 15, 0xb45309, 1)
      .setStrokeStyle(3, 0xfbbf24, 1)

    const lock = this.scene.add
      .circle(x, y + 1, 6, 0xfacc15, 1)
      .setStrokeStyle(2, 0xfef3c7, 1)

    this.chests.push({
      id: ++this.idCounter,
      x,
      y,
      base,
      lid,
      lock,
      glow,
      shadow,
      spawnedAt: this.scene.time.now,
      expiresAt: this.scene.time.now + CHEST_SETTINGS.lifetime,
      collected: false,
    })
  }

  private destroyChest(index: number) {
    const chest = this.chests[index]

    if (!chest) {
      return
    }

    chest.base.destroy()
    chest.lid.destroy()
    chest.lock.destroy()
    chest.glow.destroy()
    chest.shadow.destroy()
    this.chests.splice(index, 1)
  }

  private createOpenEffect(x: number, y: number, rewardCount: number) {
    const flash = this.scene.add
      .circle(x, y, 24, 0xfacc15, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40)

    this.scene.tweens.add({
      targets: flash,
      scale: 4.2,
      alpha: 0,
      duration: 480,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    })

    for (let index = 0; index < 12 + rewardCount * 4; index++) {
      const angle = this.rng.realInRange(0, Math.PI * 2)
      const distance = this.rng.integerInRange(35, 95)
      const spark = this.scene.add
        .circle(x, y, this.rng.integerInRange(2, 5), 0xfbbf24, 0.95)
        .setDepth(y + 45)

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: this.rng.integerInRange(360, 620),
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      })
    }
  }
}
