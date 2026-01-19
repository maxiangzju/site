import { Vector2 } from '../utils/Vector2';
import type { Rectangle } from '../../types';

/**
 * Wall obstacle in the game
 * Walls block tanks and bullets, cast shadows for 3D effect
 */
export class Wall implements Rectangle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  // Colors for 3D effect
  private readonly topColor = '#555555';
  private readonly frontColor = '#333333';
  private readonly shadowColor = 'rgba(0, 0, 0, 0.3)';
  private readonly wallHeight = 8; // Simulated 3D height

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /** Get the center position of the wall */
  getCenter(): Vector2 {
    return new Vector2(
      this.x + this.width / 2,
      this.y + this.height / 2
    );
  }

  /** Check if a point is inside the wall */
  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    );
  }

  /** Check collision with a circle */
  intersectsCircle(cx: number, cy: number, radius: number): boolean {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(this.x, Math.min(cx, this.x + this.width));
    const closestY = Math.max(this.y, Math.min(cy, this.y + this.height));

    // Calculate distance from closest point to circle center
    const dx = cx - closestX;
    const dy = cy - closestY;

    return (dx * dx + dy * dy) <= (radius * radius);
  }

  /** Get edges for line intersection tests */
  getEdges(): Array<{ start: Vector2; end: Vector2 }> {
    return [
      { start: new Vector2(this.x, this.y), end: new Vector2(this.x + this.width, this.y) }, // top
      { start: new Vector2(this.x + this.width, this.y), end: new Vector2(this.x + this.width, this.y + this.height) }, // right
      { start: new Vector2(this.x + this.width, this.y + this.height), end: new Vector2(this.x, this.y + this.height) }, // bottom
      { start: new Vector2(this.x, this.y + this.height), end: new Vector2(this.x, this.y) }, // left
    ];
  }

  /** Render the wall with 3D effect */
  render(ctx: CanvasRenderingContext2D): void {
    // Draw shadow (offset to bottom-right)
    ctx.fillStyle = this.shadowColor;
    ctx.fillRect(
      this.x + this.wallHeight,
      this.y + this.wallHeight,
      this.width,
      this.height
    );

    // Draw front face (bottom edge gives 3D depth)
    ctx.fillStyle = this.frontColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw top highlight (lighter top edge)
    const gradient = ctx.createLinearGradient(
      this.x, this.y,
      this.x, this.y + this.height
    );
    gradient.addColorStop(0, this.topColor);
    gradient.addColorStop(0.3, this.frontColor);
    gradient.addColorStop(1, '#222222');

    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border for definition
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}
