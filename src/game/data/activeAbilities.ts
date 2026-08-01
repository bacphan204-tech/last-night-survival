export type ActiveAbilityId =
  | 'bullet-crown'
  | 'phase-dash'
  | 'magnetic-field'
  | 'renewal-pulse'
  | 'plasma-detonation'
  | 'war-overdrive'
  | 'aegis-fortress'
  | 'rift-step'
  | 'heaven-judgment'
  | 'eternal-apocalypse'
  | 'supreme-starfall'
  | 'void-dominion'
  | 'last-night-verdict'

export type ActiveAbilityRarity =
  | 'Thường'
  | 'Hiếm'
  | 'Sử thi'
  | 'Huyền thoại'
  | 'Tối thượng'
  | 'Độc quyền'

export type ActiveAbilityDefinition = {
  id: ActiveAbilityId
  name: string
  codename: string
  rarity: ActiveAbilityRarity
  price: number
  cooldownSeconds: number
  icon: string
  description: string
  effectText: string
  color: number
  secondaryColor: number
  previewColor: string
  previewSecondary: string
  rewardOnly?: boolean
  honorTitle?: string
}

// Production: kỹ năng chủ động phải được mở bằng Mảnh Đêm.
export const ACTIVE_ABILITY_TEST_MODE = false
export const DEFAULT_TEST_ACTIVE_ABILITY_ID: ActiveAbilityId = 'bullet-crown'

