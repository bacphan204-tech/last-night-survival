import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

const PROFILE_BINDING_STORAGE_KEY =
  'last-night-survival:player-profile-binding:v1'
const PROFILE_SYNC_STORAGE_KEY =
  'last-night-survival:player-profile-sync:v1'
const RECOVERY_CODE_STORAGE_KEY =
  'last-night-survival:player-recovery-code:v1'
const DISPLAY_NAME_STORAGE_KEY =
  'last-night-survival:online-display-name:v1'

const STORAGE_PREFIX = 'last-night-survival:'
const MAXIMUM_PROGRESS_BYTES = 480_000
const SYNC_DEBOUNCE_MILLISECONDS = 850

const EXCLUDED_PROGRESS_KEYS = new Set([
  PROFILE_BINDING_STORAGE_KEY,
  PROFILE_SYNC_STORAGE_KEY,
  RECOVERY_CODE_STORAGE_KEY,
  DISPLAY_NAME_STORAGE_KEY,
  'last-night-survival:pending-online-runs:v1',
])

export type PlayerProfile = {
  id: string
  ownerId: string
  displayName: string
  createdAt: string
  updatedAt: string
  progressUpdatedAt: string
  progressRevision: number
}

export type PlayerProfileBootstrapStatus =
  | 'ready'
  | 'ready-offline'
  | 'unclaimed'
  | 'orphaned'
  | 'error'

export type PlayerProfileBootstrapResult = {
  status: PlayerProfileBootstrapStatus
  profile: PlayerProfile | null
  deviceId: string
  recoveryCode: string
  message: string
}

export type PlayerProfileClaimStatus =
  | 'created'
  | 'existing'
  | 'name-taken'
  | 'invalid-name'
  | 'offline'
  | 'error'

export type PlayerProfileClaimResult = {
  status: PlayerProfileClaimStatus
  profile: PlayerProfile | null
  deviceId: string
  recoveryCode: string
  message: string
}

export type PlayerProfileResetStatus =
  | 'deleted'
  | 'unclaimed'
  | 'offline'
  | 'error'

export type PlayerProfileResetResult = {
  status: PlayerProfileResetStatus
  deletedOnlineRuns: number
  message: string
}

type StoredProfileBinding = {
  profileId: string
  ownerId: string
  displayName: string
  createdAt: string
  updatedAt: string
  progressUpdatedAt: string
  progressRevision: number
}

type ProgressSyncMetadata = {
  profileId: string
  dirtyAt: number
  lastSyncedAt: number
  lastCloudRevision: number
}

type StoredRecoveryCode = {
  profileId: string
  code: string
  acknowledged: boolean
  savedAt: number
}

type StoredProgressValue = {
  kind: 'json' | 'text'
  value: unknown
}

type CloudProgressEnvelope = {
  schemaVersion: 1
  savedAt: number
  values: Record<string, StoredProgressValue>
}

type RpcProfilePayload = {
  id?: unknown
  owner_id?: unknown
  display_name?: unknown
  created_at?: unknown
  updated_at?: unknown
  progress_updated_at?: unknown
  progress_revision?: unknown
  progress?: unknown
}

let activeProfileSystem: PlayerProfileSystem | null = null
let isApplyingCloudProgress = false

function safeStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? null
      : globalThis.localStorage
  } catch {
    return null
  }
}

function safeInteger(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizePlayerName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)
}

function isValidPlayerName(value: string) {
  return /^[a-zA-Z0-9_-]{3,24}$/.test(value)
}

function parseObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function createEmptySyncMetadata(): ProgressSyncMetadata {
  return {
    profileId: '',
    dirtyAt: 0,
    lastSyncedAt: 0,
    lastCloudRevision: 0,
  }
}

export function notifyCloudProgressChanged() {
  if (isApplyingCloudProgress) {
    return
  }

  activeProfileSystem?.markProgressDirty()
}

export class PlayerProfileSystem {
  private initializationPromise: Promise<User | null> | null = null
  private currentUser: User | null = null
  private currentProfile: PlayerProfile | null = null
  private syncTimer: number | null = null
  private syncPromise: Promise<boolean> | null = null
  private lastErrorMessage = ''

