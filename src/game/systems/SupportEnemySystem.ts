import Phaser from 'phaser'
import type { EnemyUnit } from '../types/game'

type ShieldDamageResult = {
  healthDamage: number
  shieldDamage: number
}

export class SupportEnemySystem {
  private readonly scene: Phaser.Scene

  private readonly healerRadius = 270
  private readonly healerCooldown = 2300
  private readonly healerTargetLimit = 4

  private readonly shielderRadius = 285
  private readonly shielderCooldown = 2700
  private readonly shielderTargetLimit = 4
  private readonly shieldDuration = 5200

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  reset(enemies: EnemyUnit[] = []) {
    this.clearAll(enemies)
  }

  initializeEnemy(enemy: EnemyUnit, now: number) {
    enemy.sprite.setData(
      'nextSupportActionAt',
      now + 700 + (enemy.id % 5) * 180,
    )
    enemy.sprite.setData('supportShield', 0)
    enemy.sprite.setData('supportShieldMaximum', 0)
    enemy.sprite.setData('supportShieldExpiresAt', 0)
    enemy.sprite.setData('supportShieldRing', null)
  }

  update(
    now: number,
    enemies: EnemyUnit[],
    onHealthChanged?: (enemy: EnemyUnit) => void,
  ) {
    this.updateShieldStates(now, enemies)

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.rank !== 'normal') {
        continue
      }

