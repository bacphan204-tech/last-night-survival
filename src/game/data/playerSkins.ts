export type PlayerSkinId =
  | 'survivor'
  | 'ember-wraith'
  | 'frost-sovereign'
  | 'night-assassin'
  | 'crimson-weaver'
  | 'storm-lord'
  | 'celestial-trickster'
  | 'void-king'
  | 'eclipse-emperor'
  | 'final-calamity'
  | 'supreme-champion'
  | 'void-conqueror'
  | 'last-night-overlord'

export type PlayerSkinRarity =
  | 'Mặc định'
  | 'Thường'
  | 'Hiếm'
  | 'Sử thi'
  | 'Huyền thoại'
  | 'Tối thượng'
  | 'Độc quyền'

export type PlayerSkinArchetype =
  | 'tactical'
  | 'flame'
  | 'frost'
  | 'assassin'
  | 'weaver'
  | 'thunder'
  | 'trickster'
  | 'void'
  | 'eclipse'
  | 'calamity'
  | 'champion'
  | 'astral'
  | 'overlord'

export type PlayerSkinEffectTier = 0 | 1 | 2 | 3 | 4

export type PlayerSkinDefinition = {
  id: PlayerSkinId
  name: string
  codename: string
  rarity: PlayerSkinRarity
  archetype: PlayerSkinArchetype
  price: number
  statBonus: number
  description: string
  passiveText: string
  effectTier: PlayerSkinEffectTier
  primaryColor: number
  secondaryColor: number
  accentColor: number
  darkColor: number
  eyeColor: number
  auraColor: number
  projectileColor: number
  projectileCoreColor: number
  trailColor: number
  impactColor: number
  previewPrimary: string
  previewSecondary: string
  previewAccent: string
  previewGlow: string
  rewardOnly?: boolean
  auraStyle?: 'royal' | 'void' | 'nightfire'
}

export const DEFAULT_PLAYER_SKIN_ID: PlayerSkinId = 'survivor'

// Production: skin phải được mở bằng Mảnh Đêm.
export const PLAYER_SKIN_TEST_MODE = false

