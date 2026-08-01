import Phaser from 'phaser'
import type { EnemyUnit } from '../types/game'

type GroundHazardKind = 'poison' | 'fire'

type GroundHazardState = {
  id: number
  kind: GroundHazardKind
  x: number
  y: number
  radius: number
  damage: number
  createdAt: number
  expiresAt: number
  visual: Phaser.GameObjects.Container
  core: Phaser.GameObjects.Container
}

type SpawnBroodChild = (
  x: number,
  y: number,
  index: number,
  total: number,
) => void

export class EnemyDeathEffectSystem {
  private readonly scene: Phaser.Scene
  private hazards: GroundHazardState[] = []
  private hazardIdCounter = 0
  private nextPlayerHazardDamageAt = 0
  private generation = 0
  private pendingChildSpawns = 0

  private readonly deathBuffRadius = 320
  private readonly deathBuffTargetLimit = 8
  private readonly deathBuffDuration = 6000
  private readonly maximumDeathBuffStacks = 3

  private readonly maximumBroodChildren = 20
  private readonly maximumHazards = 24
  private readonly maximumHazardsPerKind = 12
  private readonly hazardDamageCooldown = 320

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  reset(enemies: EnemyUnit[] = []) {
    this.generation++
    this.pendingChildSpawns = 0
    this.nextPlayerHazardDamageAt = 0

    for (const hazard of this.hazards) {
      this.destroyHazard(hazard)
    }

    this.hazards = []

    for (const enemy of enemies) {
      this.clearEnemy(enemy)
    }
  }

  initializeEnemy(enemy: EnemyUnit) {
    enemy.sprite.setData(
      'deathBuffBaseContactDamage',
      enemy.contactDamage,
    )
    enemy.sprite.setData('deathBuffStacks', 0)
    enemy.sprite.setData('deathBuffExpiresAt', 0)
    enemy.sprite.setData('deathBuffRing', null)
    enemy.sprite.setData('isBroodChild', false)
    enemy.sprite.setData('suppressRewards', false)
    enemy.sprite.setData('suppressDeathEffects', false)
  }

  update(
    now: number,
    playerX: number,
    playerY: number,
    playerRadius: number,
    enemies: EnemyUnit[],
    onPlayerDamage: (damage: number) => void,
  ) {
    this.updateDeathBuffs(now, enemies)
    this.updateHazards(
      now,
      playerX,
      playerY,
      playerRadius,
      onPlayerDamage,
    )
  }

  handleEnemyDeath(
    enemy: EnemyUnit,
    enemies: EnemyUnit[],
    wave: number,
    spawnBroodChild: SpawnBroodChild,
  ) {
    const suppressEffects =
      enemy.sprite.getData('suppressDeathEffects') === true

    this.clearEnemy(enemy)

    if (
      suppressEffects ||
      enemy.rank !== 'normal' ||
      !enemy.archetypeId
    ) {
      return
    }

    const originX = enemy.sprite.x
    const originY = enemy.sprite.y

    if (enemy.archetypeId === 'death-buffer') {
      this.applyDeathBuff(originX, originY, enemies)
      return
    }

    if (enemy.archetypeId === 'brood-mother') {
      this.scheduleBroodChildren(
        originX,
        originY,
        enemies,
        spawnBroodChild,
      )
      return
    }

    if (enemy.archetypeId === 'toxic') {
      this.createGroundHazard('poison', originX, originY, wave)
      return
    }

    if (enemy.archetypeId === 'flame') {
      this.createGroundHazard('fire', originX, originY, wave)
    }
  }

  clearEnemy(enemy: EnemyUnit) {
    const ring = enemy.sprite.getData('deathBuffRing') as
      | Phaser.GameObjects.Arc
      | null
      | undefined

    if (ring?.active) {
      this.scene.tweens.killTweensOf(ring)
      ring.destroy()
    }

    enemy.sprite.setData('deathBuffRing', null)
    enemy.sprite.setData('deathBuffStacks', 0)
    enemy.sprite.setData('deathBuffExpiresAt', 0)

    const baseContactDamage = enemy.sprite.getData(
      'deathBuffBaseContactDamage',
    )

    enemy.speed = enemy.baseSpeed

    if (typeof baseContactDamage === 'number') {
      enemy.contactDamage = baseContactDamage
    }
  }

