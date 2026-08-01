import Phaser from 'phaser'
import type { ReservedArea } from '../types/game'

type GridCell = {
  col: number
  row: number
}

type PathNode = GridCell & {
  g: number
  h: number
  f: number
  parentKey: string | null
}

type PathfindingOptions = {
  worldWidth: number
  worldHeight: number
  cellSize: number
  padding: number
  maximumVisitedNodes?: number
}

type HeapComparator<T> = (left: T, right: T) => number

class MinHeap<T> {
  private items: T[] = []
  private readonly compare: HeapComparator<T>

  constructor(compare: HeapComparator<T>) {
    this.compare = compare
  }

  get size() {
    return this.items.length
  }

  push(value: T) {
    this.items.push(value)
    this.bubbleUp(this.items.length - 1)
  }

  pop(): T | undefined {
    if (this.items.length === 0) {
      return undefined
    }

    const first = this.items[0]
    const last = this.items.pop()

    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last
      this.bubbleDown(0)
    }

    return first
  }

  private bubbleUp(startIndex: number) {
    let index = startIndex

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)

      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
        break
      }

      const temporary = this.items[index]
      this.items[index] = this.items[parentIndex]
      this.items[parentIndex] = temporary
      index = parentIndex
    }
  }

  private bubbleDown(startIndex: number) {
    let index = startIndex

    while (true) {
      const leftIndex = index * 2 + 1
      const rightIndex = leftIndex + 1
      let bestIndex = index

      if (
        leftIndex < this.items.length &&
        this.compare(this.items[leftIndex], this.items[bestIndex]) < 0
      ) {
        bestIndex = leftIndex
      }

      if (
        rightIndex < this.items.length &&
        this.compare(this.items[rightIndex], this.items[bestIndex]) < 0
      ) {
        bestIndex = rightIndex
      }

      if (bestIndex === index) {
        break
      }

      const temporary = this.items[index]
      this.items[index] = this.items[bestIndex]
      this.items[bestIndex] = temporary
      index = bestIndex
    }
  }
}

export class PathfindingSystem {
  private readonly worldWidth: number
  private readonly worldHeight: number
  private readonly navigationCellSize: number
  private readonly navigationPadding: number
  private readonly maximumVisitedNodes: number
  private collisionObstacles: ReservedArea[] = []
  private navigationObstacles: ReservedArea[] = []
  private navigationGrid: boolean[][] = []

  constructor(options: PathfindingOptions) {
    this.worldWidth = options.worldWidth
    this.worldHeight = options.worldHeight
    this.navigationCellSize = options.cellSize
    this.navigationPadding = options.padding
    this.maximumVisitedNodes = Math.max(
      250,
      options.maximumVisitedNodes ?? 2400,
    )
  }

  reset() {
    this.collisionObstacles = []
    this.navigationObstacles = []
    this.navigationGrid = []
  }

  registerObstacle(x: number, y: number, width: number, height: number) {
    const exactArea: ReservedArea = {
      left: x - width / 2,
      right: x + width / 2,
      top: y - height / 2,
      bottom: y + height / 2,
    }

    this.collisionObstacles.push(exactArea)
    this.navigationObstacles.push({
      left: exactArea.left - this.navigationPadding,
      right: exactArea.right + this.navigationPadding,
      top: exactArea.top - this.navigationPadding,
      bottom: exactArea.bottom + this.navigationPadding,
    })
  }

  isCollisionPointBlocked(x: number, y: number, radius = 0) {
    return this.collisionObstacles.some(
      (area) =>
        x > area.left - radius &&
        x < area.right + radius &&
        y > area.top - radius &&
        y < area.bottom + radius,
    )
  }

