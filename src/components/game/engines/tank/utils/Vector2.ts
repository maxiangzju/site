/**
 * 2D Vector math utilities for the tank game
 */
export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /** Create a copy of this vector */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** Set vector components */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** Copy values from another vector */
  copy(v: Vector2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /** Add another vector to this one */
  add(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Subtract another vector from this one */
  sub(v: Vector2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** Multiply by a scalar */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** Get the length/magnitude of this vector */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Get the squared length (faster than length()) */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Normalize this vector (make it unit length) */
  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /** Get the distance to another vector */
  distanceTo(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Get the squared distance to another vector */
  distanceToSquared(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /** Get the angle of this vector in radians */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate this vector by an angle in radians */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  /** Dot product with another vector */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Cross product (returns scalar z-component for 2D) */
  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** Linear interpolation to another vector */
  lerp(v: Vector2, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /** Check if vectors are equal (within epsilon) */
  equals(v: Vector2, epsilon: number = 0.0001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /** Create a vector from an angle in radians */
  static fromAngle(angle: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  /** Add two vectors without mutating */
  static add(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  /** Subtract two vectors without mutating */
  static sub(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  /** Scale a vector without mutating */
  static scale(v: Vector2, s: number): Vector2 {
    return new Vector2(v.x * s, v.y * s);
  }

  /** Get a normalized copy of a vector */
  static normalize(v: Vector2): Vector2 {
    return v.clone().normalize();
  }

  /** Get the angle between two vectors */
  static angleBetween(a: Vector2, b: Vector2): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
}
