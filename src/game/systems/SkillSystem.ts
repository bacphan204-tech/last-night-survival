import Phaser from 'phaser'
import {
  ACTIVE_PLAYER_SKILL_IDS,
  MAX_ACTIVE_SKILL_SLOTS,
  PLAYER_SKILL_DEFINITIONS,
} from '../data/skills'
import type {
  ActivePlayerSkillId,
  EnemyUnit,
  FusionSkillState,
  PlayerSkillId,
  PlayerStats,
  SkillUpgradeContext,
} from '../types/game'

type SkillUpdateOptions = {
  now: number
  playerX: number
  playerY: number
  enemies: EnemyUnit[]
  stats: PlayerStats
  damageEnemy: (enemy: EnemyUnit, damage: number) => void
  playSkillSound?: (skillId: ActivePlayerSkillId) => void
}

type OrbitingBladeVisual = {
  blade: Phaser.GameObjects.Image
  glow: Phaser.GameObjects.Ellipse
}

type DroneVisual = {
  core: Phaser.GameObjects.Image
  glow: Phaser.GameObjects.Ellipse
}

type GravityWellState = {
  x: number
  y: number
  radius: number
  expiresAt: number
  nextDamageAt: number
  level: number
  ring: Phaser.GameObjects.Arc
  core: Phaser.GameObjects.Arc
  swirl: Phaser.GameObjects.Polygon
  nextParticleAt: number
}

type SlowState = {
  enemy: EnemyUnit
  expiresAt: number
  multiplier: number
}

export class SkillSystem {
  private readonly scene: Phaser.Scene
  private levels = new Map<PlayerSkillId, number>()
  private fusionSkills: FusionSkillState[] = []
  private fusionCounter = 0
  private orbitingBlades: OrbitingBladeVisual[] = []
  private combatDrones: DroneVisual[] = []
  private orbitHitCooldowns = new Map<string, number>()
  private slowStates = new Map<number, SlowState>()
  private gravityWells: GravityWellState[] = []

  private nextBladeWaveAt = 0
  private nextChainLightningAt = 0
  private nextPlasmaNovaAt = 0
  private nextIceLanceAt = 0
  private nextMeteorRainAt = 0
  private nextGravityWellAt = 0
  private nextDroneVolleyAt = 0
  private nextEnergyLaserAt = 0
  private droneVolleyCounter = 0
  private fusionAuraOuter: Phaser.GameObjects.Arc | null = null
  private fusionAuraInner: Phaser.GameObjects.Polygon | null = null
  private nextFusionParticleAt = 0
  private generation = 0
  private stopped = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  reset() {
    this.generation++
    this.levels.clear()
    this.fusionSkills = []
    this.fusionCounter = 0
    this.orbitHitCooldowns.clear()
    this.slowStates.clear()
    this.clearGravityWells()
    this.destroyOrbitingBlades()
    this.destroyCombatDrones()
    this.destroyFusionAura()

    this.nextBladeWaveAt = 0
    this.nextChainLightningAt = 0
    this.nextPlasmaNovaAt = 0
    this.nextIceLanceAt = 0
    this.nextMeteorRainAt = 0
    this.nextGravityWellAt = 0
    this.nextDroneVolleyAt = 0
    this.nextEnergyLaserAt = 0
    this.droneVolleyCounter = 0
    this.nextFusionParticleAt = 0
    this.stopped = false
  }

  stopAll() {
    this.generation++
    this.stopped = true
    this.clearGravityWells()
    this.slowStates.clear()

    for (const visual of this.orbitingBlades) {
      visual.blade.setVisible(false)
      visual.glow.setVisible(false)
    }

    for (const visual of this.combatDrones) {
      visual.core.setVisible(false)
      visual.glow.setVisible(false)
    }

    this.fusionAuraOuter?.setVisible(false)
    this.fusionAuraInner?.setVisible(false)
  }

  resume() {
    this.stopped = false

    for (const visual of this.orbitingBlades) {
      visual.blade.setVisible(true)
      visual.glow.setVisible(true)
    }

    for (const visual of this.combatDrones) {
      visual.core.setVisible(true)
      visual.glow.setVisible(true)
    }

    if (this.fusionSkills.length > 0) {
      this.ensureFusionAura()
      this.fusionAuraOuter?.setVisible(true)
      this.fusionAuraInner?.setVisible(true)
    }
  }

  applyUpgrade(id: PlayerSkillId) {
    const definition = PLAYER_SKILL_DEFINITIONS[id]
    const nextLevel = Math.min(
      definition.maximumLevel,
      this.getLevel(id) + 1,
    )

    this.levels.set(id, nextLevel)
    this.stopped = false

    if (id === 'orbiting-blades') {
      this.ensureOrbitingBladeVisuals()
    }

    if (id === 'combat-drone') {
      this.ensureCombatDroneVisuals()
    }

    const now = this.scene.time.now

    if (id === 'chain-lightning' && this.nextChainLightningAt <= 0) {
      this.nextChainLightningAt = now + 500
    }

    if (id === 'plasma-nova' && this.nextPlasmaNovaAt <= 0) {
      this.nextPlasmaNovaAt = now + 750
    }

    if (id === 'ice-lance' && this.nextIceLanceAt <= 0) {
      this.nextIceLanceAt = now + 620
    }

    if (id === 'meteor-rain' && this.nextMeteorRainAt <= 0) {
      this.nextMeteorRainAt = now + 900
    }

    if (id === 'gravity-well' && this.nextGravityWellAt <= 0) {
      this.nextGravityWellAt = now + 1050
    }

    if (id === 'combat-drone' && this.nextDroneVolleyAt <= 0) {
      this.nextDroneVolleyAt = now + 480
    }

    if (id === 'energy-laser' && this.nextEnergyLaserAt <= 0) {
      this.nextEnergyLaserAt = now + 800
    }
  }

  getLevel(id: PlayerSkillId) {
    return this.levels.get(id) ?? 0
  }


  getUpgradeContext(): SkillUpgradeContext {
    const ownedBaseSkillIds = ACTIVE_PLAYER_SKILL_IDS.filter(
      (id) => this.getRuntimeLevel(id) > 0,
    )
    const activeBaseCount = ACTIVE_PLAYER_SKILL_IDS.filter(
      (id) => (this.levels.get(id) ?? 0) > 0,
    ).length

    return {
      activeSlotCount: activeBaseCount + this.fusionSkills.length,
      maximumActiveSlots: MAX_ACTIVE_SKILL_SLOTS,
      ownedBaseSkillIds,
      maxedFusionCount: this.fusionSkills.filter(
        (fusion) => fusion.level >= 5,
      ).length,
      upgradeableFusionCount: this.fusionSkills.filter(
        (fusion) => fusion.level < 5,
      ).length,
      canFuse: this.getFusionCandidates().length >= 2,
    }
  }

  fuseRandom(rng: Phaser.Math.RandomDataGenerator) {
    const candidates = this.getFusionCandidates()

    if (candidates.length < 2) {
      return null
    }

    const firstIndex = rng.integerInRange(0, candidates.length - 1)
    const first = candidates[firstIndex]
    candidates.splice(firstIndex, 1)
    const second = candidates[rng.integerInRange(0, candidates.length - 1)]

    const components = Array.from(
      new Set([...first.componentSkillIds, ...second.componentSkillIds]),
    )
    const tier = Math.max(first.tier, second.tier) + 1

    this.consumeFusionCandidate(first)
    this.consumeFusionCandidate(second)

    const fusion: FusionSkillState = {
      id: `fusion-${++this.fusionCounter}`,
      title: this.createFusionTitle(components, tier),
      level: 1,
      tier,
      componentSkillIds: components,
    }

    this.fusionSkills.push(fusion)
    this.refreshPersistentVisuals()
    return fusion
  }

