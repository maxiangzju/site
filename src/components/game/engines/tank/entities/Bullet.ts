import { Vector2 } from '../utils/Vector2';

/**
 * Projectile fired by tanks
 */
export class Bullet {
  public position: Vector2;
  public velocity: Vector2;
  public readonly radius: number = 4;
  public readonly damage: number;
  public readonly speed: number = 500;
  public isActive: boolean = true;
  public readonly isPlayerBullet: boolean;

  // Visual properties
  private readonly color: string;
  private readonly trailColor: string;
  private trail: Vector2[] = [];
  private readonly maxTrailLength = 5;

  constructor(
    x: number,
    y: number,
    angle: number,
    isPlayerBullet: boolean,
    damage: number = 25
  ) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.fromAngle(angle, this.speed);
    this.isPlayerBullet = isPlayerBullet;
    this.damage = damage;

    // Different colors for player vs enemy bullets
    this.color = isPlayerBullet ? '#FFD700' : '#FF4444';
    this.trailColor = isPlayerBullet ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 68, 68, 0.5)';
  }

  /** Update bullet position */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    // Store position for trail
    this.trail.push(this.position.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Move bullet
    this.position.add(Vector2.scale(this.velocity, deltaTime));
  }

  /** Check if bullet is out of bounds */
  isOutOfBounds(width: number, height: number): boolean {
    return (
      this.position.x < -this.radius ||
      this.position.x > width + this.radius ||
      this.position.y < -this.radius ||
      this.position.y > height + this.radius
    );
  }

  /** Deactivate the bullet (hit something or went out of bounds) */
  deactivate(): void {
    this.isActive = false;
  }

  /** Render the bullet */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    // Draw trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);

      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.lineTo(this.position.x, this.position.y);

      ctx.strokeStyle = this.trailColor;
      ctx.lineWidth = this.radius * 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw bullet with glow effect
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.radius * 2
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw bullet core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