  constructor() {
    activeProfileSystem = this
  }

  isConfigured() {
    return isSupabaseConfigured && supabase !== null
  }

  getCurrentProfile() {
    return this.currentProfile ? { ...this.currentProfile } : null
  }

  getDeviceId() {
    return this.currentUser?.id ?? ''
  }

  getLastErrorMessage() {
    return this.lastErrorMessage
  }

  getRecoveryCode() {
    const stored = this.loadRecoveryCode()
    return stored?.code ?? ''
  }

  isRecoveryCodeAcknowledged() {
    return this.loadRecoveryCode()?.acknowledged === true
  }

  acknowledgeRecoveryCode() {
    const stored = this.loadRecoveryCode()

    if (!stored) {
      return
    }

    this.persistRecoveryCode({ ...stored, acknowledged: true })
  }

  async initialize(): Promise<PlayerProfileBootstrapResult> {
    const cachedBinding = this.loadBinding()

    if (!this.isConfigured() || !supabase) {
      if (cachedBinding) {
        this.currentProfile = this.profileFromBinding(cachedBinding)
        return {
          status: 'ready-offline',
          profile: this.getCurrentProfile(),
          deviceId: cachedBinding.ownerId,
          recoveryCode: this.getRecoveryCode(),
          message:
            'Đang dùng tiến trình cục bộ. Khi có mạng, hệ thống sẽ đồng bộ lại.',
        }
      }

      return {
        status: 'error',
        profile: null,
        deviceId: '',
        recoveryCode: '',
        message: 'Supabase chưa được cấu hình nên chưa thể tạo hồ sơ duy nhất.',
      }
    }

    try {
      const user = await this.initializeAuthenticatedUser()

      if (!user) {
        if (cachedBinding) {
          this.currentProfile = this.profileFromBinding(cachedBinding)
          return {
            status: 'ready-offline',
            profile: this.getCurrentProfile(),
            deviceId: cachedBinding.ownerId,
            recoveryCode: this.getRecoveryCode(),
            message:
              'Không thể kết nối máy chủ. Tiến trình cục bộ vẫn được giữ an toàn.',
          }
        }

        return {
          status: 'error',
          profile: null,
          deviceId: '',
          recoveryCode: '',
          message: this.lastErrorMessage || 'Không thể đăng nhập thiết bị.',
        }
      }

      const { data, error } = await supabase.rpc('get_my_player_profile_v1')

      if (error) {
        this.recordError('ĐỌC HỒ SƠ', error.message)

        if (cachedBinding) {
          this.currentProfile = this.profileFromBinding(cachedBinding)
          return {
            status: 'ready-offline',
            profile: this.getCurrentProfile(),
            deviceId: user.id,
            recoveryCode: this.getRecoveryCode(),
            message:
              'Máy chủ hồ sơ tạm thời không phản hồi. Game đang dùng bản lưu cục bộ.',
          }
        }

        return {
          status: 'error',
          profile: null,
          deviceId: user.id,
          recoveryCode: '',
          message:
            'Chưa cài SQL hồ sơ người chơi hoặc máy chủ đang gặp lỗi.',
        }
      }

      const response = parseObject(data)
      const status = safeString(response?.status)
      const rpcProfile = parseObject(response?.profile)

      if (status !== 'ok' || !rpcProfile) {
        if (cachedBinding) {
          return {
            status: 'orphaned',
            profile: this.profileFromBinding(cachedBinding),
            deviceId: user.id,
            recoveryCode: this.getRecoveryCode(),
            message:
              'Phiên đăng nhập cũ đã mất quyền sở hữu hồ sơ. Hãy liên hệ quản trị viên để chuyển hồ sơ sang mã thiết bị mới.',
          }
        }

        return {
          status: 'unclaimed',
          profile: null,
          deviceId: user.id,
          recoveryCode: '',
          message: 'Hãy đặt tên duy nhất để tạo hồ sơ người chơi.',
        }
      }

      const profile = this.sanitizeProfile(rpcProfile)

      if (!profile) {
        return {
          status: 'error',
          profile: null,
          deviceId: user.id,
          recoveryCode: '',
          message: 'Dữ liệu hồ sơ trả về không hợp lệ.',
        }
      }

      this.currentProfile = profile
      this.persistBinding(profile)
      this.persistDisplayName(profile.displayName)

      const cloudProgress = this.sanitizeProgressEnvelope(
        (rpcProfile as RpcProfilePayload).progress,
      )
      const metadata = this.loadSyncMetadata()
      const ownsSameLocalProfile = metadata.profileId === profile.id
      const hasUnsyncedLocalProgress =
        ownsSameLocalProfile && metadata.dirtyAt > metadata.lastSyncedAt

      if (hasUnsyncedLocalProgress) {
        await this.syncProgressNow()
      } else {
        this.applyCloudProgress(cloudProgress)
        this.persistSyncMetadata({
          profileId: profile.id,
          dirtyAt: 0,
          lastSyncedAt: Date.now(),
          lastCloudRevision: profile.progressRevision,
        })
      }

      this.installLifecycleSync()

      return {
        status: 'ready',
        profile: this.getCurrentProfile(),
        deviceId: user.id,
        recoveryCode: this.getRecoveryCode(),
        message: 'Hồ sơ và tiến trình đã được đồng bộ.',
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi không xác định.'
      this.recordError('KHỞI TẠO HỒ SƠ', message)

      if (cachedBinding) {
        this.currentProfile = this.profileFromBinding(cachedBinding)
        return {
          status: 'ready-offline',
          profile: this.getCurrentProfile(),
          deviceId: cachedBinding.ownerId,
          recoveryCode: this.getRecoveryCode(),
          message:
            'Không thể kết nối máy chủ. Game đang dùng tiến trình cục bộ.',
        }
      }

      return {
        status: 'error',
        profile: null,
        deviceId: this.getDeviceId(),
        recoveryCode: '',
        message,
      }
    }
  }

  async claimProfile(rawName: string): Promise<PlayerProfileClaimResult> {
    const displayName = normalizePlayerName(rawName)

    if (!isValidPlayerName(displayName)) {
      return {
        status: 'invalid-name',
        profile: null,
        deviceId: this.getDeviceId(),
        recoveryCode: '',
        message:
          'Tên phải có 3–24 ký tự và chỉ dùng chữ không dấu, số, gạch ngang hoặc gạch dưới.',
      }
    }

    if (!this.isConfigured() || !supabase || !navigator.onLine) {
      return {
        status: 'offline',
        profile: null,
        deviceId: this.getDeviceId(),
        recoveryCode: '',
        message: 'Cần có mạng để kiểm tra tên duy nhất và tạo hồ sơ.',
      }
    }

    const user = await this.initializeAuthenticatedUser()

    if (!user) {
      return {
        status: 'error',
        profile: null,
        deviceId: '',
        recoveryCode: '',
        message: this.lastErrorMessage || 'Không thể đăng nhập thiết bị.',
      }
    }

    const progress = this.captureLocalProgress()
    const { data, error } = await supabase.rpc('claim_player_profile_v1', {
      p_display_name: displayName,
      p_progress: progress,
    })

    if (error) {
      return {
        status: 'error',
        profile: null,
        deviceId: user.id,
        recoveryCode: '',
        message: this.recordError('TẠO HỒ SƠ', error.message),
      }
    }

    const response = parseObject(data)
    const status = safeString(response?.status)

    if (status === 'name_taken') {
      return {
        status: 'name-taken',
        profile: null,
        deviceId: user.id,
        recoveryCode: '',
        message:
          'Tên này đã tồn tại. Không thể tạo hồ sơ trùng tên trên trình duyệt mới.',
      }
    }

    if (status === 'invalid_name') {
      return {
        status: 'invalid-name',
        profile: null,
        deviceId: user.id,
        recoveryCode: '',
        message:
          'Tên không hợp lệ. Chỉ dùng chữ không dấu, số, gạch ngang hoặc gạch dưới.',
      }
    }

    const rpcProfile = parseObject(response?.profile)
    const profile = rpcProfile ? this.sanitizeProfile(rpcProfile) : null

    if (!profile || (status !== 'created' && status !== 'existing')) {
      return {
        status: 'error',
        profile: null,
        deviceId: user.id,
        recoveryCode: '',
        message: 'Máy chủ không trả về hồ sơ hợp lệ.',
      }
    }

    const recoveryCode = safeString(response?.recovery_code)
    this.currentProfile = profile
    this.persistBinding(profile)
    this.persistDisplayName(profile.displayName)
    this.persistSyncMetadata({
      profileId: profile.id,
      dirtyAt: 0,
      lastSyncedAt: Date.now(),
      lastCloudRevision: profile.progressRevision,
    })

    if (recoveryCode) {
      this.persistRecoveryCode({
        profileId: profile.id,
        code: recoveryCode,
        acknowledged: false,
        savedAt: Date.now(),
      })
    }

    this.installLifecycleSync()

    return {
      status: status === 'created' ? 'created' : 'existing',
      profile: this.getCurrentProfile(),
      deviceId: user.id,
      recoveryCode,
      message:
        status === 'created'
          ? 'Đã tạo hồ sơ duy nhất và chuyển tiến trình hiện tại lên Supabase.'
          : 'Trình duyệt này đã có hồ sơ. Tên được khóa theo hồ sơ hiện tại.',
    }
  }

  async resetProfileAndProgress(): Promise<PlayerProfileResetResult> {
    if (!this.isConfigured() || !supabase || !navigator.onLine) {
      return {
        status: 'offline',
        deletedOnlineRuns: 0,
        message:
          'Cần có mạng để xóa hồ sơ đám mây và toàn bộ tiến trình.',
      }
    }

    const user = await this.initializeAuthenticatedUser()

    if (!user) {
      return {
        status: 'error',
        deletedOnlineRuns: 0,
        message: this.lastErrorMessage || 'Không thể xác minh thiết bị.',
      }
    }

    const { data, error } = await supabase.rpc(
      'reset_my_player_profile_v1',
    )

    if (error) {
      return {
        status: 'error',
        deletedOnlineRuns: 0,
        message: this.recordError('ĐẶT LẠI HỒ SƠ', error.message),
      }
    }

    const response = parseObject(data)
    const status = safeString(response?.status)
    const deletedOnlineRuns = safeInteger(response?.deleted_online_runs)

    if (status !== 'deleted' && status !== 'unclaimed') {
      return {
        status: 'error',
        deletedOnlineRuns,
        message:
          safeString(response?.reason) ||
          'Máy chủ không xác nhận việc đặt lại hồ sơ.',
      }
    }

    if (this.syncTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.syncTimer)
      this.syncTimer = null
    }

    this.currentProfile = null
    this.syncPromise = null
    this.lastErrorMessage = ''
    this.clearAllLocalProgress()

    return {
      status: status === 'deleted' ? 'deleted' : 'unclaimed',
      deletedOnlineRuns,
      message:
        status === 'deleted'
          ? 'Đã xóa hồ sơ, tên người chơi và toàn bộ tiến trình.'
          : 'Thiết bị chưa có hồ sơ đám mây. Dữ liệu cục bộ đã được xóa.',
    }
  }