  upgradeRandomFusion(rng: Phaser.Math.RandomDataGenerator) {
    const candidates = this.fusionSkills.filter(
      (fusion) => fusion.level < 5,
    )

    if (candidates.length === 0) {
      return null
    }

    const fusion = candidates[rng.integerInRange(0, candidates.length - 1)]
    fusion.level++
    return fusion
  }

  getFusionSkills() {
    return this.fusionSkills.map((fusion) => ({ ...fusion }))
  }

  private getRuntimeLevel(id: PlayerSkillId) {
    const directLevel = this.levels.get(id) ?? 0

    if (id === 'multishot') {
      return directLevel
    }

    const inherited = this.fusionSkills.some((fusion) =>
      fusion.componentSkillIds.includes(id as ActivePlayerSkillId),
    )

    return inherited ? 5 : directLevel
  }

  private getFusionCandidates() {
    const baseCandidates = ACTIVE_PLAYER_SKILL_IDS
      .filter((id) => (this.levels.get(id) ?? 0) >= 5)
      .map((id) => ({
        kind: 'base' as const,
        id,
        tier: 0,
        componentSkillIds: [id],
      }))

    const fusionCandidates = this.fusionSkills
      .filter((fusion) => fusion.level >= 5)
      .map((fusion) => ({
        kind: 'fusion' as const,
        id: fusion.id,
        tier: fusion.tier,
        componentSkillIds: fusion.componentSkillIds,
      }))

    return [...baseCandidates, ...fusionCandidates]
  }

  private consumeFusionCandidate(candidate: {
    kind: 'base' | 'fusion'
    id: string
  }) {
    if (candidate.kind === 'base') {
      this.levels.delete(candidate.id as ActivePlayerSkillId)
      return
    }

    this.fusionSkills = this.fusionSkills.filter(
      (fusion) => fusion.id !== candidate.id,
    )
  }

  private createFusionTitle(
    components: ActivePlayerSkillId[],
    tier: number,
  ) {
    const pairKey = [...components].sort().slice(0, 2).join('|')
    const namedFusions: Record<string, string> = {
      'energy-laser|orbiting-blades': 'QUANG KIẾM TẬN DIỆT',
      'ice-lance|meteor-rain': 'SAO CHỔI BĂNG GIÁ',
      'gravity-well|plasma-nova': 'KỲ DỊ ĐIỂM PLASMA',
      'chain-lightning|combat-drone': 'BẦY DRONE LÔI ĐIỆN',
      'chain-lightning|ice-lance': 'BÃO SÉT ĐÔNG KẾT',
      'gravity-well|meteor-rain': 'TINH VÂN HỦY DIỆT',
      'combat-drone|energy-laser': 'PHÁO ĐÀI QUANG TỬ',
      'orbiting-blades|plasma-nova': 'KIẾM TRẬN PLASMA',
      'energy-laser|gravity-well': 'TIA SỤP ĐỔ HƯ KHÔNG',
      'meteor-rain|plasma-nova': 'ĐẠI HỒNG THỦY TINH HỎA',
    }
    const fallbackNames = components
      .slice(0, 2)
      .map((id) => PLAYER_SKILL_DEFINITIONS[id].title)
      .join(' × ')

    return `${namedFusions[pairKey] ?? fallbackNames}  •  BẬC ${tier}`
  }

  private getFusionDamageMultiplier() {
    if (this.fusionSkills.length === 0) {
      return 1
    }

    const bonus = this.fusionSkills.reduce((total, fusion) => {
      const componentBonus = fusion.componentSkillIds.length * 0.08
      const tierBonus = fusion.tier * 0.16
      const levelBonus = fusion.level * 0.09
      return total + componentBonus + tierBonus + levelBonus
    }, 0)

    return Math.min(1_000_000, 1 + bonus)
  }

  private refreshPersistentVisuals() {
    this.ensureOrbitingBladeVisuals()
    this.ensureCombatDroneVisuals()
    this.ensureFusionAura()
  }

  getEnemySpeedMultiplier(enemy: EnemyUnit, now: number) {
    const state = this.slowStates.get(enemy.id)

    if (!state) {
      return 1
    }

    if (
      now >= state.expiresAt ||
      !state.enemy.alive ||
      !state.enemy.sprite.active
    ) {
      this.slowStates.delete(enemy.id)
      return 1
    }

    return state.multiplier
  }

  getBasicShotAngles(baseAngle: number) {
    const level = this.getRuntimeLevel('multishot')

    if (level <= 0) {
      return [baseAngle]
    }

    const projectileCount = level + 1
    const totalSpread = 0.16 + level * 0.055

    return Array.from({ length: projectileCount }, (_, index) => {
      const ratio = index / Math.max(1, projectileCount - 1)
      return baseAngle - totalSpread / 2 + totalSpread * ratio
    })
  }

  getBasicShotDamageMultiplier() {
    const level = this.getRuntimeLevel('multishot')

    if (level <= 0) {
      return 1
    }

    return Math.min(1.03, 0.69 + level * 0.068)
  }

  update(options: SkillUpdateOptions) {
    if (this.stopped) {
      return
    }

    const fusionMultiplier = this.getFusionDamageMultiplier()
    const effectiveOptions: SkillUpdateOptions = {
      ...options,
      damageEnemy: (enemy, damage) =>
        options.damageEnemy(
          enemy,
          Math.max(1, Math.round(damage * fusionMultiplier)),
        ),
    }

    this.pruneSlowStates(effectiveOptions.now)
    this.updateGravityWells(effectiveOptions)
    this.updateOrbitingBlades(effectiveOptions)
    this.updateChainLightning(effectiveOptions)
    this.updatePlasmaNova(effectiveOptions)
    this.updateIceLance(effectiveOptions)
    this.updateMeteorRain(effectiveOptions)
    this.updateGravityWellCasting(effectiveOptions)
    this.updateCombatDrones(effectiveOptions)
    this.updateEnergyLaser(effectiveOptions)
    this.updateFusionAura(effectiveOptions)
  }

  private getOrbitingBladeCount() {
    const level = this.getRuntimeLevel('orbiting-blades')

    if (level <= 0) {
      return 0
    }

    const counts = [0, 1, 2, 2, 3, 4]
    return counts[level] ?? 4
  }

  private destroyOrbitingBlades() {
    for (const visual of this.orbitingBlades) {
      visual.blade.destroy()
      visual.glow.destroy()
    }

    this.orbitingBlades = []
  }

  private ensureOrbitingBladeVisuals() {
    const requiredCount = this.getOrbitingBladeCount()

    while (this.orbitingBlades.length < requiredCount) {
      const glow = this.scene.add
        .ellipse(0, 0, 44, 25, 0x22d3ee, 0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16000)

      const blade = this.scene.add
        .image(0, 0, 'skill-orbit-blade')
        .setOrigin(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16001)

      this.orbitingBlades.push({ blade, glow })
    }

    while (this.orbitingBlades.length > requiredCount) {
      const visual = this.orbitingBlades.pop()

      if (visual) {
        visual.blade.destroy()
        visual.glow.destroy()
      }
    }
  }

