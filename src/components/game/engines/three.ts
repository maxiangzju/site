import type { GameEngine } from './types';

/**
 * Three.js Game Engine (Placeholder)
 *
 * This is a placeholder for future Three.js integration.
 * To implement, add three.js as a dependency and implement the GameEngine interface.
 *
 * Example implementation would include:
 * - Scene, Camera, Renderer setup
 * - Lighting
 * - 3D objects/meshes
 * - Animation loop
 */
export class ThreeJSEngine implements GameEngine {
  private canvas: HTMLCanvasElement | null = null;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // Placeholder: Show message that Three.js is not yet implemented
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Three.js Engine', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Coming soon...', canvas.width / 2, canvas.height / 2 + 10);
    }
  }

  start(): void {
    // TODO: Implement Three.js animation loop
    console.log('ThreeJSEngine: start() - not yet implemented');
  }

  stop(): void {
    // TODO: Stop animation loop
    console.log('ThreeJSEngine: stop() - not yet implemented');
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    // TODO: Update Three.js renderer and camera
  }

  dispose(): void {
    // TODO: Dispose of Three.js resources
    this.canvas = null;
    console.log('ThreeJSEngine: dispose() - not yet implemented');
  }
}