  buildGrid() {
    const columns = Math.ceil(this.worldWidth / this.navigationCellSize)
    const rows = Math.ceil(this.worldHeight / this.navigationCellSize)

    this.navigationGrid = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, col) => {
        const center = this.getCellCenter({ col, row })
        return this.isNavigationPointWalkable(center.x, center.y)
      }),
    )
  }

  getNavigationCell(x: number, y: number): GridCell {
    const columns = this.navigationGrid[0]?.length ?? 1
    const rows = this.navigationGrid.length || 1

    return {
      col: Phaser.Math.Clamp(
        Math.floor(x / this.navigationCellSize),
        0,
        columns - 1,
      ),
      row: Phaser.Math.Clamp(
        Math.floor(y / this.navigationCellSize),
        0,
        rows - 1,
      ),
    }
  }

  getCellCenter(cell: GridCell) {
    return new Phaser.Math.Vector2(
      Math.min(
        cell.col * this.navigationCellSize + this.navigationCellSize / 2,
        this.worldWidth - 1,
      ),
      Math.min(
        cell.row * this.navigationCellSize + this.navigationCellSize / 2,
        this.worldHeight - 1,
      ),
    )
  }

  isNavigationPointWalkable(x: number, y: number) {
    if (
      x < this.navigationPadding ||
      x > this.worldWidth - this.navigationPadding ||
      y < this.navigationPadding ||
      y > this.worldHeight - this.navigationPadding
    ) {
      return false
    }

    return !this.navigationObstacles.some((obstacle) =>
      this.isPointInsideArea(x, y, obstacle),
    )
  }

  findNearestWalkableCell(
    origin: GridCell,
    position: Phaser.Math.Vector2,
    maxRadius = 12,
  ): GridCell | null {
    for (let radius = 0; radius <= maxRadius; radius++) {
      const candidates: GridCell[] = []

      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        for (let colOffset = -radius; colOffset <= radius; colOffset++) {
          const onPerimeter =
            radius === 0 ||
            Math.abs(rowOffset) === radius ||
            Math.abs(colOffset) === radius

          if (!onPerimeter) {
            continue
          }

          const candidate = {
            col: origin.col + colOffset,
            row: origin.row + rowOffset,
          }

          if (this.isCellWalkable(candidate.col, candidate.row)) {
            candidates.push(candidate)
          }
        }
      }

      candidates.sort((left, right) => {
        const leftCenter = this.getCellCenter(left)
        const rightCenter = this.getCellCenter(right)
        const leftDeltaX = leftCenter.x - position.x
        const leftDeltaY = leftCenter.y - position.y
        const rightDeltaX = rightCenter.x - position.x
        const rightDeltaY = rightCenter.y - position.y

        return (
          leftDeltaX * leftDeltaX +
          leftDeltaY * leftDeltaY -
          (rightDeltaX * rightDeltaX + rightDeltaY * rightDeltaY)
        )
      })

      for (const candidate of candidates) {
        const center = this.getCellCenter(candidate)

        if (
          this.isDirectPathClear(
            position.x,
            position.y,
            center.x,
            center.y,
          )
        ) {
          return candidate
        }
      }
    }

    return null
  }

  getCellKey(cell: GridCell) {
    return `${cell.col},${cell.row}`
  }

  findPath(
    startPosition: Phaser.Math.Vector2,
    targetPosition: Phaser.Math.Vector2,
  ) {
    const originalStartCell = this.getNavigationCell(
      startPosition.x,
      startPosition.y,
    )

    const startCell = this.findNearestWalkableCell(
      originalStartCell,
      startPosition,
    )

    const targetCell = this.findNearestWalkableCell(
      this.getNavigationCell(targetPosition.x, targetPosition.y),
      targetPosition,
    )

    if (!startCell || !targetCell) {
      return []
    }

    const startKey = this.getCellKey(startCell)
    const targetKey = this.getCellKey(targetCell)

    if (startKey === targetKey) {
      return this.isDirectPathClear(
        startPosition.x,
        startPosition.y,
        targetPosition.x,
        targetPosition.y,
      )
        ? [targetPosition.clone()]
        : [this.getCellCenter(targetCell)]
    }

    const openNodes = new MinHeap<PathNode>((left, right) => {
      if (left.f !== right.f) {
        return left.f - right.f
      }

      return left.h - right.h
    })

    const nodesByKey = new Map<string, PathNode>()
    const closedKeys = new Set<string>()

    const startNode: PathNode = {
      ...startCell,
      g: 0,
      h: this.getPathHeuristic(startCell, targetCell),
      f: 0,
      parentKey: null,
    }

    startNode.f = startNode.g + startNode.h
    openNodes.push(startNode)
    nodesByKey.set(startKey, startNode)

    let foundTargetKey: string | null = null
    let visitedNodes = 0

    while (
      openNodes.size > 0 &&
      visitedNodes < this.maximumVisitedNodes
    ) {
      const current = openNodes.pop()

      if (!current) {
        break
      }

      const currentKey = this.getCellKey(current)

      if (nodesByKey.get(currentKey) !== current) {
        continue
      }

      if (closedKeys.has(currentKey)) {
        continue
      }

      visitedNodes++

      if (currentKey === targetKey) {
        foundTargetKey = currentKey
        break
      }

      closedKeys.add(currentKey)

      for (const { cell, movementCost } of this.getWalkableNeighbors(
        current,
      )) {
        const neighborKey = this.getCellKey(cell)

        if (closedKeys.has(neighborKey)) {
          continue
        }

        const tentativeG = current.g + movementCost
        const existingNode = nodesByKey.get(neighborKey)

        if (existingNode && tentativeG >= existingNode.g) {
          continue
        }

        const h = this.getPathHeuristic(cell, targetCell)
        const neighborNode: PathNode = {
          ...cell,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parentKey: currentKey,
        }

        nodesByKey.set(neighborKey, neighborNode)
        openNodes.push(neighborNode)
      }
    }

    if (!foundTargetKey) {
      return []
    }

    const reversedCells: GridCell[] = []
    let cursorKey: string | null = foundTargetKey

    while (cursorKey) {
      const node = nodesByKey.get(cursorKey)

      if (!node) {
        break
      }

      reversedCells.push({
        col: node.col,
        row: node.row,
      })

      cursorKey = node.parentKey
    }

    reversedCells.reverse()

    const rawPoints = reversedCells.map((cell) => this.getCellCenter(cell))
    const startCellWasAlreadyWalkable =
      originalStartCell.col === startCell.col &&
      originalStartCell.row === startCell.row

    if (startCellWasAlreadyWalkable && rawPoints.length > 0) {
      rawPoints.shift()
    }

    const finalAnchor = rawPoints[rawPoints.length - 1]

    if (
      finalAnchor &&
      this.isDirectPathClear(
        finalAnchor.x,
        finalAnchor.y,
        targetPosition.x,
        targetPosition.y,
      )
    ) {
      rawPoints.push(targetPosition.clone())
    }

    return this.simplifyPath(startPosition, rawPoints)
  }

  isDirectPathClear(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    return !this.navigationObstacles.some((obstacle, index) => {
      const fromInsideExpanded = this.isPointInsideArea(
        fromX,
        fromY,
        obstacle,
      )

      if (fromInsideExpanded) {
        const exactObstacle = this.collisionObstacles[index]

        if (!exactObstacle) {
          return false
        }

        return this.segmentIntersectsArea(
          fromX,
          fromY,
          toX,
          toY,
          exactObstacle,
        )
      }

      return this.segmentIntersectsArea(
        fromX,
        fromY,
        toX,
        toY,
        obstacle,
      )
    })
  }

  private isPointInsideArea(
    x: number,
    y: number,
    area: ReservedArea,
  ) {
    return (
      x > area.left &&
      x < area.right &&
      y > area.top &&
      y < area.bottom
    )
  }

  private isCellWalkable(col: number, row: number) {
    return (
      row >= 0 &&
      row < this.navigationGrid.length &&
      col >= 0 &&
      col < (this.navigationGrid[0]?.length ?? 0) &&
      this.navigationGrid[row][col]
    )
  }

  private getPathHeuristic(from: GridCell, to: GridCell) {
    const deltaCol = Math.abs(from.col - to.col)
    const deltaRow = Math.abs(from.row - to.row)
    const diagonal = Math.min(deltaCol, deltaRow)
    const straight = Math.max(deltaCol, deltaRow) - diagonal

    return diagonal * Math.SQRT2 + straight
  }

  private getWalkableNeighbors(cell: GridCell) {
    const directions = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
      { col: 1, row: 1 },
      { col: 1, row: -1 },
      { col: -1, row: 1 },
      { col: -1, row: -1 },
    ]

    const neighbors: Array<{
      cell: GridCell
      movementCost: number
    }> = []

    for (const direction of directions) {
      const col = cell.col + direction.col
      const row = cell.row + direction.row

      if (!this.isCellWalkable(col, row)) {
        continue
      }

      const isDiagonal = direction.col !== 0 && direction.row !== 0

      if (isDiagonal) {
        const horizontalIsFree = this.isCellWalkable(
          cell.col + direction.col,
          cell.row,
        )
        const verticalIsFree = this.isCellWalkable(
          cell.col,
          cell.row + direction.row,
        )

        if (!horizontalIsFree || !verticalIsFree) {
          continue
        }
      }

      // Các ô đã được tạo với vùng đệm quanh vật cản. Vì vậy không cần
      // quét toàn bộ danh sách vật cản cho từng cạnh A* nữa.
      neighbors.push({
        cell: { col, row },
        movementCost: isDiagonal ? Math.SQRT2 : 1,
      })
    }

    return neighbors
  }

  private simplifyPath(
    startPosition: Phaser.Math.Vector2,
    points: Phaser.Math.Vector2[],
  ) {
    if (points.length <= 1) {
      return points
    }

    const simplified: Phaser.Math.Vector2[] = []
    let anchor = startPosition.clone()
    let searchIndex = 0

    while (searchIndex < points.length) {
      let chosenIndex = searchIndex

      for (let index = points.length - 1; index >= searchIndex; index--) {
        const point = points[index]

        if (
          this.isDirectPathClear(
            anchor.x,
            anchor.y,
            point.x,
            point.y,
          )
        ) {
          chosenIndex = index
          break
        }
      }

      const chosenPoint = points[chosenIndex].clone()
      simplified.push(chosenPoint)
      anchor = chosenPoint
      searchIndex = chosenIndex + 1
    }

    return simplified
  }

  private segmentIntersectsArea(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    area: ReservedArea,
  ) {
    const minimumX = Math.min(fromX, toX)
    const maximumX = Math.max(fromX, toX)
    const minimumY = Math.min(fromY, toY)
    const maximumY = Math.max(fromY, toY)

    if (
      maximumX < area.left ||
      minimumX > area.right ||
      maximumY < area.top ||
      minimumY > area.bottom
    ) {
      return false
    }

    const deltaX = toX - fromX
    const deltaY = toY - fromY
    const p = [-deltaX, deltaX, -deltaY, deltaY]
    const q = [
      fromX - area.left,
      area.right - fromX,
      fromY - area.top,
      area.bottom - fromY,
    ]

    let minimumTime = 0
    let maximumTime = 1

    for (let index = 0; index < 4; index++) {
      if (Math.abs(p[index]) < 0.00001) {
        if (q[index] < 0) {
          return false
        }

        continue
      }

      const ratio = q[index] / p[index]

      if (p[index] < 0) {
        minimumTime = Math.max(minimumTime, ratio)
      } else {
        maximumTime = Math.min(maximumTime, ratio)
      }

      if (minimumTime > maximumTime) {
        return false
      }
    }

    return true
  }
}
