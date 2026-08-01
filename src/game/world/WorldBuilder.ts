import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/gameConfig'
import { PathfindingSystem } from '../systems/PathfindingSystem'
import type { ObstacleKind, ReservedArea, SpawnRegion } from '../types/game'

type LandmarkOptions = {
  textureKey: string
  x: number
  y: number
  reserveWidth: number
  reserveHeight: number
  collisionWidth: number
  collisionHeight: number
  originY?: number
  rotation?: number
  flipX?: boolean
  scale?: number
  tint?: number
}

export class WorldBuilder {
  private readonly worldWidth = GAME_CONFIG.world.width
  private readonly worldHeight = GAME_CONFIG.world.height
  private readonly scene: Phaser.Scene
  private readonly rng: Phaser.Math.RandomDataGenerator
  private readonly obstacles: Phaser.Physics.Arcade.StaticGroup
  private readonly pathfinding: PathfindingSystem
  private reservedAreas: ReservedArea[] = []

  constructor(
    scene: Phaser.Scene,
    rng: Phaser.Math.RandomDataGenerator,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    pathfinding: PathfindingSystem,
  ) {
    this.scene = scene
    this.rng = rng
    this.obstacles = obstacles
    this.pathfinding = pathfinding
  }

  build() {
    this.reservedAreas = []
    this.createWorldGround()
    this.createWorldLabels()
    this.createGroundDetails()
    this.reserveImportantAreas()
    this.createWorldObstacles()
  }

  private createWorldGround() {
    const ground = this.scene.add.graphics().setDepth(-1000)
    const halfWidth = this.worldWidth / 2
    const halfHeight = this.worldHeight / 2

    ground.fillStyle(0x060b12, 1)
    ground.fillRect(0, 0, this.worldWidth, this.worldHeight)

    // Bốn khu vực dùng nhiều lớp màu thay vì một mảng phẳng.
    ground.fillStyle(0x091813, 1)
    ground.fillRect(0, 0, halfWidth, halfHeight)
    ground.fillStyle(0x10151d, 1)
    ground.fillRect(halfWidth, 0, halfWidth, halfHeight)
    ground.fillStyle(0x17120f, 1)
    ground.fillRect(0, halfHeight, halfWidth, halfHeight)
    ground.fillStyle(0x150d18, 1)
    ground.fillRect(halfWidth, halfHeight, halfWidth, halfHeight)

    this.drawBiomePatches(ground)
    this.drawWorldGrid(ground)
    this.drawMainRoads(ground)

    ground.lineStyle(18, 0x263449, 1)
    ground.strokeRect(9, 9, this.worldWidth - 18, this.worldHeight - 18)
    ground.lineStyle(3, 0x67e8f9, 0.16)
    ground.strokeRect(24, 24, this.worldWidth - 48, this.worldHeight - 48)
  }

  private drawBiomePatches(ground: Phaser.GameObjects.Graphics) {
    const halfWidth = this.worldWidth / 2
    const halfHeight = this.worldHeight / 2

    for (let index = 0; index < 42; index++) {
      const x = this.rng.integerInRange(80, halfWidth - 80)
      const y = this.rng.integerInRange(80, halfHeight - 80)
      ground.fillStyle(index % 3 === 0 ? 0x10271e : 0x0d211a, 0.22)
      ground.fillEllipse(
        x,
        y,
        this.rng.integerInRange(120, 300),
        this.rng.integerInRange(70, 190),
      )
    }

    for (let index = 0; index < 34; index++) {
      const x = this.rng.integerInRange(halfWidth + 80, this.worldWidth - 80)
      const y = this.rng.integerInRange(80, halfHeight - 80)
      ground.fillStyle(index % 2 === 0 ? 0x1d242e : 0x151a22, 0.26)
      ground.fillRoundedRect(
        x,
        y,
        this.rng.integerInRange(90, 250),
        this.rng.integerInRange(45, 120),
        12,
      )
    }

    for (let index = 0; index < 35; index++) {
      const x = this.rng.integerInRange(80, halfWidth - 80)
      const y = this.rng.integerInRange(halfHeight + 80, this.worldHeight - 80)
      ground.fillStyle(index % 2 === 0 ? 0x241a13 : 0x1d1713, 0.23)
      ground.fillEllipse(
        x,
        y,
        this.rng.integerInRange(110, 280),
        this.rng.integerInRange(60, 160),
      )
    }

    for (let index = 0; index < 38; index++) {
      const x = this.rng.integerInRange(halfWidth + 80, this.worldWidth - 80)
      const y = this.rng.integerInRange(halfHeight + 80, this.worldHeight - 80)
      ground.fillStyle(index % 2 === 0 ? 0x23102c : 0x192018, 0.23)
      ground.fillEllipse(
        x,
        y,
        this.rng.integerInRange(100, 260),
        this.rng.integerInRange(65, 180),
      )
    }
  }

