import type Phaser from 'phaser'

export type MovementKeys = {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

export type ReservedArea = {
  left: number
  right: number
  top: number
  bottom: number
}

export type ObstacleKind =
  | 'tree'
  | 'rock'
  | 'crate'
  | 'wreck'
  | 'barrier'

export type SpawnRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type ProjectileState = {
  gameObject: Phaser.Physics.Arcade.Image
  glow: Phaser.GameObjects.Ellipse
  bornAt: number
  damage: number
  critical: boolean
}

export type ExperienceOrbState = {
  sprite: Phaser.GameObjects.Image
  glow: Phaser.GameObjects.Ellipse
  value: number
  collected: boolean
}

export type PickupKind = 'health' | 'bomb' | 'magnet'

export type PickupState = {
  id: number
  kind: PickupKind
  x: number
  y: number
  icon: Phaser.GameObjects.Arc
  symbol: Phaser.GameObjects.Text
  glow: Phaser.GameObjects.Ellipse
  shadow: Phaser.GameObjects.Ellipse
  spawnedAt: number
  expiresAt: number
  collected: boolean
}

export type ChestState = {
  id: number
  x: number
  y: number
  base: Phaser.GameObjects.Rectangle
  lid: Phaser.GameObjects.Rectangle
  lock: Phaser.GameObjects.Arc
  glow: Phaser.GameObjects.Ellipse
  shadow: Phaser.GameObjects.Ellipse
  spawnedAt: number
  expiresAt: number
  collected: boolean
}

export type EnemyRank = 'normal' | 'mini-boss' | 'boss'
export type EnemyAttackMode =
  | 'melee'
  | 'single-shot'
  | 'spread-shot'
  | 'suicide'
  | 'support'

export type EnemyArchetypeId =
  | 'mutant'
  | 'crawler'
  | 'brute'
  | 'shooter'
  | 'bomber'
  | 'scatterer'
  | 'healer'
  | 'shielder'
  | 'death-buffer'
  | 'brood-mother'
  | 'toxic'
  | 'flame'

export type EnemyRole =
  | 'chaser'
  | 'swarm'
  | 'tank'
  | 'ranged'
  | 'support'
  | 'hazard'
  | 'summoner'
  | 'boss'

export type EnemyEliteTrait =
  | 'swift'
  | 'armored'
  | 'berserker'
  | 'vampiric'
  | 'regenerator'

export type EnemySpawnSelection = {
  rank: 'normal'
  archetypeId: EnemyArchetypeId
  role: EnemyRole
  eliteTrait: EnemyEliteTrait | null
  dangerCost: number
}

export type BossAbility =
  | 'charge'
  | 'shockwave'
  | 'radial-burst'
  | 'spread-barrage'
  | 'summon-minions'

export type BossVariant =
  | 'mutant-guardian'
  | 'plague-warden'
  | 'brood-tyrant'
  | 'infernal-executioner'
  | 'devourer'
  | 'aegis-colossus'
  | 'brood-queen'
  | 'infernal-engine'

export type EnemyUnit = {
  id: number
  rank: EnemyRank
  archetypeId?: EnemyArchetypeId
  role?: EnemyRole
  eliteTrait?: EnemyEliteTrait | null
  dangerCost?: number
  isElite?: boolean
  showLabel: boolean
  showHealthBar: boolean
  sprite: Phaser.Physics.Arcade.Image
  shadow: Phaser.GameObjects.Ellipse
  glow: Phaser.GameObjects.Ellipse
  label: Phaser.GameObjects.Text
  healthBarBackground: Phaser.GameObjects.Rectangle
  healthBar: Phaser.GameObjects.Rectangle
  collider: Phaser.Physics.Arcade.Collider
  maxHealth: number
  health: number
  baseSpeed: number
  speed: number
  contactDamage: number
  attackMode: EnemyAttackMode
  preferredRange: number
  minimumRange: number
  rangedAttackCooldown: number
  rangedProjectileSpeed: number
  rangedProjectileDamage: number
  nextRangedAttackAt: number
  scoreValue: number
  projectileHitRadius: number
  contactRadius: number
  labelOffsetY: number
  healthBarOffsetY: number
  healthBarWidth: number
  knockbackForce: number
  path: Phaser.Math.Vector2[]
  pathIndex: number
  nextPathUpdateAt: number
  lastPathTargetCellKey: string
  lastProgressCheckAt: number
  lastProgressPosition: Phaser.Math.Vector2
  wasTryingToMove: boolean
  stuckCount: number
  localAvoidanceTarget: Phaser.Math.Vector2 | null
  localAvoidanceUntil: number
  localAvoidanceDirection: number
  bossPhase: number
  bossVariant: BossVariant | null
  bossEncounterIndex: number
  bossAbilityCycleIndex: number
  bossSplitTriggered: boolean
  nextBossAbilityAt: number
  bossAbilityActiveUntil: number
  bossAbility: BossAbility | null
  alive: boolean
}

export type PlayerStats = {
  movementSpeed: number
  maximumHealth: number
  attackDamage: number
  attackInterval: number
  attackRange: number
  projectileSpeed: number
  pickupRadius: number
  damageReduction: number
  criticalChance: number
  criticalMultiplier: number
}

export type ActivePlayerSkillId =
  | 'orbiting-blades'
  | 'chain-lightning'
  | 'plasma-nova'
  | 'ice-lance'
  | 'meteor-rain'
  | 'gravity-well'
  | 'combat-drone'
  | 'energy-laser'

export type PlayerSkillId =
  | ActivePlayerSkillId
  | 'multishot'

export type FusionUpgradeId = 'skill-fusion' | 'fusion-training'

export type FusionSkillState = {
  id: string
  title: string
  level: number
  tier: number
  componentSkillIds: ActivePlayerSkillId[]
}

export type SkillUpgradeContext = {
  activeSlotCount: number
  maximumActiveSlots: number
  ownedBaseSkillIds: ActivePlayerSkillId[]
  maxedFusionCount: number
  upgradeableFusionCount: number
  canFuse: boolean
}

export type UpgradeId =
  | 'power-core'
  | 'rapid-fire'
  | 'mobility'
  | 'vitality'
  | 'magnetism'
  | 'overcharge'
  | 'armor-plating'
  | 'critical-core'
  | 'combat-training'
  | 'reactor-tuning'
  | 'field-repair'
  | PlayerSkillId
  | FusionUpgradeId

export type UpgradeRarity = 'common' | 'rare' | 'epic'

export type UpgradeDefinition = {
  id: UpgradeId
  title: string
  description: string
  rarity: UpgradeRarity
  accentColor: number
  maxLevel: number
}

export type UpgradeChoice = UpgradeDefinition & {
  currentLevel: number
  nextLevel: number
  isNewSkill: boolean
  usesActiveSlot: boolean
}

export type ScoreSource = 'enemy' | 'wave'

export type RunStatistics = {
  totalKills: number
  normalKills: number
  mutatedKills: number
  eliteKills: number
  miniBossKills: number
  bossKills: number
  healthPickups: number
  bombPickups: number
  magnetPickups: number
  chestsOpened: number
  chestRewardsReceived: number
  fusionsCreated: number
  fusionUpgrades: number
  highestFusionTier: number
  scoreFromEnemies: number
  scoreFromWaves: number
}

export type RunRecord = {
  id: string
  createdAt: number
  score: number
  wave: number
  kills: number
  level: number
  survivalSeconds: number
  statistics: RunStatistics
}

export type LocalLeaderboardSaveResult = {
  rank: number | null
  isNewBest: boolean
  bestScore: number
  records: RunRecord[]
}

export type OnlineLeaderboardEntry = {
  runId: string
  displayName: string
  score: number
  wave: number
  kills: number
  level: number
  survivalSeconds: number
  createdAt: string
}

export type OnlineLeaderboardSubmitStatus =
  | 'disabled'
  | 'success'
  | 'error'

export type OnlineLeaderboardSubmitResult = {
  status: OnlineLeaderboardSubmitStatus
  rank: number | null
  bestScore: number
  displayName: string
  records: OnlineLeaderboardEntry[]
  errorMessage: string
}