  markProgressDirty() {
    const profile = this.currentProfile

    if (!profile) {
      return
    }

    const metadata = this.loadSyncMetadata()
    this.persistSyncMetadata({
      profileId: profile.id,
      dirtyAt: Date.now(),
      lastSyncedAt:
        metadata.profileId === profile.id ? metadata.lastSyncedAt : 0,
      lastCloudRevision:
        metadata.profileId === profile.id
          ? metadata.lastCloudRevision
          : profile.progressRevision,
    })
    this.scheduleProgressSync()
  }

  async syncProgressNow(): Promise<boolean> {
    if (this.syncPromise) {
      return this.syncPromise
    }

    this.syncPromise = this.performProgressSync()

    try {
      return await this.syncPromise
    } finally {
      this.syncPromise = null
    }
  }

  private async performProgressSync() {
    const profile = this.currentProfile

    if (
      !profile ||
      !this.isConfigured() ||
      !supabase ||
      !navigator.onLine
    ) {
      return false
    }

    const user = await this.initializeAuthenticatedUser()

    if (!user || user.id !== profile.ownerId) {
      return false
    }

    const metadataBefore = this.loadSyncMetadata()
    const syncStartedAt = Date.now()
    const progress = this.captureLocalProgress()
    const serialized = JSON.stringify(progress)

    if (new TextEncoder().encode(serialized).byteLength > MAXIMUM_PROGRESS_BYTES) {
      this.recordError(
        'ĐỒNG BỘ TIẾN TRÌNH',
        'Dữ liệu cục bộ vượt quá giới hạn 480 KB.',
      )
      return false
    }

    const { data, error } = await supabase.rpc('sync_player_progress_v1', {
      p_profile_id: profile.id,
      p_progress: progress,
      p_client_updated_at: syncStartedAt,
    })

    if (error) {
      this.recordError('ĐỒNG BỘ TIẾN TRÌNH', error.message)
      return false
    }

    const response = parseObject(data)

    if (safeString(response?.status) !== 'synced') {
      this.recordError(
        'ĐỒNG BỘ TIẾN TRÌNH',
        safeString(response?.reason) || 'Máy chủ từ chối dữ liệu.',
      )
      return false
    }

    const rpcProfile = parseObject(response?.profile)
    const syncedProfile = rpcProfile
      ? this.sanitizeProfile(rpcProfile)
      : null

    if (syncedProfile) {
      this.currentProfile = syncedProfile
      this.persistBinding(syncedProfile)
    }

    const metadataAfter = this.loadSyncMetadata()
    const changedDuringSync =
      metadataAfter.profileId === profile.id &&
      metadataAfter.dirtyAt > metadataBefore.dirtyAt

    this.persistSyncMetadata({
      profileId: profile.id,
      dirtyAt: changedDuringSync ? metadataAfter.dirtyAt : 0,
      lastSyncedAt: Date.now(),
      lastCloudRevision:
        syncedProfile?.progressRevision ??
        Math.max(metadataBefore.lastCloudRevision + 1, 1),
    })

    if (changedDuringSync) {
      this.scheduleProgressSync()
    }

    return true
  }

