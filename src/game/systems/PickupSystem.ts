import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import {
  PICKUP_DEFINITIONS,
  PICKUP_DROP_CHANCES,
  PICKUP_SETTINGS,
} from '../data/pickups'
import type {
  EnemyRank,
  PickupKind,
  PickupState,
} from '../types/game'

type PickupCollectHandler = (
  kind: PickupKind,
  x: number,
  y: number,
) => void

export class PickupSystem {
  private readonly scene: Phaser.Scene
  private readonly rng: Phaser.Math.RandomDataGenerator
  private pickups: PickupState[] = []
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

  trySpawnDrop(
    x: number,
    y: number,
    rank: EnemyRank,
  ) {
    const chance = PICKUP_DROP_CHANCES[rank]

    if (this.rng.realInRange(0, 1) >= chance) {
      return null
    }

    const kind = this.chooseRandomKind()
    this.spawn(x, y, kind)
    return kind
  }


  update(
    now: number,
    playerX: number,
    playerY: number,
    onCollect: PickupCollectHandler,
  ) {
    for (let index = this.pickups.length - 1; index >= 0; index--) {
      const pickup = this.pickups[index]

      if (
        pickup.collected ||
        !pickup.icon.active ||
        now >= pickup.expiresAt
      ) {
        this.destroyPickup(index)
        continue
      }

      const hover = Math.sin(now / 220 + pickup.id) * 4
      const pulse =
        0.18 +
        (Math.sin(now / 170 + pickup.id * 0.7) + 1) * 0.06

      pickup.icon
        .setPosition(pickup.x, pickup.y + hover)
        .setDepth(pickup.y + 4)
        .setRotation(pickup.icon.rotation + 0.012)

      pickup.symbol
        .setPosition(pickup.x, pickup.y + hover)
        .setDepth(pickup.y + 6)

      pickup.glow
        .setPosition(pickup.x, pickup.y + hover + 3)
        .setDepth(pickup.y + 2)
        .setAlpha(pulse)

      pickup.shadow
        .setPosition(pickup.x, pickup.y + 24)
        .setDepth(pickup.y - 2)

      const distanceSquared =
        (playerX - pickup.x) * (playerX - pickup.x) +
        (playerY - pickup.y) * (playerY - pickup.y)

      if (
        distanceSquared >
        PICKUP_SETTINGS.collectDistance *
          PICKUP_SETTINGS.collectDistance
      ) {
        continue
      }

      pickup.collected = true
      const collectX = pickup.x
      const collectY = pickup.y
      const kind = pickup.kind
      this.destroyPickup(index)
      this.createCollectEffect(kind, collectX, collectY, playerX, playerY)
      onCollect(kind, collectX, collectY)
    }
  }

  clear() {
    for (const pickup of this.pickups) {
      pickup.icon.destroy()
      pickup.symbol.destroy()
      pickup.glow.destroy()
      pickup.shadow.destroy()
    }

    this.pickups = []
  }

  private chooseRandomKind(): PickupKind {
    const roll = this.rng.realInRange(0, 1)

    if (roll < 1 / 3) {
      return 'health'
    }

    if (roll < 2 / 3) {
      return 'bomb'
    }

    return 'magnet'
  }

  private spawn(
    originX: number,
    originY: number,
    kind: PickupKind,
  ) {
    if (
      this.pickups.length >=
      PICKUP_SETTINGS.maximumActivePickups
    ) {
      this.destroyPickup(0)
    }

    const definition = PICKUP_DEFINITIONS[kind]
    const angle = this.rng.realInRange(0, Math.PI * 2)
    const distance = this.rng.integerInRange(18, 46)
    const x = Phaser.Math.Clamp(
      originX + Math.cos(angle) * distance,
      30,
      GAME_CONFIG.world.width - 30,
    )
    const y = Phaser.Math.Clamp(
      originY + Math.sin(angle) * distance,
      30,
      GAME_CONFIG.world.height - 30,
    )

    const shadow = this.scene.add.ellipse(
      x,
      y + 24,
      44,
      14,
      0x000000,
      0.5,
    )

    const glow = this.scene.add
      .ellipse(x, y + 3, 66, 54, definition.glowColor, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD)

    const icon = this.scene.add
      .circle(x, y, 18, definition.color, 0.98)
      .setStrokeStyle(4, definition.glowColor, 0.95)

    const symbol = this.scene.add
      .text(x, y, definition.symbol, {
        fontFamily: 'Arial, sans-serif',
        fontSize: kind === 'magnet' ? '17px' : '21px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 3,
      })
      .setOrigin(0.5)

    this.pickups.push({
      id: ++this.idCounter,
      kind,
      x,
      y,
      icon,
      symbol,
      glow,
      shadow,
      spawnedAt: this.scene.time.now,
      expiresAt: this.scene.time.now + PICKUP_SETTINGS.lifetime,
      collected: false,
    })

    const ring = this.scene.add
      .circle(x, y, 20, definition.glowColor, 0)
      .setStrokeStyle(4, definition.glowColor, 0.85)
      .setDepth(y + 8)

    this.scene.tweens.add({
      targets: ring,
      scale: 2.5,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })
  }

  private destroyPickup(index: number) {
    const pickup = this.pickups[index]

    if (!pickup) {
      return
    }

    pickup.icon.destroy()
    pickup.symbol.destroy()
    pickup.glow.destroy()
    pickup.shadow.destroy()
    this.pickups.splice(index, 1)
  }

  private createCollectEffect(
    kind: PickupKind,
    x: number,
    y: number,
    playerX: number,
    playerY: number,
  ) {
    const definition = PICKUP_DEFINITIONS[kind]
    const flash = this.scene.add
      .circle(x, y, 16, definition.glowColor, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 30)

    this.scene.tweens.add({
      targets: flash,
      x: playerX,
      y: playerY,
      scale: 2.4,
      alpha: 0,
      duration: 240,
      ease: 'Quad.In',
      onComplete: () => flash.destroy(),
    })
  }
}
