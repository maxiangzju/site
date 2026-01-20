import type { GameEngine, TankGameState } from '../types';
import { Vector2 } from './utils/Vector2';
import { InputSystem } from './systems/InputSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { RenderSystem } from './systems/RenderSystem';
import { GameMap } from './map/GameMap';
import { PlayerTank } from './entities/PlayerTank';
import { EnemyTank, type EnemyTankType } from './entities/EnemyTank';
import { Bullet } from './entities/Bullet';
import { ParticleSystem } from './entities/Particle';

/**
 * Main tank game engine
 * Implements the GameEngine interface for the pluggable architecture
 */
export class TankGameEngine implements GameEngine {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  // Systems
  private inputSystem!: InputSystem;
  private collisionSystem!: CollisionSystem;
  private renderSystem!: RenderSystem;

  // Game world
  private gameMap!: GameMap;
  private player!: PlayerTank;
  private enemies: EnemyTank[] = [];
  private bullets: Bullet[] = [];
  private particleSystem: ParticleSystem = new ParticleSystem();

  // Game state
  private state: TankGameState = {
    score: 0,
    isRunning: false,
    isPaused: false,
    playerHealth: 100,
    maxHealth: 100,
    enemiesKilled: 0,
    wave: 1,
    gameOver: false,
    victory: false,
  };

  // Wave management
  private readonly maxWaves = 5;
  private enemiesPerWave = 3;
  private waveAnnouncementTimer = 0;
  private readonly waveAnnouncementDuration = 2;
  private playerDamage = 25; // Increases each wave

  // Timing
  private lastTime = 0;
  private animationId: number | null = null;

  // Auto-fire
  private autoFireEnabled = false;

  // Virtual canvas size (game logic works at this resolution)
  private readonly virtualWidth = 800;
  private readonly virtualHeight = 560;
  private scale = 1;

  /** Initialize the engine with a canvas element */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Initialize systems
    this.inputSystem = new InputSystem();
    this.inputSystem.init(canvas);
    this.inputSystem.setPauseCallback(() => this.togglePause());
    this.inputSystem.setFireCallback(() => this.playerFire());

    // Initialize game world
    this.initializeGame();

