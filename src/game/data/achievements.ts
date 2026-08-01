export type CareerMetric =
  | 'totalRuns'
  | 'totalScore'
  | 'totalKills'
  | 'totalBossKills'
  | 'totalEliteKills'
  | 'totalChestsOpened'
  | 'totalFusionsCreated'
  | 'highestScore'
  | 'highestWave'
  | 'highestLevel'
  | 'highestKills'
  | 'highestSurvivalSeconds'
  | 'highestFusionTier'

export type AchievementCategory =
  | 'survival'
  | 'combat'
  | 'boss'
  | 'exploration'
  | 'mastery'

export type AchievementDefinition = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  metric: CareerMetric
  target: number
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: 'first-night',
    title: 'Đêm đầu tiên',
    description: 'Hoàn thành 1 lượt chơi.',
    category: 'survival',
    metric: 'totalRuns',
    target: 1,
  },
  {
    id: 'five-nights',
    title: 'Không bỏ cuộc',
    description: 'Hoàn thành 5 lượt chơi.',
    category: 'survival',
    metric: 'totalRuns',
    target: 5,
  },
  {
    id: 'twenty-five-nights',
    title: 'Cựu binh màn đêm',
    description: 'Hoàn thành 25 lượt chơi.',
    category: 'survival',
    metric: 'totalRuns',
    target: 25,
  },
  {
    id: 'score-1000',
    title: 'Bắt đầu ghi dấu',
    description: 'Đạt 1.000 điểm trong một lượt.',
    category: 'combat',
    metric: 'highestScore',
    target: 1_000,
  },
  {
    id: 'score-10000',
    title: 'Cỗ máy hủy diệt',
    description: 'Đạt 10.000 điểm trong một lượt.',
    category: 'combat',
    metric: 'highestScore',
    target: 10_000,
  },
  {
    id: 'wave-5',
    title: 'Kẻ canh cửa',
    description: 'Sống sót đến đợt 5.',
    category: 'survival',
    metric: 'highestWave',
    target: 5,
  },
  {
    id: 'wave-10',
    title: 'Đối mặt ác mộng',
    description: 'Sống sót đến đợt 10.',
    category: 'boss',
    metric: 'highestWave',
    target: 10,
  },
  {
    id: 'wave-25',
    title: 'Bất khuất',
    description: 'Sống sót đến đợt 25.',
    category: 'survival',
    metric: 'highestWave',
    target: 25,
  },
  {
    id: 'wave-50',
    title: 'Bình minh không đến',
    description: 'Sống sót đến đợt 50.',
    category: 'survival',
    metric: 'highestWave',
    target: 50,
  },
  {
    id: 'kills-100-run',
    title: 'Không còn đường lui',
    description: 'Hạ 100 kẻ địch trong một lượt.',
    category: 'combat',
    metric: 'highestKills',
    target: 100,
  },
  {
    id: 'kills-1000-career',
    title: 'Thợ săn đột biến',
    description: 'Hạ tổng cộng 1.000 kẻ địch.',
    category: 'combat',
    metric: 'totalKills',
    target: 1_000,
  },
  {
    id: 'kills-10000-career',
    title: 'Tận thế một người',
    description: 'Hạ tổng cộng 10.000 kẻ địch.',
    category: 'combat',
    metric: 'totalKills',
    target: 10_000,
  },
  {
    id: 'first-boss',
    title: 'Kẻ giết quái vật',
    description: 'Hạ boss đầu tiên.',
    category: 'boss',
    metric: 'totalBossKills',
    target: 1,
  },
  {
    id: 'boss-10',
    title: 'Thợ săn ác mộng',
    description: 'Hạ tổng cộng 10 boss.',
    category: 'boss',
    metric: 'totalBossKills',
    target: 10,
  },
  {
    id: 'elite-50',
    title: 'Phá vỡ hàng ngũ',
    description: 'Hạ tổng cộng 50 quái tinh anh.',
    category: 'combat',
    metric: 'totalEliteKills',
    target: 50,
  },
  {
    id: 'chests-25',
    title: 'Không bỏ sót chiến lợi phẩm',
    description: 'Mở tổng cộng 25 rương.',
    category: 'exploration',
    metric: 'totalChestsOpened',
    target: 25,
  },
  {
    id: 'first-fusion',
    title: 'Phản ứng dây chuyền',
    description: 'Tạo kỹ năng dung hợp đầu tiên.',
    category: 'mastery',
    metric: 'totalFusionsCreated',
    target: 1,
  },
  {
    id: 'fusion-tier-3',
    title: 'Năng lượng vượt giới hạn',
    description: 'Đạt kỹ năng dung hợp bậc 3.',
    category: 'mastery',
    metric: 'highestFusionTier',
    target: 3,
  },
  {
    id: 'survive-10-minutes',
    title: 'Mười phút địa ngục',
    description: 'Sống sót 10 phút trong một lượt.',
    category: 'survival',
    metric: 'highestSurvivalSeconds',
    target: 600,
  },
  {
    id: 'level-25',
    title: 'Tiến hóa hoàn chỉnh',
    description: 'Đạt cấp 25 trong một lượt.',
    category: 'mastery',
    metric: 'highestLevel',
    target: 25,
  },
]
