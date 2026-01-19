import { Tank } from './Tank';
import { Vector2 } from '../utils/Vector2';

/** AI behavior states */
export type AIState = 'patrol' | 'chase' | 'attack' | 'retreat';

/** Enemy tank types with different stats and appearances */
export type EnemyTankType = 'standard' | 'fast' | 'heavy' | 'boss';

/** Tank type configurations */
const TANK_CONFIGS: Record<EnemyTankType, {
  healthMult: number;
  speedMult: number;
  fireRateMult: number;
  sizeMult: number;
  damage: number;
  bodyColor: string;
  bodyHighlight: string;
  bodyShadow: string;
  turretColor: string;
  trackColor: string;
  lightColor: { r: number; g: number; b: number };
}> = {
  standard: {
    healthMult: 1,
    speedMult: 1,
    fireRateMult: 1,
    sizeMult: 1,
    damage: 15,
    bodyColor: '#8B4513',
    bodyHighlight: '#A0522D',
    bodyShadow: '#654321',
    turretColor: '#6B3811',
    trackColor: '#3D2314',
    lightColor: { r: 255, g: 200, b: 150 },
  },
  fast: {
    healthMult: 0.6,
    speedMult: 1.8,
    fireRateMult: 1.5,
    sizeMult: 0.8,
    damage: 10,
    bodyColor: '#2E7D32',
    bodyHighlight: '#43A047',
    bodyShadow: '#1B5E20',
    turretColor: '#1B5E20',
    trackColor: '#0D3D0F',
    lightColor: { r: 150, g: 255, b: 150 },
  },
  heavy: {
    healthMult: 2.5,
    speedMult: 0.5,
    fireRateMult: 0.6,
    sizeMult: 1.3,
    damage: 35,
    bodyColor: '#455A64',
    bodyHighlight: '#607D8B',
    bodyShadow: '#263238',
    turretColor: '#37474F',
    trackColor: '#1C2529',
    lightColor: { r: 150, g: 200, b: 255 },
  },
  boss: {
    healthMult: 4,
    speedMult: 0.7,
    fireRateMult: 2,
    sizeMult: 1.5,
    damage: 25,
    bodyColor: '#B71C1C',
    bodyHighlight: '#E53935',
    bodyShadow: '#7F0000',
    turretColor: '#C62828',
    trackColor: '#4A0000',
    lightColor: { r: 255, g: 100, b: 100 },
  },
};

/**
 * AI-controlled enemy tank
 * Has patrol, chase, and attack behaviors
 */
export class EnemyTank extends Tank {
  // Tank type
  public readonly tankType: EnemyTankType;
  // AI state
  public aiState: AIState = 'patrol';

  // Patrol behavior
  private patrolPoints: Vector2[] = [];
  private currentPatrolIndex: number = 0;
  private patrolWaitTime: number = 0;
  private readonly patrolWaitDuration: number = 1.5;

  // Detection
  public readonly detectionRange: number = 300;
  public readonly attackRange: number = 350;
  public readonly loseTargetRange: number = 450;

  // Light cone properties (like player but red-tinted)
  public readonly lightConeAngle: number = Math.PI / 4; // 45 degree cone
  public readonly lightConeRange: number = 250;

  // Target tracking
  private targetPosition: Vector2 | null = null;
  private lastKnownTargetPosition: Vector2 | null = null;

  // Alert state - when shot, enemy becomes alerted to player position
  private alertedPosition: Vector2 | null = null;
  private alertTimer: number = 0;
  private readonly alertDuration: number = 8; // Seconds to stay alerted (longer for better tracking)
  private searchTimer: number = 0; // Timer for searching behavior when reached alert position

  // Movement smoothing
  private desiredAngle: number = 0;
  private readonly turnSmoothing: number = 3;

  // Attack cooldown variation
  private attackCooldownVariation: number = 0;

  // Light color for this tank type
  private lightColor: { r: number; g: number; b: number };

  // Bullet damage for this tank
  public readonly bulletDamage: number;

  constructor(x: number, y: number, difficulty: number = 1, tankType: EnemyTankType = 'standard') {
    const config = TANK_CONFIGS[tankType];

    // Scale stats with difficulty and tank type
    const health = (60 + difficulty * 20) * config.healthMult;
    const speed = (80 + difficulty * 15) * config.speedMult;
    const fireRate = (0.8 + difficulty * 0.3) * config.fireRateMult;

    super(x, y, health, speed, fireRate);

    this.tankType = tankType;
    this.bulletDamage = config.damage;
    this.lightColor = config.lightColor;

    // Apply tank type colors
    this.bodyColor = config.bodyColor;
    this.bodyHighlight = config.bodyHighlight;
    this.bodyShadow = config.bodyShadow;
    this.turretColor = config.turretColor;
    this.trackColor = config.trackColor;

    // Apply size multiplier
    this.bodyWidth = Math.round(28 * config.sizeMult);
    this.bodyHeight = Math.round(35 * config.sizeMult);
    this.turretLength = Math.round(25 * config.sizeMult);
    this.turretWidth = Math.round(6 * config.sizeMult);
    this.radius = Math.round(18 * config.sizeMult);

    // Random initial angle
    this.bodyAngle = Math.random() * Math.PI * 2;
    this.turretAngle = this.bodyAngle;

    // Random attack variation
    this.attackCooldownVariation = Math.random() * 0.5;
  }

