import Phaser from 'phaser'
import type { EnemyUnit } from '../types/game'
import type { PathfindingSystem } from './PathfindingSystem'

type EnemyProjectileState = {
  gameObject: Phaser.Physics.Arcade.Image
  glow: Phaser.GameObjects.Ellipse
  owner: EnemyUnit
  bornAt: number
  damage: number
  impactColor: number
}

type FireEnemyProjectileParams = {
  owner: EnemyUnit
  targetX: number
  targetY: number
  speed: number
  damage: number
  projectileColor?: number
  glowColor?: number
}

type FireEnemySpreadParams = FireEnemyProjectileParams & {
  projectileCount: number
  spreadRadians: number
}

type FireEnemyRadialParams = {
  owner: EnemyUnit
  speed: number
  damage: number
  projectileCount: number
  startAngle?: number
  projectileColor?: number
  glowColor?: number
}

export class EnemyProjectileSystem {
  private readonly scene: Phaser.Scene
  private readonly pathfinding: PathfindingSystem
  private readonly worldWidth: number
  private readonly worldHeight: number
  private readonly projectileLifetime = 4200
  private readonly maximumProjectiles = 240
  private projectiles: EnemyProjectileState[] = []

  constructor(
    scene: Phaser.Scene,
    pathfinding: PathfindingSystem,
    worldWidth: number,
    worldHeight: number,
  ) {
    this.scene = scene
    this.pathfinding = pathfinding
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
  }

  reset() {
    this.clear()
  }

  fire(params: FireEnemyProjectileParams) {
    if (
      params.damage <= 0 ||
      params.speed <= 0 ||
      !params.owner.alive ||
      this.projectiles.length >= this.maximumProjectiles
    ) {
      return false
    }

    const direction = new Phaser.Math.Vector2(
      params.targetX - params.owner.sprite.x,
      params.targetY - params.owner.sprite.y,
    )

    if (direction.lengthSq() < 1) {
      return false
    }

    direction.normalize()

    return this.fireDirection(
      params.owner,
      direction,
      params.speed,
      params.damage,
      params.projectileColor ?? 0xfb7185,
      params.glowColor ?? 0xf43f5e,
    )
  }

  fireSpread(params: FireEnemySpreadParams) {
    if (
      params.projectileCount <= 0 ||
      params.spreadRadians < 0 ||
      !params.owner.alive
    ) {
      return 0
    }

    const baseAngle = Phaser.Math.Angle.Between(
      params.owner.sprite.x,
      params.owner.sprite.y,
      params.targetX,
      params.targetY,
    )

    const count = Math.max(1, Math.round(params.projectileCount))
    const step = count <= 1 ? 0 : params.spreadRadians / (count - 1)
    const startAngle = baseAngle - params.spreadRadians / 2
    let firedCount = 0

    for (let index = 0; index < count; index++) {
      if (this.projectiles.length >= this.maximumProjectiles) {
        break
      }

      const angle = count <= 1 ? baseAngle : startAngle + step * index
      const direction = new Phaser.Math.Vector2(
        Math.cos(angle),
        Math.sin(angle),
      )

      const fired = this.fireDirection(
        params.owner,
        direction,
        params.speed,
        params.damage,
        params.projectileColor ?? 0xc084fc,
        params.glowColor ?? 0x9333ea,
      )

      if (fired) {
        firedCount++
      }
    }

    return firedCount
  }


  fireRadial(params: FireEnemyRadialParams) {
    if (
      params.projectileCount <= 0 ||
      params.damage <= 0 ||
      params.speed <= 0 ||
      !params.owner.alive
    ) {
      return 0
    }

    const count = Math.max(1, Math.round(params.projectileCount))
    const startAngle = params.startAngle ?? 0
    const angleStep = (Math.PI * 2) / count
    let firedCount = 0

    for (let index = 0; index < count; index++) {
      if (this.projectiles.length >= this.maximumProjectiles) {
        break
      }

      const angle = startAngle + angleStep * index
      const fired = this.fireDirection(
        params.owner,
        new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)),
        params.speed,
        params.damage,
        params.projectileColor ?? 0xfbbf24,
        params.glowColor ?? 0xf97316,
      )

