import Phaser from 'phaser';
import MapGenerator from './MapGenerator.js';
import FOV from './FOV.js';
import Enemy from './Enemy.js';
import Combat from './Combat.js';

const TILE_SIZE = 16;
const FOV_RADIUS = 6;

const COLORS = {
  wall:  { visible: '#aaaaaa', explored: '#444444', hidden: '#000000' },
  floor: { visible: '#888888', explored: '#222222', hidden: '#000000' }
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

    // Stats del jugador
    this.player = {
      hp: 30,
      maxHp: 30,
      attack: 6,
      defense: 2
    };

    this.fov = new FOV(this.map);
    this.log = []; // historial de mensajes de combate

    // Renderizar mapa
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

    // Jugador
    this.playerText = this.add.text(
      this.playerX * TILE_SIZE,
      this.playerY * TILE_SIZE,
      '@', { fontSize: '16px', color: '#00ff00', fontFamily: 'monospace' }
    ).setDepth(2);

    // Enemigos
    this.enemies = [];
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const ex = Math.floor(room.x + room.w / 2);
      const ey = Math.floor(room.y + room.h / 2);
      this.enemies.push(new Enemy(ex, ey, this));
    }

    // UI — HP
    this.hpText = this.add.text(10, 610, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(10);

    // UI — log de combate
    this.logTexts = [];
    for (let i = 0; i < 3; i++) {
      this.logTexts.push(
        this.add.text(10, 630 + i * 16, '', {
          fontSize: '12px',
          color: '#aaaaaa',
          fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(10)
      );
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.lastMove = 0;

    this.updateFOV();
    this.updateUI();
  }

  addLog(message) {
    this.log.unshift(message); // añade al principio
    if (this.log.length > 3) this.log.pop(); // máximo 3 mensajes
  }

  updateUI() {
    const p = this.player;
    this.hpText.setText(`HP: ${p.hp} / ${p.maxHp}  ATK: ${p.attack}  DEF: ${p.defense}`);
    this.logTexts.forEach((text, i) => {
      text.setText(this.log[i] || '');
    });
  }

  getEnemyAt(x, y) {
    return this.enemies.find(e => e.alive && e.x === x && e.y === y);
  }

  handleCombat(enemy) {
    // Jugador ataca al enemigo
    const playerResult = Combat.fight(this.player, enemy);
    this.addLog(`Golpeas al goblin por ${playerResult.damage} de daño.`);

    if (playerResult.defeated) {
      enemy.die();
      this.addLog('El goblin ha muerto.');
      return;
    }

    // El enemigo contraataca
    const enemyResult = Combat.fight(enemy, this.player);
    this.addLog(`El goblin te golpea por ${enemyResult.damage} de daño.`);

    if (enemyResult.defeated) {
      this.scene.start('GameOverScene');
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

    if (newX === this.playerX && newY === this.playerY) return;

    if (this.map[newY][newX] === '#') return;

    this.lastMove = time;
    const enemy = this.getEnemyAt(newX, newY);

    if (enemy) {
      // Hay un enemigo: combate en lugar de moverse
      this.handleCombat(enemy);
    } else {
      // Casilla libre: moverse
      this.playerX = newX;
      this.playerY = newY;
      this.playerText.setPosition(newX * TILE_SIZE, newY * TILE_SIZE);
    }

    // Turno de los enemigos
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;

      const blockers = [
        { alive: true, x: this.playerX, y: this.playerY },
        ...this.enemies.filter(e => e !== enemy)
      ];

      enemy.takeTurn(this.playerX, this.playerY, this.map, blockers);
      enemy.updateVisibility(this.fov.visibility);
    });

    this.updateFOV();
    this.updateUI();
  }

  updateFOV() {
    this.fov.compute(this.playerX, this.playerY, FOV_RADIUS);

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
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.add.text(400, 300, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff0000',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(400, 370, 'Pulsa R para reiniciar', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-R', () => {
      this.scene.start('GameScene');
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 700,
  backgroundColor: '#000000',
  scene: [GameScene, GameOverScene]
};

new Phaser.Game(config);