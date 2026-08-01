import Phaser from 'phaser'

export class MobileControlSystem {
  private readonly scene: Phaser.Scene
  private readonly direction = new Phaser.Math.Vector2()
  private base: Phaser.GameObjects.Arc | null = null
  private knob: Phaser.GameObjects.Arc | null = null
  private hint: Phaser.GameObjects.Text | null = null
  private activePointerId: number | null = null
  private movementEnabled = true
  private created = false
  private readonly joystickRadius = 50

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    if (this.created || !this.shouldUseTouchControls()) {
      return
    }

    this.created = true

    const basePosition = this.getBasePosition()

    this.base = this.scene.add
      .circle(
        basePosition.x,
        basePosition.y,
        this.joystickRadius,
        0x0f172a,
        0.42,
      )
      .setStrokeStyle(3, 0x67e8f9, 0.38)
      .setScrollFactor(0)
      .setDepth(28600)

    this.knob = this.scene.add
      .circle(basePosition.x, basePosition.y, 22, 0x67e8f9, 0.58)
      .setStrokeStyle(2, 0xe0f2fe, 0.72)
      .setScrollFactor(0)
      .setDepth(28601)

    this.hint = this.scene.add
      .text(basePosition.x, basePosition.y + 67, 'KÉO ĐỂ DI CHUYỂN', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 0.8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(28601)

    this.scene.input.on('pointerdown', this.handlePointerDown, this)
    this.scene.input.on('pointermove', this.handlePointerMove, this)
    this.scene.input.on('pointerup', this.handlePointerUp, this)
    this.scene.input.on('gameout', this.release, this)

    this.scene.events.once('shutdown', this.destroy, this)
  }

  reset() {
    this.movementEnabled = true
    this.release()
    this.setVisible(true)
  }

  setMovementEnabled(enabled: boolean) {
    this.movementEnabled = enabled

    if (!enabled) {
      this.release()
    }

    this.setVisible(enabled)
  }

  getMovementVector() {
    return this.direction
  }

  isTouchControlEnabled() {
    return this.created
  }

  release() {
    this.activePointerId = null
    this.direction.set(0, 0)

    const basePosition = this.getBasePosition()
    this.knob?.setPosition(basePosition.x, basePosition.y)
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (
      !this.created ||
      !this.movementEnabled ||
      this.activePointerId !== null ||
      !this.isInsideActivationArea(pointer.x, pointer.y)
    ) {
      return
    }

    this.activePointerId = pointer.id
    this.updateDirection(pointer)
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (
      !this.movementEnabled ||
      this.activePointerId !== pointer.id ||
      !pointer.isDown
    ) {
      return
    }

    this.updateDirection(pointer)
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.activePointerId === pointer.id) {
      this.release()
    }
  }

  private updateDirection(pointer: Phaser.Input.Pointer) {
    const basePosition = this.getBasePosition()
    const deltaX = pointer.x - basePosition.x
    const deltaY = pointer.y - basePosition.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance <= 0.001) {
      this.direction.set(0, 0)
      this.knob?.setPosition(basePosition.x, basePosition.y)
      return
    }

    const clampedDistance = Math.min(this.joystickRadius, distance)
    const normalizedX = deltaX / distance
    const normalizedY = deltaY / distance
    const strength = clampedDistance / this.joystickRadius

    this.direction.set(normalizedX * strength, normalizedY * strength)
    this.knob?.setPosition(
      basePosition.x + normalizedX * clampedDistance,
      basePosition.y + normalizedY * clampedDistance,
    )
  }

  private isInsideActivationArea(x: number, y: number) {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const basePosition = this.getBasePosition()
    const distance = Phaser.Math.Distance.Between(
      x,
      y,
      basePosition.x,
      basePosition.y,
    )

    return (
      distance <= this.joystickRadius + 42 ||
      (x <= width * 0.48 && y >= height * 0.48)
    )
  }

  private getBasePosition() {
    return new Phaser.Math.Vector2(92, this.scene.scale.height - 88)
  }

  private setVisible(visible: boolean) {
    this.base?.setVisible(visible)
    this.knob?.setVisible(visible)
    this.hint?.setVisible(visible)
  }

  private shouldUseTouchControls() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false
    }

    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia?.('(pointer: coarse)').matches === true ||
      this.scene.sys.game.device.input.touch
    )
  }

  private destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown, this)
    this.scene.input.off('pointermove', this.handlePointerMove, this)
    this.scene.input.off('pointerup', this.handlePointerUp, this)
    this.scene.input.off('gameout', this.release, this)

    this.base?.destroy()
    this.knob?.destroy()
    this.hint?.destroy()

    this.base = null
    this.knob = null
    this.hint = null
    this.created = false
    this.release()
  }
}
