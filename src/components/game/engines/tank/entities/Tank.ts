import { Vector2 } from '../utils/Vector2';

/**
 * Base tank class with common functionality
 * Handles body rendering, turret rendering, and basic physics
 */
export abstract class Tank {
  // Position and movement
  public position: Vector2;
  public velocity: Vector2;
  public bodyAngle: number = 0; // Direction tank body faces (radians)
  public turretAngle: number = 0; // Direction turret faces (radians)

  // Tank dimensions (smaller for bigger map feel)
  public bodyWidth: number = 28;
  public bodyHeight: number = 35;
  public turretLength: number = 25;
  public turretWidth: number = 6;
  public radius: number = 18; // Collision radius

  // Stats
  public health: number;
  public maxHealth: number;
  public speed: number;
  public rotationSpeed: number;
  public fireCooldown: number = 0;
  public fireRate: number; // Shots per second

  // State
  public isAlive: boolean = true;

  // Colors (can be overridden by subclasses)
  protected bodyColor: string = '#4a7c59';
  protected bodyHighlight: string = '#5d9b6e';
  protected bodyShadow: string = '#3a5c49';
  protected turretColor: string = '#3d6b4a';
  protected trackColor: string = '#2a3a2e';

  constructor(
    x: number,
    y: number,
    health: number = 100,
    speed: number = 150,
    fireRate: number = 2
  ) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2();
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.rotationSpeed = 2.5; // Radians per second
    this.fireRate = fireRate;
  }

  /** Update tank state each frame */
  abstract update(deltaTime: number): void;

  /** Take damage, returns true if tank dies */
  takeDamage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  /** Heal the tank */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Check if can fire */
  canFire(): boolean {
    return this.fireCooldown <= 0;
  }

  /** Reset fire cooldown after shooting */
  resetFireCooldown(): void {
    this.fireCooldown = 1 / this.fireRate;
  }

  /** Get the position where bullets should spawn */
  getMuzzlePosition(): Vector2 {
    return Vector2.add(
      this.position,
      Vector2.fromAngle(this.turretAngle, this.turretLength)
    );
  }

  /** Render the tank */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Draw tank body
    this.renderBody(ctx);

    // Draw turret
    this.renderTurret(ctx);

    // Draw person in tank (on top of turret)
    this.renderPerson(ctx);

    ctx.restore();
  }

  /** Render the person/driver in the tank */
  protected renderPerson(ctx: CanvasRenderingContext2D): void {
    // Person sits in the turret area
    ctx.save();

    // Head
    ctx.fillStyle = '#FFDBAC'; // Skin color
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#3D5C3D';
    ctx.beginPath();
    ctx.arc(0, -1, 5, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes (looking in turret direction)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(2, -1, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Render tank body with 3D effect */
  protected renderBody(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.rotate(this.bodyAngle);

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(
      -this.bodyWidth / 2 + 4,
      -this.bodyHeight / 2 + 4,
      this.bodyWidth,
      this.bodyHeight
    );

    // Draw tracks
    ctx.fillStyle = this.trackColor;
    ctx.fillRect(
      -this.bodyWidth / 2 - 4,
      -this.bodyHeight / 2,
      8,
      this.bodyHeight
    );
    ctx.fillRect(
      this.bodyWidth / 2 - 4,
      -this.bodyHeight / 2,
      8,
      this.bodyHeight
    );

    // Draw body with gradient for 3D effect
    const bodyGradient = ctx.createLinearGradient(
      -this.bodyWidth / 2, 0,
      this.bodyWidth / 2, 0
    );
    bodyGradient.addColorStop(0, this.bodyShadow);
    bodyGradient.addColorStop(0.3, this.bodyColor);
    bodyGradient.addColorStop(0.7, this.bodyHighlight);
    bodyGradient.addColorStop(1, this.bodyShadow);

    ctx.fillStyle = bodyGradient;
    ctx.fillRect(
      -this.bodyWidth / 2,
      -this.bodyHeight / 2,
      this.bodyWidth,
      this.bodyHeight
    );

    // Draw body outline
    ctx.strokeStyle = this.bodyShadow;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      -this.bodyWidth / 2,
      -this.bodyHeight / 2,
      this.bodyWidth,
      this.bodyHeight
    );

    ctx.restore();
  }

  /** Render tank turret */
  protected renderTurret(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.rotate(this.turretAngle);

    // Turret base (circular)
    const baseRadius = 12;
    const baseGradient = ctx.createRadialGradient(
      -2, -2, 0,
      0, 0, baseRadius
    );
    baseGradient.addColorStop(0, this.bodyHighlight);
    baseGradient.addColorStop(1, this.turretColor);

    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.bodyShadow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Turret barrel
    const barrelGradient = ctx.createLinearGradient(
      0, -this.turretWidth / 2,
      0, this.turretWidth / 2
    );
    barrelGradient.addColorStop(0, this.bodyHighlight);
    barrelGradient.addColorStop(0.5, this.turretColor);
    barrelGradient.addColorStop(1, this.bodyShadow);

    ctx.fillStyle = barrelGradient;
    ctx.fillRect(
      baseRadius - 4,
      -this.turretWidth / 2,
      this.turretLength - baseRadius + 4,
      this.turretWidth
    );

    // Barrel outline
    ctx.strokeStyle = this.bodyShadow;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      baseRadius - 4,
      -this.turretWidth / 2,
      this.turretLength - baseRadius + 4,
      this.turretWidth
    );

    // Muzzle brake
    ctx.fillStyle = this.bodyShadow;
    ctx.fillRect(
      this.turretLength - 6,
      -this.turretWidth / 2 - 2,
      6,
      this.turretWidth + 4
    );

    ctx.restore();
  }

  /** Render health bar above tank */
  renderHealthBar(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive) return;

    const barWidth = 40;
    const barHeight = 4;
    const barY = this.position.y - this.bodyHeight / 2 - 15;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
      this.position.x - barWidth / 2,
      barY,
      barWidth,
      barHeight
    );

    // Health fill
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';

    ctx.fillStyle = healthColor;
    ctx.fillRect(
      this.position.x - barWidth / 2,
      barY,
      barWidth * healthPercent,
      barHeight
    );

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.position.x - barWidth / 2,
      barY,
      barWidth,
      barHeight
    );
  }
}
