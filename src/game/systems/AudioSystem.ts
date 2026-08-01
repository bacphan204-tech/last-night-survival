import Phaser from 'phaser'
import type { ActivePlayerSkillId } from '../types/game'
import type { GameSettingsSystem } from './GameSettingsSystem'

const AUDIO_ROOT = '/audio/v7'

const KEYS = {
  shots: [
    'audio-player-shot-v7-1',
    'audio-player-shot-v7-2',
    'audio-player-shot-v7-3',
  ],
  damages: [
    'audio-player-damage-v7-1',
    'audio-player-damage-v7-2',
  ],
  kills: [
    'audio-enemy-kill-v7-1',
    'audio-enemy-kill-v7-2',
    'audio-enemy-kill-v7-3',
  ],
  bossKill: 'audio-boss-kill-v7',
  orbit: 'audio-skill-orbit-v7',
  lightning: 'audio-skill-lightning-v7',
  nova: 'audio-skill-nova-v7',
  ice: 'audio-skill-ice-v7',
  meteor: 'audio-skill-meteor-v7',
  gravity: 'audio-skill-gravity-v7',
  drone: 'audio-skill-drone-v7',
  laser: 'audio-skill-laser-v7',
  pickup: 'audio-pickup-v7',
  level: 'audio-level-up-v7',
  fusion: 'audio-fusion-v7',
  gameOver: 'audio-game-over-v7',
  waveStart: 'audio-wave-start-v7',
  miniBossIntro: 'audio-mini-boss-intro-v7',
  bossIntro: 'audio-boss-intro-v7',
} as const

export type SkillSoundId = ActivePlayerSkillId | 'fusion'

type AudioContextLike = {
  state: 'suspended' | 'running' | 'closed'
  resume: () => Promise<void>
}

type SkillSoundConfig = {
  key: string
  cooldown: number
  volume: number
  minimumRate: number
  maximumRate: number
  duckMultiplier: number | null
  duckDuration: number
}

export class AudioSystem {
  private readonly scene: Phaser.Scene
  private readonly settings: GameSettingsSystem

  private music: HTMLAudioElement | null = null
  private pausedByGame = false
  private destroyed = false
  private nextAllowedAt = new Map<string, number>()
  private musicRetryEvent: Phaser.Time.TimerEvent | null = null
  private duckReleaseEvent: Phaser.Time.TimerEvent | null = null
  private duckTween: Phaser.Tweens.Tween | null = null
  private musicDuckMultiplier = 1

  private readonly handleUnlockGesture = () => {
    void this.unlockAndStartMusic()
  }

  static preload(scene: Phaser.Scene) {
    KEYS.shots.forEach((key, index) => {
      scene.load.audio(key, `${AUDIO_ROOT}/shot-${index + 1}.wav`)
    })

    KEYS.damages.forEach((key, index) => {
      scene.load.audio(key, `${AUDIO_ROOT}/damage-${index + 1}.wav`)
    })

    KEYS.kills.forEach((key, index) => {
      scene.load.audio(key, `${AUDIO_ROOT}/enemy-kill-${index + 1}.wav`)
    })

    scene.load.audio(KEYS.bossKill, `${AUDIO_ROOT}/boss-kill.wav`)
    scene.load.audio(KEYS.orbit, `${AUDIO_ROOT}/skill-orbit.wav`)
    scene.load.audio(KEYS.lightning, `${AUDIO_ROOT}/skill-lightning.wav`)
    scene.load.audio(KEYS.nova, `${AUDIO_ROOT}/skill-nova.wav`)
    scene.load.audio(KEYS.ice, `${AUDIO_ROOT}/skill-ice.wav`)
    scene.load.audio(KEYS.meteor, `${AUDIO_ROOT}/skill-meteor.wav`)
    scene.load.audio(KEYS.gravity, `${AUDIO_ROOT}/skill-gravity.wav`)
    scene.load.audio(KEYS.drone, `${AUDIO_ROOT}/skill-drone.wav`)
    scene.load.audio(KEYS.laser, `${AUDIO_ROOT}/skill-laser.wav`)
    scene.load.audio(KEYS.pickup, `${AUDIO_ROOT}/pickup.wav`)
    scene.load.audio(KEYS.level, `${AUDIO_ROOT}/level-up.wav`)
    scene.load.audio(KEYS.fusion, `${AUDIO_ROOT}/fusion.wav`)
    scene.load.audio(KEYS.gameOver, `${AUDIO_ROOT}/game-over.wav`)
    scene.load.audio(KEYS.waveStart, `${AUDIO_ROOT}/wave-start.wav`)
    scene.load.audio(
      KEYS.miniBossIntro,
      `${AUDIO_ROOT}/mini-boss-intro.wav`,
    )
    scene.load.audio(KEYS.bossIntro, `${AUDIO_ROOT}/boss-intro.wav`)
  }