  private updateOrbitingBlades(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('orbiting-blades')

    if (level <= 0) {
      return
    }

    this.ensureOrbitingBladeVisuals()

    const count = this.orbitingBlades.length
    const orbitRadius = 88 + level * 10
    const angularSpeed = 1.55 + level * 0.22
    const bladeDamage = Math.max(
      1,
      Math.round(options.stats.attackDamage * (0.34 + level * 0.11)),
    )
    const hitCooldown = Math.max(190, 470 - level * 48)

    for (let index = 0; index < count; index++) {
      const angle =
        options.now * 0.001 * angularSpeed +
        (Math.PI * 2 * index) / Math.max(1, count)
      const x = options.playerX + Math.cos(angle) * orbitRadius
      const y = options.playerY + Math.sin(angle) * orbitRadius
      const visual = this.orbitingBlades[index]

      visual.blade
        .setPosition(x, y)
        .setRotation(angle)
        .setScale(level >= 5 ? 1.16 : 0.92 + level * 0.035)
        .setDepth(y + 4)
        .setVisible(true)

      visual.glow
        .setPosition(x - Math.cos(angle) * 8, y - Math.sin(angle) * 8)
        .setRotation(angle)
        .setScale(level >= 5 ? 1.3 : 1)
        .setDepth(y + 3)
        .setVisible(true)

      for (const enemy of options.enemies) {
        if (!enemy.alive || !enemy.sprite.active) {
          continue
        }

        const hitRadius = enemy.projectileHitRadius + 20
        const deltaX = enemy.sprite.x - x
        const deltaY = enemy.sprite.y - y

        if (deltaX * deltaX + deltaY * deltaY > hitRadius * hitRadius) {
          continue
        }

        const cooldownKey = `${index}:${enemy.id}`
        const nextHitAt = this.orbitHitCooldowns.get(cooldownKey) ?? 0

        if (options.now < nextHitAt) {
          continue
        }

        this.orbitHitCooldowns.set(
          cooldownKey,
          options.now + hitCooldown,
        )
        options.damageEnemy(enemy, bladeDamage)
        this.createBladeHitEffect(x, y, angle)
      }
    }

    if (level >= 5 && options.now >= this.nextBladeWaveAt) {
      this.nextBladeWaveAt = options.now + 1650
      options.playSkillSound?.('orbiting-blades')
      this.triggerBladeWave(options)
    }

    if (this.orbitHitCooldowns.size > 700) {
      for (const [key, expiresAt] of this.orbitHitCooldowns) {
        if (expiresAt < options.now - 500) {
          this.orbitHitCooldowns.delete(key)
        }
      }
    }
  }

  private triggerBladeWave(options: SkillUpdateOptions) {
    const radius = 185
    const damage = Math.max(
      1,
      Math.round(options.stats.attackDamage * 1.25),
    )

    for (const enemy of options.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        options.playerX,
        options.playerY,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance <= radius + enemy.projectileHitRadius) {
        options.damageEnemy(enemy, damage)
      }
    }

    const ring = this.scene.add
      .circle(options.playerX, options.playerY, radius, 0x22d3ee, 0.04)
      .setStrokeStyle(8, 0xa5f3fc, 0.9)
      .setScale(0.2)
      .setDepth(options.playerY + 20)

