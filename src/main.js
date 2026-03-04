import Phaser from 'phaser';
import MapGenerator from './MapGenerator.js';

const TILE_SIZE = 16;

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Generamos el mapa proceduralmente
    const generator = new MapGenerator(50, 37);
    const { map, rooms } = generator.generate();
    this.map = map;

    // Spawn en el centro de la primera habitación
    const startRoom = rooms[0];
    this.playerX = Math.floor(startRoom.x + startRoom.w / 2);
    this.playerY = Math.floor(startRoom.y + startRoom.h / 2);

    // Renderizar el mapa
    this.mapTexts = [];
    for (let y = 0; y < this.map.length; y++) {
      this.mapTexts[y] = [];
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        const color = tile === '#' ? '#888888' : '#444444';
        const text = this.add.text(x * TILE_SIZE, y * TILE_SIZE, tile, {
          fontSize: '16px',
          color: color,
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