  private drawWorldGrid(ground: Phaser.GameObjects.Graphics) {
    ground.lineStyle(2, 0x334155, 0.12)

    for (let x = 0; x <= this.worldWidth; x += 200) {
      ground.lineBetween(x, 0, x, this.worldHeight)
    }

    for (let y = 0; y <= this.worldHeight; y += 200) {
      ground.lineBetween(0, y, this.worldWidth, y)
    }

    ground.lineStyle(1, 0x64748b, 0.045)

    for (let x = 0; x <= this.worldWidth; x += 100) {
      ground.lineBetween(x, 0, x, this.worldHeight)
    }

    for (let y = 0; y <= this.worldHeight; y += 100) {
      ground.lineBetween(0, y, this.worldWidth, y)
    }
  }

  private drawMainRoads(ground: Phaser.GameObjects.Graphics) {
    const roadY = this.worldHeight / 2
    const roadX = this.worldWidth / 2
    const horizontalHalfHeight = 128
    const verticalHalfWidth = 145

    ground.fillStyle(0x090e15, 1)
    ground.fillRect(0, roadY - horizontalHalfHeight, this.worldWidth, horizontalHalfHeight * 2)
    ground.fillRect(roadX - verticalHalfWidth, 0, verticalHalfWidth * 2, this.worldHeight)

    // Mép đường tối và lớp bụi tạo cảm giác dày hơn.
    ground.fillStyle(0x141b24, 0.75)
    ground.fillRect(0, roadY - horizontalHalfHeight, this.worldWidth, 13)
    ground.fillRect(0, roadY + horizontalHalfHeight - 13, this.worldWidth, 13)
    ground.fillRect(roadX - verticalHalfWidth, 0, 13, this.worldHeight)
    ground.fillRect(roadX + verticalHalfWidth - 13, 0, 13, this.worldHeight)

    ground.lineStyle(5, 0x475569, 0.52)
    ground.lineBetween(0, roadY - horizontalHalfHeight, this.worldWidth, roadY - horizontalHalfHeight)
    ground.lineBetween(0, roadY + horizontalHalfHeight, this.worldWidth, roadY + horizontalHalfHeight)
    ground.lineBetween(roadX - verticalHalfWidth, 0, roadX - verticalHalfWidth, this.worldHeight)
    ground.lineBetween(roadX + verticalHalfWidth, 0, roadX + verticalHalfWidth, this.worldHeight)

    ground.lineStyle(6, 0xfbbf24, 0.2)
    for (let x = 55; x < this.worldWidth; x += 170) {
      ground.lineBetween(x, roadY, x + 78, roadY)
    }
    for (let y = 55; y < this.worldHeight; y += 170) {
      ground.lineBetween(roadX, y, roadX, y + 78)
    }

    // Giao lộ trung tâm.
    ground.fillStyle(0x172554, 0.27)
    ground.fillCircle(roadX, roadY, 292)
    ground.lineStyle(5, 0x38bdf8, 0.28)
    ground.strokeCircle(roadX, roadY, 292)
    ground.lineStyle(2, 0x67e8f9, 0.14)
    ground.strokeCircle(roadX, roadY, 218)
    ground.strokeCircle(roadX, roadY, 150)
  }