export const ACTIVE_ABILITY_DEFINITIONS: readonly ActiveAbilityDefinition[] = [
  {
    id: 'bullet-crown',
    name: 'Vương Miện Đạn',
    codename: 'BULLET-CROWN',
    rarity: 'Thường',
    price: 500,
    cooldownSeconds: 16,
    icon: '✦',
    description: 'Giải phóng một chùm đạn tròn quanh cơ thể.',
    effectText: 'Bắn 10 viên theo mọi hướng • Mỗi viên gây 100% sát thương người chơi.',
    color: 0x38bdf8,
    secondaryColor: 0xe0f2fe,
    previewColor: '#38bdf8',
    previewSecondary: '#e0f2fe',
  },
  {
    id: 'phase-dash',
    name: 'Ảnh Bộ Xung Kích',
    codename: 'PHASE-DASH',
    rarity: 'Thường',
    price: 1200,
    cooldownSeconds: 12,
    icon: '➤',
    description: 'Lướt nhanh theo hướng di chuyển và xuyên khỏi vòng vây.',
    effectText: 'Lướt 360 khoảng cách • Miễn thương 0,45 giây • Nổ 180% sát thương tại điểm đến.',
    color: 0x22d3ee,
    secondaryColor: 0xa5f3fc,
    previewColor: '#22d3ee',
    previewSecondary: '#a5f3fc',
  },
  {
    id: 'magnetic-field',
    name: 'Từ Trường Hủy Diệt',
    codename: 'MAGNETIC-FIELD',
    rarity: 'Hiếm',
    price: 2000,
    cooldownSeconds: 32,
    icon: '◉',
    description: 'Tạo một vùng từ trường di chuyển cùng người chơi.',
    effectText: 'Tồn tại 10 giây • Mỗi giây gây 100% sát thương trong bán kính 190.',
    color: 0xa855f7,
    secondaryColor: 0xe9d5ff,
    previewColor: '#a855f7',
    previewSecondary: '#e9d5ff',
  },
  {
    id: 'renewal-pulse',
    name: 'Mạch Sống Tái Sinh',
    codename: 'RENEWAL-PULSE',
    rarity: 'Hiếm',
    price: 3500,
    cooldownSeconds: 48,
    icon: '✚',
    description: 'Kích hoạt lõi sinh mệnh để hồi phục giữa trận chiến.',
    effectText: 'Hồi ngay 35% máu tối đa • Hồi thêm 3% mỗi giây trong 5 giây.',
    color: 0x22c55e,
    secondaryColor: 0xbbf7d0,
    previewColor: '#22c55e',
    previewSecondary: '#bbf7d0',
  },
  {
    id: 'plasma-detonation',
    name: 'Bùng Nổ Plasma',
    codename: 'PLASMA-DETONATION',
    rarity: 'Sử thi',
    price: 6000,
    cooldownSeconds: 34,
    icon: '✹',
    description: 'Nén năng lượng rồi phát nổ trên diện rộng.',
    effectText: 'Bán kính 330 • Gây 600% sát thương người chơi lên toàn bộ mục tiêu trúng đòn.',
    color: 0xf97316,
    secondaryColor: 0xfef3c7,
    previewColor: '#f97316',
    previewSecondary: '#fef3c7',
  },
  {
    id: 'war-overdrive',
    name: 'Cuồng Nộ Chiến Thần',
    codename: 'WAR-OVERDRIVE',
    rarity: 'Sử thi',
    price: 9000,
    cooldownSeconds: 52,
    icon: '⚔',
    description: 'Ép lò phản ứng vượt giới hạn trong thời gian ngắn.',
    effectText: '12 giây: +45% sát thương • +47% tốc độ đánh • +18% tốc độ di chuyển.',
    color: 0xef4444,
    secondaryColor: 0xfde68a,
    previewColor: '#ef4444',
    previewSecondary: '#fde68a',
  },
  {
    id: 'aegis-fortress',
    name: 'Thành Trì Bất Diệt',
    codename: 'AEGIS-FORTRESS',
    rarity: 'Sử thi',
    price: 14000,
    cooldownSeconds: 60,
    icon: '⬡',
    description: 'Dựng lớp giáp năng lượng chống lại làn sóng tử vong.',
    effectText: 'Hồi 20% máu tối đa • 10 giây nhận thêm 65% giảm sát thương.',
    color: 0x60a5fa,
    secondaryColor: 0xdbeafe,
    previewColor: '#60a5fa',
    previewSecondary: '#dbeafe',
  },
  {
    id: 'rift-step',
    name: 'Bước Nhảy Hư Không',
    codename: 'RIFT-STEP',
    rarity: 'Huyền thoại',
    price: 22000,
    cooldownSeconds: 28,
    icon: '◇',
    description: 'Xé rách không gian và xuất hiện ở vị trí phía trước.',
    effectText: 'Dịch chuyển 600 khoảng cách • Miễn thương 1 giây • Nổ 450% sát thương tại điểm đến.',
    color: 0x8b5cf6,
    secondaryColor: 0xf5d0fe,
    previewColor: '#8b5cf6',
    previewSecondary: '#f5d0fe',
  },
  {
    id: 'heaven-judgment',
    name: 'Thiên Lôi Phán Quyết',
    codename: 'HEAVEN-JUDGMENT',
    rarity: 'Huyền thoại',
    price: 35000,
    cooldownSeconds: 65,
    icon: 'ϟ',
    description: 'Gọi thiên lôi truy sát những kẻ địch nguy hiểm nhất.',
    effectText: 'Đánh tối đa 12 mục tiêu • Mỗi mục tiêu nhận 900% sát thương người chơi.',
    color: 0xfacc15,
    secondaryColor: 0xffffff,
    previewColor: '#facc15',
    previewSecondary: '#ffffff',
  },
  {
    id: 'eternal-apocalypse',
    name: 'Tận Thế Vĩnh Hằng',
    codename: 'ETERNAL-APOCALYPSE',
    rarity: 'Tối thượng',
    price: 50000,
    cooldownSeconds: 100,
    icon: '☄',
    description: 'Mở vùng tận thế nuốt chửng toàn bộ chiến trường xung quanh.',
    effectText: '8 giây, mỗi 0,5 giây gây 250% sát thương trong bán kính 850 • Đồng thời tăng công, tốc đánh và phòng thủ.',
    color: 0xf43f5e,
    secondaryColor: 0xc4b5fd,
    previewColor: '#f43f5e',
    previewSecondary: '#c4b5fd',
  },
  {
    id: 'supreme-starfall',
    name: 'Thiên Vẫn Tối Thượng',
    codename: 'SUPREME-STARFALL',
    rarity: 'Độc quyền',
    price: 0,
    cooldownSeconds: 68,
    icon: '✧',
    description: 'Triệu hồi chín thiên thạch vương giả giáng xuống mục tiêu nguy hiểm nhất.',
    effectText: '9 thiên thạch • 750% sát thương mục tiêu • Nổ lan 180% trong bán kính 120.',
    color: 0xa855f7,
    secondaryColor: 0xfef08a,
    previewColor: '#a855f7',
    previewSecondary: '#fef08a',
    rewardOnly: true,
    honorTitle: 'TOP 1 TỐI THƯỢNG',
  },
  {
    id: 'void-dominion',
    name: 'Vương Quyền Hư Không',
    codename: 'VOID-DOMINION',
    rarity: 'Độc quyền',
    price: 0,
    cooldownSeconds: 58,
    icon: '◈',
    description: 'Mở một lõi chân không khóa chặt vùng đông quái và nghiền nát chúng.',
    effectText: '7 giây • Mỗi 0,7 giây gây 150% sát thương trong bán kính 320 • Kết thúc nổ 450%.',
    color: 0x2563eb,
    secondaryColor: 0x67e8f9,
    previewColor: '#2563eb',
    previewSecondary: '#67e8f9',
    rewardOnly: true,
    honorTitle: 'TOP 1 HƯ KHÔNG',
  },
  {
    id: 'last-night-verdict',
    name: 'Phán Quyết Đêm Cuối',
    codename: 'LAST-NIGHT-VERDICT',
    rarity: 'Độc quyền',
    price: 0,
    cooldownSeconds: 62,
    icon: '✕',
    description: 'Chém ba vòng phán quyết đỏ vàng xuyên qua toàn bộ vòng vây.',
    effectText: '3 đợt chém • Mỗi đợt gây 320% sát thương trong bán kính 440 • Tối đa 35 mục tiêu.',
    color: 0xdc2626,
    secondaryColor: 0xfde047,
    previewColor: '#dc2626',
    previewSecondary: '#fde047',
    rewardOnly: true,
    honorTitle: 'TOP 1 ĐÊM CUỐI',
  },
]

const DEFINITIONS_BY_ID = new Map(
  ACTIVE_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]),
)

export function isActiveAbilityId(value: unknown): value is ActiveAbilityId {
  return typeof value === 'string' && DEFINITIONS_BY_ID.has(value as ActiveAbilityId)
}

export function getActiveAbilityDefinition(
  id: ActiveAbilityId | string | null | undefined,
): ActiveAbilityDefinition | null {
  if (!id) return null
  return DEFINITIONS_BY_ID.get(id as ActiveAbilityId) ?? null
}
