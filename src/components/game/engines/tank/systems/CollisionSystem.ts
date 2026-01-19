import { Vector2 } from '../utils/Vector2';
import type { Tank } from '../entities/Tank';
import type { Bullet } from '../entities/Bullet';
import type { Wall } from '../entities/Wall';
import type { GameMap } from '../map/GameMap';

/**
 * Collision detection and resolution system
 */
export class CollisionSystem {
  private gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  /** Update game map reference */
  setGameMap(gameMap: GameMap): void {
    this.gameMap = gameMap;
  }

  /** Check and resolve tank collision with walls */
  resolveTankWallCollision(tank: Tank): void {
    if (!tank.isAlive) return;

    for (const wall of this.gameMap.walls) {
      if (wall.intersectsCircle(tank.position.x, tank.position.y, tank.radius)) {
        // Push tank out of wall
        const wallCenter = wall.getCenter();
        const direction = Vector2.sub(tank.position, wallCenter);

        // Calculate overlap and push direction
        const halfWidth = wall.width / 2 + tank.radius;
        const halfHeight = wall.height / 2 + tank.radius;

        const dx = tank.position.x - wallCenter.x;
        const dy = tank.position.y - wallCenter.y;

        // Determine which axis to push along
        const overlapX = halfWidth - Math.abs(dx);
        const overlapY = halfHeight - Math.abs(dy);

        if (overlapX < overlapY) {
          // Push horizontally
          tank.position.x = wallCenter.x + Math.sign(dx) * halfWidth;
        } else {
          // Push vertically
          tank.position.y = wallCenter.y + Math.sign(dy) * halfHeight;
        }
      }
    }
  }

  /** Check and resolve tank-to-tank collision */
  resolveTankTankCollision(tank1: Tank, tank2: Tank): void {
    if (!tank1.isAlive || !tank2.isAlive) return;

    const distance = tank1.position.distanceTo(tank2.position);
    const minDistance = tank1.radius + tank2.radius;

    if (distance < minDistance && distance > 0) {
      // Calculate push direction
      const direction = Vector2.sub(tank1.position, tank2.position).normalize();
      const overlap = minDistance - distance;

      // Push both tanks apart (equal force)
      const push = Vector2.scale(direction, overlap / 2);
      tank1.position.add(push);
      tank2.position.sub(push);
    }
  }

  /** Check bullet collision with walls */
  checkBulletWallCollision(bullet: Bullet): boolean {
    if (!bullet.isActive) return false;

    for (const wall of this.gameMap.walls) {
      if (wall.intersectsCircle(bullet.position.x, bullet.position.y, bullet.radius)) {
        return true;
      }
    }
    return false;
  }

  /** Check bullet collision with a tank */
  checkBulletTankCollision(bullet: Bullet, tank: Tank): boolean {
    if (!bullet.isActive || !tank.isAlive) return false;

    const distance = bullet.position.distanceTo(tank.position);
    return distance < bullet.radius + tank.radius;
  }

  /** Check if line of sight exists between two points */
  hasLineOfSight(from: Vector2, to: Vector2): boolean {
    for (const wall of this.gameMap.walls) {
      if (this.lineIntersectsRect(from, to, wall)) {
        return false;
      }
    }
    return true;
  }

  /** Check if a line segment intersects a rectangle */
  private lineIntersectsRect(
    lineStart: Vector2,
    lineEnd: Vector2,
    rect: Wall
  ): boolean {
    // Check each edge of the rectangle
    const edges = rect.getEdges();

    for (const edge of edges) {
      if (this.lineSegmentsIntersect(lineStart, lineEnd, edge.start, edge.end)) {
        return true;
      }
    }

    return false;
  }

  /** Check if two line segments intersect */
  private lineSegmentsIntersect(
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    p4: Vector2
  ): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    if (d1 === 0 && this.onSegment(p3, p4, p1)) return true;
    if (d2 === 0 && this.onSegment(p3, p4, p2)) return true;
    if (d3 === 0 && this.onSegment(p1, p2, p3)) return true;
    if (d4 === 0 && this.onSegment(p1, p2, p4)) return true;

    return false;
  }

  /** Calculate cross product direction */
  private direction(p1: Vector2, p2: Vector2, p3: Vector2): number {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
  }

  /** Check if point is on segment */
  private onSegment(p1: Vector2, p2: Vector2, p: Vector2): boolean {
    return (
      Math.min(p1.x, p2.x) <= p.x &&
      p.x <= Math.max(p1.x, p2.x) &&
      Math.min(p1.y, p2.y) <= p.y &&
      p.y <= Math.max(p1.y, p2.y)
    );
  }

  /** Keep tank within bounds */
  keepTankInBounds(tank: Tank): void {
    const bounds = this.gameMap.getPlayableBounds();
    const margin = tank.radius;

    tank.position.x = Math.max(bounds.minX + margin, Math.min(bounds.maxX - margin, tank.position.x));
    tank.position.y = Math.max(bounds.minY + margin, Math.min(bounds.maxY - margin, tank.position.y));
  }

  /** Get push-out vector for circle from rectangle */
  getCircleRectPushVector(
    circleX: number,
    circleY: number,
    radius: number,
    rectX: number,
    rectY: number,
    rectW: number,
    rectH: number
  ): Vector2 | null {
    // Find closest point on rectangle
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectW));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectH));

    const dx = circleX - closestX;
    const dy = circleY - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= radius) {
      return null; // No collision
    }

    if (distance === 0) {
      // Circle center is inside rectangle, push to nearest edge
      const toLeft = circleX - rectX;
      const toRight = rectX + rectW - circleX;
      const toTop = circleY - rectY;
      const toBottom = rectY + rectH - circleY;

      const minDist = Math.min(toLeft, toRight, toTop, toBottom);

      if (minDist === toLeft) return new Vector2(-radius - toLeft, 0);
      if (minDist === toRight) return new Vector2(radius + toRight, 0);
      if (minDist === toTop) return new Vector2(0, -radius - toTop);
      return new Vector2(0, radius + toBottom);
    }

    // Push out along collision normal
    const overlap = radius - distance;
    return new Vector2(
      (dx / distance) * overlap,
      (dy / distance) * overlap
    );
  }
}
