import { Wall } from '../entities/Wall';
import { Vector2 } from '../utils/Vector2';

/**
 * Game map with walls and spawn points
 */
export class GameMap {
  public walls: Wall[] = [];
  public obstacleWalls: Wall[] = []; // Interior obstacles only (not boundaries)
  public playerSpawn: Vector2;
  public enemySpawnPoints: Vector2[] = [];
  public readonly width: number;
  public readonly height: number;
  public readonly boundaryThickness: number = 20;

  // Floor tile properties
  private readonly tileSize = 50;
  private readonly floorColor1 = '#5D7A5D';
  private readonly floorColor2 = '#4A6347';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.playerSpawn = new Vector2(width / 2, height - 100);

    this.createBoundaryWalls();
    this.createObstacles();
    this.createSpawnPoints();
  }

  /** Create boundary walls around the map */
  private createBoundaryWalls(): void {
    const t = this.boundaryThickness;

    // Top wall
    this.walls.push(new Wall(0, 0, this.width, t));
    // Bottom wall
    this.walls.push(new Wall(0, this.height - t, this.width, t));
    // Left wall
    this.walls.push(new Wall(0, 0, t, this.height));
    // Right wall
    this.walls.push(new Wall(this.width - t, 0, t, this.height));
  }

  /** Create obstacle walls */
  private createObstacles(): void {
    const t = this.boundaryThickness;

    // Helper to add wall to both arrays
    const addObstacle = (x: number, y: number, w: number, h: number) => {
      const wall = new Wall(x, y, w, h);
      this.walls.push(wall);
      this.obstacleWalls.push(wall);
    };

    // Center obstacles
    addObstacle(this.width / 2 - 60, this.height / 2 - 40, 120, 80);

    // Left side obstacles
    addObstacle(t + 80, this.height / 3, 100, 30);
    addObstacle(t + 80, (this.height / 3) * 2, 100, 30);

    // Right side obstacles
    addObstacle(this.width - t - 180, this.height / 3, 100, 30);
    addObstacle(this.width - t - 180, (this.height / 3) * 2, 100, 30);

    // Top corners
    addObstacle(t + 50, t + 50, 60, 60);
    addObstacle(this.width - t - 110, t + 50, 60, 60);

    // Cover positions
    addObstacle(this.width / 4 - 30, this.height / 2 - 50, 60, 100);
    addObstacle((this.width / 4) * 3 - 30, this.height / 2 - 50, 60, 100);
  }

  /** Create enemy spawn points */
  private createSpawnPoints(): void {
    const t = this.boundaryThickness;
    const margin = 60;

    // Top area spawn points
    this.enemySpawnPoints = [
      new Vector2(t + margin + 100, t + margin + 100),
      new Vector2(this.width - t - margin - 100, t + margin + 100),
      new Vector2(this.width / 2, t + margin + 80),
      new Vector2(t + margin + 50, this.height / 2),
      new Vector2(this.width - t - margin - 50, this.height / 2),
    ];
  }

  /** Get a random enemy spawn point */
  getRandomSpawnPoint(): Vector2 {
    const index = Math.floor(Math.random() * this.enemySpawnPoints.length);
    return this.enemySpawnPoints[index].clone();
  }

  /** Get playable bounds (inside boundary walls) */
  getPlayableBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: this.boundaryThickness,
      maxX: this.width - this.boundaryThickness,
      minY: this.boundaryThickness,
      maxY: this.height - this.boundaryThickness,
    };
  }

  /** Check if a position is valid (not inside a wall) */
  isValidPosition(x: number, y: number, radius: number): boolean {
    for (const wall of this.walls) {
      if (wall.intersectsCircle(x, y, radius)) {
        return false;
      }
    }
    return true;
  }

  /** Find nearest valid position (push out of walls) */
  findValidPosition(x: number, y: number, radius: number): Vector2 {
    const result = new Vector2(x, y);

    for (const wall of this.walls) {
      if (wall.intersectsCircle(result.x, result.y, radius)) {
        // Push out of wall
        const wallCenter = wall.getCenter();
        const direction = Vector2.sub(result, wallCenter).normalize();

        // Find the closest edge
        const halfWidth = wall.width / 2 + radius;
        const halfHeight = wall.height / 2 + radius;

        // Calculate push direction based on which side we're closest to
        const dx = result.x - wallCenter.x;
        const dy = result.y - wallCenter.y;

        if (Math.abs(dx) / halfWidth > Math.abs(dy) / halfHeight) {
          // Push horizontally
          result.x = wallCenter.x + Math.sign(dx) * halfWidth;
        } else {
          // Push vertically
          result.y = wallCenter.y + Math.sign(dy) * halfHeight;
        }
      }
    }

    return result;
  }

  /** Render the floor */
  renderFloor(ctx: CanvasRenderingContext2D): void {
    // Draw simple checkered floor pattern
    for (let x = 0; x < this.width; x += this.tileSize) {
      for (let y = 0; y < this.height; y += this.tileSize) {
        const isEven = ((x / this.tileSize) + (y / this.tileSize)) % 2 === 0;
        ctx.fillStyle = isEven ? this.floorColor1 : this.floorColor2;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
      }
    }

    // Add subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  /** Render all walls */
  renderWalls(ctx: CanvasRenderingContext2D): void {
    for (const wall of this.walls) {
      wall.render(ctx);
    }
  }

  /** Render spawn points (for debugging) */
  renderSpawnPoints(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Player spawn
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(this.playerSpawn.x, this.playerSpawn.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Enemy spawns
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    for (const spawn of this.enemySpawnPoints) {
      ctx.beginPath();
      ctx.arc(spawn.x, spawn.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
