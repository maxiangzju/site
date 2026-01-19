import type { TankGameState } from '../../types';
import type { PlayerTank } from '../entities/PlayerTank';

/**
 * Handles UI rendering: health bar, score, pause overlay, ambient effects
 */
export class RenderSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // UI colors
  private readonly uiBackgroundColor = 'rgba(0, 0, 0, 0.7)';
  private readonly uiTextColor = '#ffffff';
  private readonly healthBarWidth = 200;
  private readonly healthBarHeight = 20;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  /** Render ambient darkness with light cone cutout */
  renderAmbientDarkness(player: PlayerTank): void {
    const ctx = this.ctx;

    ctx.save();

    // Create a path for the entire canvas
    ctx.beginPath();
    ctx.rect(0, 0, this.canvas.width, this.canvas.height);

    // Create light cone path (subtracted from darkness)
    const lightAngle = player.lightConeAngle;
    const lightRange = player.lightConeRange;

    ctx.moveTo(player.position.x, player.position.y);
    ctx.arc(
      player.position.x,
      player.position.y,
      lightRange,
      player.turretAngle - lightAngle / 2,
      player.turretAngle + lightAngle / 2
    );
    ctx.closePath();

    // Use even-odd fill rule to create cutout (very light darkness)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fill('evenodd');

    ctx.restore();
  }

  /** Render vignette effect around edges */
  renderVignette(): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.max(this.canvas.width, this.canvas.height) * 0.7;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.5,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Render player health bar in top-left */
  renderHealthBar(state: TankGameState): void {
    const ctx = this.ctx;
    const x = 20;
    const y = 20;

    // Background
    ctx.fillStyle = this.uiBackgroundColor;
    ctx.fillRect(x - 5, y - 5, this.healthBarWidth + 10, this.healthBarHeight + 30);

    // Health label
    ctx.fillStyle = this.uiTextColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('HEALTH', x, y + 10);

    // Health bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y + 15, this.healthBarWidth, this.healthBarHeight);

    // Health bar fill with gradient
    const healthPercent = state.playerHealth / state.maxHealth;
    const healthWidth = this.healthBarWidth * healthPercent;

    // Color based on health level
    let healthColor: string;
    if (healthPercent > 0.6) {
      healthColor = '#4CAF50'; // Green
    } else if (healthPercent > 0.3) {
      healthColor = '#FFC107'; // Yellow
    } else {
      healthColor = '#F44336'; // Red
    }

    const gradient = ctx.createLinearGradient(x, y + 15, x, y + 15 + this.healthBarHeight);
    gradient.addColorStop(0, healthColor);
    gradient.addColorStop(0.5, this.lightenColor(healthColor, 20));
    gradient.addColorStop(1, this.darkenColor(healthColor, 20));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + 15, healthWidth, this.healthBarHeight);

    // Health bar border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y + 15, this.healthBarWidth, this.healthBarHeight);

    // Health text
    ctx.fillStyle = this.uiTextColor;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.ceil(state.playerHealth)} / ${state.maxHealth}`,
      x + this.healthBarWidth / 2,
      y + 30
    );
    ctx.textAlign = 'left';
  }

  /** Render score and wave info in top-right */
  renderScoreAndWave(state: TankGameState): void {
    const ctx = this.ctx;
    const x = this.canvas.width - 150;
    const y = 20;

    // Background
    ctx.fillStyle = this.uiBackgroundColor;
    ctx.fillRect(x - 10, y - 5, 140, 60);

    // Wave number
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`WAVE ${state.wave}`, x, y + 15);

    // Enemies killed
    ctx.fillStyle = this.uiTextColor;
    ctx.font = '14px monospace';
    ctx.fillText(`Kills: ${state.enemiesKilled}`, x, y + 35);

    // Score
    ctx.fillText(`Score: ${state.score}`, x, y + 50);
  }

  /** Render pause overlay */
  renderPauseOverlay(): void {
    const ctx = this.ctx;

    // Darken screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Pause text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 30);

    // Instructions
    ctx.font = '18px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(
      'Press P or ESC to resume',
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Render game over screen */
  renderGameOver(state: TankGameState): void {
    const ctx = this.ctx;

    // Darken screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Game over text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.victory) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 48px monospace';
      ctx.fillText('VICTORY!', this.canvas.width / 2, this.canvas.height / 2 - 50);
    } else {
      ctx.fillStyle = '#F44336';
      ctx.font = 'bold 48px monospace';
      ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
    }

    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText(
      `Final Score: ${state.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10
    );
    ctx.fillText(
      `Enemies Killed: ${state.enemiesKilled}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 45
    );
    ctx.fillText(
      `Waves Completed: ${state.wave - (state.victory ? 0 : 1)}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 80
    );

    // Restart instruction
    ctx.font = '18px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(
      'Click to restart',
      this.canvas.width / 2,
      this.canvas.height / 2 + 130
    );

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Render wave announcement */
  renderWaveAnnouncement(wave: number, alpha: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`WAVE ${wave}`, this.canvas.width / 2, this.canvas.height / 2);

    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** Render controls hint at bottom */
  renderControlsHint(): void {
    const ctx = this.ctx;
    const y = this.canvas.height - 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'WASD: Move  |  Mouse: Aim  |  Click: Fire  |  P/ESC: Pause',
      this.canvas.width / 2,
      y
    );
    ctx.textAlign = 'left';
  }

  /** Lighten a hex color */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  /** Darken a hex color */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }
}