    // Set up restart on click when game over
    canvas.addEventListener('click', () => {
      if (this.state.gameOver) {
        this.restart();
      }
    });
  }

  /** Initialize/reset game state */
  private initializeGame(): void {
    // Calculate scale based on canvas size
    this.scale = Math.min(
      this.canvas.width / this.virtualWidth,
      this.canvas.height / this.virtualHeight
    );

    // Create map at virtual size (game logic works at this resolution)
    this.gameMap = new GameMap(this.virtualWidth, this.virtualHeight);

    // Initialize remaining systems
    this.collisionSystem = new CollisionSystem(this.gameMap);
    this.renderSystem = new RenderSystem(this.canvas, this.ctx);

    // Create player
    this.player = new PlayerTank(
      this.gameMap.playerSpawn.x,
      this.gameMap.playerSpawn.y
    );

    // Reset state
    this.state = {
      score: 0,
      isRunning: false,
      isPaused: false,
      playerHealth: this.player.maxHealth,
      maxHealth: this.player.maxHealth,
      enemiesKilled: 0,
      wave: 1,
      gameOver: false,
      victory: false,
    };

    // Clear entities
    this.enemies = [];
    this.bullets = [];
    this.particleSystem.clear();

    // Spawn first wave
    this.spawnWave();
  }

  /** Spawn enemies for current wave */
  private spawnWave(): void {
    const numEnemies = this.enemiesPerWave + (this.state.wave - 1) * 2;
    const difficulty = 1 + (this.state.wave - 1) * 0.3;

    for (let i = 0; i < numEnemies; i++) {
      const spawnPoint = this.gameMap.getRandomSpawnPoint();

      // Offset spawn slightly to avoid overlap
      spawnPoint.x += (Math.random() - 0.5) * 60;
      spawnPoint.y += (Math.random() - 0.5) * 60;

      // Determine tank type based on wave and randomness
      const tankType = this.selectEnemyType(i, numEnemies);
      const enemy = new EnemyTank(spawnPoint.x, spawnPoint.y, difficulty, tankType);
      enemy.generatePatrolPoints(this.gameMap.getPlayableBounds());
      this.enemies.push(enemy);
    }

    // Start wave announcement
    this.waveAnnouncementTimer = this.waveAnnouncementDuration;
  }

  /** Select enemy tank type based on wave and position */
  private selectEnemyType(index: number, totalEnemies: number): EnemyTankType {
    const wave = this.state.wave;

    // Boss spawns on wave 3+ with 15% chance (max 1 per wave)
    if (wave >= 3 && index === 0 && Math.random() < 0.15 + (wave - 3) * 0.1) {
      return 'boss';
    }

    // Heavy tanks start appearing in wave 2+
    if (wave >= 2 && Math.random() < 0.2) {
      return 'heavy';
    }

    // Fast tanks have 25% chance from wave 1
    if (Math.random() < 0.25) {
      return 'fast';
    }

    // Default to standard
    return 'standard';
  }

  /** Start the game loop */
  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /** Stop the game loop */
  stop(): void {
    this.state.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** Main game loop */
  private gameLoop(): void {
    if (!this.state.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap delta
    this.lastTime = currentTime;

    if (!this.state.isPaused && !this.state.gameOver) {
      this.update(deltaTime);
    }

    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  /** Update game state */
  private update(deltaTime: number): void {
    // Update wave announcement timer
    if (this.waveAnnouncementTimer > 0) {
      this.waveAnnouncementTimer -= deltaTime;
    }

    // Update player
    this.updatePlayer(deltaTime);

    // Update enemies
    this.updateEnemies(deltaTime);

    // Update bullets
    this.updateBullets(deltaTime);

    // Update particles
    this.particleSystem.update(deltaTime);

    // Check for wave completion
    this.checkWaveCompletion();

    // Update game state
    this.state.playerHealth = this.player.health;
  }

  /** Update player tank */
  private updatePlayer(deltaTime: number): void {
    const input = this.inputSystem.getState();

    // Process input
    this.player.processInput(input, deltaTime);

    // Scale mouse position to virtual coordinates for aiming
    const scaledMousePos = new Vector2(
      input.mousePosition.x / this.scale,
      input.mousePosition.y / this.scale
    );
    this.player.setAimTarget(scaledMousePos);

    // Move player
    const newPos = Vector2.add(
      this.player.position,
      Vector2.scale(this.player.velocity, deltaTime)
    );
    this.player.position.copy(newPos);

    // Resolve collisions
    this.collisionSystem.resolveTankWallCollision(this.player);
    this.collisionSystem.keepTankInBounds(this.player);

    // Tank-tank collisions
    for (const enemy of this.enemies) {
      this.collisionSystem.resolveTankTankCollision(this.player, enemy);
    }

    // Update player state
    this.player.update(deltaTime);

    // Auto-fire if enabled
    if (this.autoFireEnabled && this.player.canFire()) {
      this.playerFire();
    }
  }

  /** Update enemy tanks */
  private updateEnemies(deltaTime: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;

      // Update AI target based on line of sight
      if (this.collisionSystem.hasLineOfSight(enemy.position, this.player.position)) {
        enemy.setTarget(this.player.position.clone());
        // If enemy can now see player while alerted, update their alerted position too
        if (enemy.isAlerted()) {
          enemy.updateAlertedPosition(this.player.position);
        }
      } else {
        // Lost sight, but remember last position briefly
        enemy.setTarget(null);
        // If alerted but can't see player, keep tracking toward last known position
        // Alerted enemies will continue pursuing even without line of sight
      }

      enemy.updateAIState();
      enemy.update(deltaTime);

      // Move enemy
      const newPos = Vector2.add(
        enemy.position,
        Vector2.scale(enemy.velocity, deltaTime)
      );
      enemy.position.copy(newPos);

      // Resolve collisions
      this.collisionSystem.resolveTankWallCollision(enemy);
      this.collisionSystem.keepTankInBounds(enemy);

      // Enemy-enemy collisions
      for (const other of this.enemies) {
        if (other !== enemy) {
          this.collisionSystem.resolveTankTankCollision(enemy, other);
        }
      }

      // Enemy firing - fire if can see player OR if alerted and aiming toward player
      const canSeePlayer = this.collisionSystem.hasLineOfSight(enemy.position, this.player.position);
      const isAlertedAndAiming = enemy.isAlerted() && enemy.getEffectiveTarget();
      if (enemy.shouldFire() && (canSeePlayer || isAlertedAndAiming)) {
        this.enemyFire(enemy);
      }
    }

    // Remove dead enemies
    this.enemies = this.enemies.filter(e => e.isAlive);
  }

  /** Update bullets */
  private updateBullets(deltaTime: number): void {
    for (const bullet of this.bullets) {
      if (!bullet.isActive) continue;

      const prevPos = bullet.position.clone();
      bullet.update(deltaTime);

      // Check bounds (use virtual dimensions)
      if (bullet.isOutOfBounds(this.virtualWidth, this.virtualHeight)) {
        bullet.deactivate();
        continue;
      }

      // Check wall collision
      if (this.collisionSystem.checkBulletWallCollision(bullet)) {
        // Create wall hit effect with spark direction
        const hitAngle = Math.atan2(
          bullet.position.y - prevPos.y,
          bullet.position.x - prevPos.x
        ) + Math.PI; // Reverse direction for bounce effect
        this.particleSystem.createWallHitEffect(bullet.position.x, bullet.position.y, hitAngle);
        bullet.deactivate();
        continue;
      }

      // Check tank collisions
      if (bullet.isPlayerBullet) {
        // Player bullet hits enemy
        for (const enemy of this.enemies) {
          if (this.collisionSystem.checkBulletTankCollision(bullet, enemy)) {
            // Create hit effect
            this.particleSystem.createHitEffect(bullet.position.x, bullet.position.y, false);
            bullet.deactivate();

            // Alert the hit enemy to player's position
            enemy.alertToPosition(this.player.position);

            // Also alert nearby enemies (within 200 units)
            for (const nearbyEnemy of this.enemies) {
              if (nearbyEnemy !== enemy && nearbyEnemy.isAlive) {
                const distance = nearbyEnemy.position.distanceTo(enemy.position);
                if (distance < 200) {
                  nearbyEnemy.alertToPosition(this.player.position);
                }
              }
            }

            const killed = enemy.takeDamage(bullet.damage);
            if (killed) {
              // Create explosion effect
              this.particleSystem.createExplosion(enemy.position.x, enemy.position.y);
              // Spawn fleeing person from destroyed tank (use virtual dimensions)
              this.particleSystem.createFleeingPerson(
                enemy.position.x, enemy.position.y,
                this.virtualWidth, this.virtualHeight,
                this.gameMap.obstacleWalls
              );
              this.state.enemiesKilled++;
              this.state.score += 100 * this.state.wave;
            }
            break;
          }
        }
      } else {
        // Enemy bullet hits player
        if (this.collisionSystem.checkBulletTankCollision(bullet, this.player)) {
          // Create hit effect
          this.particleSystem.createHitEffect(bullet.position.x, bullet.position.y, true);
          bullet.deactivate();
          const killed = this.player.takeDamage(bullet.damage);
          if (killed) {
            // Create explosion effect
            this.particleSystem.createExplosion(this.player.position.x, this.player.position.y);
            // Spawn fleeing person from destroyed tank (use virtual dimensions)
            this.particleSystem.createFleeingPerson(
              this.player.position.x, this.player.position.y,
              this.virtualWidth, this.virtualHeight,
              this.gameMap.obstacleWalls
            );
            this.gameOver(false);
          }
        }
      }
    }

    // Remove inactive bullets
    this.bullets = this.bullets.filter(b => b.isActive);
  }

  /** Player fires a bullet */
  private playerFire(): void {
    if (this.state.isPaused || this.state.gameOver) return;
    if (!this.player.canFire()) return;

    const muzzle = this.player.getMuzzlePosition();
    const bullet = new Bullet(
      muzzle.x,
      muzzle.y,
      this.player.turretAngle,
      true, // isPlayerBullet
      this.playerDamage
    );

    this.bullets.push(bullet);
    this.player.resetFireCooldown();

    // Muzzle flash effect
    this.particleSystem.createMuzzleFlash(muzzle.x, muzzle.y, this.player.turretAngle);
  }

  /** Enemy fires a bullet */
  private enemyFire(enemy: EnemyTank): void {
    const muzzle = enemy.getMuzzlePosition();
    const bullet = new Bullet(
      muzzle.x,
      muzzle.y,
      enemy.turretAngle,
      false, // isPlayerBullet
      enemy.bulletDamage
    );

    this.bullets.push(bullet);
    enemy.resetFireCooldown();

    // Muzzle flash effect (larger for heavy/boss tanks)
    const flashScale = enemy.tankType === 'boss' ? 1.5 : enemy.tankType === 'heavy' ? 1.3 : 1;
    this.particleSystem.createMuzzleFlash(muzzle.x, muzzle.y, enemy.turretAngle, flashScale);
  }

  /** Check if wave is complete */
  private checkWaveCompletion(): void {
    if (this.enemies.length === 0) {
      if (this.state.wave >= this.maxWaves) {
        this.gameOver(true);
      } else {
        this.state.wave++;
        // Heal player to full health on wave clear
        this.player.heal(this.player.maxHealth);
        this.state.playerHealth = this.player.health;
        // Increase player damage for new wave
        this.playerDamage = 25 + (this.state.wave - 1) * 5;
        this.spawnWave();
      }
    }
  }

  /** Handle game over */
  private gameOver(victory: boolean): void {
    this.state.gameOver = true;
    this.state.victory = victory;
  }

  /** Toggle pause state */
  private togglePause(): void {
    if (this.state.gameOver) return;

    this.state.isPaused = !this.state.isPaused;

    if (this.state.isPaused) {
      this.inputSystem.reset();
    }
  }

  /** Restart the game */
  private restart(): void {
    this.initializeGame();
  }

  /** Render the game */
  private render(): void {
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply scaling for game world rendering
    ctx.save();
    ctx.scale(this.scale, this.scale);

    // Render floor
    this.gameMap.renderFloor(ctx);

    // Render walls
    this.gameMap.renderWalls(ctx);

    // Render enemy light cones (before tanks for layering)
    for (const enemy of this.enemies) {
      enemy.renderLightCone(ctx);
    }

    // Render player light cone
    this.player.renderLightCone(ctx);

    // Render bullets
    for (const bullet of this.bullets) {
      bullet.render(ctx);
    }

    // Render enemies
    for (const enemy of this.enemies) {
      enemy.render(ctx);
      enemy.renderHealthBar(ctx);
    }

    // Render player
    this.player.render(ctx);

    // Render aim line
    this.player.renderAimLine(ctx);

    // Render particles (on top of tanks)
    this.particleSystem.render(ctx);

    // Render ambient darkness (needs scale for player position)
    if (this.player.isAlive) {
      this.renderSystem.renderAmbientDarkness(this.player, this.scale);
    }

    // Render vignette
    this.renderSystem.renderVignette(this.scale);

    ctx.restore();

    // UI elements render at canvas scale (not virtual scale)
    this.renderSystem.renderHealthBar(this.state);
    this.renderSystem.renderScoreAndWave(this.state);
    this.renderSystem.renderControlsHint();

    // Render wave announcement
    if (this.waveAnnouncementTimer > 0) {
      const alpha = Math.min(1, this.waveAnnouncementTimer / (this.waveAnnouncementDuration * 0.3));
      this.renderSystem.renderWaveAnnouncement(this.state.wave, alpha);
    }

    // Render pause overlay
    if (this.state.isPaused) {
      this.renderSystem.renderPauseOverlay();
    }

    // Render game over screen
    if (this.state.gameOver) {
      this.renderSystem.renderGameOver(this.state);
    }
  }

  /** Handle window/canvas resize */
  resize(width: number, height: number): void {
    // Recalculate scale based on new canvas size
    this.scale = Math.min(
      width / this.virtualWidth,
      height / this.virtualHeight
    );

    // Update render system with new canvas size
    this.renderSystem = new RenderSystem(this.canvas, this.ctx);
  }

  /** Clean up resources */
  dispose(): void {
    this.stop();
    this.inputSystem.dispose();
  }

  /** Get current game state */
  getState(): TankGameState {
    return { ...this.state };
  }

  /** Manually set pause state */
  setPaused(paused: boolean): void {
    this.state.isPaused = paused;
    if (paused) {
      this.inputSystem.reset();
    }
  }

  /** Set auto-fire mode */
  setAutoFire(enabled: boolean): void {
    this.autoFireEnabled = enabled;
  }

  /** Get auto-fire state */
  getAutoFire(): boolean {
    return this.autoFireEnabled;
  }
}
