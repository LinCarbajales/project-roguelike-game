import Phaser from 'phaser';

const TILE_SIZE = 16; // tamaño en píxeles de cada celda

const map = [
  ['#','#','#','#','#','#','#','#','#','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','.','.','.','.','.','.','.','.','#'],
  ['#','#','#','#','#','#','#','#','#','#'],
];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Posición inicial del jugador (en celdas, no píxeles)
    this.playerX = 1;
    this.playerY = 1;

    // Renderizar el mapa
    this.mapTexts = [];
    for (let y = 0; y < map.length; y++) {
      this.mapTexts[y] = [];
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
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
      '@',
      { fontSize: '16px', color: '#00ff00', fontFamily: 'monospace' }
    );

    // Capturar teclado
    this.cursors = this.input.keyboard.createCursorKeys();
    this.lastMove = 0; // para controlar la velocidad del movimiento
  }

  update(time) {
    // Movimiento cada 150ms para que no vaya disparado
    if (time - this.lastMove < 150) return;

    let newX = this.playerX;
    let newY = this.playerY;

    if (this.cursors.left.isDown)  newX--;
    if (this.cursors.right.isDown) newX++;
    if (this.cursors.up.isDown)    newY--;
    if (this.cursors.down.isDown)  newY++;

    // Solo mover si la celda destino no es una pared
    if (map[newY][newX] !== '#') {
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