  private createWorldLabels() {
    const quarterWidth = this.worldWidth * 0.25
    const topY = 245
    const bottomY = this.worldHeight - 245

    this.createAreaLabel(quarterWidth, topY, 'RỪNG CHẾT', 'KHU VỰC A-01', '#4ade80')
    this.createAreaLabel(this.worldWidth - quarterWidth, topY, 'NHÀ MÁY BỎ HOANG', 'KHU VỰC B-02', '#94a3b8')
    this.createAreaLabel(quarterWidth, bottomY, 'PHẾ TÍCH THÀNH PHỐ', 'KHU VỰC C-03', '#f59e0b')
    this.createAreaLabel(this.worldWidth - quarterWidth, bottomY, 'VÙNG LÂY NHIỄM', 'KHU VỰC D-04', '#c084fc')

    this.scene.add
      .text(this.worldWidth / 2, this.worldHeight / 2 - 162, 'TRẠM TRUNG TÂM', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#67e8f9',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.28)
      .setDepth(-50)
  }

  private createAreaLabel(
    x: number,
    y: number,
    title: string,
    subtitle: string,
    color: string,
  ) {
    this.scene.add
      .text(x, y, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color,
        letterSpacing: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0.12)
      .setDepth(-60)

    this.scene.add
      .text(x, y + 45, subtitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0.17)
      .setDepth(-60)
  }

  private createGroundDetails() {
    const details = this.scene.add.graphics().setDepth(-900)
    const halfWidth = this.worldWidth / 2
    const halfHeight = this.worldHeight / 2

    // Ít chấm vụn hơn bản cũ, nhưng lớn và có cụm rõ ràng hơn.
    for (let index = 0; index < 360; index++) {
      const x = this.rng.integerInRange(55, this.worldWidth - 55)
      const y = this.rng.integerInRange(55, this.worldHeight - 55)
      const size = this.rng.integerInRange(2, 8)
      const colors = [0x64748b, 0x334155, 0x1e293b, 0x475569, 0x78350f]

      details.fillStyle(this.rng.pick(colors), this.rng.realInRange(0.07, 0.2))
      details.fillCircle(x, y, size)

      if (index % 9 === 0) {
        details.lineStyle(2, 0x020617, 0.24)
        const crackX = x + this.rng.integerInRange(-34, 34)
        const crackY = y + this.rng.integerInRange(-34, 34)
        details.lineBetween(x, y, crackX, crackY)
        details.lineBetween(crackX, crackY, crackX + this.rng.integerInRange(-18, 18), crackY + this.rng.integerInRange(-18, 18))
      }
    }

    // Vết lốp và dầu ở nhà máy.
    details.lineStyle(8, 0x020617, 0.18)
    for (let index = 0; index < 14; index++) {
      const x = this.rng.integerInRange(halfWidth + 220, this.worldWidth - 320)
      const y = this.rng.integerInRange(180, halfHeight - 180)
      const length = this.rng.integerInRange(120, 260)
      details.lineBetween(x, y, x + length, y + this.rng.integerInRange(-30, 30))
      details.lineBetween(x, y + 18, x + length, y + 18 + this.rng.integerInRange(-30, 30))
    }

    for (let index = 0; index < 22; index++) {
      const x = this.rng.integerInRange(halfWidth + 180, this.worldWidth - 150)
      const y = this.rng.integerInRange(150, halfHeight - 150)
      const radius = this.rng.integerInRange(18, 48)
      details.fillStyle(0x020617, 0.34)
      details.fillEllipse(x, y, radius * 1.7, radius)
      details.lineStyle(2, 0x475569, 0.13)
      details.strokeEllipse(x, y, radius * 1.7, radius)
    }

    // Vùng lây nhiễm có vũng tím-xanh nổi rõ nhưng vẫn chỉ là trang trí nền.
    for (let index = 0; index < 26; index++) {
      const x = this.rng.integerInRange(halfWidth + 180, this.worldWidth - 150)
      const y = this.rng.integerInRange(halfHeight + 170, this.worldHeight - 150)
      const radius = this.rng.integerInRange(22, 58)
      details.fillStyle(index % 2 === 0 ? 0x7e22ce : 0x3f6212, 0.12)
      details.fillEllipse(x, y, radius * 1.8, radius * 1.15)
      details.lineStyle(2, index % 2 === 0 ? 0xc084fc : 0xa3e635, 0.17)
      details.strokeEllipse(x, y, radius * 1.8, radius * 1.15)
      details.fillStyle(0xd9f99d, 0.14)
      details.fillCircle(x - radius * 0.25, y - radius * 0.15, Math.max(3, radius * 0.12))
      details.fillCircle(x + radius * 0.2, y + radius * 0.05, Math.max(2, radius * 0.09))
    }

    // Vết cháy lớn trong phế tích.
    for (let index = 0; index < 18; index++) {
      const x = this.rng.integerInRange(160, halfWidth - 180)
      const y = this.rng.integerInRange(halfHeight + 180, this.worldHeight - 150)
      const radius = this.rng.integerInRange(24, 54)
      details.fillStyle(0x020617, 0.32)
      details.fillEllipse(x, y, radius * 2, radius)
      details.lineStyle(3, 0x7c2d12, 0.14)
      details.strokeEllipse(x, y, radius * 2, radius)
    }
  }

  private reserveImportantAreas() {
    const centerX = this.worldWidth / 2
    const centerY = this.worldHeight / 2

    this.reserveArea(centerX, centerY, 760, 660, 0)
    this.reserveArea(centerX, centerY, 350, this.worldHeight, 0)
    this.reserveArea(centerX, centerY, this.worldWidth, 310, 0)
  }

  private createWorldObstacles() {
    const halfWidth = this.worldWidth / 2
    const halfHeight = this.worldHeight / 2
    const edge = 140
    const roadGapX = 205
    const roadGapY = 185

    const northWest: SpawnRegion = {
      x: edge,
      y: edge,
      width: halfWidth - roadGapX - edge,
      height: halfHeight - roadGapY - edge,
    }
    const northEast: SpawnRegion = {
      x: halfWidth + roadGapX,
      y: edge,
      width: halfWidth - roadGapX - edge,
      height: halfHeight - roadGapY - edge,
    }
    const southWest: SpawnRegion = {
      x: edge,
      y: halfHeight + roadGapY,
      width: halfWidth - roadGapX - edge,
      height: halfHeight - roadGapY - edge,
    }
    const southEast: SpawnRegion = {
      x: halfWidth + roadGapX,
      y: halfHeight + roadGapY,
      width: halfWidth - roadGapX - edge,
      height: halfHeight - roadGapY - edge,
    }

    // Landmark lớn được đặt trước để các vật nhỏ tránh chồng lên chúng.
    this.createLargeLandmarks()

    // Giảm mật độ vật nhỏ so với bản cũ, giữ khoảng trống để né và luồn lách.
    this.placeObstacleGroup('tree', 42, northWest)
    this.placeObstacleGroup('rock', 11, northWest)

    this.placeObstacleGroup('crate', 12, northEast)
    this.placeObstacleGroup('wreck', 8, northEast)
    this.placeObstacleGroup('barrier', 12, northEast)

    this.placeObstacleGroup('rock', 20, southWest)
    this.placeObstacleGroup('barrier', 12, southWest)
    this.placeObstacleGroup('wreck', 6, southWest)

    this.placeObstacleGroup('tree', 17, southEast)
    this.placeObstacleGroup('rock', 13, southEast)
    this.placeObstacleGroup('crate', 7, southEast)
  }

  private createLargeLandmarks() {
    const width = this.worldWidth
    const height = this.worldHeight

    const landmarks: LandmarkOptions[] = [
      {
        textureKey: 'obstacle-tree-giant',
        x: width * 0.16,
        y: height * 0.22,
        reserveWidth: 230,
        reserveHeight: 210,
        collisionWidth: 78,
        collisionHeight: 92,
        originY: 0.88,
      },
      {
        textureKey: 'obstacle-tree-giant',
        x: width * 0.39,
        y: height * 0.38,
        reserveWidth: 230,
        reserveHeight: 210,
        collisionWidth: 78,
        collisionHeight: 92,
        originY: 0.88,
        flipX: true,
      },
      {
        textureKey: 'obstacle-rock-large',
        x: width * 0.29,
        y: height * 0.13,
        reserveWidth: 205,
        reserveHeight: 130,
        collisionWidth: 154,
        collisionHeight: 68,
        originY: 0.78,
        rotation: -0.04,
      },
      {
        textureKey: 'obstacle-wreck-truck',
        x: width * 0.76,
        y: height * 0.22,
        reserveWidth: 270,
        reserveHeight: 145,
        collisionWidth: 205,
        collisionHeight: 68,
        originY: 0.77,
        flipX: true,
        rotation: 0.04,
      },
      {
        textureKey: 'obstacle-tank',
        x: width * 0.63,
        y: height * 0.39,
        reserveWidth: 165,
        reserveHeight: 185,
        collisionWidth: 104,
        collisionHeight: 106,
        originY: 0.83,
        rotation: -0.03,
      },
      {
        textureKey: 'obstacle-tank',
        x: width * 0.88,
        y: height * 0.37,
        reserveWidth: 165,
        reserveHeight: 185,
        collisionWidth: 104,
        collisionHeight: 106,
        originY: 0.83,
        tint: 0xb8c1aa,
      },
      {
        textureKey: 'obstacle-wall',
        x: width * 0.69,
        y: height * 0.11,
        reserveWidth: 245,
        reserveHeight: 115,
        collisionWidth: 205,
        collisionHeight: 43,
        originY: 0.79,
        rotation: 0.03,
      },
      {
        textureKey: 'obstacle-wall',
        x: width * 0.19,
        y: height * 0.76,
        reserveWidth: 245,
        reserveHeight: 115,
        collisionWidth: 205,
        collisionHeight: 43,
        originY: 0.79,
        rotation: -0.04,
      },
      {
        textureKey: 'obstacle-rock-large',
        x: width * 0.39,
        y: height * 0.82,
        reserveWidth: 205,
        reserveHeight: 130,
        collisionWidth: 154,
        collisionHeight: 68,
        originY: 0.78,
        flipX: true,
      },
      {
        textureKey: 'obstacle-wreck-truck',
        x: width * 0.31,
        y: height * 0.64,
        reserveWidth: 270,
        reserveHeight: 145,
        collisionWidth: 205,
        collisionHeight: 68,
        originY: 0.77,
        rotation: -0.05,
      },
      {
        textureKey: 'obstacle-tree-giant',
        x: width * 0.68,
        y: height * 0.72,
        reserveWidth: 235,
        reserveHeight: 215,
        collisionWidth: 82,
        collisionHeight: 96,
        originY: 0.88,
        tint: 0x9ac48c,
      },
      {
        textureKey: 'obstacle-tree-giant',
        x: width * 0.88,
        y: height * 0.82,
        reserveWidth: 235,
        reserveHeight: 215,
        collisionWidth: 82,
        collisionHeight: 96,
        originY: 0.88,
        flipX: true,
        tint: 0xb285c4,
      },
      {
        textureKey: 'obstacle-tank',
        x: width * 0.78,
        y: height * 0.63,
        reserveWidth: 165,
        reserveHeight: 185,
        collisionWidth: 104,
        collisionHeight: 106,
        originY: 0.83,
        tint: 0xa6b985,
      },
    ]

    for (const landmark of landmarks) {
      this.createLandmark(landmark)
    }
  }

  private createLandmark(options: LandmarkOptions) {
    if (
      !this.canReserveArea(
        options.x,
        options.y,
        options.reserveWidth,
        options.reserveHeight,
        28,
      )
    ) {
      return
    }

    this.reserveArea(
      options.x,
      options.y,
      options.reserveWidth,
      options.reserveHeight,
      28,
    )

    const image = this.scene.add
      .image(options.x, options.y, options.textureKey)
      .setOrigin(0.5, options.originY ?? 0.76)
      .setDepth(options.y)
      .setRotation(options.rotation ?? 0)
      .setFlipX(options.flipX ?? false)
      .setScale(options.scale ?? 1)

    if (options.tint !== undefined) {
      image.setTint(options.tint)
    }

    this.addStaticObstacle(
      options.x,
      options.y,
      options.collisionWidth,
      options.collisionHeight,
    )
  }

  private placeObstacleGroup(
    kind: ObstacleKind,
    amount: number,
    region: SpawnRegion,
  ) {
    const size = this.getObstacleReserveSize(kind)

    for (let index = 0; index < amount; index++) {
      let placed = false

      for (let attempt = 0; attempt < 90; attempt++) {
        const x = this.rng.integerInRange(
          region.x + size.width / 2,
          region.x + region.width - size.width / 2,
        )
        const y = this.rng.integerInRange(
          region.y + size.height / 2,
          region.y + region.height - size.height / 2,
        )

        if (!this.canReserveArea(x, y, size.width, size.height, 20)) {
          continue
        }

        this.reserveArea(x, y, size.width, size.height, 20)
        this.createObstacle(kind, x, y)
        placed = true
        break
      }

      if (!placed) {
        console.warn(`Không tìm được vị trí cho vật cản ${kind}`)
      }
    }
  }

  private getObstacleReserveSize(kind: ObstacleKind) {
    switch (kind) {
      case 'tree':
        return { width: 108, height: 100 }
      case 'rock':
        return { width: 116, height: 78 }
      case 'crate':
        return { width: 84, height: 78 }
      case 'wreck':
        return { width: 178, height: 108 }
      case 'barrier':
        return { width: 136, height: 82 }
    }
  }

  private canReserveArea(
    x: number,
    y: number,
    width: number,
    height: number,
    padding: number,
  ) {
    const candidate: ReservedArea = {
      left: x - width / 2 - padding,
      right: x + width / 2 + padding,
      top: y - height / 2 - padding,
      bottom: y + height / 2 + padding,
    }

    if (
      candidate.left < 40 ||
      candidate.right > this.worldWidth - 40 ||
      candidate.top < 40 ||
      candidate.bottom > this.worldHeight - 40
    ) {
      return false
    }

    return !this.reservedAreas.some(
      (area) =>
        candidate.left < area.right &&
        candidate.right > area.left &&
        candidate.top < area.bottom &&
        candidate.bottom > area.top,
    )
  }

  private reserveArea(
    x: number,
    y: number,
    width: number,
    height: number,
    padding: number,
  ) {
    this.reservedAreas.push({
      left: x - width / 2 - padding,
      right: x + width / 2 + padding,
      top: y - height / 2 - padding,
      bottom: y + height / 2 + padding,
    })
  }

  private createObstacle(kind: ObstacleKind, x: number, y: number) {
    switch (kind) {
      case 'tree':
        this.createTree(x, y)
        break
      case 'rock':
        this.createRock(x, y)
        break
      case 'crate':
        this.createCrate(x, y)
        break
      case 'wreck':
        this.createWreck(x, y)
        break
      case 'barrier':
        this.createBarrier(x, y)
        break
    }
  }

  private createTree(x: number, y: number) {
    const tree = this.scene.add
      .image(x, y, 'obstacle-tree')
      .setOrigin(0.5, 0.84)
      .setDepth(y)

    const scale = this.rng.realInRange(0.86, 1.14)
    tree.setScale(scale).setFlipX(this.rng.integerInRange(0, 1) === 1)

    // Cây ở vùng lây nhiễm được đổi tông nhẹ nhưng vẫn dùng cùng collider.
    if (x > this.worldWidth / 2 && y > this.worldHeight / 2) {
      tree.setTint(this.rng.integerInRange(0, 1) === 0 ? 0x9ac48c : 0xb58ac6)
    }

    this.addStaticObstacle(x, y - 2, 32 * scale, 42 * scale)
  }

  private createRock(x: number, y: number) {
    const rock = this.scene.add
      .image(x, y, 'obstacle-rock')
      .setOrigin(0.5, 0.72)
      .setDepth(y)

    const scale = this.rng.realInRange(0.84, 1.16)
    rock
      .setScale(scale)
      .setFlipX(this.rng.integerInRange(0, 1) === 1)
      .setRotation(this.rng.realInRange(-0.04, 0.04))

    this.addStaticObstacle(x, y, 76 * scale, 40 * scale)
  }

  private createCrate(x: number, y: number) {
    const useTank = this.rng.integerInRange(0, 8) === 0

    if (useTank) {
      const tankScale = this.rng.realInRange(0.62, 0.72)
      this.scene.add
        .image(x, y, 'obstacle-tank')
        .setOrigin(0.5, 0.83)
        .setDepth(y)
        .setScale(tankScale)
        .setRotation(this.rng.realInRange(-0.05, 0.05))
      this.addStaticObstacle(x, y, 72, 72)
      return
    }

    this.scene.add
      .image(x, y, 'obstacle-crate')
      .setOrigin(0.5, 0.72)
      .setDepth(y)
      .setRotation(this.rng.realInRange(-0.09, 0.09))

    this.addStaticObstacle(x, y, 58, 50)
  }

  private createWreck(x: number, y: number) {
    this.scene.add
      .image(x, y, 'obstacle-wreck')
      .setOrigin(0.5, 0.67)
      .setDepth(y)
      .setFlipX(this.rng.integerInRange(0, 1) === 1)
      .setRotation(this.rng.realInRange(-0.05, 0.05))

    this.addStaticObstacle(x, y, 126, 52)
  }

  private createBarrier(x: number, y: number) {
    const barrier = this.scene.add
      .image(x, y, 'obstacle-barrier')
      .setOrigin(0.5, 0.7)
      .setDepth(y)

    const vertical = this.rng.integerInRange(0, 3) === 0

    if (vertical) {
      barrier.setRotation(Phaser.Math.DegToRad(90))
      this.addStaticObstacle(x, y, 36, 104)
    } else {
      barrier.setRotation(this.rng.realInRange(-0.07, 0.07))
      this.addStaticObstacle(x, y, 104, 36)
    }
  }

  private addStaticObstacle(
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const collisionBody = this.scene.add
      .rectangle(x, y, width, height, 0x000000, 0)
      .setVisible(false)

    this.obstacles.add(collisionBody)
    this.pathfinding.registerObstacle(x, y, width, height)
  }
}
