export type GameSettings = {
  screenShakeEnabled: boolean
  autoPauseEnabled: boolean
  musicEnabled: boolean
  sfxEnabled: boolean
  musicVolume: number
  sfxVolume: number
}

const STORAGE_KEY = 'last-night-survival-settings-v1'

const MUSIC_LEVELS = [0, 0.25, 0.45, 0.65, 0.85, 1] as const
const SFX_LEVELS = [0, 0.3, 0.5, 0.7, 0.85, 1] as const

const DEFAULT_SETTINGS: GameSettings = {
  screenShakeEnabled: true,
  autoPauseEnabled: true,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.5,
}

export class GameSettingsSystem {
  private settings: GameSettings = { ...DEFAULT_SETTINGS }

  constructor() {
    this.load()
  }

  getSettings(): Readonly<GameSettings> {
    return this.settings
  }

  isScreenShakeEnabled() {
    return this.settings.screenShakeEnabled
  }

  isAutoPauseEnabled() {
    return this.settings.autoPauseEnabled
  }

  isMusicEnabled() {
    return this.settings.musicEnabled && this.settings.musicVolume > 0
  }

  isSfxEnabled() {
    return this.settings.sfxEnabled && this.settings.sfxVolume > 0
  }

  getMusicVolume() {
    return this.isMusicEnabled() ? this.settings.musicVolume : 0
  }

  getSfxVolume() {
    return this.isSfxEnabled() ? this.settings.sfxVolume : 0
  }

  cycleMusicVolume() {
    const current = this.isMusicEnabled() ? this.settings.musicVolume : 0
    const next = this.getNextLevel(current, MUSIC_LEVELS)

    this.settings.musicVolume = next
    this.settings.musicEnabled = next > 0
    this.save()

    return next
  }

  cycleSfxVolume() {
    const current = this.isSfxEnabled() ? this.settings.sfxVolume : 0
    const next = this.getNextLevel(current, SFX_LEVELS)

    this.settings.sfxVolume = next
    this.settings.sfxEnabled = next > 0
    this.save()

    return next
  }

  toggleScreenShake() {
    this.settings.screenShakeEnabled =
      !this.settings.screenShakeEnabled
    this.save()
    return this.settings.screenShakeEnabled
  }

  toggleAutoPause() {
    this.settings.autoPauseEnabled =
      !this.settings.autoPauseEnabled
    this.save()
    return this.settings.autoPauseEnabled
  }

  // Giữ lại để không làm hỏng những đoạn code cũ đang gọi hai hàm này.
  toggleMusic() {
    this.settings.musicEnabled = !this.settings.musicEnabled

    if (this.settings.musicEnabled && this.settings.musicVolume <= 0) {
      this.settings.musicVolume = DEFAULT_SETTINGS.musicVolume
    }

    this.save()
    return this.settings.musicEnabled
  }

  toggleSfx() {
    this.settings.sfxEnabled = !this.settings.sfxEnabled

    if (this.settings.sfxEnabled && this.settings.sfxVolume <= 0) {
      this.settings.sfxVolume = DEFAULT_SETTINGS.sfxVolume
    }

    this.save()
    return this.settings.sfxEnabled
  }

  private getNextLevel(
    current: number,
    levels: readonly number[],
  ) {
    const currentIndex = levels.findIndex(
      (level) => Math.abs(level - current) < 0.001,
    )

    if (currentIndex >= 0) {
      return levels[(currentIndex + 1) % levels.length]
    }

    const firstHigherIndex = levels.findIndex((level) => level > current)
    return firstHigherIndex >= 0 ? levels[firstHigherIndex] : levels[0]
  }

  private load() {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY)

      if (!rawValue) {
        return
      }

      const parsed = JSON.parse(rawValue) as Partial<GameSettings>
      const musicEnabled =
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_SETTINGS.musicEnabled
      const sfxEnabled =
        typeof parsed.sfxEnabled === 'boolean'
          ? parsed.sfxEnabled
          : DEFAULT_SETTINGS.sfxEnabled

      const musicVolume = this.clampVolume(
        typeof parsed.musicVolume === 'number'
          ? parsed.musicVolume
          : DEFAULT_SETTINGS.musicVolume,
      )
      const sfxVolume = this.clampVolume(
        typeof parsed.sfxVolume === 'number'
          ? parsed.sfxVolume
          : DEFAULT_SETTINGS.sfxVolume,
      )

      this.settings = {
        screenShakeEnabled:
          typeof parsed.screenShakeEnabled === 'boolean'
            ? parsed.screenShakeEnabled
            : DEFAULT_SETTINGS.screenShakeEnabled,
        autoPauseEnabled:
          typeof parsed.autoPauseEnabled === 'boolean'
            ? parsed.autoPauseEnabled
            : DEFAULT_SETTINGS.autoPauseEnabled,
        musicEnabled,
        sfxEnabled,
        musicVolume: musicEnabled ? musicVolume : 0,
        sfxVolume: sfxEnabled ? sfxVolume : 0,
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  private clampVolume(value: number) {
    return Math.max(0, Math.min(1, value))
  }

  private save() {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.settings),
      )
    } catch {
      // localStorage bị chặn thì game vẫn dùng cấu hình trong lượt hiện tại.
    }
  }
}