    this.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    })
  }

  private updateChainLightning(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('chain-lightning')

    if (level <= 0 || options.now < this.nextChainLightningAt) {
      return
    }

    const interval = Math.max(1200, 3200 - level * 390)
    this.nextChainLightningAt = options.now + interval
    options.playSkillSound?.('chain-lightning')

    this.executeChainLightning(options, level, 1)

    if (level >= 5) {
      const generation = this.generation

      this.scene.time.delayedCall(150, () => {
        if (
          generation !== this.generation ||
          this.stopped
        ) {
          return
        }

        this.executeChainLightning(options, level, 0.78)
      })
    }
  }

  private executeChainLightning(
    options: SkillUpdateOptions,
    level: number,
    damageMultiplier: number,
  ) {
    const livingEnemies = options.enemies.filter(
      (enemy) => enemy.alive && enemy.sprite.active,
    )

    if (livingEnemies.length === 0) {
      return
    }

    const firstTarget = this.findNearestEnemy(
      options.playerX,
      options.playerY,
      livingEnemies,
      options.stats.attackRange * 1.12,
      new Set<number>(),
    )

    if (!firstTarget) {
      return
    }

    const maximumTargets = 2 + level
    const chainRange = 205 + level * 34
    const selected: EnemyUnit[] = []
    const usedIds = new Set<number>()
    let currentX = options.playerX
    let currentY = options.playerY
    let currentTarget: EnemyUnit | null = firstTarget

    while (currentTarget && selected.length < maximumTargets) {
      selected.push(currentTarget)
      usedIds.add(currentTarget.id)

      const chainIndex = selected.length - 1
      const damage = Math.max(
        1,
        Math.round(
          options.stats.attackDamage *
            (0.74 + level * 0.24) *
            Math.pow(0.86, chainIndex) *
            damageMultiplier,
        ),
      )

      const targetX = currentTarget.sprite.x
      const targetY = currentTarget.sprite.y

      options.damageEnemy(currentTarget, damage)
      this.createLightningSegment(
        currentX,
        currentY,
        targetX,
        targetY,
      )

      currentX = targetX
      currentY = targetY
      currentTarget = this.findNearestEnemy(
        currentX,
        currentY,
        livingEnemies,
        chainRange,
        usedIds,
      )
    }
  }

  private updatePlasmaNova(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('plasma-nova')

    if (level <= 0 || options.now < this.nextPlasmaNovaAt) {
      return
    }

    const interval = Math.max(2100, 5450 - level * 560)
    this.nextPlasmaNovaAt = options.now + interval
    options.playSkillSound?.('plasma-nova')

    const pulseCount = level >= 5 ? 3 : level >= 3 ? 2 : 1
    const generation = this.generation

    for (let pulse = 0; pulse < pulseCount; pulse++) {
      this.scene.time.delayedCall(pulse * 210, () => {
        if (
          generation !== this.generation ||
          this.stopped
        ) {
          return
        }

        const radius = 125 + level * 27 + pulse * 42
        const damageMultiplier = Math.max(0.66, 1 - pulse * 0.14)
        this.triggerNovaPulse(
          options,
          level,
          radius,
          damageMultiplier,
        )
      })
    }
  }

  private triggerNovaPulse(
    options: SkillUpdateOptions,
    level: number,
    radius: number,
    damageMultiplier: number,
  ) {
    const damage = Math.max(
      1,
      Math.round(
        options.stats.attackDamage *
          (0.62 + level * 0.31) *
          damageMultiplier,
      ),
    )
    let hitCount = 0

    for (const enemy of options.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        options.playerX,
        options.playerY,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance > radius + enemy.projectileHitRadius) {
        continue
      }

      options.damageEnemy(enemy, damage)
      hitCount++
    }

    this.createNovaEffect(
      options.playerX,
      options.playerY,
      radius,
      hitCount,
    )
  }

  private updateIceLance(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('ice-lance')

    if (level <= 0 || options.now < this.nextIceLanceAt) {
      return
    }

    const target = this.findNearestEnemy(
      options.playerX,
      options.playerY,
      options.enemies,
      options.stats.attackRange * 1.22,
      new Set<number>(),
    )

    if (!target) {
      return
    }

    this.nextIceLanceAt =
      options.now + Math.max(1350, 3800 - level * 430)
    options.playSkillSound?.('ice-lance')

    const baseAngle = Phaser.Math.Angle.Between(
      options.playerX,
      options.playerY,
      target.sprite.x,
      target.sprite.y,
    )
    const angles =
      level >= 5
        ? [baseAngle - 0.16, baseAngle, baseAngle + 0.16]
        : [baseAngle]

    for (const angle of angles) {
      this.fireIceLance(options, level, angle)
    }
  }

  private fireIceLance(
    options: SkillUpdateOptions,
    level: number,
    angle: number,
  ) {
    const length = options.stats.attackRange * (1.05 + level * 0.05)
    const width = 18 + level * 5
    const endX = options.playerX + Math.cos(angle) * length
    const endY = options.playerY + Math.sin(angle) * length
    const hits = this.getEnemiesAlongLine(
      options.enemies,
      options.playerX,
      options.playerY,
      endX,
      endY,
      width,
    )

    hits.forEach((enemy, index) => {
      const damage = Math.max(
        1,
        Math.round(
          options.stats.attackDamage *
            (0.86 + level * 0.28) *
            Math.pow(0.88, index),
        ),
      )

      options.damageEnemy(enemy, damage)
      this.applySlow(
        enemy,
        options.now,
        level >= 5 ? 0.38 : Math.max(0.52, 0.76 - level * 0.045),
        950 + level * 260,
      )
    })

    const trail = this.scene.add
      .line(
        0,
        0,
        options.playerX,
        options.playerY,
        endX,
        endY,
        0x38bdf8,
        0.28,
      )
      .setOrigin(0, 0)
      .setLineWidth(level >= 5 ? 11 : 7, 2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(options.playerY, endY) + 20)

    const lance = this.scene.add
      .image(options.playerX, options.playerY, 'skill-ice-lance')
      .setRotation(angle)
      .setScale(level >= 5 ? 1.12 : 0.9 + level * 0.035)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(options.playerY, endY) + 23)

    const duration = Phaser.Math.Clamp(length / 3.6, 150, 260)
    this.scene.tweens.add({
      targets: lance,
      x: endX,
      y: endY,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.createIceShatter(endX, endY, level)
        lance.destroy()
      },
    })

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: duration + 90,
      ease: 'Quad.Out',
      onComplete: () => trail.destroy(),
    })
  }

  private applySlow(
    enemy: EnemyUnit,
    now: number,
    multiplier: number,
    duration: number,
  ) {
    const current = this.slowStates.get(enemy.id)

    this.slowStates.set(enemy.id, {
      enemy,
      expiresAt: Math.max(current?.expiresAt ?? 0, now + duration),
      multiplier: Math.min(current?.multiplier ?? 1, multiplier),
    })

    const frost = this.scene.add
      .circle(enemy.sprite.x, enemy.sprite.y, 17, 0x7dd3fc, 0.24)
      .setStrokeStyle(3, 0xe0f2fe, 0.82)
      .setDepth(enemy.sprite.y + 20)

    this.scene.tweens.add({
      targets: frost,
      scale: 1.8,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => frost.destroy(),
    })
  }

  private pruneSlowStates(now: number) {
    for (const [enemyId, state] of this.slowStates) {
      if (
        now >= state.expiresAt ||
        !state.enemy.alive ||
        !state.enemy.sprite.active
      ) {
        this.slowStates.delete(enemyId)
      }
    }
  }

  private updateMeteorRain(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('meteor-rain')

    if (level <= 0 || options.now < this.nextMeteorRainAt) {
      return
    }

    const livingEnemies = options.enemies.filter(
      (enemy) => enemy.alive && enemy.sprite.active,
    )

    if (livingEnemies.length === 0) {
      return
    }

    this.nextMeteorRainAt =
      options.now + Math.max(3000, 6900 - level * 620)
    options.playSkillSound?.('meteor-rain')

    const meteorCount = level >= 5 ? 6 : level + 1
    const generation = this.generation

    for (let index = 0; index < meteorCount; index++) {
      const target =
        livingEnemies[
          (Math.floor(options.now / 97) + index * 3) %
            livingEnemies.length
        ]
      const offsetAngle =
        (Math.PI * 2 * index) / Math.max(1, meteorCount)
      const offsetDistance = index === 0 ? 0 : 32 + level * 6
      const x =
        target.sprite.x + Math.cos(offsetAngle) * offsetDistance
      const y =
        target.sprite.y + Math.sin(offsetAngle) * offsetDistance

      this.scheduleMeteor(
        options,
        level,
        x,
        y,
        index * 90,
        generation,
      )
    }
  }

  private scheduleMeteor(
    options: SkillUpdateOptions,
    level: number,
    x: number,
    y: number,
    extraDelay: number,
    generation: number,
  ) {
    const fallDuration = 620
    const warningDelay = fallDuration + extraDelay
    const radius = 82 + level * 11

    const warning = this.scene.add
      .circle(x, y, radius, 0x7f1d1d, 0.12)
      .setStrokeStyle(5, 0xfb7185, 0.92)
      .setScale(0.35)
      .setDepth(y + 18)

    const warningCore = this.scene.add
      .circle(x, y, radius * 0.42, 0xf97316, 0.08)
      .setStrokeStyle(2, 0xfef3c7, 0.72)
      .setDepth(y + 19)

    this.scene.tweens.add({
      targets: warning,
      scale: 1,
      alpha: 0.24,
      duration: warningDelay,
      ease: 'Quad.Out',
    })

    this.scene.tweens.add({
      targets: warningCore,
      scale: 1.35,
      alpha: 0.02,
      duration: warningDelay,
      ease: 'Sine.InOut',
    })

    this.scene.time.delayedCall(extraDelay, () => {
      if (generation !== this.generation || this.stopped) {
        warning.destroy()
        warningCore.destroy()
        return
      }

      const startX = x - 180 - level * 12
      const startY = y - 420 - level * 18
      const meteor = this.scene.add
        .image(startX, startY, 'skill-meteor')
        .setScale(0.72 + level * 0.055)
        .setRotation(0.42)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 30)

      this.scene.tweens.add({
        targets: meteor,
        x,
        y,
        rotation: 0.92,
        duration: fallDuration,
        ease: 'Cubic.In',
        onUpdate: () => {
          if (!meteor.active || Math.random() > 0.42) {
            return
          }

          const ember = this.scene.add
            .circle(
              meteor.x + Phaser.Math.Between(-7, 7),
              meteor.y - 20,
              Phaser.Math.FloatBetween(2, 5),
              Math.random() > 0.45 ? 0xf97316 : 0xfacc15,
              0.82,
            )
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(y + 28)

          this.scene.tweens.add({
            targets: ember,
            y: ember.y - Phaser.Math.Between(16, 30),
            alpha: 0,
            scale: 0.25,
            duration: Phaser.Math.Between(140, 230),
            onComplete: () => ember.destroy(),
          })
        },
        onComplete: () => meteor.destroy(),
      })
    })

    this.scene.time.delayedCall(warningDelay, () => {
      if (warning.active) {
        warning.destroy()
      }
      if (warningCore.active) {
        warningCore.destroy()
      }

      if (generation !== this.generation || this.stopped) {
        return
      }

      this.explodeMeteor(options, level, x, y, radius, 1)

      if (level >= 5) {
        this.scene.time.delayedCall(280, () => {
          if (generation !== this.generation || this.stopped) {
            return
          }

          this.explodeMeteor(
            options,
            level,
            x,
            y,
            radius * 1.32,
            0.68,
          )
        })
      }
    })
  }

  private explodeMeteor(
    options: SkillUpdateOptions,
    level: number,
    x: number,
    y: number,
    radius: number,
    damageScale: number,
  ) {
    const damage = Math.max(
      1,
      Math.round(
        options.stats.attackDamage *
          (0.95 + level * 0.42) *
          damageScale,
      ),
    )

    for (const enemy of options.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance <= radius + enemy.projectileHitRadius) {
        options.damageEnemy(enemy, damage)
      }
    }

    const crater = this.scene.add
      .ellipse(x, y + radius * 0.08, radius * 1.08, radius * 0.5, 0x1c0a04, 0.72)
      .setStrokeStyle(3, 0x7c2d12, 0.72)
      .setDepth(y + 20)

    const blast = this.scene.add
      .circle(x, y, 24, 0xf97316, 0.42)
      .setStrokeStyle(8, 0xfef3c7, 0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 25)

    const core = this.scene.add
      .circle(x, y, 13, 0xfef08a, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 26)

    this.scene.tweens.add({
      targets: blast,
      scale: radius / 24,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => blast.destroy(),
    })

    this.scene.tweens.add({
      targets: core,
      scale: radius / 16,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => core.destroy(),
    })

    this.scene.tweens.add({
      targets: crater,
      alpha: 0,
      scale: 1.18,
      duration: 1200,
      delay: 260,
      ease: 'Quad.Out',
      onComplete: () => crater.destroy(),
    })

    for (let index = 0; index < 10; index++) {
      const angle = (Math.PI * 2 * index) / 10 + Math.random() * 0.35
      const distance = radius * Phaser.Math.FloatBetween(0.45, 0.95)
      const debris = this.scene.add
        .circle(x, y, Phaser.Math.FloatBetween(2, 5), index % 2 === 0 ? 0x431407 : 0xfb923c, 0.92)
        .setDepth(y + 27)

      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.62,
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(300, 520),
        ease: 'Quad.Out',
        onComplete: () => debris.destroy(),
      })
    }
  }

  private updateGravityWellCasting(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('gravity-well')

    if (level <= 0 || options.now < this.nextGravityWellAt) {
      return
    }

    const center = this.findBestClusterCenter(
      options.enemies,
      options.playerX,
      options.playerY,
      options.stats.attackRange * 1.25,
    )

    if (!center) {
      return
    }

    this.nextGravityWellAt =
      options.now + Math.max(3700, 7600 - level * 650)
    options.playSkillSound?.('gravity-well')

    const radius = 122 + level * 19
    const duration = 1900 + level * 470
    const ring = this.scene.add
      .circle(center.x, center.y, radius, 0x4c1d95, 0.13)
      .setStrokeStyle(7, 0xa78bfa, 0.94)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(center.y + 16)

    const core = this.scene.add
      .circle(center.x, center.y, 29, 0x020617, 0.98)
      .setStrokeStyle(5, 0xe9d5ff, 0.92)
      .setDepth(center.y + 18)

    const swirl = this.scene.add
      .polygon(
        center.x,
        center.y,
        [0, -radius * 0.62, 20, -20, radius * 0.72, 0, 20, 20, 0, radius * 0.62, -20, 20, -radius * 0.72, 0, -20, -20],
        0x8b5cf6,
        0.06,
      )
      .setStrokeStyle(3, 0xc4b5fd, 0.48)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(center.y + 17)

    this.gravityWells.push({
      x: center.x,
      y: center.y,
      radius,
      expiresAt: options.now + duration,
      nextDamageAt: options.now,
      level,
      ring,
      core,
      swirl,
      nextParticleAt: options.now,
    })
  }

  private updateGravityWells(options: SkillUpdateOptions) {
    for (let index = this.gravityWells.length - 1; index >= 0; index--) {
      const well = this.gravityWells[index]

      if (options.now >= well.expiresAt) {
        if (well.level >= 5) {
          this.collapseGravityWell(options, well)
        }

        well.ring.destroy()
        well.core.destroy()
        well.swirl.destroy()
        this.gravityWells.splice(index, 1)
        continue
      }

      const lifeRemaining = Math.max(0, well.expiresAt - options.now)
      const pulse =
        1 +
        Math.sin(options.now / 110 + index) * 0.08

      well.ring.setScale(pulse).setAlpha(0.08 + pulse * 0.045)
      well.core
        .setScale(0.82 + pulse * 0.18)
        .setRotation(options.now * 0.002)
      well.swirl
        .setRotation(options.now * 0.0018)
        .setScale(0.92 + pulse * 0.08)
        .setAlpha(0.22 + pulse * 0.08)

      if (options.now >= well.nextParticleAt) {
        well.nextParticleAt = options.now + 95
        this.emitGravityParticle(well)
      }

      const shouldDamage = options.now >= well.nextDamageAt

      if (shouldDamage) {
        well.nextDamageAt = options.now + 480
      }

      for (const enemy of options.enemies) {
        if (!enemy.alive || !enemy.sprite.active) {
          continue
        }

        const deltaX = well.x - enemy.sprite.x
        const deltaY = well.y - enemy.sprite.y
        const distanceSquared = deltaX * deltaX + deltaY * deltaY

        if (
          distanceSquared <= 1 ||
          distanceSquared > well.radius * well.radius
        ) {
          continue
        }

        const distance = Math.sqrt(distanceSquared)
        const pullStrength =
          (1 - distance / well.radius) *
          (70 + well.level * 18)
        const body = enemy.sprite.body as
          | Phaser.Physics.Arcade.Body
          | null

        if (body) {
          enemy.sprite.setVelocity(
            body.velocity.x + (deltaX / distance) * pullStrength,
            body.velocity.y + (deltaY / distance) * pullStrength,
          )
        }

        if (shouldDamage) {
          const damage = Math.max(
            1,
            Math.round(
              options.stats.attackDamage *
                (0.2 + well.level * 0.09),
            ),
          )
          options.damageEnemy(enemy, damage)
        }
      }

      if (lifeRemaining < 450) {
        well.ring.setStrokeStyle(8, 0xf5d0fe, 0.95)
      }
    }
  }

  private collapseGravityWell(
    options: SkillUpdateOptions,
    well: GravityWellState,
  ) {
    const radius = well.radius * 1.35
    const damage = Math.max(
      1,
      Math.round(options.stats.attackDamage * 2.45),
    )

    for (const enemy of options.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        well.x,
        well.y,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance <= radius + enemy.projectileHitRadius) {
        options.damageEnemy(enemy, damage)
      }
    }

    const blast = this.scene.add
      .circle(well.x, well.y, 26, 0xa78bfa, 0.35)
      .setStrokeStyle(8, 0xf5d0fe, 0.92)
      .setDepth(well.y + 28)

    this.scene.tweens.add({
      targets: blast,
      scale: radius / 26,
      alpha: 0,
      duration: 460,
      ease: 'Quad.Out',
      onComplete: () => blast.destroy(),
    })
  }

  private clearGravityWells() {
    for (const well of this.gravityWells) {
      well.ring.destroy()
      well.core.destroy()
      well.swirl.destroy()
    }

    this.gravityWells = []
  }

  private getCombatDroneCount() {
    const level = this.getRuntimeLevel('combat-drone')

    if (level <= 0) {
      return 0
    }

    if (level >= 5) {
      return 3
    }

    if (level >= 3) {
      return 2
    }

    return 1
  }

  private destroyCombatDrones() {
    for (const visual of this.combatDrones) {
      visual.core.destroy()
      visual.glow.destroy()
    }

    this.combatDrones = []
  }

  private ensureCombatDroneVisuals() {
    const requiredCount = this.getCombatDroneCount()

    while (this.combatDrones.length < requiredCount) {
      const glow = this.scene.add
        .ellipse(0, 0, 38, 28, 0x34d399, 0.2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16010)

      const core = this.scene.add
        .image(0, 0, 'skill-combat-drone')
        .setScale(0.72)
        .setDepth(16011)

      this.combatDrones.push({ core, glow })
    }

    while (this.combatDrones.length > requiredCount) {
      const visual = this.combatDrones.pop()

      if (visual) {
        visual.core.destroy()
        visual.glow.destroy()
      }
    }
  }

  private updateCombatDrones(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('combat-drone')

    if (level <= 0) {
      return
    }

    this.ensureCombatDroneVisuals()

    const count = this.combatDrones.length
    const radius = 64 + level * 5
    const angularSpeed = 0.8 + level * 0.08
    const dronePositions: Phaser.Math.Vector2[] = []

    for (let index = 0; index < count; index++) {
      const angle =
        -options.now * 0.001 * angularSpeed +
        (Math.PI * 2 * index) / Math.max(1, count)
      const x = options.playerX + Math.cos(angle) * radius
      const y = options.playerY + Math.sin(angle) * radius
      const visual = this.combatDrones[index]

      visual.core
        .setPosition(x, y)
        .setRotation(angle + Math.PI / 2)
        .setDepth(y + 8)
        .setVisible(true)

      visual.glow
        .setPosition(x - Math.cos(angle) * 8, y - Math.sin(angle) * 8)
        .setDepth(y + 7)
        .setVisible(true)

      dronePositions.push(new Phaser.Math.Vector2(x, y))
    }

    if (options.now < this.nextDroneVolleyAt) {
      return
    }

    this.nextDroneVolleyAt =
      options.now + Math.max(800, 2350 - level * 270)
    this.droneVolleyCounter++
    options.playSkillSound?.('combat-drone')

    const usedIds = new Set<number>()

    dronePositions.forEach((position) => {
      const target = this.findNearestEnemy(
        position.x,
        position.y,
        options.enemies,
        options.stats.attackRange * 1.12,
        usedIds,
      )

      if (!target) {
        return
      }

      usedIds.add(target.id)

      const damage = Math.max(
        1,
        Math.round(
          options.stats.attackDamage * (0.42 + level * 0.19),
        ),
      )

      options.damageEnemy(target, damage)
      this.createDroneShot(
        position.x,
        position.y,
        target.sprite.x,
        target.sprite.y,
      )

      if (level >= 5 && this.droneVolleyCounter % 3 === 0) {
        this.triggerDroneMissileExplosion(
          options,
          target.sprite.x,
          target.sprite.y,
        )
      }
    })
  }

  private triggerDroneMissileExplosion(
    options: SkillUpdateOptions,
    x: number,
    y: number,
  ) {
    const radius = 92
    const damage = Math.max(
      1,
      Math.round(options.stats.attackDamage * 1.15),
    )

    for (const enemy of options.enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance <= radius + enemy.projectileHitRadius) {
        options.damageEnemy(enemy, damage)
      }
    }

    const blast = this.scene.add
      .circle(x, y, 16, 0x10b981, 0.38)
      .setStrokeStyle(6, 0xd1fae5, 0.94)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 24)

    const core = this.scene.add
      .circle(x, y, 8, 0xfef3c7, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 25)

    this.scene.tweens.add({
      targets: blast,
      scale: radius / 16,
      alpha: 0,
      duration: 320,
      ease: 'Quad.Out',
      onComplete: () => blast.destroy(),
    })

    this.scene.tweens.add({
      targets: core,
      scale: radius / 20,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => core.destroy(),
    })
  }

  private updateEnergyLaser(options: SkillUpdateOptions) {
    const level = this.getRuntimeLevel('energy-laser')

    if (level <= 0 || options.now < this.nextEnergyLaserAt) {
      return
    }

    const target = this.findNearestEnemy(
      options.playerX,
      options.playerY,
      options.enemies,
      options.stats.attackRange * 1.28,
      new Set<number>(),
    )

    if (!target) {
      return
    }

    this.nextEnergyLaserAt =
      options.now + Math.max(2350, 5300 - level * 520)
    options.playSkillSound?.('energy-laser')

    const baseAngle = Phaser.Math.Angle.Between(
      options.playerX,
      options.playerY,
      target.sprite.x,
      target.sprite.y,
    )
    const angles =
      level >= 5
        ? [baseAngle - 0.2, baseAngle, baseAngle + 0.2]
        : [baseAngle]

    for (const angle of angles) {
      this.fireEnergyLaser(options, level, angle)
    }
  }

  private fireEnergyLaser(
    options: SkillUpdateOptions,
    level: number,
    angle: number,
  ) {
    const length = options.stats.attackRange * (1.12 + level * 0.055)
    const endX = options.playerX + Math.cos(angle) * length
    const endY = options.playerY + Math.sin(angle) * length
    const width = 20 + level * 5
    const hits = this.getEnemiesAlongLine(
      options.enemies,
      options.playerX,
      options.playerY,
      endX,
      endY,
      width,
    )
    const generation = this.generation

    for (const enemy of hits) {
      const damage = Math.max(
        1,
        Math.round(
          options.stats.attackDamage * (0.95 + level * 0.38),
        ),
      )

      options.damageEnemy(enemy, damage)
      this.createLaserImpact(enemy.sprite.x, enemy.sprite.y, level)

      if (level >= 3) {
        this.scene.time.delayedCall(240, () => {
          if (
            generation !== this.generation ||
            this.stopped ||
            !enemy.alive ||
            !enemy.sprite.active
          ) {
            return
          }

          options.damageEnemy(
            enemy,
            Math.max(1, Math.round(damage * 0.38)),
          )
        })
      }
    }

    const halo = this.scene.add
      .line(
        0,
        0,
        options.playerX,
        options.playerY,
        endX,
        endY,
        0xdb2777,
        0.24,
      )
      .setOrigin(0, 0)
      .setLineWidth(level >= 5 ? 22 : 15, 6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(options.playerY, endY) + 27)

    const beam = this.scene.add
      .line(
        0,
        0,
        options.playerX,
        options.playerY,
        endX,
        endY,
        0xf472b6,
        0.96,
      )
      .setOrigin(0, 0)
      .setLineWidth(level >= 5 ? 12 : 7, 3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(options.playerY, endY) + 28)

    const core = this.scene.add
      .line(
        0,
        0,
        options.playerX,
        options.playerY,
        endX,
        endY,
        0xfdf2f8,
        0.92,
      )
      .setOrigin(0, 0)
      .setLineWidth(level >= 5 ? 5 : 3, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(options.playerY, endY) + 29)

    const source = this.scene.add
      .circle(
        options.playerX,
        options.playerY,
        level >= 5 ? 18 : 13,
        0xfdf2f8,
        0.86,
      )
      .setStrokeStyle(4, 0xf472b6, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(options.playerY + 30)

    this.scene.tweens.add({
      targets: source,
      scale: 2.6,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => source.destroy(),
    })

    this.scene.tweens.add({
      targets: [halo, beam, core],
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => {
        halo.destroy()
        beam.destroy()
        core.destroy()
      },
    })
  }

  private createLaserImpact(
    x: number,
    y: number,
    level: number,
  ) {
    const impact = this.scene.add
      .circle(x, y, 7 + level, 0xfdf2f8, 0.82)
      .setStrokeStyle(3, 0xf472b6, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 30)

    this.scene.tweens.add({
      targets: impact,
      scale: 2.4,
      alpha: 0,
      duration: 170,
      ease: 'Quad.Out',
      onComplete: () => impact.destroy(),
    })
  }

  private findNearestEnemy(
    originX: number,
    originY: number,
    enemies: EnemyUnit[],
    maximumDistance: number,
    excludedIds: Set<number>,
  ) {
    let nearest: EnemyUnit | null = null
    let nearestDistance = maximumDistance

    for (const enemy of enemies) {
      if (
        excludedIds.has(enemy.id) ||
        !enemy.alive ||
        !enemy.sprite.active
      ) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        originX,
        originY,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance < nearestDistance) {
        nearest = enemy
        nearestDistance = distance
      }
    }

    return nearest
  }

  private findBestClusterCenter(
    enemies: EnemyUnit[],
    playerX: number,
    playerY: number,
    maximumDistance: number,
  ) {
    const candidates = enemies
      .filter((enemy) => {
        if (!enemy.alive || !enemy.sprite.active) {
          return false
        }

        return (
          Phaser.Math.Distance.Between(
            playerX,
            playerY,
            enemy.sprite.x,
            enemy.sprite.y,
          ) <= maximumDistance
        )
      })
      .slice(0, 24)

    let best: EnemyUnit | null = null
    let bestCount = 0

    for (const candidate of candidates) {
      let count = 0

      for (const other of candidates) {
        const distance = Phaser.Math.Distance.Between(
          candidate.sprite.x,
          candidate.sprite.y,
          other.sprite.x,
          other.sprite.y,
        )

        if (distance <= 245) {
          count++
        }
      }

      if (count > bestCount) {
        bestCount = count
        best = candidate
      }
    }

    return best
      ? new Phaser.Math.Vector2(best.sprite.x, best.sprite.y)
      : null
  }

  private getEnemiesAlongLine(
    enemies: EnemyUnit[],
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    halfWidth: number,
  ) {
    const deltaX = toX - fromX
    const deltaY = toY - fromY
    const lengthSquared = deltaX * deltaX + deltaY * deltaY

    if (lengthSquared <= 1) {
      return []
    }

    const hits: Array<{
      enemy: EnemyUnit
      projection: number
    }> = []

    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.sprite.active) {
        continue
      }

      const relativeX = enemy.sprite.x - fromX
      const relativeY = enemy.sprite.y - fromY
      const projection = Phaser.Math.Clamp(
        (relativeX * deltaX + relativeY * deltaY) / lengthSquared,
        0,
        1,
      )
      const closestX = fromX + deltaX * projection
      const closestY = fromY + deltaY * projection
      const distance = Phaser.Math.Distance.Between(
        closestX,
        closestY,
        enemy.sprite.x,
        enemy.sprite.y,
      )

      if (distance <= halfWidth + enemy.projectileHitRadius) {
        hits.push({ enemy, projection })
      }
    }

    hits.sort((left, right) => left.projection - right.projection)
    return hits.map((entry) => entry.enemy)
  }

  private createBladeHitEffect(
    x: number,
    y: number,
    angle: number,
  ) {
    const slash = this.scene.add
      .line(
        0,
        0,
        x - Math.cos(angle + Math.PI / 2) * 16,
        y - Math.sin(angle + Math.PI / 2) * 16,
        x + Math.cos(angle + Math.PI / 2) * 16,
        y + Math.sin(angle + Math.PI / 2) * 16,
        0xe0f2fe,
        0.96,
      )
      .setOrigin(0, 0)
      .setLineWidth(5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 12)

    const spark = this.scene.add
      .circle(x, y, 6, 0x67e8f9, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 13)

    this.scene.tweens.add({
      targets: [slash, spark],
      scale: 1.8,
      alpha: 0,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => {
        slash.destroy()
        spark.destroy()
      },
    })
  }

  private createLightningSegment(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    const graphics = this.scene.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(fromY, toY) + 25)

    const points: Phaser.Math.Vector2[] = [
      new Phaser.Math.Vector2(fromX, fromY),
    ]
    const segments = 7

    for (let index = 1; index < segments; index++) {
      const progress = index / segments
      points.push(
        new Phaser.Math.Vector2(
          Phaser.Math.Linear(fromX, toX, progress) + Phaser.Math.Between(-13, 13),
          Phaser.Math.Linear(fromY, toY, progress) + Phaser.Math.Between(-13, 13),
        ),
      )
    }
    points.push(new Phaser.Math.Vector2(toX, toY))

    graphics.lineStyle(9, 0x0ea5e9, 0.28)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    graphics.lineStyle(4, 0x67e8f9, 0.96)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    graphics.lineStyle(1, 0xffffff, 0.96)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()

    const impact = this.scene.add
      .circle(toX, toY, 9, 0xe0f2fe, 0.88)
      .setStrokeStyle(3, 0x67e8f9, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(toY + 26)

    for (let index = 0; index < 4; index++) {
      const angle = (Math.PI * 2 * index) / 4 + Math.random() * 0.5
      const spark = this.scene.add
        .line(
          0,
          0,
          toX,
          toY,
          toX + Math.cos(angle) * Phaser.Math.Between(15, 27),
          toY + Math.sin(angle) * Phaser.Math.Between(15, 27),
          0xe0f2fe,
          0.9,
        )
        .setOrigin(0, 0)
        .setLineWidth(2, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(toY + 27)

      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 150,
        onComplete: () => spark.destroy(),
      })
    }

    this.scene.tweens.add({
      targets: [graphics, impact],
      alpha: 0,
      duration: 170,
      ease: 'Quad.Out',
      onComplete: () => {
        graphics.destroy()
        impact.destroy()
      },
    })
  }

  private createDroneShot(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY)
    const bolt = this.scene.add
      .image(fromX, fromY, 'skill-drone-bolt')
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(fromY, toY) + 22)

    const trail = this.scene.add
      .line(0, 0, fromX, fromY, toX, toY, 0x34d399, 0.28)
      .setOrigin(0, 0)
      .setLineWidth(3, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Math.max(fromY, toY) + 21)

    const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY)
    const duration = Phaser.Math.Clamp(distance / 2.8, 90, 220)

    this.scene.tweens.add({
      targets: bolt,
      x: toX,
      y: toY,
      duration,
      ease: 'Quad.Out',
      onComplete: () => {
        const impact = this.scene.add
          .circle(toX, toY, 7, 0xd1fae5, 0.82)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(toY + 24)

        this.scene.tweens.add({
          targets: impact,
          scale: 2,
          alpha: 0,
          duration: 120,
          onComplete: () => impact.destroy(),
        })
        bolt.destroy()
      },
    })

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: duration + 60,
      ease: 'Quad.Out',
      onComplete: () => trail.destroy(),
    })
  }

  private createNovaEffect(
    x: number,
    y: number,
    radius: number,
    hitCount: number,
  ) {
    const ring = this.scene.add
      .circle(x, y, radius, 0x6d28d9, 0.12)
      .setStrokeStyle(8, 0xc4b5fd, 0.94)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.08)
      .setDepth(y + 18)

    const secondaryRing = this.scene.add
      .circle(x, y, radius * 0.72, 0x312e81, 0.08)
      .setStrokeStyle(3, 0xf5d0fe, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.12)
      .setDepth(y + 19)

    const core = this.scene.add
      .circle(x, y, 23, 0xa78bfa, 0.72)
      .setStrokeStyle(3, 0xffffff, 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 20)

    this.scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 430,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    })

    this.scene.tweens.add({
      targets: secondaryRing,
      scale: 1.18,
      rotation: Math.PI / 4,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => secondaryRing.destroy(),
    })

    this.scene.tweens.add({
      targets: core,
      scale: 5,
      alpha: 0,
      duration: 320,
      ease: 'Quad.Out',
      onComplete: () => core.destroy(),
    })

    for (let index = 0; index < 12; index++) {
      const angle = (Math.PI * 2 * index) / 12
      const bolt = this.scene.add
        .line(
          0,
          0,
          x + Math.cos(angle) * 18,
          y + Math.sin(angle) * 18,
          x + Math.cos(angle) * radius * 0.88,
          y + Math.sin(angle) * radius * 0.88,
          index % 2 === 0 ? 0xe9d5ff : 0x8b5cf6,
          0.82,
        )
        .setOrigin(0, 0)
        .setLineWidth(index % 2 === 0 ? 3 : 2, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 21)

      this.scene.tweens.add({
        targets: bolt,
        alpha: 0,
        duration: 270 + index * 8,
        onComplete: () => bolt.destroy(),
      })
    }

    if (hitCount > 0) {
      const text = this.scene.add
        .text(x, y - 48, `NOVA  •  ${hitCount} MỤC TIÊU`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ddd6fe',
          stroke: '#2e1065',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(y + 30)

      this.scene.tweens.add({
        targets: text,
        y: text.y - 24,
        alpha: 0,
        duration: 520,
        ease: 'Quad.Out',
        onComplete: () => text.destroy(),
      })
    }
  }

  private createIceShatter(
    x: number,
    y: number,
    level: number,
  ) {
    const shardCount = 5 + level

    for (let index = 0; index < shardCount; index++) {
      const angle = (Math.PI * 2 * index) / shardCount + Math.random() * 0.35
      const distance = 18 + Math.random() * (26 + level * 4)
      const shard = this.scene.add
        .triangle(
          x,
          y,
          0,
          -7,
          4,
          5,
          -4,
          5,
          index % 2 === 0 ? 0xe0f2fe : 0x7dd3fc,
          0.92,
        )
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 25)

      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        rotation: angle + Math.PI,
        alpha: 0,
        scale: 0.25,
        duration: 220 + Math.random() * 120,
        ease: 'Quad.Out',
        onComplete: () => shard.destroy(),
      })
    }
  }

  private emitGravityParticle(well: GravityWellState) {
    const angle = Math.random() * Math.PI * 2
    const startRadius = well.radius * Phaser.Math.FloatBetween(0.72, 1.05)
    const particle = this.scene.add
      .circle(
        well.x + Math.cos(angle) * startRadius,
        well.y + Math.sin(angle) * startRadius * 0.55,
        Phaser.Math.FloatBetween(2, 5),
        Math.random() > 0.45 ? 0xc4b5fd : 0x8b5cf6,
        0.82,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(well.y + 19)

    this.scene.tweens.add({
      targets: particle,
      x: well.x,
      y: well.y,
      alpha: 0,
      scale: 0.15,
      duration: Phaser.Math.Between(360, 620),
      ease: 'Sine.In',
      onComplete: () => particle.destroy(),
    })
  }

  private ensureFusionAura() {
    if (this.fusionSkills.length <= 0) {
      this.destroyFusionAura()
      return
    }

    if (!this.fusionAuraOuter) {
      this.fusionAuraOuter = this.scene.add
        .circle(0, 0, 76, 0x4a044e, 0.03)
        .setStrokeStyle(4, 0xf472b6, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15980)
    }

    if (!this.fusionAuraInner) {
      this.fusionAuraInner = this.scene.add
        .polygon(
          0,
          0,
          [0, -51, 26, -26, 51, 0, 26, 26, 0, 51, -26, 26, -51, 0, -26, -26],
          0xe879f9,
          0.035,
        )
        .setStrokeStyle(2, 0xfef3c7, 0.64)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15981)
    }
  }

  private updateFusionAura(options: SkillUpdateOptions) {
    if (this.fusionSkills.length <= 0) {
      this.destroyFusionAura()
      return
    }

    this.ensureFusionAura()

    const highestTier = Math.max(
      1,
      ...this.fusionSkills.map((fusion) => fusion.tier),
    )
    const totalLevel = this.fusionSkills.reduce(
      (total, fusion) => total + fusion.level,
      0,
    )
    const pulse = 1 + Math.sin(options.now / 180) * 0.055
    const scale = 0.9 + highestTier * 0.07 + totalLevel * 0.008

    this.fusionAuraOuter
      ?.setPosition(options.playerX, options.playerY + 13)
      .setDepth(options.playerY - 1)
      .setRotation(options.now / 900)
      .setScale(scale * pulse)
      .setAlpha(0.32 + Math.min(0.3, highestTier * 0.055))
      .setVisible(true)

    this.fusionAuraInner
      ?.setPosition(options.playerX, options.playerY + 12)
      .setDepth(options.playerY)
      .setRotation(-options.now / 650)
      .setScale(scale * (2 - pulse))
      .setAlpha(0.26 + Math.min(0.3, totalLevel * 0.02))
      .setVisible(true)

    if (options.now >= this.nextFusionParticleAt) {
      this.nextFusionParticleAt = options.now + Math.max(70, 125 - highestTier * 8)
      this.emitFusionParticle(options.playerX, options.playerY, highestTier)
    }
  }

  private emitFusionParticle(
    x: number,
    y: number,
    tier: number,
  ) {
    const angle = Math.random() * Math.PI * 2
    const radius = 48 + Math.random() * (24 + tier * 4)
    const particle = this.scene.add
      .rectangle(
        x + Math.cos(angle) * radius,
        y + 8 + Math.sin(angle) * radius * 0.42,
        5 + tier,
        8 + tier,
        Math.random() > 0.4 ? 0xf472b6 : 0xfef3c7,
        0.82,
      )
      .setRotation(Math.PI / 4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 2)

    this.scene.tweens.add({
      targets: particle,
      x,
      y: y - 32 - tier * 3,
      rotation: Math.PI,
      alpha: 0,
      scale: 0.2,
      duration: Phaser.Math.Between(420, 680),
      ease: 'Sine.In',
      onComplete: () => particle.destroy(),
    })
  }

  private destroyFusionAura() {
    this.fusionAuraOuter?.destroy()
    this.fusionAuraInner?.destroy()
    this.fusionAuraOuter = null
    this.fusionAuraInner = null
  }
}
