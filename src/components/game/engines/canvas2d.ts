import type { GameEngine, GameState } from './types';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

/**
 * Canvas 2D Game Engine
 * A simple bouncing balls demo showcasing the engine architecture
 */
export class Canvas2DEngine implements GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private balls: Ball[] = [];
  private state: GameState = {
    score: 0,
    isRunning: false,
    isPaused: false,
  };

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('Could not get 2D context');
    }

    // Initialize with some balls
    this.balls = this.createBalls(5);

    // Handle click to add more balls
    canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private createBalls(count: number): Ball[] {
    const balls: Ball[] = [];
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];

    for (let i = 0; i < count; i++) {
      balls.push({
        x: Math.random() * (this.canvas?.width ?? 400),
        y: Math.random() * (this.canvas?.height ?? 300),
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 15 + Math.random() * 20,
        color: colors[i % colors.length],
      });
    }

    return balls;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.balls.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: 15 + Math.random() * 20,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    });

    this.state.score++;
  }

  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.gameLoop();
  }

  stop(): void {
    this.state.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.state.isRunning || !this.ctx || !this.canvas) return;

    this.update();
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (!this.canvas) return;

    for (const ball of this.balls) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bounce off walls
      if (ball.x - ball.radius < 0 || ball.x + ball.radius > this.canvas.width) {
        ball.vx *= -1;
        ball.x = Math.max(ball.radius, Math.min(this.canvas.width - ball.radius, ball.x));
      }
      if (ball.y - ball.radius < 0 || ball.y + ball.radius > this.canvas.height) {
        ball.vy *= -1;
        ball.y = Math.max(ball.radius, Math.min(this.canvas.height - ball.radius, ball.y));
      }
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw balls
    for (const ball of this.balls) {
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = ball.color;
      this.ctx.fill();

      // Add a subtle shadow/glow
      this.ctx.shadowColor = ball.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // Draw score
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px system-ui, sans-serif';
    this.ctx.fillText(`Balls: ${this.balls.length}`, 10, 25);
    this.ctx.fillText('Click to add more!', 10, 45);
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.canvas.width = width;
    this.canvas.height = height;
  }

  dispose(): void {
    this.stop();
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.handleClick.bind(this));
    }
    this.canvas = null;
    this.ctx = null;
    this.balls = [];
  }

  getState(): GameState {
    return { ...this.state };
  }
}
