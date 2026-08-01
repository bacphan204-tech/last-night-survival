export const GAME_CONFIG = {
  world: {
    width: 5800,
    height: 3400,
    seed: 'last-night-survival-map-v2',
  },

  player: {
    speed: 245,
    maxHealth: 100,
    damageCooldown: 800,
    contactDistance: 54,
  },

  enemy: {
    baseSpeed: 114,
    maximumSpeed: 176,
    stopDistance: 46,
    baseHealth: 100,
    baseContactDamage: 10,
    healthGrowthPerWave: 0.075,
    damageGrowthPerWave: 0.035,
    speedGrowthPerWave: 0.009,
    separationDistance: 58,
    spawnMinDistance: 700,
    spawnMaxDistance: 1020,
  },

  boss: {
    miniBossHealthMultiplier: 5,
    miniBossDamageMultiplier: 1.55,
    miniBossSpeedMultiplier: 0.9,
    miniBossScore: 1200,
    miniBossAbilityCooldown: 4600,
    miniBossChargeDuration: 850,
    miniBossChargeMultiplier: 2.15,

    bossHealthMultiplier: 10.5,
    bossDamageMultiplier: 2.2,
    bossSpeedMultiplier: 0.76,
    bossScore: 5000,
    bossAbilityCooldown: 5200,
    bossShockwaveDelay: 760,
    bossShockwaveRadius: 235,
    bossShockwaveDamageMultiplier: 1.3,
  },

  weapon: {
    attackRange: 560,
    attackInterval: 620,
    projectileSpeed: 690,
    projectileDamage: 25,
    projectileLifetime: 1250,
  },

  experience: {
    baseRequirement: 70,
    requirementGrowth: 1.24,
    normalEnemyValue: 12,
    miniBossValue: 180,
    bossValue: 520,
    attractionSpeed: 470,
    collectDistance: 23,
    maximumOrbs: 160,
  },

  wave: {
    normalDuration: 30000,
    miniBossDuration: 34000,
    bossDuration: 42000,
    baseSpawnInterval: 1650,
    minimumSpawnInterval: 520,
    maximumActiveEnemies: 40,
    baseEnemyLimit: 10,
    enemyLimitGrowthEveryWaves: 2,
    spawnIntervalMultiplierPerWave: 0.965,
  },

  navigation: {
    cellSize: 40,
    padding: 30,
    pathRefreshInterval: 850,
    waypointReachDistance: 18,
    stuckCheckInterval: 350,
    stuckDistanceThreshold: 3,
    localAvoidanceDistance: 165,
    localAvoidanceDuration: 620,

    // Không cho hàng chục quái chạy A* trong cùng một frame.
    maxPathSearchesPerFrame: 2,

    // Giới hạn công việc của từng lượt A* để tránh treo trình duyệt
    // khi mục tiêu nằm ở phía bên kia bản đồ hoặc đường bị khóa.
    maximumVisitedNodes: 2400,

    // Spatial hash dùng cho lực tách đàn, thay cho việc mỗi quái quét
    // toàn bộ danh sách quái ở mọi frame.
    separationBucketSize: 96,

    // Sau bốn lần xác nhận bị kẹt, boss/mini boss sẽ tìm lối thoát riêng.
    specialEnemyRescueThreshold: 4,
  },

  hud: {
    healthBarMaxWidth: 200,
  },
}
