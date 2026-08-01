import { GAME_CONFIG } from '../config/gameConfig'
import type {
  PlayerStats,
  UpgradeDefinition,
  UpgradeId,
} from '../types/game'

export const UPGRADE_DEFINITIONS: Record<
  UpgradeId,
  UpgradeDefinition
> = {
  'power-core': {
    id: 'power-core',
    title: 'LÕI SÁT THƯƠNG',
    description: '+10% sát thương. Có thể nâng gần như vô hạn.',
    rarity: 'rare',
    accentColor: 0xf97316,
    maxLevel: 999,
  },
  'rapid-fire': {
    id: 'rapid-fire',
    title: 'BỘ NẠP NHANH',
    description: '+3% tốc độ bắn. Giới hạn để bảo vệ hiệu năng.',
    rarity: 'rare',
    accentColor: 0x22d3ee,
    maxLevel: 25,
  },
  mobility: {
    id: 'mobility',
    title: 'ĐỘNG CƠ CƠ ĐỘNG',
    description: '+2,5% tốc độ di chuyển. Tối đa 20 cấp.',
    rarity: 'common',
    accentColor: 0x4ade80,
    maxLevel: 20,
  },
  vitality: {
    id: 'vitality',
    title: 'GIÁP SINH HỌC',
    description: '+18 máu tối đa và hồi 18 máu. Tối đa 999 cấp.',
    rarity: 'common',
    accentColor: 0xef4444,
    maxLevel: 999,
  },
  magnetism: {
    id: 'magnetism',
    title: 'TỪ TRƯỜNG THU GOM',
    description: '+24 phạm vi hút kinh nghiệm.',
    rarity: 'common',
    accentColor: 0xa78bfa,
    maxLevel: 50,
  },
  overcharge: {
    id: 'overcharge',
    title: 'ĐẠN QUÁ TẢI',
    description: '+2,5% tầm bắn và +3% tốc độ đạn.',
    rarity: 'rare',
    accentColor: 0x38bdf8,
    maxLevel: 30,
  },
  'armor-plating': {
    id: 'armor-plating',
    title: 'TẤM GIÁP GIA CỐ',
    description:
      'Tăng giáp theo công thức giảm dần, tối đa khoảng 82% giảm sát thương.',
    rarity: 'rare',
    accentColor: 0x94a3b8,
    maxLevel: 999,
  },
  'critical-core': {
    id: 'critical-core',
    title: 'LÕI CHÍ MẠNG',
    description: '+3,5% tỉ lệ chí mạng, tối đa 70%.',
    rarity: 'epic',
    accentColor: 0xfacc15,
    maxLevel: 20,
  },
  'orbiting-blades': {
    id: 'orbiting-blades',
    title: 'LƯỠI DAO QUỸ ĐẠO',
    description:
      'Lưỡi năng lượng xoay quanh nhân vật. Cấp 5 có 4 lưỡi và tạo sóng chém.',
    rarity: 'rare',
    accentColor: 0x22d3ee,
    maxLevel: 5,
  },
  'chain-lightning': {
    id: 'chain-lightning',
    title: 'SÉT DÂY CHUYỀN',
    description:
      'Sét truyền qua nhiều mục tiêu. Cấp 5 phóng hai chuỗi sét liên tiếp.',
    rarity: 'epic',
    accentColor: 0x67e8f9,
    maxLevel: 5,
  },
  'plasma-nova': {
    id: 'plasma-nova',
    title: 'NOVA PLASMA',
    description:
      'Nổ năng lượng quanh nhân vật. Cấp 5 tạo ba vòng nổ mở rộng.',
    rarity: 'rare',
    accentColor: 0xa78bfa,
    maxLevel: 5,
  },
  'ice-lance': {
    id: 'ice-lance',
    title: 'BĂNG THƯƠNG',
    description:
      'Bắn thương băng xuyên đàn và làm chậm. Cấp 5 bắn ba hướng, đóng băng mạnh.',
    rarity: 'rare',
    accentColor: 0x7dd3fc,
    maxLevel: 5,
  },
  'meteor-rain': {
    id: 'meteor-rain',
    title: 'MƯA THIÊN THẠCH',
    description:
      'Gọi thiên thạch xuống vị trí quái. Cấp 5 gọi sáu thiên thạch và nổ lần hai.',
    rarity: 'epic',
    accentColor: 0xfb7185,
    maxLevel: 5,
  },
  'gravity-well': {
    id: 'gravity-well',
    title: 'HỐ ĐEN TRỌNG LỰC',
    description:
      'Tạo vùng hút và nghiền đàn quái. Cấp 5 sụp đổ bằng một vụ nổ lớn.',
    rarity: 'epic',
    accentColor: 0x8b5cf6,
    maxLevel: 5,
  },
  'combat-drone': {
    id: 'combat-drone',
    title: 'DRONE CHIẾN ĐẤU',
    description:
      'Drone tự tìm mục tiêu và khai hỏa. Cấp 5 có ba drone cùng tên lửa nổ.',
    rarity: 'rare',
    accentColor: 0x34d399,
    maxLevel: 5,
  },
  'energy-laser': {
    id: 'energy-laser',
    title: 'LASER NĂNG LƯỢNG',
    description:
      'Tia laser xuyên mọi quái trên đường bắn. Cấp 5 bắn ba tia đồng thời.',
    rarity: 'epic',
    accentColor: 0xf472b6,
    maxLevel: 5,
  },
  multishot: {
    id: 'multishot',
    title: 'ĐẠN PHÂN KỲ',
    description:
      'Nâng vũ khí mặc định, không chiếm ô kỹ năng. Cấp 5 bắn 6 viên.',
    rarity: 'epic',
    accentColor: 0xfacc15,
    maxLevel: 5,
  },

  'skill-fusion': {
    id: 'skill-fusion',
    title: 'DUNG HỢP TỐI THƯỢNG',
    description:
      'Kết hợp ngẫu nhiên 2 kỹ năng chủ động cấp 5 thành một kỹ năng bậc cao, giữ toàn bộ cơ chế và giải phóng 1 ô kỹ năng.',
    rarity: 'epic',
    accentColor: 0xf472b6,
    maxLevel: 999,
  },
  'fusion-training': {
    id: 'fusion-training',
    title: 'CƯỜNG HÓA DUNG HỢP',
    description:
      'Tăng 1 cấp cho một kỹ năng dung hợp chưa đạt cấp 5. Cấp cao làm toàn bộ thành phần bên trong mạnh hơn.',
    rarity: 'epic',
    accentColor: 0xe879f9,
    maxLevel: 999,
  },
  'combat-training': {
    id: 'combat-training',
    title: 'HUẤN LUYỆN CHIẾN ĐẤU',
    description: '+5% sát thương vĩnh viễn. Tối đa 999 cấp.',
    rarity: 'common',
    accentColor: 0xfb923c,
    maxLevel: 999,
  },
  'reactor-tuning': {
    id: 'reactor-tuning',
    title: 'TINH CHỈNH LÒ PHẢN ỨNG',
    description: '+2% tốc độ bắn. Tối đa 25 cấp.',
    rarity: 'common',
    accentColor: 0x06b6d4,
    maxLevel: 25,
  },
  'field-repair': {
    id: 'field-repair',
    title: 'SỬA CHỮA KHẨN CẤP',
    description: 'Hồi ngay 35 máu.',
    rarity: 'common',
    accentColor: 0x22c55e,
    maxLevel: 999,
  },
}

export function createBasePlayerStats(): PlayerStats {
  return {
    movementSpeed: GAME_CONFIG.player.speed,
    maximumHealth: GAME_CONFIG.player.maxHealth,
    attackDamage: GAME_CONFIG.weapon.projectileDamage,
    attackInterval: GAME_CONFIG.weapon.attackInterval,
    attackRange: GAME_CONFIG.weapon.attackRange,
    projectileSpeed: GAME_CONFIG.weapon.projectileSpeed,
    pickupRadius: 96,
    damageReduction: 0,
    criticalChance: 0.05,
    criticalMultiplier: 2,
  }
}
