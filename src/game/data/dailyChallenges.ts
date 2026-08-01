export type DailyChallengeMetric =
  | 'kills'
  | 'mutatedKills'
  | 'eliteKills'
  | 'miniBossKills'
  | 'bossKills'
  | 'pickupsCollected'
  | 'chestsOpened'
  | 'fusionsCreated'
  | 'wave'
  | 'level'
  | 'survivalSeconds'
  | 'score'

export type DailyChallengeAggregation = 'sum' | 'max'
export type DailyChallengeCategory = 'combat' | 'survival' | 'mastery'

export type DailyChallengeDefinition = {
  id: string
  title: string
  description: string
  category: DailyChallengeCategory
  metric: DailyChallengeMetric
  aggregation: DailyChallengeAggregation
  target: number
  reward: number
}

const COMBAT_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'combat-kills-80',
    title: 'Không còn đường lui',
    description: 'Hạ tổng cộng 80 kẻ địch trong hôm nay.',
    category: 'combat',
    metric: 'kills',
    aggregation: 'sum',
    target: 80,
    reward: 10,
  },
  {
    id: 'combat-kills-180',
    title: 'Cơn quét màn đêm',
    description: 'Hạ tổng cộng 180 kẻ địch trong hôm nay.',
    category: 'combat',
    metric: 'kills',
    aggregation: 'sum',
    target: 180,
    reward: 16,
  },
  {
    id: 'combat-mutants-45',
    title: 'Thanh lọc dị thể',
    description: 'Hạ 45 dị thể đột biến trong hôm nay.',
    category: 'combat',
    metric: 'mutatedKills',
    aggregation: 'sum',
    target: 45,
    reward: 13,
  },
  {
    id: 'combat-elites-10',
    title: 'Săn kẻ tinh anh',
    description: 'Hạ 10 kẻ địch tinh anh trong hôm nay.',
    category: 'combat',
    metric: 'eliteKills',
    aggregation: 'sum',
    target: 10,
    reward: 15,
  },
  {
    id: 'combat-mini-boss-2',
    title: 'Phá vỡ tiền tuyến',
    description: 'Hạ 2 mini boss trong hôm nay.',
    category: 'combat',
    metric: 'miniBossKills',
    aggregation: 'sum',
    target: 2,
    reward: 16,
  },
  {
    id: 'combat-boss-1',
    title: 'Chặt đầu ác mộng',
    description: 'Hạ ít nhất 1 boss trong hôm nay.',
    category: 'combat',
    metric: 'bossKills',
    aggregation: 'sum',
    target: 1,
    reward: 20,
  },
]

const SURVIVAL_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'survival-wave-5',
    title: 'Trụ vững tiền tuyến',
    description: 'Đạt đợt 5 trong một lượt chơi.',
    category: 'survival',
    metric: 'wave',
    aggregation: 'max',
    target: 5,
    reward: 10,
  },
  {
    id: 'survival-wave-10',
    title: 'Qua cổng ác mộng',
    description: 'Đạt đợt 10 trong một lượt chơi.',
    category: 'survival',
    metric: 'wave',
    aggregation: 'max',
    target: 10,
    reward: 18,
  },
  {
    id: 'survival-five-minutes',
    title: 'Năm phút địa ngục',
    description: 'Sống sót 5 phút trong một lượt chơi.',
    category: 'survival',
    metric: 'survivalSeconds',
    aggregation: 'max',
    target: 300,
    reward: 12,
  },
  {
    id: 'survival-eight-minutes',
    title: 'Không được gục ngã',
    description: 'Sống sót 8 phút trong một lượt chơi.',
    category: 'survival',
    metric: 'survivalSeconds',
    aggregation: 'max',
    target: 480,
    reward: 18,
  },
  {
    id: 'survival-level-12',
    title: 'Thích nghi cưỡng bức',
    description: 'Đạt cấp 12 trong một lượt chơi.',
    category: 'survival',
    metric: 'level',
    aggregation: 'max',
    target: 12,
    reward: 13,
  },
  {
    id: 'survival-score-3000',
    title: 'Để lại dấu vết',
    description: 'Đạt 3.000 điểm trong một lượt chơi.',
    category: 'survival',
    metric: 'score',
    aggregation: 'max',
    target: 3_000,
    reward: 14,
  },
]

const MASTERY_CHALLENGES: readonly DailyChallengeDefinition[] = [
  {
    id: 'mastery-pickups-8',
    title: 'Thu gom chiến trường',
    description: 'Nhặt tổng cộng 8 vật phẩm trong hôm nay.',
    category: 'mastery',
    metric: 'pickupsCollected',
    aggregation: 'sum',
    target: 8,
    reward: 10,
  },
  {
    id: 'mastery-chests-2',
    title: 'Kho dự trữ bị bỏ quên',
    description: 'Mở 2 rương kỹ năng trong hôm nay.',
    category: 'mastery',
    metric: 'chestsOpened',
    aggregation: 'sum',
    target: 2,
    reward: 12,
  },
  {
    id: 'mastery-chests-4',
    title: 'Kẻ vét sạch chiến trường',
    description: 'Mở 4 rương kỹ năng trong hôm nay.',
    category: 'mastery',
    metric: 'chestsOpened',
    aggregation: 'sum',
    target: 4,
    reward: 18,
  },
  {
    id: 'mastery-fusion-1',
    title: 'Phản ứng dây chuyền',
    description: 'Tạo ít nhất 1 kỹ năng dung hợp trong hôm nay.',
    category: 'mastery',
    metric: 'fusionsCreated',
    aggregation: 'sum',
    target: 1,
    reward: 18,
  },
  {
    id: 'mastery-level-16',
    title: 'Lò phản ứng quá tải',
    description: 'Đạt cấp 16 trong một lượt chơi.',
    category: 'mastery',
    metric: 'level',
    aggregation: 'max',
    target: 16,
    reward: 18,
  },
  {
    id: 'mastery-score-6000',
    title: 'Hiệu suất hủy diệt',
    description: 'Đạt 6.000 điểm trong một lượt chơi.',
    category: 'mastery',
    metric: 'score',
    aggregation: 'max',
    target: 6_000,
    reward: 20,
  },
]

export const DAILY_CHALLENGE_POOLS = {
  combat: COMBAT_CHALLENGES,
  survival: SURVIVAL_CHALLENGES,
  mastery: MASTERY_CHALLENGES,
} as const

export const DAILY_COMPLETION_BONUS = 25

export function getAllDailyChallengeDefinitions() {
  return [
    ...COMBAT_CHALLENGES,
    ...SURVIVAL_CHALLENGES,
    ...MASTERY_CHALLENGES,
  ]
}
