export default class Enemy {
  constructor(x, y, scene) {
    this.x = x;
    this.y = y;
    this.symbol = 'g';
    this.color = '#ff6600';
    this.visionRadius = 6; // distancia a la que empieza a perseguir

    // Objeto visual de Phaser
    this.text = scene.add.text(
      x * 16, y * 16,
      this.symbol,
      { fontSize: '16px', color: this.color, fontFamily: 'monospace' }
    ).setDepth(1);
  }

  takeTurn(playerX, playerY, map) {
    const distance = this.getDistance(playerX, playerY);

    if (distance <= this.visionRadius) {
      this.moveTowards(playerX, playerY, map);
    } else {
      this.moveRandom(map);
    }
  }

  getDistance(targetX, targetY) {
    return Math.abs(targetX - this.x) + Math.abs(targetY - this.y);
  }

  moveTowards(targetX, targetY, map) {
    // Calculamos en qué dirección está el jugador
    const dx = Math.sign(targetX - this.x);
    const dy = Math.sign(targetY - this.y);

    // Intentamos movernos primero en el eje con más distancia
    const distX = Math.abs(targetX - this.x);
    const distY = Math.abs(targetY - this.y);

    if (distX >= distY) {
      // Intentamos horizontal primero, si hay pared intentamos vertical
      if (this.canMoveTo(this.x + dx, this.y, map)) {
        this.move(this.x + dx, this.y);
      } else if (this.canMoveTo(this.x, this.y + dy, map)) {
        this.move(this.x, this.y + dy);
      }
    } else {
      // Intentamos vertical primero, si hay pared intentamos horizontal
      if (this.canMoveTo(this.x, this.y + dy, map)) {
        this.move(this.x, this.y + dy);
      } else if (this.canMoveTo(this.x + dx, this.y, map)) {
        this.move(this.x + dx, this.y);
      }
    }
  }

  moveRandom(map) {
    // Las cuatro direcciones posibles
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy:  1 },
      { dx: -1, dy: 0 },
      { dx:  1, dy: 0 },
    ];

    // Filtramos las que son válidas y elegimos una al azar
    const valid = directions.filter(d => this.canMoveTo(this.x + d.dx, this.y + d.dy, map));

    if (valid.length > 0) {
      const chosen = valid[Math.floor(Math.random() * valid.length)];
      this.move(this.x + chosen.dx, this.y + chosen.dy);
    }
  }

  canMoveTo(x, y, map) {
    return map[y] && map[y][x] && map[y][x] !== '#';
  }

  move(newX, newY) {
    this.x = newX;
    this.y = newY;
    this.text.setPosition(newX * 16, newY * 16);
  }

  // Actualiza la visibilidad del enemigo según el FOV
  updateVisibility(fovVisibility) {
    const visibility = fovVisibility[this.y][this.x];
    this.text.setVisible(visibility === 'visible');
  }
}