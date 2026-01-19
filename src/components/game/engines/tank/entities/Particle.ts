import { Vector2 } from '../utils/Vector2';
import { Wall } from './Wall';

/**
 * Fleeing person that runs away when tank explodes
 */
export class FleeingPerson {
  public position: Vector2;
  public velocity: Vector2;
  public isActive: boolean = true;
  private runFrame: number = 0;
  private frameTimer: number = 0;
  private direction: number; // Facing direction
  private mapWidth: number;
  private mapHeight: number;
  private walls: Wall[];
  private readonly radius: number = 6; // Collision radius for person

  constructor(x: number, y: number, mapWidth: number, mapHeight: number, walls: Wall[]) {
    this.position = new Vector2(x, y);
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.walls = walls;

    // Run in a random direction
    this.direction = Math.random() * Math.PI * 2;
    const speed = 180 + Math.random() * 80; // Faster to reach edge
    this.velocity = new Vector2(
      Math.cos(this.direction) * speed,
      Math.sin(this.direction) * speed
    );
  }

  update(deltaTime: number): boolean {
    if (!this.isActive) return false;

    // Calculate new position
    const newPos = Vector2.add(this.position, Vector2.scale(this.velocity, deltaTime));

    // Check wall collisions and handle them
    let collided = false;
    for (const wall of this.walls) {
      if (wall.intersectsCircle(newPos.x, newPos.y, this.radius)) {
        collided = true;

        // Find which side we're hitting and slide along it
        const wallCenterX = wall.x + wall.width / 2;
        const wallCenterY = wall.y + wall.height / 2;

        // Determine if we should redirect horizontally or vertically
        const dx = newPos.x - wallCenterX;
        const dy = newPos.y - wallCenterY;
        const halfWidth = wall.width / 2 + this.radius;
        const halfHeight = wall.height / 2 + this.radius;

        // Check which axis has more overlap
        const overlapX = halfWidth - Math.abs(dx);
        const overlapY = halfHeight - Math.abs(dy);

        if (overlapX < overlapY) {
          // Push out horizontally, slide vertically
          this.velocity.x = -this.velocity.x * 0.5;
          // Redirect more towards vertical movement
          const speed = this.velocity.length();
          this.velocity.y = Math.sign(this.velocity.y) * speed * 0.9;
        } else {
          // Push out vertically, slide horizontally
          this.velocity.y = -this.velocity.y * 0.5;
          // Redirect more towards horizontal movement
          const speed = this.velocity.length();
          this.velocity.x = Math.sign(this.velocity.x) * speed * 0.9;
        }

        // Update direction to match new velocity
        this.direction = Math.atan2(this.velocity.y, this.velocity.x);
        break;
      }
    }

    // Update position (use original if no collision, recalculate if collided)
    if (!collided) {
      this.position.copy(newPos);
    } else {
      // Move with new velocity after collision
      this.position.add(Vector2.scale(this.velocity, deltaTime));
    }

    // Check if out of map bounds (with margin)
    const margin = 50;
    if (this.position.x < -margin || this.position.x > this.mapWidth + margin ||
        this.position.y < -margin || this.position.y > this.mapHeight + margin) {
      this.isActive = false;
      return false;
    }

    // Update animation frame
    this.frameTimer += deltaTime;
    if (this.frameTimer > 0.1) {
      this.frameTimer = 0;
      this.runFrame = (this.runFrame + 1) % 4;
    }

    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Flip based on direction
    if (Math.cos(this.direction) < 0) {
      ctx.scale(-1, 1);
    }

    // Running animation - leg positions
    const legOffset = Math.sin(this.runFrame * Math.PI / 2) * 4;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#2C4A2C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.lineTo(-2 - legOffset, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.lineTo(2 + legOffset, 10);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#3D5C3D';
    ctx.fillRect(-4, -4, 8, 8);

    // Arms (swinging)
    ctx.strokeStyle = '#FFDBAC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-6 + legOffset, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.lineTo(6 - legOffset, 4);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(0, -8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#3D5C3D';
    ctx.beginPath();
    ctx.arc(0, -9, 5, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Single particle for effects
 */
export class Particle {
  public position: Vector2;
  public velocity: Vector2;
  public life: number;
  public maxLife: number;
  public size: number;
  public color: string;
  public alpha: number = 1;
  public decay: number;
  public gravity: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    gravity: number = 0
  ) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(vx, vy);
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.decay = 1 / life;
    this.gravity = gravity;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    if (this.life <= 0) return false;

    // Update alpha based on remaining life
    this.alpha = this.life / this.maxLife;

    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;

    // Move particle
    this.position.add(Vector2.scale(this.velocity, deltaTime));

    // Shrink over time
    this.size *= (1 - this.decay * deltaTime * 0.5);

    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Particle effect types
 */
export type EffectType = 'hit' | 'explosion' | 'spark' | 'smoke';

/**
 * Particle emitter for managing effects
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private fleeingPeople: FleeingPerson[] = [];

  /** Create hit effect when bullet hits tank */
  createHitEffect(x: number, y: number, isPlayerHit: boolean): void {
    const color = isPlayerHit ? '#FF6B6B' : '#FFD700';
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.3 + Math.random() * 0.3;
      const size = 3 + Math.random() * 4;

      this.particles.push(new Particle(x, y, vx, vy, life, size, color));
    }

    // Add flash effect
    this.particles.push(new Particle(x, y, 0, 0, 0.15, 25, '#FFFFFF'));
  }

  /** Create explosion when tank dies */
  createExplosion(x: number, y: number): void {
    // Main explosion particles
    const colors = ['#FF4500', '#FF6B00', '#FFD700', '#FF8C00', '#FFA500'];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.5 + Math.random() * 0.8;
      const size = 5 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push(new Particle(x, y, vx, vy, life, size, color, 100));
    }

    // Smoke particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30; // Rise upward
      const life = 0.8 + Math.random() * 1.0;
      const size = 10 + Math.random() * 15;
      const gray = Math.floor(50 + Math.random() * 50);
      const color = `rgb(${gray}, ${gray}, ${gray})`;

      this.particles.push(new Particle(x, y, vx, vy, life, size, color, -20));
    }