      if (fired) {
        firedCount++
      }
    }

    return firedCount
  }

  update(
    now: number,
    playerX: number,
    playerY: number,
    playerHitRadius: number,
    onPlayerHit: (damage: number, owner: EnemyUnit) => void,
  ) {
    for (
      let index = this.projectiles.length - 1;
      index >= 0;
      index--
    ) {
      const state = this.projectiles[index]
      const projectile = state.gameObject

      if (!projectile.active) {
        this.destroyAt(index)
        continue
      }

      state.glow
        .setPosition(projectile.x, projectile.y)
        .setDepth(projectile.y - 1)

      projectile.setDepth(projectile.y)

      const expired = now - state.bornAt > this.projectileLifetime
      const outsideWorld =
        projectile.x < 0 ||
        projectile.x > this.worldWidth ||
        projectile.y < 0 ||
        projectile.y > this.worldHeight

      if (expired || outsideWorld) {
        this.destroyAt(index)
        continue
      }

      if (
        this.pathfinding.isCollisionPointBlocked(
          projectile.x,
          projectile.y,
          5,
        )
      ) {
        this.createImpact(
          projectile.x,
          projectile.y,
          state.impactColor,
        )
        this.destroyAt(index)
        continue
      }

      const distanceToPlayer = Phaser.Math.Distance.Between(
        projectile.x,
        projectile.y,
        playerX,
        playerY,
      )

      if (distanceToPlayer <= playerHitRadius) {
        this.createImpact(
          projectile.x,
          projectile.y,
          state.impactColor,
        )
        onPlayerHit(state.damage, state.owner)
        this.destroyAt(index)
      }
    }
  }

  stopAll() {
    for (const state of this.projectiles) {
      if (state.gameObject.active) {
        state.gameObject.setVelocity(0, 0)
      }
    }
  }

  clear() {
    for (const state of this.projectiles) {
      state.gameObject.destroy()
      state.glow.destroy()
    }

    this.projectiles = []
  }

  private fireDirection(
    owner: EnemyUnit,
    direction: Phaser.Math.Vector2,
    speed: number,
    damage: number,
    projectileColor: number,
    glowColor: number,
  ) {
    if (
      damage <= 0 ||
      speed <= 0 ||
      !owner.alive ||
      this.projectiles.length >= this.maximumProjectiles
    ) {
      return false
    }

    const normalizedDirection = direction.clone()

    if (normalizedDirection.lengthSq() < 1) {
      return false
    }

    normalizedDirection.normalize()

    const spawnX = owner.sprite.x + normalizedDirection.x * 30
    const spawnY = owner.sprite.y + normalizedDirection.y * 22

    const glow = this.scene.add
      .ellipse(
        spawnX,
        spawnY,
        36,
        26,
        glowColor,
        0.24,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(spawnY - 1)

    const projectile = this.scene.physics.add
      .image(spawnX, spawnY, 'player-projectile')
      .setCircle(5, 3, 3)
      .setDepth(spawnY)
      .setRotation(normalizedDirection.angle())
      .setTint(projectileColor)

    projectile.setVelocity(
      normalizedDirection.x * speed,
      normalizedDirection.y * speed,
    )

    this.projectiles.push({
      gameObject: projectile,
      glow,
      owner,
      bornAt: this.scene.time.now,
      damage: Math.max(1, Math.round(damage)),
      impactColor: projectileColor,
    })

    this.createMuzzleFlash(spawnX, spawnY, glowColor)

    return true
  }

  private destroyAt(index: number) {
    const state = this.projectiles[index]

    if (!state) {
      return
    }

    state.gameObject.destroy()
    state.glow.destroy()
    this.projectiles.splice(index, 1)
  }

  private createMuzzleFlash(x: number, y: number, color: number) {
    const flash = this.scene.add
      .circle(x, y, 10, color, 0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 2)

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.4,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    })
  }

  private createImpact(x: number, y: number, color: number) {
    for (let index = 0; index < 6; index++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.Between(10, 25)

      const spark = this.scene.add
        .circle(
          x,
          y,
          Phaser.Math.Between(2, 4),
          color,
          0.9,
        )
        .setDepth(y + 8)

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 210,
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      })
    }
  }
}
