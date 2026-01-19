import { Vector2 } from '../utils/Vector2';

/**
 * Input state tracking for keyboard and mouse
 */
export interface InputState {
  // Movement keys (WASD)
  forward: boolean;
  backward: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;

  // Actions
  fire: boolean;
  pause: boolean;

  // Mouse state
  mousePosition: Vector2;
  mouseDown: boolean;
}

/**
 * Handles keyboard and mouse input for the tank game
 */
export class InputSystem {
  private state: InputState;
  private canvas: HTMLCanvasElement | null = null;
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;
  private mousedownHandler: (e: MouseEvent) => void;
  private mouseupHandler: (e: MouseEvent) => void;
  private contextmenuHandler: (e: MouseEvent) => void;

  // Callbacks for one-shot events
  private onPauseToggle: (() => void) | null = null;
  private onFire: (() => void) | null = null;

  constructor() {
    this.state = {
      forward: false,
      backward: false,
      rotateLeft: false,
      rotateRight: false,
      fire: false,
      pause: false,
      mousePosition: new Vector2(),
      mouseDown: false,
    };

    // Bind handlers
    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);
    this.mousemoveHandler = this.handleMouseMove.bind(this);
    this.mousedownHandler = this.handleMouseDown.bind(this);
    this.mouseupHandler = this.handleMouseUp.bind(this);
    this.contextmenuHandler = (e) => e.preventDefault();
  }

  /** Initialize input listeners on canvas */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // Keyboard events (on window to capture regardless of focus)
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    // Mouse events on canvas
    canvas.addEventListener('mousemove', this.mousemoveHandler);
    canvas.addEventListener('mousedown', this.mousedownHandler);
    canvas.addEventListener('mouseup', this.mouseupHandler);
    canvas.addEventListener('contextmenu', this.contextmenuHandler);
  }

  /** Clean up event listeners */
  dispose(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);

    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.mousemoveHandler);
      this.canvas.removeEventListener('mousedown', this.mousedownHandler);
      this.canvas.removeEventListener('mouseup', this.mouseupHandler);
      this.canvas.removeEventListener('contextmenu', this.contextmenuHandler);
    }
  }

  /** Set callback for pause toggle */
  setPauseCallback(callback: () => void): void {
    this.onPauseToggle = callback;
  }

  /** Set callback for fire action */
  setFireCallback(callback: () => void): void {
    this.onFire = callback;
  }

  /** Get current input state */
  getState(): Readonly<InputState> {
    return this.state;
  }

  /** Get mouse position in canvas coordinates */
  getMousePosition(): Vector2 {
    return this.state.mousePosition.clone();
  }

  /** Check if mouse button is down */
  isMouseDown(): boolean {
    return this.state.mouseDown;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'p', 'Escape', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
      case 'w':
        this.state.forward = true;
        break;
      case 's':
        this.state.backward = true;
        break;
      case 'a':
        this.state.rotateLeft = true;
        break;
      case 'd':
        this.state.rotateRight = true;
        break;
      case 'p':
      case 'escape':
        // Fire pause callback only on keydown, not held
        if (!this.state.pause) {
          this.state.pause = true;
          this.onPauseToggle?.();
        }
        break;
      case ' ':
        if (!this.state.fire) {
          this.state.fire = true;
          this.onFire?.();
        }
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.state.forward = false;
        break;
      case 's':
        this.state.backward = false;
        break;
      case 'a':
        this.state.rotateLeft = false;
        break;
      case 'd':
        this.state.rotateRight = false;
        break;
      case 'p':
      case 'escape':
        this.state.pause = false;
        break;
      case ' ':
        this.state.fire = false;
        break;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.state.mousePosition.set(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left click
      this.state.mouseDown = true;
      this.onFire?.();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.mouseDown = false;
    }
  }

  /** Reset all input state (useful when pausing) */
  reset(): void {
    this.state.forward = false;
    this.state.backward = false;
    this.state.rotateLeft = false;
    this.state.rotateRight = false;
    this.state.fire = false;
    this.state.mouseDown = false;
  }
}
