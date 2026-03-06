import Phaser from 'phaser';
import MapGenerator from './MapGenerator.js';
import FOV from './FOV.js';
import Enemy from './Enemy.js';

const TILE_SIZE = 16;
const FOV_RADIUS = 6; // radio de la antorcha en celdas

// Colores según visibilidad y tipo de celda
const COLORS = {
  wall: {
    visible:  '#aaaaaa',
    explored: '#444444',
    hidden:   '#000000'
  },
  floor: {
    visible:  '#888888',
    explored: '#222222',
    hidden:   '#000000'
  }
};

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const generator = new MapGenerator(50, 37);
    const { map, rooms } = generator.generate();
    this.map = map;

    const startRoom = rooms[0];
    this.playerX = Math.floor(startRoom.x + startRoom.w / 2);
    this.playerY = Math.floor(startRoom.y + startRoom.h / 2);

    // Inicializamos el FOV
    this.fov = new FOV(this.map);

    // Renderizar el mapa, todo oculto al principio
    this.mapTexts = [];
    for (let y = 0; y < this.map.length; y++) {
      this.mapTexts[y] = [];
      for (let x = 0; x < this.map[y].length; x++) {
        const text = this.add.text(x * TILE_SIZE, y * TILE_SIZE, ' ', {
          fontSize: '16px',
          fontFamily: 'monospace'
        });
        this.mapTexts[y][x] = text;
      }
    }

    // Renderizar jugador
    this.playerText = this.add.text(
      this.playerX * TILE_SIZE,
      this.playerY * TILE_SIZE,
      '@', { fontSize: '16px', color: '#00ff00', fontFamily: 'monospace' }
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.lastMove = 0;

    // Spawneamos un enemigo en el centro de cada habitación excepto la primera
    this.enemies = [];
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const ex = Math.floor(room.x + room.w / 2);
      const ey = Math.floor(room.y + room.h / 2);
      this.enemies.push(new Enemy(ex, ey, this));
    }

    // Calculamos el FOV inicial
    this.updateFOV();
  }

  updateFOV() {
    // Calculamos qué celdas son visibles desde la posición del jugador
    this.fov.compute(this.playerX, this.playerY, FOV_RADIUS);

    // Actualizamos el aspecto visual de cada celda según su visibilidad
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        const visibility = this.fov.visibility[y][x];
        const isWall = tile === '#';

        const colorSet = isWall ? COLORS.wall : COLORS.floor;
        const color = colorSet[visibility];

        if (visibility === 'hidden') {
          this.mapTexts[y][x].setText(' ');
        } else {
          this.mapTexts[y][x].setText(tile);
          this.mapTexts[y][x].setColor(color);
        }
      }
    }
    if (this.enemies) {
      this.enemies.forEach(enemy => enemy.updateVisibility(this.fov.visibility));
    }
  }

  update(time) {
    if (time - this.lastMove < 150) return;

    let newX = this.playerX;
    let newY = this.playerY;

    if (this.cursors.left.isDown)  newX--;
    if (this.cursors.right.isDown) newX++;
    if (this.cursors.up.isDown)    newY--;
    if (this.cursors.down.isDown)  newY++;

    if (this.map[newY][newX] !== '#') {
      this.playerX = newX;
      this.playerY = newY;
      this.playerText.setPosition(newX * TILE_SIZE, newY * TILE_SIZE);
      this.lastMove = time;

      // Recalculamos el FOV cada vez que el jugador se mueve
      this.updateFOV();

      // Turno de los enemigos
      this.enemies.forEach(enemy => {
        enemy.takeTurn(this.playerX, this.playerY, this.map);
        enemy.updateVisibility(this.fov.visibility);
      });
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: GameScene
};

new Phaser.Game(config);