  private applyDeathBuff(
    originX: number,
    originY: number,
    enemies: EnemyUnit[],
  ) {
    const targets = enemies
      .filter((target) => {
        if (!target.alive || !target.sprite.active) {
          return false
        }

        return (
          Phaser.Math.Distance.Between(
            originX,
            originY,
            target.sprite.x,
            target.sprite.y,
          ) <= this.deathBuffRadius
        )
      })
      .sort((left, right) => {
        const leftDeltaX = left.sprite.x - originX
        const leftDeltaY = left.sprite.y - originY
        const rightDeltaX = right.sprite.x - originX
        const rightDeltaY = right.sprite.y - originY
        const leftDistance =
          leftDeltaX * leftDeltaX + leftDeltaY * leftDeltaY
        const rightDistance =
          rightDeltaX * rightDeltaX + rightDeltaY * rightDeltaY
        return leftDistance - rightDistance
      })
      .slice(0, this.deathBuffTargetLimit)

    this.createDeathBuffPulse(originX, originY)

    for (const target of targets) {
      const currentStacks = this.getDeathBuffStacks(target)
      const nextStacks = Math.min(
        this.maximumDeathBuffStacks,
        currentStacks + 1,
      )

      target.sprite.setData('deathBuffStacks', nextStacks)
      target.sprite.setData(
        'deathBuffExpiresAt',
        this.scene.time.now + this.deathBuffDuration,
      )

      const rankScale =
        target.rank === 'boss'
          ? 0.35
          : target.rank === 'mini-boss'
            ? 0.55
            : 1

      target.speed =
        target.baseSpeed * (1 + nextStacks * 0.12 * rankScale)

      const baseContactDamage = this.getBaseContactDamage(target)
      target.contactDamage = Math.max(
        1,
        Math.round(
          baseContactDamage *
            (1 + nextStacks * 0.16 * rankScale),
        ),
      )

      const healAmount = Math.max(
        1,
        Math.round(target.maxHealth * 0.05 * rankScale),
      )
      target.health = Math.min(
        target.maxHealth,
        target.health + healAmount,
      )

      this.ensureDeathBuffRing(target)
      this.createBuffArrivalEffect(originX, originY, target)
    }
  }

  private updateDeathBuffs(now: number, enemies: EnemyUnit[]) {
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        this.clearEnemy(enemy)
        continue
      }

      const stacks = this.getDeathBuffStacks(enemy)

      if (stacks <= 0) {
        continue
      }

      const expiresAtValue = enemy.sprite.getData(
        'deathBuffExpiresAt',
      )
      const expiresAt =
        typeof expiresAtValue === 'number' ? expiresAtValue : 0

      if (expiresAt > 0 && now >= expiresAt) {
        this.clearEnemy(enemy)
        continue
      }

      const ring = this.ensureDeathBuffRing(enemy)
      const pulse =
        0.82 +
        (Math.sin(now / 170 + enemy.id) + 1) * 0.06