  private scheduleProgressSync() {
    if (this.syncTimer !== null || typeof window === 'undefined') {
      return
    }

    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null
      void this.syncProgressNow()
    }, SYNC_DEBOUNCE_MILLISECONDS)
  }

  private installLifecycleSync() {
    if (typeof window === 'undefined') {
      return
    }

    const marker = '__lastNightProfileSyncInstalled'
    const host = window as typeof window & Record<string, unknown>

    if (host[marker] === true) {
      return
    }

    host[marker] = true
    window.addEventListener('online', () => {
      void activeProfileSystem?.syncProgressNow()
    })
    window.addEventListener('pagehide', () => {
      void activeProfileSystem?.syncProgressNow()
    })
  }

  private async initializeAuthenticatedUser() {
    if (!this.isConfigured() || !supabase) {
      return null
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.resolveAuthenticatedUser()
    }

    const user = await this.initializationPromise

    if (!user) {
      this.initializationPromise = null
    }

    this.currentUser = user
    return user
  }

  private async resolveAuthenticatedUser() {
    if (!supabase) {
      return null
    }

    const sessionResult = await supabase.auth.getSession()

    if (sessionResult.error) {
      this.recordError('ĐỌC PHIÊN', sessionResult.error.message)
    }

    const existingUser = sessionResult.data.session?.user

    if (existingUser) {
      return existingUser
    }

    const signInResult = await supabase.auth.signInAnonymously()

    if (signInResult.error) {
      this.recordError('ĐĂNG NHẬP ẨN DANH', signInResult.error.message)
      return null
    }

    return signInResult.data.user
  }

  private clearAllLocalProgress() {
    const storage = safeStorage()

    if (!storage) {
      return
    }

    const removableKeys: string[] = []

    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index)

      if (key?.startsWith(STORAGE_PREFIX)) {
        removableKeys.push(key)
      }
    }

    for (const key of removableKeys) {
      storage.removeItem(key)
    }

    try {
      if (typeof globalThis.sessionStorage !== 'undefined') {
        const sessionKeys: string[] = []

        for (
          let index = 0;
          index < globalThis.sessionStorage.length;
          index++
        ) {
          const key = globalThis.sessionStorage.key(index)

          if (key?.startsWith(STORAGE_PREFIX)) {
            sessionKeys.push(key)
          }
        }

        for (const key of sessionKeys) {
          globalThis.sessionStorage.removeItem(key)
        }
      }
    } catch {
      // sessionStorage có thể bị chặn; localStorage đã được xóa trước đó.
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('last-night-survival:progress-hydrated'),
      )
    }
  }

  private captureLocalProgress(): CloudProgressEnvelope {
    const storage = safeStorage()
    const values: Record<string, StoredProgressValue> = {}

    if (storage) {
      const keys: string[] = []

      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)

        if (
          key &&
          key.startsWith(STORAGE_PREFIX) &&
          !EXCLUDED_PROGRESS_KEYS.has(key)
        ) {
          keys.push(key)
        }
      }

      keys.sort()

      for (const key of keys) {
        const rawValue = storage.getItem(key)

        if (rawValue === null) {
          continue
        }

        try {
          values[key] = { kind: 'json', value: JSON.parse(rawValue) }
        } catch {
          values[key] = { kind: 'text', value: rawValue }
        }
      }
    }

    return {
      schemaVersion: 1,
      savedAt: Date.now(),
      values,
    }
  }

  private applyCloudProgress(progress: CloudProgressEnvelope) {
    const storage = safeStorage()

    if (!storage) {
      return
    }

    isApplyingCloudProgress = true

    try {
      const removableKeys: string[] = []

      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)

        if (
          key &&
          key.startsWith(STORAGE_PREFIX) &&
          !EXCLUDED_PROGRESS_KEYS.has(key)
        ) {
          removableKeys.push(key)
        }
      }

      for (const key of removableKeys) {
        storage.removeItem(key)
      }

      for (const [key, storedValue] of Object.entries(progress.values)) {
        if (
          !key.startsWith(STORAGE_PREFIX) ||
          EXCLUDED_PROGRESS_KEYS.has(key)
        ) {
          continue
        }

        const serialized =
          storedValue.kind === 'json'
            ? JSON.stringify(storedValue.value)
            : safeString(storedValue.value)
        storage.setItem(key, serialized)
      }
    } finally {
      isApplyingCloudProgress = false
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('last-night-survival:progress-hydrated'),
      )
    }
  }

  private sanitizeProgressEnvelope(value: unknown): CloudProgressEnvelope {
    const source = parseObject(value)
    const valuesSource = parseObject(source?.values)
    const values: Record<string, StoredProgressValue> = {}

    if (valuesSource) {
      for (const [key, rawStoredValue] of Object.entries(valuesSource)) {
        if (
          !key.startsWith(STORAGE_PREFIX) ||
          EXCLUDED_PROGRESS_KEYS.has(key)
        ) {
          continue
        }

        const storedValue = parseObject(rawStoredValue)
        const kind = safeString(storedValue?.kind)

        if (kind === 'json') {
          values[key] = { kind: 'json', value: storedValue?.value }
        } else if (kind === 'text') {
          values[key] = {
            kind: 'text',
            value: safeString(storedValue?.value),
          }
        }
      }
    }

    return {
      schemaVersion: 1,
      savedAt: safeInteger(source?.savedAt),
      values,
    }
  }

  private sanitizeProfile(value: Record<string, unknown>): PlayerProfile | null {
    const payload = value as RpcProfilePayload
    const id = safeString(payload.id)
    const ownerId = safeString(payload.owner_id)
    const displayName = safeString(payload.display_name)

    if (!id || !ownerId || !isValidPlayerName(displayName)) {
      return null
    }

    return {
      id,
      ownerId,
      displayName,
      createdAt: safeString(payload.created_at),
      updatedAt: safeString(payload.updated_at),
      progressUpdatedAt: safeString(payload.progress_updated_at),
      progressRevision: safeInteger(payload.progress_revision),
    }
  }

  private persistDisplayName(displayName: string) {
    const storage = safeStorage()

    try {
      storage?.setItem(DISPLAY_NAME_STORAGE_KEY, displayName)
    } catch {
      // Phiên hiện tại vẫn giữ tên trong hồ sơ RAM.
    }
  }

  private loadBinding(): StoredProfileBinding | null {
    const storage = safeStorage()

    try {
      const raw = storage?.getItem(PROFILE_BINDING_STORAGE_KEY)

      if (!raw) {
        return null
      }

      const value = JSON.parse(raw) as Partial<StoredProfileBinding>

      if (
        typeof value.profileId !== 'string' ||
        typeof value.ownerId !== 'string' ||
        typeof value.displayName !== 'string' ||
        !isValidPlayerName(value.displayName)
      ) {
        return null
      }

      return {
        profileId: value.profileId,
        ownerId: value.ownerId,
        displayName: value.displayName,
        createdAt: safeString(value.createdAt),
        updatedAt: safeString(value.updatedAt),
        progressUpdatedAt: safeString(value.progressUpdatedAt),
        progressRevision: safeInteger(value.progressRevision),
      }
    } catch {
      return null
    }
  }

  private persistBinding(profile: PlayerProfile) {
    const storage = safeStorage()
    const binding: StoredProfileBinding = {
      profileId: profile.id,
      ownerId: profile.ownerId,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      progressUpdatedAt: profile.progressUpdatedAt,
      progressRevision: profile.progressRevision,
    }

    try {
      storage?.setItem(PROFILE_BINDING_STORAGE_KEY, JSON.stringify(binding))
    } catch {
      // Hồ sơ vẫn tồn tại trên Supabase.
    }
  }

  private profileFromBinding(binding: StoredProfileBinding): PlayerProfile {
    return {
      id: binding.profileId,
      ownerId: binding.ownerId,
      displayName: binding.displayName,
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
      progressUpdatedAt: binding.progressUpdatedAt,
      progressRevision: binding.progressRevision,
    }
  }

  private loadSyncMetadata(): ProgressSyncMetadata {
    const storage = safeStorage()

    try {
      const raw = storage?.getItem(PROFILE_SYNC_STORAGE_KEY)

      if (!raw) {
        return createEmptySyncMetadata()
      }

      const value = JSON.parse(raw) as Partial<ProgressSyncMetadata>
      return {
        profileId: safeString(value.profileId),
        dirtyAt: safeInteger(value.dirtyAt),
        lastSyncedAt: safeInteger(value.lastSyncedAt),
        lastCloudRevision: safeInteger(value.lastCloudRevision),
      }
    } catch {
      return createEmptySyncMetadata()
    }
  }

  private persistSyncMetadata(metadata: ProgressSyncMetadata) {
    const storage = safeStorage()

    try {
      storage?.setItem(PROFILE_SYNC_STORAGE_KEY, JSON.stringify(metadata))
    } catch {
      // Không có localStorage thì tiến trình vẫn tồn tại trong phiên hiện tại.
    }
  }

  private loadRecoveryCode(): StoredRecoveryCode | null {
    const storage = safeStorage()

    try {
      const raw = storage?.getItem(RECOVERY_CODE_STORAGE_KEY)

      if (!raw) {
        return null
      }

      const value = JSON.parse(raw) as Partial<StoredRecoveryCode>

      if (
        typeof value.profileId !== 'string' ||
        typeof value.code !== 'string' ||
        value.code.length < 8
      ) {
        return null
      }

      return {
        profileId: value.profileId,
        code: value.code,
        acknowledged: value.acknowledged === true,
        savedAt: safeInteger(value.savedAt),
      }
    } catch {
      return null
    }
  }

  private persistRecoveryCode(value: StoredRecoveryCode) {
    const storage = safeStorage()

    try {
      storage?.setItem(RECOVERY_CODE_STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Người chơi vẫn nhìn thấy mã trong phiên hiện tại.
    }
  }

  private recordError(stage: string, message: string) {
    this.lastErrorMessage = `${stage}: ${message}`
    console.error(`[PlayerProfile] ${this.lastErrorMessage}`)
    return this.lastErrorMessage
  }
}