      if (enemy.archetypeId === 'healer') {
        this.tryHeal(enemy, now, enemies, onHealthChanged)
      } else if (enemy.archetypeId === 'shielder') {
        this.tryShield(enemy, now, enemies)
      }
    }
  }

  absorbDamage(
    enemy: EnemyUnit,
    amount: number,
  ): ShieldDamageResult {
    const safeAmount = Math.max(0, amount)
    const shield = this.getShieldAmount(enemy)

    if (safeAmount <= 0 || shield <= 0) {
      return {
        healthDamage: safeAmount,
        shieldDamage: 0,
      }
    }

    const absorbed = Math.min(shield, safeAmount)
    const remainingShield = Math.max(0, shield - absorbed)

    enemy.sprite.setData('supportShield', remainingShield)

    this.createShieldHitEffect(enemy, absorbed)

    if (remainingShield <= 0) {
      this.removeShieldVisual(enemy)
    } else {
      this.updateShieldVisual(enemy)
    }

    return {
      healthDamage: Math.max(0, safeAmount - absorbed),
      shieldDamage: absorbed,
    }
  }

  getShieldAmount(enemy: EnemyUnit) {
    const value = enemy.sprite.getData('supportShield')
    return typeof value === 'number' ? Math.max(0, value) : 0
  }

  clearEnemy(enemy: EnemyUnit) {
    this.removeShieldVisual(enemy)
    enemy.sprite.setData('supportShield', 0)
    enemy.sprite.setData('supportShieldMaximum', 0)
    enemy.sprite.setData('supportShieldExpiresAt', 0)
  }

  clearAll(enemies: EnemyUnit[]) {
    for (const enemy of enemies) {
      this.clearEnemy(enemy)
    }
  }

  private tryHeal(
    healer: EnemyUnit,
    now: number,
    enemies: EnemyUnit[],
    onHealthChanged?: (enemy: EnemyUnit) => void,
  ) {
    if (now < this.getNextSupportActionAt(healer)) {
      return
    }

    const targets = enemies
      .filter((target) => {
        if (!target.alive || target.id === healer.id) {
          return false
        }

        if (target.health >= target.maxHealth) {
          return false
        }

        return (
          Phaser.Math.Distance.Between(
            healer.sprite.x,
            healer.sprite.y,
            target.sprite.x,
            target.sprite.y,
          ) <= this.healerRadius
        )
      })
      .sort((left, right) => {
        const leftRatio = left.health / left.maxHealth
        const rightRatio = right.health / right.maxHealth
        return leftRatio - rightRatio
      })
      .slice(0, this.healerTargetLimit)

    if (targets.length === 0) {
      this.setNextSupportActionAt(healer, now + 550)
      return
    }

    this.setNextSupportActionAt(
      healer,
      now + this.healerCooldown + (healer.id % 3) * 120,
    )

    this.createSupportPulse(healer, 0x22c55e, 0x86efac)

    for (const target of targets) {
      const rankMultiplier =
        target.rank === 'boss'
          ? 0.28
          : target.rank === 'mini-boss'
            ? 0.45
            : 1

      const healAmount = Math.max(
        1,
        Math.round(target.maxHealth * 0.1 * rankMultiplier),
      )

      const previousHealth = target.health
      target.health = Math.min(
        target.maxHealth,
        target.health + healAmount,
      )

      const actualHeal = target.health - previousHealth

      if (actualHeal > 0) {
        this.createHealEffect(healer, target, actualHeal)
        onHealthChanged?.(target)
      }
    }
  }

  private tryShield(
    shielder: EnemyUnit,
    now: number,
    enemies: EnemyUnit[],
  ) {
    if (now < this.getNextSupportActionAt(shielder)) {
      return
    }

    const targets = enemies
      .filter((target) => {
        if (!target.alive) {
          return false
        }

        return (
          Phaser.Math.Distance.Between(
            shielder.sprite.x,
            shielder.sprite.y,
            target.sprite.x,
            target.sprite.y,
          ) <= this.shielderRadius
        )
      })
      .sort((left, right) => {
        const leftShieldRatio =
          this.getShieldAmount(left) / Math.max(1, left.maxHealth)
        const rightShieldRatio =
          this.getShieldAmount(right) / Math.max(1, right.maxHealth)

        if (leftShieldRatio !== rightShieldRatio) {
          return leftShieldRatio - rightShieldRatio
        }

        return left.id === shielder.id ? 1 : -1
      })
      .slice(0, this.shielderTargetLimit)

    if (targets.length === 0) {
      this.setNextSupportActionAt(shielder, now + 550)
      return
    }

    this.setNextSupportActionAt(
      shielder,
      now + this.shielderCooldown + (shielder.id % 3) * 130,
    )

    this.createSupportPulse(shielder, 0x2563eb, 0x93c5fd)

    for (const target of targets) {
      const rankMultiplier =
        target.rank === 'boss'
          ? 0.42
          : target.rank === 'mini-boss'
            ? 0.62
            : 1

      const selfMultiplier = target.id === shielder.id ? 0.55 : 1
      const shieldGrant = Math.max(
        6,
        Math.round(
          target.maxHealth * 0.16 * rankMultiplier * selfMultiplier,
        ),
      )

      const maximumShield = Math.max(
        10,
        Math.round(target.maxHealth * 0.3 * rankMultiplier),
      )

      const currentShield = this.getShieldAmount(target)
      const nextShield = Math.min(
        maximumShield,
        currentShield + shieldGrant,
      )

      target.sprite.setData('supportShield', nextShield)
      target.sprite.setData('supportShieldMaximum', maximumShield)
      target.sprite.setData(
        'supportShieldExpiresAt',
        now + this.shieldDuration,
      )

      this.ensureShieldVisual(target)
      this.updateShieldVisual(target)
      this.createShieldGrantEffect(shielder, target)
    }
  }

  private updateShieldStates(now: number, enemies: EnemyUnit[]) {
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        this.clearEnemy(enemy)
        continue
      }

      const shield = this.getShieldAmount(enemy)
      const expiresAtValue = enemy.sprite.getData(
        'supportShieldExpiresAt',
      )
      const expiresAt =
        typeof expiresAtValue === 'number' ? expiresAtValue : 0

      if (shield <= 0 || (expiresAt > 0 && now >= expiresAt)) {
        this.clearEnemy(enemy)
        continue
      }

      this.ensureShieldVisual(enemy)
      this.updateShieldVisual(enemy)
    }
  }

  private ensureShieldVisual(enemy: EnemyUnit) {
    const existing = enemy.sprite.getData('supportShieldRing') as
      | Phaser.GameObjects.Container
      | null
      | undefined

    if (existing?.active) {
      return existing
    }

    const radius = Math.max(31, enemy.projectileHitRadius + 13)
    const container = this.scene.add
      .container(enemy.sprite.x, enemy.sprite.y)
      .setDepth(enemy.sprite.y + 1)

    const aura = this.scene.add.circle(
      0,
      0,
      radius,
      0x2563eb,
      0.18,
    )
    aura.setStrokeStyle(4, 0x7dd3fc, 0.92)

    const innerRing = this.scene.add.circle(
      0,
      0,
      radius * 0.78,
      0x38bdf8,
      0.08,
    )
    innerRing.setStrokeStyle(2, 0xbae6fd, 0.68)

    const shield = this.scene.add.graphics()
    const shieldWidth = radius * 0.74
    const shieldHeight = radius * 0.92

    shield.fillStyle(0x1d4ed8, 0.54)
    shield.fillRoundedRect(
      -shieldWidth / 2,
      -shieldHeight / 2,
      shieldWidth,
      shieldHeight * 0.66,
      7,
    )
    shield.fillTriangle(
      -shieldWidth / 2,
      shieldHeight * 0.08,
      shieldWidth / 2,
      shieldHeight * 0.08,
      0,
      shieldHeight / 2,
    )
    shield.lineStyle(3, 0xdbeafe, 0.92)
    shield.strokeRoundedRect(
      -shieldWidth / 2,
      -shieldHeight / 2,
      shieldWidth,
      shieldHeight * 0.66,
      7,
    )
    shield.lineBetween(
      -shieldWidth / 2,
      shieldHeight * 0.08,
      0,
      shieldHeight / 2,
    )
    shield.lineBetween(
      shieldWidth / 2,
      shieldHeight * 0.08,
      0,
      shieldHeight / 2,
    )
    shield.lineStyle(3, 0x93c5fd, 0.82)
    shield.lineBetween(0, -shieldHeight * 0.32, 0, shieldHeight * 0.24)
    shield.lineBetween(-shieldWidth * 0.28, -shieldHeight * 0.04, shieldWidth * 0.28, -shieldHeight * 0.04)

    const shine = this.scene.add.ellipse(
      -radius * 0.28,
      -radius * 0.32,
      radius * 0.32,
      radius * 0.12,
      0xffffff,
      0.34,
    )
    shine.setRotation(-0.55)

    container.add([aura, innerRing, shield, shine])
    enemy.sprite.setData('supportShieldRing', container)
    return container
  }

  private updateShieldVisual(enemy: EnemyUnit) {
    const ring = enemy.sprite.getData('supportShieldRing') as
      | Phaser.GameObjects.Container
      | null
      | undefined

    if (!ring?.active) {
      return
    }

    const shield = this.getShieldAmount(enemy)
    const maximumValue = enemy.sprite.getData('supportShieldMaximum')
    const maximum =
      typeof maximumValue === 'number' ? Math.max(1, maximumValue) : 1
    const ratio = Phaser.Math.Clamp(shield / maximum, 0, 1)
    const pulse =
      0.98 +
      (Math.sin(this.scene.time.now / 180 + enemy.id) + 1) * 0.025

    ring
      .setPosition(enemy.sprite.x, enemy.sprite.y)
      .setDepth(enemy.sprite.y + 1)
      .setAlpha(0.42 + ratio * 0.46)
      .setScale((0.92 + ratio * 0.11) * pulse)
      .setAngle(Math.sin(this.scene.time.now / 480 + enemy.id) * 1.8)
  }

  private removeShieldVisual(enemy: EnemyUnit) {
    const ring = enemy.sprite.getData('supportShieldRing') as
      | Phaser.GameObjects.Container
      | null
      | undefined

    if (ring?.active) {
      this.scene.tweens.killTweensOf(ring)
      ring.removeAll(true)
      ring.destroy()
    }

    enemy.sprite.setData('supportShieldRing', null)
  }

  private getNextSupportActionAt(enemy: EnemyUnit) {
    const value = enemy.sprite.getData('nextSupportActionAt')
    return typeof value === 'number' ? value : 0
  }

  private setNextSupportActionAt(enemy: EnemyUnit, value: number) {
    enemy.sprite.setData('nextSupportActionAt', value)
  }

  private createSupportPulse(
    enemy: EnemyUnit,
    color: number,
    borderColor: number,
  ) {
    const pulse = this.scene.add
      .circle(enemy.sprite.x, enemy.sprite.y, 18, color, 0.12)
      .setStrokeStyle(4, borderColor, 0.82)
      .setDepth(enemy.sprite.y + 8)

    this.scene.tweens.add({
      targets: pulse,
      scale: 4.2,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    })
  }

  private createHealEffect(
    healer: EnemyUnit,
    target: EnemyUnit,
    amount: number,
  ) {
    const orb = this.scene.add
      .circle(healer.sprite.x, healer.sprite.y, 7, 0x4ade80, 0.9)
      .setDepth(Math.max(healer.sprite.y, target.sprite.y) + 20)

    this.scene.tweens.add({
      targets: orb,
      x: target.sprite.x,
      y: target.sprite.y,
      scale: 0.55,
      duration: 260,
      ease: 'Quad.InOut',
      onComplete: () => {
        orb.destroy()

        const text = this.scene.add
          .text(target.sprite.x, target.sprite.y - 42, `+${amount}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#86efac',
            stroke: '#052e16',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(target.sprite.y + 24)

        this.scene.tweens.add({
          targets: text,
          y: text.y - 28,
          alpha: 0,
          duration: 520,
          ease: 'Quad.Out',
          onComplete: () => text.destroy(),
        })
      },
    })
  }

  private createShieldGrantEffect(
    shielder: EnemyUnit,
    target: EnemyUnit,
  ) {
    const spark = this.scene.add
      .circle(shielder.sprite.x, shielder.sprite.y, 6, 0x60a5fa, 0.92)
      .setDepth(Math.max(shielder.sprite.y, target.sprite.y) + 18)

    this.scene.tweens.add({
      targets: spark,
      x: target.sprite.x,
      y: target.sprite.y,
      alpha: 0,
      scale: 1.8,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => spark.destroy(),
    })
  }

  private createShieldHitEffect(enemy: EnemyUnit, amount: number) {
    const ring = this.scene.add
      .circle(
        enemy.sprite.x,
        enemy.sprite.y,
        Math.max(26, enemy.projectileHitRadius + 7),
        0x38bdf8,
        0.12,
      )
      .setStrokeStyle(4, 0xbae6fd, 0.9)
      .setDepth(enemy.sprite.y + 25)

    const text = this.scene.add
      .text(enemy.sprite.x, enemy.sprite.y - 36, `KHIÊN -${amount}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#bae6fd',
        stroke: '#082f49',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(enemy.sprite.y + 26)

    this.scene.tweens.add({
      targets: ring,
      scale: 1.45,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
  }
}
