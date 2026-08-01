import type { User } from '@supabase/supabase-js'
import {
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase'
import type {
  OnlineLeaderboardEntry,
  OnlineLeaderboardSubmitResult,
  RunRecord,
} from '../types/game'

const DISPLAY_NAME_STORAGE_KEY =
  'last-night-survival:online-display-name:v1'
const PENDING_RUNS_STORAGE_KEY =
  'last-night-survival:pending-online-runs:v1'
const DEFAULT_LEADERBOARD_LIMIT = 10
const MAX_PENDING_RUNS = 20

type PendingOnlineRun = {
  record: RunRecord
  displayName: string
  queuedAt: number
}

export type PendingRunSyncResult = {
  attempted: number
  synced: number
  rejected: number
  remaining: number
}

type InsertRunResult = {
  success: boolean
  retryable: boolean
  rejected: boolean
  errorMessage: string
}

function createRandomDisplayName() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''

  for (let index = 0; index < 4; index++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }

  return `Survivor-${suffix}`
}

function normalizeDisplayName(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 24)

  return normalized.length >= 3 ? normalized : createRandomDisplayName()
}

export class OnlineLeaderboardSystem {
  private initializationPromise: Promise<User | null> | null = null
  private displayName = this.loadOrCreateDisplayName()
  private lastErrorMessage = ''

  isConfigured() {
    return isSupabaseConfigured && supabase !== null
  }

  getDisplayName() {
    return this.displayName
  }

  setDisplayName(value: string) {
    const displayName = normalizeDisplayName(value)
    this.displayName = displayName

    const storage = this.getStorage()

    if (storage) {
      try {
        storage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName)
      } catch {
        // Tên vẫn được giữ trong phiên hiện tại nếu localStorage bị chặn.
      }
    }