  /** Set patrol points for this enemy */
  setPatrolPoints(points: Vector2[]): void {
    this.patrolPoints = points;
    this.currentPatrolIndex = 0;
  }

  /** Generate patrol points around spawn position */
  generatePatrolPoints(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const center = this.position.clone();
    const patrolRadius = 100;

    this.patrolPoints = [
      new Vector2(
        Math.max(bounds.minX + 50, Math.min(bounds.maxX - 50, center.x + patrolRadius)),
        center.y
      ),
      new Vector2(
        center.x,
        Math.max(bounds.minY + 50, Math.min(bounds.maxY - 50, center.y + patrolRadius))
      ),
      new Vector2(
        Math.max(bounds.minX + 50, Math.min(bounds.maxX - 50, center.x - patrolRadius)),
        center.y
      ),
      new Vector2(
        center.x,
        Math.max(bounds.minY + 50, Math.min(bounds.maxY - 50, center.y - patrolRadius))
      ),
    ];
  }

  /** Update AI behavior */
  update(deltaTime: number): void {
    if (!this.isAlive) return;

    // Update cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }

    // Update alert timer
    if (this.alertTimer > 0) {
      this.alertTimer -= deltaTime;
      if (this.alertTimer <= 0) {
        this.alertedPosition = null;
      }
    }

    // Update AI state machine
    switch (this.aiState) {
      case 'patrol':
        this.updatePatrol(deltaTime);
        break;
      case 'chase':
        this.updateChase(deltaTime);
        break;
      case 'attack':
        this.updateAttack(deltaTime);
        break;
      case 'retreat':
        this.updateRetreat(deltaTime);
        break;
    }

    // Smooth body rotation
    this.smoothRotation(deltaTime);
  }

  /** Set target position for AI */
  setTarget(position: Vector2 | null): void {
    this.targetPosition = position;
    if (position) {
      this.lastKnownTargetPosition = position.clone();
    }
  }

  /** Alert enemy to a position (called when shot by player) */
  alertToPosition(position: Vector2): void {
    this.alertedPosition = position.clone();
    this.alertTimer = this.alertDuration;
    this.searchTimer = 0;
    // Always switch to chase mode when alerted (even from attack/retreat)
    this.aiState = 'chase';
  }

  /** Update alerted position (call this to keep enemy tracking player) */
  updateAlertedPosition(position: Vector2): void {
    if (this.alertTimer > 0) {
      this.alertedPosition = position.clone();
    }
  }

  /** Check if enemy is currently alerted */
  isAlerted(): boolean {
    return this.alertTimer > 0;
  }

  /** Check if target is within detection range */
  canSeeTarget(): boolean {
    if (!this.targetPosition) return false;
    return this.position.distanceTo(this.targetPosition) <= this.detectionRange;
  }

  /** Check if target is within attack range */
  canAttackTarget(): boolean {
    if (!this.targetPosition) return false;
    return this.position.distanceTo(this.targetPosition) <= this.attackRange;
  }

  /** Check if should lose target */
  shouldLoseTarget(): boolean {
    if (!this.targetPosition) return true;
    return this.position.distanceTo(this.targetPosition) > this.loseTargetRange;
  }

  /** Update AI state based on target */
  updateAIState(): void {
    // If we have a direct target (can see player)
    if (this.targetPosition) {
      const distance = this.position.distanceTo(this.targetPosition);

      if (distance <= this.attackRange) {
        this.aiState = 'attack';
      } else if (distance <= this.detectionRange) {
        this.aiState = 'chase';
      } else if (distance > this.loseTargetRange) {
        this.aiState = 'patrol';
        this.targetPosition = null;
      }
      return;
    }

    // If we don't have direct vision but are alerted (were shot)
    if (this.alertedPosition && this.alertTimer > 0) {
      const distance = this.position.distanceTo(this.alertedPosition);

      // Always chase toward alerted position, regardless of distance
      if (distance > 30) {
        this.aiState = 'chase';
      } else {
        // Reached the alerted position, start searching
        this.searchTimer += 0.016; // Approximate delta time
        if (this.searchTimer < 2) {
          // Search around for 2 seconds
          this.aiState = 'patrol';
        } else {
          // Give up searching
          this.alertedPosition = null;
          this.alertTimer = 0;
          this.searchTimer = 0;
          this.aiState = 'patrol';
        }
      }
      return;
    }

    // Default to patrol
    this.aiState = 'patrol';
  }

  /** Get effective target - either direct target or alerted position */
  getEffectiveTarget(): Vector2 | null {
    if (this.targetPosition) return this.targetPosition;
    if (this.alertedPosition && this.alertTimer > 0) return this.alertedPosition;
    return null;
  }