  constructor(scene: Phaser.Scene, settings: GameSettingsSystem) {
    this.scene = scene
    this.settings = settings

    this.createMusicElement()
    this.installUnlockListeners()
    this.scene.sound.on('unlocked', this.handleUnlockGesture)
    this.scene.events.once('shutdown', () => this.destroy())
  }

  startMusic() {
    if (
      this.destroyed ||
      this.pausedByGame ||
      !this.settings.isMusicEnabled()
    ) {
      return
    }

    void this.unlockAndStartMusic()
    this.ensureMusicRetry()
  }

  applySettings() {
    if (!this.settings.isMusicEnabled()) {
      this.pauseMusic()
      return
    }

    this.applyMusicVolume()
    this.startMusic()
  }

  pauseForGame() {
    this.pausedByGame = true
    this.pauseMusic()
  }

  resumeFromGame() {
    this.pausedByGame = false
    this.startMusic()
  }

  stopMusic() {
    this.pausedByGame = false
    this.musicRetryEvent?.remove(false)
    this.musicRetryEvent = null
    this.resetDucking()

    try {
      this.music?.pause()

      if (this.music) {
        this.music.currentTime = 0
      }
    } catch {
      // Trình duyệt có thể đã giải phóng phần tử âm thanh.
    }
  }

  playShot(count = 1) {
    this.play(
      this.randomKey(KEYS.shots),
      'shot',
      58,
      0.22 + Math.min(0.05, Math.max(0, count - 1) * 0.01),
      Phaser.Math.FloatBetween(0.975, 1.035),
    )
  }

  playPlayerDamage(lethal = false) {
    if (lethal) {
      this.duckMusic(0.72, 520)
    }

    this.play(
      this.randomKey(KEYS.damages),
      'damage',
      lethal ? 0 : 115,
      lethal ? 0.64 : 0.48,
      lethal ? 0.9 : Phaser.Math.FloatBetween(0.98, 1.02),
    )
  }

  playEnemyKill(special = false) {
    if (special) {
      this.duckMusic(0.72, 700)
      this.play(KEYS.bossKill, 'boss-kill', 420, 0.72, 1)
      return
    }

    this.play(
      this.randomKey(KEYS.kills),
      'enemy-kill',
      62,
      0.18,
      Phaser.Math.FloatBetween(0.97, 1.035),
    )
  }

  playSkill(id: SkillSoundId) {
    if (id === 'fusion') {
      this.duckMusic(0.78, 650)
      this.play(KEYS.fusion, 'fusion', 520, 0.64, 1)
      return
    }

    const sound = this.getSkillSound(id)

    if (sound.duckMultiplier !== null) {
      this.duckMusic(sound.duckMultiplier, sound.duckDuration)
    }

    this.play(
      sound.key,
      `skill-${id}`,
      sound.cooldown,
      sound.volume,
      Phaser.Math.FloatBetween(sound.minimumRate, sound.maximumRate),
    )
  }

  playWaveStart(kind: 'normal' | 'mini-boss' | 'boss') {
    if (kind === 'boss') {
      this.duckMusic(0.72, 760)
      this.play(KEYS.bossIntro, 'wave-intro', 900, 0.74, 1)
      return
    }

    if (kind === 'mini-boss') {
      this.duckMusic(0.82, 480)
      this.play(KEYS.miniBossIntro, 'wave-intro', 650, 0.62, 1)
      return
    }

    this.play(KEYS.waveStart, 'wave-intro', 380, 0.34, 1)
  }

