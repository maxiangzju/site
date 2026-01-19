import { Tank } from './Tank';
import { Vector2 } from '../utils/Vector2';
import type { InputState } from '../systems/InputSystem';

/**
 * Player-controlled tank with light cone and mouse aiming
 */
export class PlayerTank extends Tank {
  // Light cone properties
  public readonly lightConeAngle: number = Math.PI / 3; // 60 degree cone
  public readonly lightConeRange: number = 300;

  // Aim line
  private aimTarget: Vector2 = new Vector2();

  constructor(x: number, y: number) {
    super(x, y, 100, 180, 3); // 100 HP, 180 speed, 3 shots/sec

    // Player tank colors (green)
    this.bodyColor = '#4a7c59';
    this.bodyHighlight = '#5d9b6e';
    this.bodyShadow = '#3a5c49';
    this.turretColor = '#3d6b4a';
    this.trackColor = '#2a3a2e';
  }

  /** Update based on input state */
  update(deltaTime: number): void {
    // Update cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
  }

  /** Process movement input - directional WASD (W=up, S=down, A=left, D=right) */
  processInput(input: InputState, deltaTime: number): void {
    // Directional movement (WASD)
    this.velocity.set(0, 0);

    // Build velocity from directional input
    if (input.forward) {  // W - up
      this.velocity.y -= this.speed;
    }
    if (input.backward) {  // S - down
      this.velocity.y += this.speed;
    }
    if (input.rotateLeft) {  // A - left
      this.velocity.x -= this.speed;
    }
    if (input.rotateRight) {  // D - right
      this.velocity.x += this.speed;
    }

    // Normalize diagonal movement to prevent faster diagonal speed
    if (this.velocity.lengthSquared() > 0) {
      const length = this.velocity.length();
      if (length > this.speed) {
        this.velocity.scale(this.speed / length);
      }
      // Update body angle to face movement direction
      this.bodyAngle = this.velocity.angle() + Math.PI / 2;
    }

    // Update aim based on mouse position
    this.aimTarget.copy(input.mousePosition);
    this.updateTurretAngle();
  }

  /** Update turret to aim at mouse position */
  private updateTurretAngle(): void {
    const dx = this.aimTarget.x - this.position.x;
    const dy = this.aimTarget.y - this.position.y;
    this.turretAngle = Math.atan2(dy, dx);
  }

  /** Set aim target position */
  setAimTarget(target: Vector2): void {
    this.aimTarget.copy(target);
    this.updateTurretAngle();
  }

  /** Normalize angle to -PI to PI range */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  /** Render with light cone effect */
  renderLightCone(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();

    // Create light cone path
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);

    const startAngle = this.turretAngle - this.lightConeAngle / 2;
    const endAngle = this.turretAngle + this.lightConeAngle / 2;

    ctx.arc(
      this.position.x,
      this.position.y,
      this.lightConeRange,
      startAngle,
      endAngle
    );
    ctx.closePath();

    // Create gradient for light effect
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.lightConeRange
    );
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 150, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  /** Render aim line (dotted line to cursor) */
  renderAimLine(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const muzzle = this.getMuzzlePosition();
    const distance = muzzle.distanceTo(this.aimTarget);
    const maxDistance = 500;
    const lineLength = Math.min(distance, maxDistance);

    const direction = Vector2.sub(this.aimTarget, muzzle).normalize();
    const endPoint = Vector2.add(muzzle, Vector2.scale(direction, lineLength));

    ctx.save();

    // Draw dotted line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();

    // Draw crosshair at cursor
    const crosshairSize = 10;
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(this.aimTarget.x - crosshairSize, this.aimTarget.y);
    ctx.lineTo(this.aimTarget.x + crosshairSize, this.aimTarget.y);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(this.aimTarget.x, this.aimTarget.y - crosshairSize);
    ctx.lineTo(this.aimTarget.x, this.aimTarget.y + crosshairSize);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(this.aimTarget.x, this.aimTarget.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