  /** Patrol behavior - move between patrol points */
  private updatePatrol(deltaTime: number): void {
    if (this.patrolPoints.length === 0) {
      this.velocity.set(0, 0);
      return;
    }

    const target = this.patrolPoints[this.currentPatrolIndex];
    const distance = this.position.distanceTo(target);

    if (distance < 20) {
      // Reached patrol point, wait then move to next
      this.velocity.set(0, 0);
      this.patrolWaitTime += deltaTime;

      if (this.patrolWaitTime >= this.patrolWaitDuration) {
        this.patrolWaitTime = 0;
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    } else {
      // Move toward patrol point
      this.moveToward(target, this.speed * 0.6);
    }

    // Look in movement direction
    if (this.velocity.lengthSquared() > 0) {
      this.turretAngle = this.velocity.angle();
    }
  }

  /** Chase behavior - pursue target */
  private updateChase(deltaTime: number): void {
    const target = this.getEffectiveTarget();
    if (!target) {
      this.aiState = 'patrol';
      return;
    }

    // Move faster when alerted (angry pursuit!)
    const chaseSpeed = this.isAlerted() ? this.speed * 1.3 : this.speed;
    this.moveToward(target, chaseSpeed);

    // Aim at target
    this.aimAtPosition(target);
  }

  /** Attack behavior - stop and shoot */
  private updateAttack(deltaTime: number): void {
    const target = this.getEffectiveTarget();
    if (!target) {
      this.aiState = 'patrol';
      return;
    }

    // Stop moving
    this.velocity.set(0, 0);

    // Aim at target
    this.aimAtPosition(target);

    // Low health? Retreat
    if (this.health < this.maxHealth * 0.3) {
      this.aiState = 'retreat';
    }
  }

  /** Retreat behavior - move away from target */
  private updateRetreat(deltaTime: number): void {
    const target = this.getEffectiveTarget();
    if (!target) {
      this.aiState = 'patrol';
      return;
    }

    // Move away from target
    const awayDirection = Vector2.sub(this.position, target).normalize();
    this.velocity = Vector2.scale(awayDirection, this.speed);
    this.desiredAngle = awayDirection.angle() + Math.PI / 2;

    // Still aim at target while retreating
    this.aimAtPosition(target);

    // If far enough, go back to patrol
    if (this.position.distanceTo(target) > this.loseTargetRange) {
      this.aiState = 'patrol';
      this.targetPosition = null;
      this.alertedPosition = null;
      this.alertTimer = 0;
    }
  }

  /** Move toward a position */
  private moveToward(target: Vector2, speed: number): void {
    const direction = Vector2.sub(target, this.position).normalize();
    this.velocity = Vector2.scale(direction, speed);
    this.desiredAngle = direction.angle() + Math.PI / 2;
  }

  /** Aim turret at a position (smoothly) */
  private aimAtPosition(target: Vector2): void {
    const targetAngle = Vector2.angleBetween(this.position, target);

    // Smooth turret rotation
    let angleDiff = targetAngle - this.turretAngle;

    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Smoothly interpolate (turret turns at ~3 radians per second)
    const turretSpeed = 3;
    const maxTurn = turretSpeed * 0.016; // Assuming ~60fps
    this.turretAngle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);
  }

  /** Smoothly rotate body toward desired angle */
  private smoothRotation(deltaTime: number): void {
    if (this.velocity.lengthSquared() < 0.1) return;

    // Calculate angle difference
    let angleDiff = this.desiredAngle - this.bodyAngle;

    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Smoothly interpolate
    this.bodyAngle += angleDiff * this.turnSmoothing * deltaTime;
  }

  /** Check if should fire (with some randomness) */
  shouldFire(): boolean {
    if (!this.canFire()) return false;
    if (this.aiState !== 'attack' && this.aiState !== 'chase') return false;

    const target = this.getEffectiveTarget();
    if (!target) return false;

    // Higher chance to fire when alerted (enemy is angry!)
    const fireChance = this.isAlerted() ? 0.7 : 0.5;
    return Math.random() < fireChance;
  }

  /** Override fire cooldown with variation */
  resetFireCooldown(): void {
    this.fireCooldown = (1 / this.fireRate) + this.attackCooldownVariation * Math.random();
  }

  /** Render with enemy-specific styling */
  render(ctx: CanvasRenderingContext2D): void {
    super.render(ctx);

    // Debug: render detection range (comment out for production)
    // this.renderDebugInfo(ctx);
  }

  /** Render light cone effect with tank-type specific color */
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

    // Create gradient for light effect using tank-type specific color
    const { r, g, b } = this.lightColor;
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, this.lightConeRange
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.25)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  /** Debug visualization */
  private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Detection range
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.detectionRange, 0, Math.PI * 2);
    ctx.stroke();

    // Attack range
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.attackRange, 0, Math.PI * 2);
    ctx.stroke();

    // AI state
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(this.aiState, this.position.x - 20, this.position.y - 40);

    ctx.restore();
  }
}