  playPickup() {
    this.play(KEYS.pickup, 'pickup', 100, 0.26, 1)
  }

  playLevelUp() {
    // Âm ngắn 0,4 giây; không hạ nhạc nền.
    this.play(KEYS.level, 'level-up', 360, 0.48, 1)
  }

  playGameOver() {
    this.duckMusic(0.58, 1000)
    this.play(KEYS.gameOver, 'game-over', 0, 0.66, 1)
  }

  private getSkillSound(id: ActivePlayerSkillId): SkillSoundConfig {
    switch (id) {
      case 'orbiting-blades':
        return {
          key: KEYS.orbit,
          cooldown: 230,
          volume: 0.30,
          minimumRate: 0.98,
          maximumRate: 1.035,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'chain-lightning':
        return {
          key: KEYS.lightning,
          cooldown: 190,
          volume: 0.40,
          minimumRate: 0.985,
          maximumRate: 1.025,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'plasma-nova':
        return {
          key: KEYS.nova,
          cooldown: 340,
          volume: 0.50,
          minimumRate: 0.99,
          maximumRate: 1.015,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'ice-lance':
        return {
          key: KEYS.ice,
          cooldown: 190,
          volume: 0.43,
          minimumRate: 0.985,
          maximumRate: 1.03,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'meteor-rain':
        return {
          key: KEYS.meteor,
          cooldown: 420,
          volume: 0.58,
          minimumRate: 0.99,
          maximumRate: 1.01,
          duckMultiplier: 0.88,
          duckDuration: 300,
        }

      case 'gravity-well':
        return {
          key: KEYS.gravity,
          cooldown: 390,
          volume: 0.49,
          minimumRate: 0.99,
          maximumRate: 1.01,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'combat-drone':
        return {
          key: KEYS.drone,
          cooldown: 270,
          volume: 0.24,
          minimumRate: 0.98,
          maximumRate: 1.04,
          duckMultiplier: null,
          duckDuration: 0,
        }

      case 'energy-laser':
        return {
          key: KEYS.laser,
          cooldown: 220,
          volume: 0.38,
          minimumRate: 0.99,
          maximumRate: 1.025,
          duckMultiplier: null,
          duckDuration: 0,
        }
    }
  }

  private play(
    key: string,
    channel: string,
    cooldown: number,
    baseVolume: number,
    rate: number,
  ) {
    if (this.destroyed || !this.settings.isSfxEnabled()) {
      return
    }

    const now = this.scene.time.now

    if (now < (this.nextAllowedAt.get(channel) ?? 0)) {
      return
    }

    this.nextAllowedAt.set(channel, now + cooldown)

    const volume = Phaser.Math.Clamp(
      baseVolume * this.settings.getSfxVolume() * 1.2,
      0,
      1,
    )

    if (volume <= 0) {
      return
    }

    void this.playWhenReady(key, volume, rate)
  }

  private async playWhenReady(
    key: string,
    volume: number,
    rate: number,
  ) {
    await this.resumeAudioContext()

    if (this.destroyed || !this.scene.sys.isActive()) {
      return
    }

    try {
      this.scene.sound.play(key, { volume, rate })
    } catch {
      // Lỗi âm thanh không được phép làm hỏng lượt chơi.
    }
  }

  private async unlockAndStartMusic() {
    await this.resumeAudioContext()

    if (
      this.destroyed ||
      this.pausedByGame ||
      !this.settings.isMusicEnabled() ||
      !this.scene.sys.isActive()
    ) {
      return
    }

    this.createMusicElement()
    this.applyMusicVolume()

    if (!this.music) {
      return
    }

    try {
      await this.music.play()
    } catch {
      // Trình duyệt sẽ cho phát ở thao tác chuột hoặc bàn phím kế tiếp.
      return
    }

    if (!this.music.paused) {
      this.musicRetryEvent?.remove(false)
      this.musicRetryEvent = null
    }
  }

  private createMusicElement() {
    if (this.music || typeof Audio === 'undefined') {
      return
    }

    const music = new Audio(`${AUDIO_ROOT}/night-drive-loop.mp3`)
    music.loop = true
    music.preload = 'auto'
    music.volume = this.getTargetMusicVolume()
    this.music = music
  }

  private getTargetMusicVolume() {
    return Phaser.Math.Clamp(
      this.settings.getMusicVolume() * 1.35 * this.musicDuckMultiplier,
      0,
      1,
    )
  }

  private applyMusicVolume() {
    if (!this.music) {
      return
    }

    this.music.volume = this.getTargetMusicVolume()
  }

  private duckMusic(multiplier: number, holdMs: number) {
    if (this.destroyed || !this.settings.isMusicEnabled()) {
      return
    }

    this.duckReleaseEvent?.remove(false)
    this.duckReleaseEvent = null
    this.duckTween?.stop()
    this.duckTween = null

    this.musicDuckMultiplier = Math.min(
      this.musicDuckMultiplier,
      Phaser.Math.Clamp(multiplier, 0.4, 1),
    )
    this.applyMusicVolume()

    this.duckReleaseEvent = this.scene.time.delayedCall(holdMs, () => {
      this.duckReleaseEvent = null
      const state = { value: this.musicDuckMultiplier }

      this.duckTween = this.scene.tweens.add({
        targets: state,
        value: 1,
        duration: 260,
        ease: 'Sine.Out',
        onUpdate: () => {
          this.musicDuckMultiplier = state.value
          this.applyMusicVolume()
        },
        onComplete: () => {
          this.musicDuckMultiplier = 1
          this.duckTween = null
          this.applyMusicVolume()
        },
      })
    })
  }

  private resetDucking() {
    this.duckReleaseEvent?.remove(false)
    this.duckReleaseEvent = null
    this.duckTween?.stop()
    this.duckTween = null
    this.musicDuckMultiplier = 1
  }

  private async resumeAudioContext() {
    const soundManager = this.scene.sound as unknown as {
      context?: AudioContextLike
    }
    const context = soundManager.context

    if (!context || context.state !== 'suspended') {
      return
    }

    try {
      await context.resume()
    } catch {
      // Trình duyệt sẽ cho phép ở thao tác người dùng kế tiếp.
    }
  }

  private ensureMusicRetry() {
    if (this.musicRetryEvent || this.destroyed) {
      return
    }

    this.musicRetryEvent = this.scene.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (
          this.destroyed ||
          this.pausedByGame ||
          !this.settings.isMusicEnabled()
        ) {
          return
        }

        void this.unlockAndStartMusic()
      },
    })
  }

  private pauseMusic() {
    try {
      this.music?.pause()
    } catch {
      // Trình duyệt có thể đã giải phóng phần tử âm thanh.
    }
  }

  private randomKey<T extends readonly string[]>(keys: T) {
    return keys[Phaser.Math.Between(0, keys.length - 1)]
  }

  private installUnlockListeners() {
    if (typeof window === 'undefined') {
      return
    }

    window.addEventListener('pointerdown', this.handleUnlockGesture, true)
    window.addEventListener('touchstart', this.handleUnlockGesture, true)
    window.addEventListener('keydown', this.handleUnlockGesture, true)
  }

  private removeUnlockListeners() {
    if (typeof window === 'undefined') {
      return
    }

    window.removeEventListener('pointerdown', this.handleUnlockGesture, true)
    window.removeEventListener('touchstart', this.handleUnlockGesture, true)
    window.removeEventListener('keydown', this.handleUnlockGesture, true)
  }

  private destroy() {
    if (this.destroyed) {
      return
    }

    this.destroyed = true
    this.musicRetryEvent?.remove(false)
    this.musicRetryEvent = null
    this.resetDucking()
    this.removeUnlockListeners()
    this.scene.sound.off('unlocked', this.handleUnlockGesture)

    try {
      if (this.music) {
        this.music.pause()
        this.music.removeAttribute('src')
        this.music.load()
      }
    } catch {
      // Scene đã đóng.
    }

    this.music = null
    this.nextAllowedAt.clear()
  }
}