    return displayName
  }

  getLastErrorMessage() {
    return this.lastErrorMessage
  }

  getPendingRunCount() {
    return this.loadPendingRuns().length
  }

  private recordError(stage: string, message: string) {
    const fullMessage = `${stage}: ${message}`
    this.lastErrorMessage = fullMessage
    console.error(`[OnlineLeaderboard] ${fullMessage}`)
    return fullMessage
  }

  async initialize() {
    if (!this.isConfigured()) {
      return null
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.resolveAuthenticatedUser()
    }

    const user = await this.initializationPromise

    if (!user) {
      this.initializationPromise = null
    }

    return user
  }

  async submitRun(
    record: RunRecord,
  ): Promise<OnlineLeaderboardSubmitResult> {
    if (!this.isConfigured() || !supabase) {
      return {
        status: 'disabled',
        rank: null,
        bestScore: 0,
        displayName: this.displayName,
        records: [],
        errorMessage: '',
      }
    }

    try {
      if (!this.isBrowserOnline()) {
        this.queuePendingRun(record, this.displayName)
        return this.createQueuedErrorResult(
          'Thiết bị đang offline. Điểm đã được lưu để tự gửi lại.',
        )
      }

      const user = await this.initialize()

      if (!user) {
        this.queuePendingRun(record, this.displayName)
        return this.createQueuedErrorResult(
          this.lastErrorMessage || 'Không thể đăng nhập ẩn danh.',
        )
      }

      const insertResult = await this.insertRun(
        record,
        this.displayName,
        user,
      )

      if (!insertResult.success) {
        if (insertResult.retryable) {
          this.queuePendingRun(record, this.displayName)
          return this.createQueuedErrorResult(insertResult.errorMessage)
        }

        this.removePendingRun(record.id)
        return this.createErrorResult(insertResult.errorMessage)
      }

      this.removePendingRun(record.id)

      const [rankResponse, records] = await Promise.all([
        supabase.rpc('get_leaderboard_rank', {
          target_run_id: record.id,
        }),
        this.getTopRecords(DEFAULT_LEADERBOARD_LIMIT),
      ])

      if (rankResponse.error) {
        this.recordError(
          `TÍNH HẠNG [${rankResponse.error.code || 'không mã'}]`,
          rankResponse.error.message,
        )
      }

      const rankValue = rankResponse.data
      const parsedRank =
        typeof rankValue === 'number'
          ? rankValue
          : typeof rankValue === 'string'
            ? Number.parseInt(rankValue, 10)
            : null
      const rank =
        parsedRank !== null && Number.isFinite(parsedRank)
          ? Math.max(1, Math.round(parsedRank))
          : null

      return {
        status: 'success',
        rank,
        bestScore: records[0]?.score ?? record.score,
        displayName: this.displayName,
        records,
        errorMessage: rankResponse.error?.message ?? '',
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Lỗi không xác định khi gửi bảng điểm.'

      this.queuePendingRun(record, this.displayName)
      const detailedMessage = this.recordError('NGOẠI LỆ', message)
      return this.createQueuedErrorResult(detailedMessage)
    }
  }

  async flushPendingRuns(): Promise<PendingRunSyncResult> {
    const pendingRuns = this.loadPendingRuns()
    const initialCount = pendingRuns.length

    if (
      initialCount === 0 ||
      !this.isConfigured() ||
      !supabase ||
      !this.isBrowserOnline()
    ) {
      return {
        attempted: 0,
        synced: 0,
        rejected: 0,
        remaining: initialCount,
      }
    }

    const user = await this.initialize()

    if (!user) {
      return {
        attempted: 0,
        synced: 0,
        rejected: 0,
        remaining: initialCount,
      }
    }

    let attempted = 0
    let synced = 0
    let rejected = 0

    for (const pending of pendingRuns) {
      attempted += 1

      const result = await this.insertRun(
        pending.record,
        pending.displayName,
        user,
      )

      if (!result.success) {
        if (result.retryable) {
          break
        }

        this.removePendingRun(pending.record.id)
        rejected += 1
        continue
      }

      this.removePendingRun(pending.record.id)
      synced += 1
    }

    return {
      attempted,
      synced,
      rejected,
      remaining: this.getPendingRunCount(),
    }
  }

  async getTopRecords(limit = DEFAULT_LEADERBOARD_LIMIT) {
    if (!this.isConfigured() || !supabase) {
      return []
    }

    const safeLimit = Math.max(1, Math.min(50, Math.round(limit)))
    const { data, error } = await supabase
      .from('leaderboard_runs')
      .select(
        'run_id, display_name, score, wave, kills, player_level, survival_seconds, created_at',
      )
      .order('score', { ascending: false })
      .order('wave', { ascending: false })
      .order('kills', { ascending: false })
      .order('player_level', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(safeLimit)

    if (error) {
      this.recordError(
        `ĐỌC TOP [${error.code || 'không mã'}]`,
        error.message,
      )
      return []
    }

    return (data ?? [])
      .map((row: unknown) => this.sanitizeEntry(row))
      .filter(
        (entry: OnlineLeaderboardEntry | null): entry is OnlineLeaderboardEntry =>
          entry !== null,
      )
  }

  private async insertRun(
    record: RunRecord,
    displayName: string,
    _user: User,
  ): Promise<InsertRunResult> {
    if (!supabase) {
      return {
        success: false,
        retryable: true,
        rejected: false,
        errorMessage: 'Supabase chưa được cấu hình.',
      }
    }

    const { data, error } = await supabase.rpc(
      'submit_leaderboard_run_v2',
      {
        p_run_id: record.id,
        p_display_name: normalizeDisplayName(displayName),
        p_score: record.score,
        p_wave: record.wave,
        p_kills: record.kills,
        p_player_level: record.level,
        p_survival_seconds: record.survivalSeconds,
        p_client_created_at: record.createdAt,
        p_statistics: record.statistics,
      },
    )

    if (error) {
      const errorCode = error.code || ''
      const retryable = this.isRetryableSubmissionError(
        errorCode,
        error.message,
      )

      const normalizedErrorMessage = error.message.toLowerCase()
      const permanentMessage = normalizedErrorMessage.includes(
        'player_profile_required',
      )
        ? 'Cần tạo hoặc khôi phục hồ sơ người chơi trước khi gửi điểm.'
        : 'Máy chủ chưa cài đặt hoặc không cho phép hàm gửi điểm v2.'

      return {
        success: false,
        retryable,
        rejected: !retryable,
        errorMessage: this.recordError(
          `GỬI ĐIỂM AN TOÀN [${errorCode || 'không mã'}]`,
          retryable ? error.message : permanentMessage,
        ),
      }
    }

    const response =
      data && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : null
    const status =
      response && typeof response.status === 'string'
        ? response.status
        : ''

    if (status === 'inserted' || status === 'duplicate') {
      return {
        success: true,
        retryable: false,
        rejected: false,
        errorMessage: '',
      }
    }

    const reason =
      response && typeof response.reason === 'string'
        ? response.reason
        : 'invalid_response'

    return {
      success: false,
      retryable: false,
      rejected: true,
      errorMessage: this.recordError(
        'ĐIỂM BỊ TỪ CHỐI',
        this.getSubmissionRejectionMessage(reason),
      ),
    }
  }

  private isRetryableSubmissionError(code: string, message: string) {
    const permanentCodes = new Set([
      '42501',
      '42883',
      'PGRST202',
      'PGRST203',
    ])

    if (permanentCodes.has(code)) {
      return false
    }

    const normalizedMessage = message.toLowerCase()

    if (
      normalizedMessage.includes('submit_leaderboard_run_v2') &&
      (normalizedMessage.includes('not find') ||
        normalizedMessage.includes('does not exist'))
    ) {
      return false
    }

    if (
      normalizedMessage.includes('player_profile_required') ||
      normalizedMessage.includes('hồ sơ người chơi')
    ) {
      return false
    }

    return true
  }

  private getSubmissionRejectionMessage(reason: string) {
    const messages: Record<string, string> = {
      auth_required: 'Phiên đăng nhập ẩn danh không hợp lệ.',
      invalid_run_id: 'Mã lượt chơi không hợp lệ.',
      invalid_display_name: 'Tên người chơi không hợp lệ.',
      invalid_created_at: 'Thời gian tạo lượt chơi không hợp lệ.',
      invalid_numeric_range: 'Thông số lượt chơi vượt giới hạn an toàn.',
      invalid_statistics: 'Thống kê lượt chơi bị thiếu hoặc sai định dạng.',
      inconsistent_kills: 'Số quái hạ gục không khớp thống kê.',
      inconsistent_score: 'Tổng điểm không khớp nguồn điểm trong trận.',
      implausible_progress: 'Tiến độ trận đấu không hợp lý.',
      rate_limit_hour: 'Thiết bị đã gửi quá nhiều lượt trong một giờ.',
      rate_limit_day: 'Thiết bị đã gửi quá nhiều lượt trong một ngày.',
      run_id_owned_by_other_user: 'Mã lượt chơi đã thuộc về người chơi khác.',
      invalid_response: 'Máy chủ trả về kết quả không hợp lệ.',
    }

    return messages[reason] ?? `Lý do máy chủ: ${reason}`
  }

  private async resolveAuthenticatedUser() {
    if (!supabase) {
      return null
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      this.recordError('ĐỌC PHIÊN ĐĂNG NHẬP', sessionError.message)
    }

    if (session?.user) {
      return session.user
    }

    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: this.displayName,
          game: 'last-night-survival',
        },
      },
    })

    if (error) {
      this.recordError(
        `ĐĂNG NHẬP ẨN DANH [${error.status || 'không trạng thái'}]`,
        error.message,
      )
      return null
    }

    if (!data.user) {
      this.recordError(
        'ĐĂNG NHẬP ẨN DANH',
        'Supabase không trả về người dùng.',
      )
      return null
    }

    console.info(
      `[OnlineLeaderboard] Đăng nhập thành công: ${data.user.id}`,
    )
    return data.user
  }

  private createErrorResult(
    errorMessage: string,
  ): OnlineLeaderboardSubmitResult {
    return {
      status: 'error',
      rank: null,
      bestScore: 0,
      displayName: this.displayName,
      records: [],
      errorMessage,
    }
  }

  private createQueuedErrorResult(errorMessage: string) {
    const suffix = 'Điểm đã được xếp hàng để tự gửi lại khi có mạng.'
    const message = errorMessage.includes('xếp hàng')
      ? errorMessage
      : `${errorMessage} ${suffix}`

    return this.createErrorResult(message)
  }

  private queuePendingRun(record: RunRecord, displayName: string) {
    const pendingRuns = this.loadPendingRuns().filter(
      (pending) => pending.record.id !== record.id,
    )

    pendingRuns.push({
      record,
      displayName: normalizeDisplayName(displayName),
      queuedAt: Date.now(),
    })

    this.persistPendingRuns(pendingRuns.slice(-MAX_PENDING_RUNS))
  }

  private removePendingRun(runId: string) {
    const pendingRuns = this.loadPendingRuns()
    const filteredRuns = pendingRuns.filter(
      (pending) => pending.record.id !== runId,
    )

    if (filteredRuns.length !== pendingRuns.length) {
      this.persistPendingRuns(filteredRuns)
    }
  }

  private loadPendingRuns(): PendingOnlineRun[] {
    const storage = this.getStorage()

    if (!storage) {
      return []
    }

    try {
      const rawValue = storage.getItem(PENDING_RUNS_STORAGE_KEY)

      if (!rawValue) {
        return []
      }

      const parsedValue: unknown = JSON.parse(rawValue)

      if (!Array.isArray(parsedValue)) {
        return []
      }

      return parsedValue
        .map((value) => this.sanitizePendingRun(value))
        .filter((value): value is PendingOnlineRun => value !== null)
        .slice(-MAX_PENDING_RUNS)
    } catch {
      return []
    }
  }

  private persistPendingRuns(pendingRuns: PendingOnlineRun[]) {
    const storage = this.getStorage()

    if (!storage) {
      return
    }

    try {
      if (pendingRuns.length === 0) {
        storage.removeItem(PENDING_RUNS_STORAGE_KEY)
        return
      }

      storage.setItem(
        PENDING_RUNS_STORAGE_KEY,
        JSON.stringify(pendingRuns.slice(-MAX_PENDING_RUNS)),
      )
    } catch {
      // Không làm gián đoạn game nếu bộ nhớ trình duyệt bị chặn hoặc đầy.
    }
  }

  private sanitizePendingRun(value: unknown): PendingOnlineRun | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const pending = value as Record<string, unknown>
    const rawRecord = pending.record

    if (!rawRecord || typeof rawRecord !== 'object') {
      return null
    }

    const record = rawRecord as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id : ''
    const statistics = record.statistics

    if (!id || !statistics || typeof statistics !== 'object') {
      return null
    }

    const safeInteger = (input: unknown, minimum: number) => {
      const numeric = typeof input === 'number' ? input : Number(input)

      return Number.isFinite(numeric)
        ? Math.max(minimum, Math.round(numeric))
        : minimum
    }

    return {
      displayName:
        typeof pending.displayName === 'string'
          ? normalizeDisplayName(pending.displayName)
          : this.displayName,
      queuedAt: safeInteger(pending.queuedAt, 0),
      record: {
        id,
        createdAt: safeInteger(record.createdAt, 0),
        score: safeInteger(record.score, 0),
        wave: safeInteger(record.wave, 1),
        kills: safeInteger(record.kills, 0),
        level: safeInteger(record.level, 1),
        survivalSeconds: safeInteger(record.survivalSeconds, 0),
        statistics: statistics as RunRecord['statistics'],
      },
    }
  }

  private loadOrCreateDisplayName() {
    const storage = this.getStorage()

    if (storage) {
      try {
        const storedValue = storage.getItem(DISPLAY_NAME_STORAGE_KEY)

        if (storedValue) {
          return normalizeDisplayName(storedValue)
        }
      } catch {
        // Tiếp tục dùng tên tạm nếu trình duyệt chặn localStorage.
      }
    }

    const displayName = createRandomDisplayName()

    if (storage) {
      try {
        storage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName)
      } catch {
        // Tên vẫn hoạt động trong phiên hiện tại.
      }
    }

    return displayName
  }

  private getStorage(): Storage | null {
    try {
      return typeof globalThis.localStorage === 'undefined'
        ? null
        : globalThis.localStorage
    } catch {
      return null
    }
  }

  private isBrowserOnline() {
    try {
      return typeof navigator === 'undefined' || navigator.onLine
    } catch {
      return true
    }
  }

  private sanitizeEntry(value: unknown): OnlineLeaderboardEntry | null {
    if (!value || typeof value !== 'object') {
      return null
    }

    const row = value as Record<string, unknown>
    const runId = typeof row.run_id === 'string' ? row.run_id : ''
    const displayName =
      typeof row.display_name === 'string'
        ? normalizeDisplayName(row.display_name)
        : 'Survivor'
    const createdAt =
      typeof row.created_at === 'string' ? row.created_at : ''

    if (!runId || !createdAt) {
      return null
    }

    const safeNumber = (input: unknown, minimum: number) => {
      const numeric =
        typeof input === 'number'
          ? input
          : typeof input === 'string'
            ? Number(input)
            : Number.NaN

      return Number.isFinite(numeric)
        ? Math.max(minimum, Math.round(numeric))
        : minimum
    }

    return {
      runId,
      displayName,
      score: safeNumber(row.score, 0),
      wave: safeNumber(row.wave, 1),
      kills: safeNumber(row.kills, 0),
      level: safeNumber(row.player_level, 1),
      survivalSeconds: safeNumber(row.survival_seconds, 0),
      createdAt,
    }
  }
}