      ring
        .setPosition(enemy.sprite.x, enemy.sprite.y)
        .setDepth(enemy.sprite.y + 1)
        .setScale(pulse + stacks * 0.035)
        .setAlpha(0.11 + stacks * 0.055)
    }
  }

  private getDeathBuffStacks(enemy: EnemyUnit) {
    const value = enemy.sprite.getData('deathBuffStacks')
    return typeof value === 'number' ? Math.max(0, value) : 0
  }

  private getBaseContactDamage(enemy: EnemyUnit) {
    const value = enemy.sprite.getData('deathBuffBaseContactDamage')
    return typeof value === 'number' ? value : enemy.contactDamage
  }

  private ensureDeathBuffRing(enemy: EnemyUnit) {
    const existing = enemy.sprite.getData('deathBuffRing') as
      | Phaser.GameObjects.Arc
      | null
      | undefined

    if (existing?.active) {
      return existing
    }

    const radius = Math.max(30, enemy.projectileHitRadius + 12)
    const ring = this.scene.add
      .circle(enemy.sprite.x, enemy.sprite.y, radius, 0xf97316, 0.08)
      .setStrokeStyle(3, 0xfbbf24, 0.82)
      .setDepth(enemy.sprite.y + 1)

    enemy.sprite.setData('deathBuffRing', ring)
    return ring
  }

  private createDeathBuffPulse(x: number, y: number) {
    const pulse = this.scene.add
      .circle(x, y, 32, 0xf97316, 0.12)
      .setStrokeStyle(6, 0xfbbf24, 0.9)
      .setDepth(y + 30)

    this.scene.tweens.add({
      targets: pulse,
      scale: this.deathBuffRadius / 32,
      alpha: 0,
      duration: 620,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    })
  }

  private createBuffArrivalEffect(
    originX: number,
    originY: number,
    target: EnemyUnit,
  ) {
    const spark = this.scene.add
      .circle(originX, originY, 6, 0xfbbf24, 0.95)
      .setDepth(Math.max(originY, target.sprite.y) + 20)

    this.scene.tweens.add({
      targets: spark,
      x: target.sprite.x,
      y: target.sprite.y,
      scale: 0.45,
      duration: 260,
      ease: 'Quad.InOut',
      onComplete: () => spark.destroy(),
    })
  }

  private scheduleBroodChildren(
    originX: number,
    originY: number,
    enemies: EnemyUnit[],
    spawnBroodChild: SpawnBroodChild,
  ) {
    const activeChildren = enemies.filter(
      (enemy) =>
        enemy.alive &&
        enemy.sprite.active &&
        enemy.sprite.getData('isBroodChild') === true,
    ).length

    const availableSlots = Math.max(
      0,
      this.maximumBroodChildren -
        activeChildren -
        this.pendingChildSpawns,
    )

    if (availableSlots <= 0) {
      return
    }

    const requestedCount = Phaser.Math.Between(3, 5)
    const childCount = Math.min(requestedCount, availableSlots)
    const generationAtSchedule = this.generation

    this.pendingChildSpawns += childCount
    this.createBroodBurst(originX, originY, childCount)

    for (let index = 0; index < childCount; index++) {
      this.scene.time.delayedCall(70 + index * 65, () => {
        this.pendingChildSpawns = Math.max(
          0,
          this.pendingChildSpawns - 1,
        )

        if (generationAtSchedule !== this.generation) {
          return
        }

        const angle =
          (Math.PI * 2 * index) / Math.max(1, childCount) +
          Phaser.Math.FloatBetween(-0.18, 0.18)
        const distance = Phaser.Math.Between(35, 78)

        spawnBroodChild(
          originX + Math.cos(angle) * distance,
          originY + Math.sin(angle) * distance,
          index,
          childCount,
        )
      })
    }
  }

  private createBroodBurst(x: number, y: number, count: number) {
    const ring = this.scene.add
      .circle(x, y, 28, 0xec4899, 0.12)
      .setStrokeStyle(5, 0xf9a8d4, 0.9)
      .setDepth(y + 25)

    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    const text = this.scene.add
      .text(x, y - 45, `PHÂN TÁCH ×${count}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f9a8d4',
        stroke: '#500724',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(y + 30)

    this.scene.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 720,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
  }

  private createGroundHazard(
    kind: GroundHazardKind,
    x: number,
    y: number,
    wave: number,
  ) {
    this.ensureHazardCapacity(kind)

    const isPoison = kind === 'poison'
    const radius = isPoison ? 125 : 110
    const duration = isPoison ? 7000 : 4800
    const waveBonus = Math.min(4, Math.floor(Math.max(1, wave) / 10))
    const damage = (isPoison ? 3 : 5) + waveBonus
    const { visual, core } = isPoison
      ? this.createPoisonHazardVisual(x, y, radius)
      : this.createFireHazardVisual(x, y, radius)

    visual.setScale(0.25)
    core.setScale(0.2)

    this.scene.tweens.add({
      targets: [visual, core],
      scale: 1,
      duration: 260,
      ease: 'Back.Out',
    })

    this.hazards.push({
      id: ++this.hazardIdCounter,
      kind,
      x,
      y,
      radius,
      damage,
      createdAt: this.scene.time.now,
      expiresAt: this.scene.time.now + duration,
      visual,
      core,
    })
  }

  private createPoisonHazardVisual(
    x: number,
    y: number,
    radius: number,
  ) {
    const visual = this.scene.add
      .container(x, y)
      .setDepth(y - 8)

    const outer = this.scene.add.graphics()
    outer.fillStyle(0x052e16, 0.88)
    outer.fillEllipse(0, 5, radius * 2.08, radius * 1.42)
    outer.fillStyle(0x166534, 0.9)
    outer.fillEllipse(-radius * 0.18, 0, radius * 1.55, radius * 1.08)
    outer.fillEllipse(radius * 0.43, radius * 0.05, radius * 0.82, radius * 0.64)
    outer.fillEllipse(-radius * 0.54, radius * 0.08, radius * 0.7, radius * 0.56)
    outer.lineStyle(5, 0xa3e635, 0.88)
    outer.strokeEllipse(0, 5, radius * 2.02, radius * 1.36)
    outer.lineStyle(2, 0xd9f99d, 0.5)
    outer.strokeEllipse(-radius * 0.15, 0, radius * 1.48, radius)
    visual.add(outer)

    const core = this.scene.add
      .container(x, y)
      .setDepth(y - 7)

    const liquid = this.scene.add.graphics()
    liquid.fillStyle(0x22c55e, 0.92)
    liquid.fillEllipse(0, 2, radius * 1.14, radius * 0.78)
    liquid.fillStyle(0x84cc16, 0.82)
    liquid.fillEllipse(-radius * 0.18, -radius * 0.08, radius * 0.62, radius * 0.42)
    liquid.fillStyle(0xd9f99d, 0.44)
    liquid.fillEllipse(-radius * 0.27, -radius * 0.16, radius * 0.2, radius * 0.12)
    core.add(liquid)

    const bubbleData = [
      [-0.31, -0.05, 0.11],
      [0.04, -0.2, 0.14],
      [0.32, 0.02, 0.09],
      [-0.08, 0.2, 0.08],
      [0.22, 0.19, 0.07],
    ] as const

    for (const [ratioX, ratioY, ratioRadius] of bubbleData) {
      const bubble = this.scene.add.circle(
        ratioX * radius,
        ratioY * radius,
        ratioRadius * radius,
        0xa3e635,
        0.92,
      )
      bubble.setStrokeStyle(2, 0xecfccb, 0.9)
      const highlight = this.scene.add.circle(
        ratioX * radius - ratioRadius * radius * 0.28,
        ratioY * radius - ratioRadius * radius * 0.3,
        Math.max(2, ratioRadius * radius * 0.23),
        0xffffff,
        0.72,
      )
      core.add([bubble, highlight])
    }

    return { visual, core }
  }

  private createFireHazardVisual(
    x: number,
    y: number,
    radius: number,
  ) {
    const visual = this.scene.add
      .container(x, y)
      .setDepth(y - 8)

    const glow = this.scene.add.graphics()
    glow.fillStyle(0x7c2d12, 0.84)
    glow.fillEllipse(0, radius * 0.13, radius * 2.05, radius * 1.35)
    glow.fillStyle(0xc2410c, 0.86)
    glow.fillEllipse(0, radius * 0.08, radius * 1.7, radius * 1.08)
    glow.lineStyle(5, 0xfbbf24, 0.88)
    glow.strokeEllipse(0, radius * 0.12, radius * 1.98, radius * 1.28)
    visual.add(glow)

    const core = this.scene.add
      .container(x, y)
      .setDepth(y - 7)

    const flames = this.scene.add.graphics()
    flames.fillStyle(0xf97316, 0.95)
    flames.fillEllipse(0, radius * 0.16, radius * 1.36, radius * 0.72)

    const flameAngles = [-1.2, -0.82, -0.42, 0, 0.42, 0.82, 1.2]
    for (let index = 0; index < flameAngles.length; index++) {
      const angle = flameAngles[index]
      const baseX = Math.sin(angle) * radius * 0.55
      const baseY = Math.cos(angle) * radius * 0.18 + radius * 0.04
      const height = radius * (index % 2 === 0 ? 0.78 : 0.96)
      const width = radius * (index % 2 === 0 ? 0.24 : 0.3)

      flames.fillStyle(index % 2 === 0 ? 0xf97316 : 0xef4444, 0.96)
      flames.fillTriangle(
        baseX - width,
        baseY + radius * 0.3,
        baseX + width,
        baseY + radius * 0.3,
        baseX,
        baseY - height,
      )
      flames.fillStyle(0xfacc15, 0.92)
      flames.fillTriangle(
        baseX - width * 0.48,
        baseY + radius * 0.27,
        baseX + width * 0.48,
        baseY + radius * 0.27,
        baseX,
        baseY - height * 0.48,
      )
    }

    flames.fillStyle(0xfef3c7, 0.9)
    flames.fillEllipse(0, radius * 0.18, radius * 0.5, radius * 0.24)
    core.add(flames)

    const emberData = [
      [-0.42, -0.25, 0.045],
      [-0.1, -0.5, 0.055],
      [0.22, -0.36, 0.04],
      [0.47, -0.12, 0.05],
    ] as const

    for (const [ratioX, ratioY, ratioRadius] of emberData) {
      core.add(
        this.scene.add.circle(
          ratioX * radius,
          ratioY * radius,
          ratioRadius * radius,
          0xfef08a,
          0.94,
        ),
      )
    }

    return { visual, core }
  }

  private ensureHazardCapacity(kind: GroundHazardKind) {
    const sameKind = this.hazards
      .filter((hazard) => hazard.kind === kind)
      .sort((left, right) => left.createdAt - right.createdAt)

    if (sameKind.length >= this.maximumHazardsPerKind) {
      this.removeHazard(sameKind[0])
    }

    if (this.hazards.length >= this.maximumHazards) {
      const oldest = [...this.hazards].sort(
        (left, right) => left.createdAt - right.createdAt,
      )[0]

      if (oldest) {
        this.removeHazard(oldest)
      }
    }
  }

  private updateHazards(
    now: number,
    playerX: number,
    playerY: number,
    playerRadius: number,
    onPlayerDamage: (damage: number) => void,
  ) {
    let strongestOverlappingDamage = 0

    for (let index = this.hazards.length - 1; index >= 0; index--) {
      const hazard = this.hazards[index]

      if (now >= hazard.expiresAt) {
        this.destroyHazard(hazard)
        this.hazards.splice(index, 1)
        continue
      }

      const lifeRatio = Phaser.Math.Clamp(
        (hazard.expiresAt - now) /
          Math.max(1, hazard.expiresAt - hazard.createdAt),
        0,
        1,
      )
      const pulse =
        0.96 +
        (Math.sin(now / 210 + hazard.id) + 1) * 0.035

      hazard.visual
        .setScale(pulse)
        .setAlpha((hazard.kind === 'poison' ? 0.78 : 0.86) * lifeRatio)
        .setAngle(Math.sin(now / 520 + hazard.id) * 1.4)
      hazard.core
        .setScale(0.92 + (2 - pulse) * 0.12)
        .setAlpha((hazard.kind === 'poison' ? 0.92 : 0.96) * lifeRatio)
        .setAngle(
          hazard.kind === 'poison'
            ? Math.sin(now / 360 + hazard.id) * 2.2
            : Math.sin(now / 130 + hazard.id) * 1.1,
        )

      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        hazard.x,
        hazard.y,
      )

      if (distance <= hazard.radius + playerRadius) {
        strongestOverlappingDamage = Math.max(
          strongestOverlappingDamage,
          hazard.damage,
        )
      }
    }

    if (
      strongestOverlappingDamage > 0 &&
      now >= this.nextPlayerHazardDamageAt
    ) {
      this.nextPlayerHazardDamageAt =
        now + this.hazardDamageCooldown
      onPlayerDamage(strongestOverlappingDamage)
    }
  }

  private removeHazard(hazard: GroundHazardState) {
    const index = this.hazards.findIndex(
      (candidate) => candidate.id === hazard.id,
    )

    if (index < 0) {
      return
    }

    this.destroyHazard(hazard)
    this.hazards.splice(index, 1)
  }

  private destroyHazard(hazard: GroundHazardState) {
    this.scene.tweens.killTweensOf(hazard.visual)
    this.scene.tweens.killTweensOf(hazard.core)

    if (hazard.visual.active) {
      hazard.visual.removeAll(true)
      hazard.visual.destroy()
    }

    if (hazard.core.active) {
      hazard.core.removeAll(true)
      hazard.core.destroy()
    }
  }
}
