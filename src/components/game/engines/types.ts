/**
 * Game Engine Interface
 * Provides a pluggable architecture for different rendering engines
 */
export interface GameEngine {
  /** Initialize the engine with a canvas element */
  init(canvas: HTMLCanvasElement): void;

  /** Start the game loop */
  start(): void;

  /** Stop the game loop */
  stop(): void;

  /** Handle window/canvas resize */
  resize(width: number, height: number): void;

  /** Clean up resources */
  dispose(): void;
}

export interface GameState {
  score: number;
  isRunning: boolean;
  isPaused: boolean;
}

export type EngineType = 'canvas2d' | 'three';