export const PLAYER_SKIN_DEFINITIONS: readonly PlayerSkinDefinition[] = [
  {
    id: 'survivor', name: 'Kẻ Sống Sót', codename: 'SURVIVOR-01', rarity: 'Mặc định', archetype: 'tactical',
    price: 0, statBonus: 0, description: 'Chiến binh chiến thuật cuối cùng còn đứng vững.', passiveText: 'Không cộng chỉ số.', effectTier: 0,
    primaryColor: 0x334155, secondaryColor: 0x94a3b8, accentColor: 0x38bdf8, darkColor: 0x0f172a, eyeColor: 0x67e8f9,
    auraColor: 0x2563eb, projectileColor: 0x67e8f9, projectileCoreColor: 0xe0f2fe, trailColor: 0x38bdf8, impactColor: 0x67e8f9,
    previewPrimary: '#334155', previewSecondary: '#94a3b8', previewAccent: '#38bdf8', previewGlow: '#2563eb',
  },
  {
    id: 'ember-wraith', name: 'Hỏa Linh', codename: 'EMBER-WRAITH', rarity: 'Thường', archetype: 'flame',
    price: 300, statBonus: 0.01, description: 'Kỵ sĩ tro tàn mang lõi lửa sống giữa lồng ngực.', passiveText: '+1% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0x7c2d12, secondaryColor: 0xf97316, accentColor: 0xfbbf24, darkColor: 0x2a0c04, eyeColor: 0xfff7ae,
    auraColor: 0xea580c, projectileColor: 0xfb923c, projectileCoreColor: 0xfef3c7, trailColor: 0xf97316, impactColor: 0xfbbf24,
    previewPrimary: '#7c2d12', previewSecondary: '#f97316', previewAccent: '#fbbf24', previewGlow: '#ea580c',
  },
  {
    id: 'frost-sovereign', name: 'Băng Chủ', codename: 'FROST-SOVEREIGN', rarity: 'Thường', archetype: 'frost',
    price: 600, statBonus: 0.02, description: 'Vương giáp băng với vương miện tinh thể lạnh tuyệt đối.', passiveText: '+2% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0x155e75, secondaryColor: 0x67e8f9, accentColor: 0xe0f2fe, darkColor: 0x083344, eyeColor: 0xffffff,
    auraColor: 0x22d3ee, projectileColor: 0x7dd3fc, projectileCoreColor: 0xffffff, trailColor: 0x22d3ee, impactColor: 0xbae6fd,
    previewPrimary: '#155e75', previewSecondary: '#67e8f9', previewAccent: '#e0f2fe', previewGlow: '#22d3ee',
  },
  {
    id: 'night-assassin', name: 'Ảnh Sát', codename: 'NIGHT-ASSASSIN', rarity: 'Hiếm', archetype: 'assassin',
    price: 1000, statBonus: 0.03, description: 'Sát thủ choàng khăn đen, mang song nhận tím lạnh.', passiveText: '+3% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0x1e1b4b, secondaryColor: 0x6d28d9, accentColor: 0xc4b5fd, darkColor: 0x090816, eyeColor: 0xe9d5ff,
    auraColor: 0x7c3aed, projectileColor: 0xa78bfa, projectileCoreColor: 0xf5f3ff, trailColor: 0x8b5cf6, impactColor: 0xc4b5fd,
    previewPrimary: '#1e1b4b', previewSecondary: '#6d28d9', previewAccent: '#c4b5fd', previewGlow: '#7c3aed',
  },
  {
    id: 'crimson-weaver', name: 'Kẻ Dệt Tơ Đỏ', codename: 'CRIMSON-WEAVER', rarity: 'Hiếm', archetype: 'weaver',
    price: 1600, statBonus: 0.04, description: 'Thợ săn tường đêm với mặt nạ mắt bạc và giáp tơ đỏ nguyên bản.', passiveText: '+4% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0x991b1b, secondaryColor: 0x1e293b, accentColor: 0xe2e8f0, darkColor: 0x0f172a, eyeColor: 0xffffff,
    auraColor: 0xdc2626, projectileColor: 0xf43f5e, projectileCoreColor: 0xffffff, trailColor: 0xfb7185, impactColor: 0xfda4af,
    previewPrimary: '#991b1b', previewSecondary: '#1e293b', previewAccent: '#e2e8f0', previewGlow: '#dc2626',
  },
  {
    id: 'storm-lord', name: 'Lôi Thần', codename: 'STORM-LORD', rarity: 'Sử thi', archetype: 'thunder',
    price: 2500, statBonus: 0.06, description: 'Chiến thần sấm sét cầm chiến chùy và khoác giáp trời xanh.', passiveText: '+6% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0x1d4ed8, secondaryColor: 0x94a3b8, accentColor: 0xf8fafc, darkColor: 0x172554, eyeColor: 0xe0f2fe,
    auraColor: 0x38bdf8, projectileColor: 0x60a5fa, projectileCoreColor: 0xffffff, trailColor: 0x38bdf8, impactColor: 0xe0f2fe,
    previewPrimary: '#1d4ed8', previewSecondary: '#94a3b8', previewAccent: '#f8fafc', previewGlow: '#38bdf8',
  },
  {
    id: 'celestial-trickster', name: 'Tề Thiên', codename: 'CELESTIAL-TRICKSTER', rarity: 'Sử thi', archetype: 'trickster',
    price: 3800, statBonus: 0.08, description: 'Hành giả thiên giới với kim cô, vân giáp và trường côn vàng.', passiveText: '+8% toàn bộ nhóm chỉ số chính.', effectTier: 0,
    primaryColor: 0xb45309, secondaryColor: 0xdc2626, accentColor: 0xfde047, darkColor: 0x451a03, eyeColor: 0xfffbeb,
    auraColor: 0xf59e0b, projectileColor: 0xfbbf24, projectileCoreColor: 0xffffff, trailColor: 0xf59e0b, impactColor: 0xfde68a,
    previewPrimary: '#b45309', previewSecondary: '#dc2626', previewAccent: '#fde047', previewGlow: '#f59e0b',
  },
  {
    id: 'void-king', name: 'Hư Không Vương', codename: 'VOID-KING', rarity: 'Huyền thoại', archetype: 'void',
    price: 5000, statBonus: 0.10, description: 'Quân vương khe nứt với vương miện sừng và lõi hư vô.', passiveText: '+10% chỉ số • Đạn hư không • Hào quang động.', effectTier: 1,
    primaryColor: 0x4c1d95, secondaryColor: 0x111827, accentColor: 0xc084fc, darkColor: 0x070211, eyeColor: 0xf5d0fe,
    auraColor: 0x8b5cf6, projectileColor: 0xa855f7, projectileCoreColor: 0xffffff, trailColor: 0x7c3aed, impactColor: 0xd8b4fe,
    previewPrimary: '#4c1d95', previewSecondary: '#111827', previewAccent: '#c084fc', previewGlow: '#8b5cf6',
  },
  {
    id: 'eclipse-emperor', name: 'Nhật Thực Đế', codename: 'ECLIPSE-EMPEROR', rarity: 'Huyền thoại', archetype: 'eclipse',
    price: 7500, statBonus: 0.12, description: 'Đế vương hắc nhật, giáp đỏ đen và quầng sáng bị nuốt chửng.', passiveText: '+12% chỉ số • Đạn nhật thực • Hai vòng hào quang.', effectTier: 2,
    primaryColor: 0x7f1d1d, secondaryColor: 0x111827, accentColor: 0xfbbf24, darkColor: 0x050505, eyeColor: 0xfff7ed,
    auraColor: 0xdc2626, projectileColor: 0xef4444, projectileCoreColor: 0xfef3c7, trailColor: 0xf59e0b, impactColor: 0xfbbf24,
    previewPrimary: '#7f1d1d', previewSecondary: '#111827', previewAccent: '#fbbf24', previewGlow: '#dc2626',
  },
  {
    id: 'final-calamity', name: 'Thiên Tai Tối Thượng', codename: 'FINAL-CALAMITY', rarity: 'Tối thượng', archetype: 'calamity',
    price: 10000, statBonus: 0.15, description: 'Thực thể tận thế kết hợp lôi, hỏa và hư không trong một cơ thể.', passiveText: '+15% chỉ số • Đạn tối thượng • Hào quang và va chạm đặc biệt.', effectTier: 3,
    primaryColor: 0x312e81, secondaryColor: 0x991b1b, accentColor: 0xfde047, darkColor: 0x020617, eyeColor: 0xffffff,
    auraColor: 0x6366f1, projectileColor: 0xf43f5e, projectileCoreColor: 0xffffff, trailColor: 0x22d3ee, impactColor: 0xfde047,
    previewPrimary: '#312e81', previewSecondary: '#991b1b', previewAccent: '#fde047', previewGlow: '#6366f1',
  },
  {
    id: 'supreme-champion', name: 'Vương Giả Tối Thượng', codename: 'SUPREME-CHAMPION', rarity: 'Độc quyền', archetype: 'champion',
    price: 0, statBonus: 0.15, description: 'Chiến giáp vương giả dát vàng, mang lõi tinh tú và vương miện chiến thắng.', passiveText: '+15% chỉ số • Đại hào quang hoàng kim • Chỉ mở bằng phần thưởng ID.', effectTier: 4,
    primaryColor: 0x4c1d95, secondaryColor: 0xf59e0b, accentColor: 0xfef08a, darkColor: 0x090314, eyeColor: 0xffffff,
    auraColor: 0xa855f7, projectileColor: 0xfbbf24, projectileCoreColor: 0xffffff, trailColor: 0xe879f9, impactColor: 0xfef08a,
    previewPrimary: '#4c1d95', previewSecondary: '#f59e0b', previewAccent: '#fef08a', previewGlow: '#c084fc',
    rewardOnly: true, auraStyle: 'royal',
  },
  {
    id: 'void-conqueror', name: 'Chinh Phục Hư Không', codename: 'VOID-CONQUEROR', rarity: 'Độc quyền', archetype: 'astral',
    price: 0, statBonus: 0.15, description: 'Thống lĩnh khe nứt với giáp thiên hà, lõi chân không và cánh năng lượng xanh tím.', passiveText: '+15% chỉ số • Đại hào quang hư không • Chỉ mở bằng phần thưởng ID.', effectTier: 4,
    primaryColor: 0x1e3a8a, secondaryColor: 0x6d28d9, accentColor: 0x67e8f9, darkColor: 0x020617, eyeColor: 0xe0f2fe,
    auraColor: 0x2563eb, projectileColor: 0x22d3ee, projectileCoreColor: 0xffffff, trailColor: 0x8b5cf6, impactColor: 0xa5f3fc,
    previewPrimary: '#1e3a8a', previewSecondary: '#6d28d9', previewAccent: '#67e8f9', previewGlow: '#3b82f6',
    rewardOnly: true, auraStyle: 'void',
  },
  {
    id: 'last-night-overlord', name: 'Bá Chủ Đêm Cuối', codename: 'LAST-NIGHT-OVERLORD', rarity: 'Độc quyền', archetype: 'overlord',
    price: 0, statBonus: 0.15, description: 'Bạo chúa của đêm tận thế, khoác giáp đỏ đen và vương miện hỏa ngục.', passiveText: '+15% chỉ số • Đại hào quang huyết hỏa • Chỉ mở bằng phần thưởng ID.', effectTier: 4,
    primaryColor: 0x7f1d1d, secondaryColor: 0xea580c, accentColor: 0xfde047, darkColor: 0x090303, eyeColor: 0xfffbeb,
    auraColor: 0xdc2626, projectileColor: 0xfb7185, projectileCoreColor: 0xffffff, trailColor: 0xf97316, impactColor: 0xfbbf24,
    previewPrimary: '#7f1d1d', previewSecondary: '#ea580c', previewAccent: '#fde047', previewGlow: '#ef4444',
    rewardOnly: true, auraStyle: 'nightfire',
  },
]

const PLAYER_SKINS_BY_ID = new Map(
  PLAYER_SKIN_DEFINITIONS.map((skin) => [skin.id, skin]),
)

export function isPlayerSkinId(value: unknown): value is PlayerSkinId {
  return typeof value === 'string' && PLAYER_SKINS_BY_ID.has(value as PlayerSkinId)
}

export function getPlayerSkinDefinition(
  id: PlayerSkinId | string | null | undefined,
): PlayerSkinDefinition {
  return (
    (id ? PLAYER_SKINS_BY_ID.get(id as PlayerSkinId) : undefined) ??
    PLAYER_SKINS_BY_ID.get(DEFAULT_PLAYER_SKIN_ID)!
  )
}
