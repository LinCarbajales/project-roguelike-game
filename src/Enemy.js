export default class Enemy {
  constructor(x, y, scene) {
    this.x = x;
    this.y = y;
    this.symbol = 'g';
    this.color = '#ff6600';
    this.visionRadius = 6;

    // Stats de combate
    this.hp = 10;
    this.maxHp = 10;
    this.attack = 4;
    this.defense = 1;
    this.alive = true;

    this.text = scene.add.text(
      x * 16, y * 16,
      this.symbol,
      { fontSize: '16px', color: this.color, fontFamily: 'monospace' }
    ).setDepth(1);
  }

  takeTurn(playerX, playerY, map) {
    if (!this.alive) return;
    const distance = this.getDistance(playerX, playerY);
    if (distance <= this.visionRadius) {
      this.moveTowards(playerX, playerY, map);
    } else {
      this.moveRandom(map);
    }
  }

  die() {
    this.alive = false;
    this.symbol = '%';
    this.text.setText('%');
    this.text.setColor('#666666');
    this.text.setDepth(0);
  }

  getDistance(targetX, targetY) {
    return Math.abs(targetX - this.x) + Math.abs(targetY - this.y);
  }

  moveTowards(targetX, targetY, map, entities) {
    const dx = Math.sign(targetX - this.x);
    const dy = Math.sign(targetY - this.y);
    const distX = Math.abs(targetX - this.x);
    const distY = Math.abs(targetY - this.y);

    if (distX >= distY) {
      if (this.canMoveTo(this.x + dx, this.y, map, entities)) {
        this.move(this.x + dx, this.y);
      } else if (this.canMoveTo(this.x, this.y + dy, map, entities)) {
        this.move(this.x, this.y + dy);
      }
    } else {
      if (this.canMoveTo(this.x, this.y + dy, map, entities)) {
        this.move(this.x, this.y + dy);
      } else if (this.canMoveTo(this.x + dx, this.y, map, entities)) {
        this.move(this.x + dx, this.y);
      }
    }
  }

  moveRandom(map, entities) {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy:  1 },
      { dx: -1, dy: 0 },
      { dx:  1, dy: 0 },
    ];
    const valid = directions.filter(d =>
      this.canMoveTo(this.x + d.dx, this.y + d.dy, map, entities)
    );
    if (valid.length > 0) {
      const chosen = valid[Math.floor(Math.random() * valid.length)];
      this.move(this.x + chosen.dx, this.y + chosen.dy);
    }
  }

  takeTurn(playerX, playerY, map, entities) {
    if (!this.alive) return;
    const distance = this.getDistance(playerX, playerY);
    if (distance <= this.visionRadius) {
      this.moveTowards(playerX, playerY, map, entities);
    } else {
      this.moveRandom(map, entities);
    }
  }

  canMoveTo(x, y, map, entities = []) {
    if (!map[y] || !map[y][x] || map[y][x] === '#') return false;
    // Comprueba que no haya otra entidad viva en esa casilla
    return !entities.some(e => e.alive && e.x === x && e.y === y);
  }

  move(newX, newY) {
    this.x = newX;
    this.y = newY;
    this.text.setPosition(newX * 16, newY * 16);
  }

  updateVisibility(fovVisibility) {
    if (!this.alive) {
      // El cadáver solo se ve si la celda ha sido explorada
      const visibility = fovVisibility[this.y][this.x];
      this.text.setVisible(visibility === 'visible' || visibility === 'explored');
    } else {
      const visibility = fovVisibility[this.y][this.x];
      this.text.setVisible(visibility === 'visible');
    }
  }
}