    // Central flash
    this.particles.push(new Particle(x, y, 0, 0, 0.2, 50, '#FFFFFF'));
    this.particles.push(new Particle(x, y, 0, 0, 0.3, 40, '#FFFF00'));
  }

  /** Create spark effect when bullet hits wall */
  createWallHitEffect(x: number, y: number, normalAngle: number): void {
    const particleCount = 8;
    const spreadAngle = Math.PI / 3; // 60 degree spread

    for (let i = 0; i < particleCount; i++) {
      const angle = normalAngle + (Math.random() - 0.5) * spreadAngle;
      const speed = 100 + Math.random() * 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.2 + Math.random() * 0.2;
      const size = 2 + Math.random() * 3;
      const color = Math.random() > 0.5 ? '#FFD700' : '#FFA500';

      this.particles.push(new Particle(x, y, vx, vy, life, size, color, 200));
    }

    // Small flash
    this.particles.push(new Particle(x, y, 0, 0, 0.1, 10, '#FFFFFF'));
  }

  /** Create muzzle flash effect */
  createMuzzleFlash(x: number, y: number, angle: number, scale: number = 1): void {
    // Flash particles
    const particleCount = Math.round(5 * scale);
    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
      const speed = (150 + Math.random() * 100) * scale;
      const vx = Math.cos(spreadAngle) * speed;
      const vy = Math.sin(spreadAngle) * speed;
      const life = 0.1 + Math.random() * 0.1 * scale;
      const size = (3 + Math.random() * 3) * scale;

      this.particles.push(new Particle(x, y, vx, vy, life, size, '#FFFF00'));
    }

    // Central flash
    this.particles.push(new Particle(x, y, 0, 0, 0.08, 15 * scale, '#FFFFFF'));
  }

  /** Create fleeing person when tank explodes */
  createFleeingPerson(x: number, y: number, mapWidth: number, mapHeight: number, walls: Wall[], count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.fleeingPeople.push(new FleeingPerson(x, y, mapWidth, mapHeight, walls));
    }
  }

  /** Update all particles */
  update(deltaTime: number): void {
    this.particles = this.particles.filter(p => p.update(deltaTime));
    this.fleeingPeople = this.fleeingPeople.filter(p => p.update(deltaTime));
  }

  /** Render all particles */
  render(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      particle.render(ctx);
    }
    for (const person of this.fleeingPeople) {
      person.render(ctx);
    }
  }

  /** Clear all particles */
  clear(): void {
    this.particles = [];
    this.fleeingPeople = [];
  }

  /** Get particle count (for debugging) */
  getCount(): number {
    return this.particles.length;
  }
}
