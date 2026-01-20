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
 * Handles keyboard, mouse, and touch input for the tank game
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

  // Touch handlers
  private touchstartHandler: (e: TouchEvent) => void;
  private touchmoveHandler: (e: TouchEvent) => void;
  private touchendHandler: (e: TouchEvent) => void;

  // Callbacks for one-shot events
  private onPauseToggle: (() => void) | null = null;
  private onFire: (() => void) | null = null;

  // Touch state for virtual joystick
  private joystickTouchId: number | null = null;
  private joystickCenter: Vector2 = new Vector2();
  private joystickCurrent: Vector2 = new Vector2();
  private aimTouchId: number | null = null;

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
    this.touchstartHandler = this.handleTouchStart.bind(this);
    this.touchmoveHandler = this.handleTouchMove.bind(this);
    this.touchendHandler = this.handleTouchEnd.bind(this);
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

    // Touch events on canvas
    canvas.addEventListener('touchstart', this.touchstartHandler, { passive: false });
    canvas.addEventListener('touchmove', this.touchmoveHandler, { passive: false });
    canvas.addEventListener('touchend', this.touchendHandler, { passive: false });
    canvas.addEventListener('touchcancel', this.touchendHandler, { passive: false });
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
      this.canvas.removeEventListener('touchstart', this.touchstartHandler);
      this.canvas.removeEventListener('touchmove', this.touchmoveHandler);
      this.canvas.removeEventListener('touchend', this.touchendHandler);
      this.canvas.removeEventListener('touchcancel', this.touchendHandler);
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
    this.joystickTouchId = null;
    this.aimTouchId = null;
  }

  /** Handle touch start - left side for joystick, right side for aim */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.canvas) return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Left half of screen - movement joystick
      if (touchX < canvasWidth / 2 && this.joystickTouchId === null) {
        this.joystickTouchId = touch.identifier;
        this.joystickCenter.set(touchX, touchY);
        this.joystickCurrent.set(touchX, touchY);
      }
      // Right half of screen - aim and fire
      else if (touchX >= canvasWidth / 2) {
        this.aimTouchId = touch.identifier;
        // Scale touch position to canvas coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.state.mousePosition.set(touchX * scaleX, touchY * scaleY);
        this.state.mouseDown = true;
        this.onFire?.();
      }
    }
  }

  /** Handle touch move - update joystick or aim position */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.canvas) return;
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      if (touch.identifier === this.joystickTouchId) {
        this.joystickCurrent.set(touchX, touchY);
        this.updateJoystickState();
      } else if (touch.identifier === this.aimTouchId) {
        // Scale touch position to canvas coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.state.mousePosition.set(touchX * scaleX, touchY * scaleY);
      }
    }
  }

  /** Handle touch end - reset joystick or aim */
  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.state.forward = false;
        this.state.backward = false;
        this.state.rotateLeft = false;
        this.state.rotateRight = false;
      } else if (touch.identifier === this.aimTouchId) {
        this.aimTouchId = null;
        this.state.mouseDown = false;
      }
    }
  }

  /** Update movement state based on joystick position */
  private updateJoystickState(): void {
    const dx = this.joystickCurrent.x - this.joystickCenter.x;
    const dy = this.joystickCurrent.y - this.joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Dead zone
    const deadZone = 15;
    if (distance < deadZone) {
      this.state.forward = false;
      this.state.backward = false;
      this.state.rotateLeft = false;
      this.state.rotateRight = false;
      return;
    }

    // Normalize and apply thresholds
    const threshold = 0.3;
    const normalizedX = dx / Math.max(distance, 50);
    const normalizedY = dy / Math.max(distance, 50);

    // Forward/backward based on Y axis
    this.state.forward = normalizedY < -threshold;
    this.state.backward = normalizedY > threshold;

    // Rotation based on X axis
    this.state.rotateLeft = normalizedX < -threshold;
    this.state.rotateRight = normalizedX > threshold;
  }

  /** Get joystick state for rendering virtual joystick UI */
  getJoystickState(): { active: boolean; centerX: number; centerY: number; currentX: number; currentY: number } {
    return {
      active: this.joystickTouchId !== null,
      centerX: this.joystickCenter.x,
      centerY: this.joystickCenter.y,
      currentX: this.joystickCurrent.x,
      currentY: this.joystickCurrent.y,
    };
  }

  /** Check if touch input is being used */
  isTouchActive(): boolean {
    return this.joystickTouchId !== null || this.aimTouchId !== null;
  }
}
