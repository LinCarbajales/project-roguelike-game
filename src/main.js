import Phaser from 'phaser';
import MapGenerator from './MapGenerator.js';
import FOV from './FOV.js';
import Enemy from './Enemy.js';
import Combat from './Combat.js';
import { LEVELS } from './levels.js';

const TILE_SIZE = 16;
const FOV_RADIUS = 6;
const ENEMY_MOVE_INTERVAL = 250;
const ENEMY_ATTACK_INTERVAL = 500;
const PLAYER_ATTACKS = [
  'Apuñalas',
  'Aplastas con tu maza',
  'Cortas con tu hoja',
  'Golpeas con el pomo'
];
const GOBLIN_ATTACKS = [
  'apuñala',
  'raja',
  'muerde',
  'patea',
  'acuchilla'
];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Nivel actual, empieza en 0 (índice del array)
    this.levelIndex = this.registry.get('levelIndex') || 0;
    const levelConfig = LEVELS[this.levelIndex];

    const generator = new MapGenerator(levelConfig.mapWidth, levelConfig.mapHeight);
    const { map, rooms } = generator.generate();
    this.map = map;
    this.colors = levelConfig.colors;  // guardamos los colores del nivel

    const startRoom = rooms[0];
    this.playerX = Math.floor(startRoom.x + startRoom.w / 2);
    this.playerY = Math.floor(startRoom.y + startRoom.h / 2);

    // Stats del jugador, se mantienen entre niveles
    if (!this.registry.get('player')) {
      this.registry.set('player', { hp: 30, maxHp: 30, attack: 6, defense: 2 });
    }
    this.player = this.registry.get('player');

    this.lastEnemyMove = 0;
    this.lastEnemyAttack = 0;
    this.fov = new FOV(this.map);
    this.log = [];

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

    // Enemigos según configuración del nivel
    this.enemies = [];
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const ex = Math.floor(room.x + room.w / 2);
      const ey = Math.floor(room.y + room.h / 2);

      for (const enemyConfig of levelConfig.enemies) {
        if (enemyConfig.count === 'perRoom') {
          this.enemies.push(new Enemy(ex, ey, this, enemyConfig));
        }
      }
    }

    // Enemigos con count numérico en habitaciones aleatorias
    for (const enemyConfig of levelConfig.enemies) {
      if (typeof enemyConfig.count === 'number') {
        const availableRooms = [...rooms.slice(1)];
        for (let i = 0; i < enemyConfig.count; i++) {
          if (availableRooms.length === 0) break;
          const randomIndex = Math.floor(Math.random() * availableRooms.length);
          const room = availableRooms.splice(randomIndex, 1)[0];
          const ex = Math.floor(room.x + room.w / 2);
          const ey = Math.floor(room.y + room.h / 2);
          this.enemies.push(new Enemy(ex, ey, this, enemyConfig));
        }
      }
    }

    // Escalera en la habitación más alejada de la primera
    const startCenter = {
      x: Math.floor(rooms[0].x + rooms[0].w / 2),
      y: Math.floor(rooms[0].y + rooms[0].h / 2)
    };

    const farthestRoom = rooms.slice(1).reduce((farthest, room) => {
      const center = {
        x: Math.floor(room.x + room.w / 2),
        y: Math.floor(room.y + room.h / 2)
      };
      const dist = Math.abs(center.x - startCenter.x) + Math.abs(center.y - startCenter.y);
      const farthestCenter = {
        x: Math.floor(farthest.x + farthest.w / 2),
        y: Math.floor(farthest.y + farthest.h / 2)
      };
      const farthestDist = Math.abs(farthestCenter.x - startCenter.x) + Math.abs(farthestCenter.y - startCenter.y);
      return dist > farthestDist ? room : farthest;
    });

    this.stairsX = Math.floor(farthestRoom.x + farthestRoom.w / 2);
    this.stairsY = Math.floor(farthestRoom.y + farthestRoom.h / 2);
    this.stairsText = this.add.text(
      this.stairsX * TILE_SIZE,
      this.stairsY * TILE_SIZE,
      '>', {
        fontSize: '16px',
        color: levelConfig.colors.stairs,
        fontFamily: 'monospace'
      }
    ).setDepth(1).setVisible(false);

    // UI
    this.hpText = this.add.text(10, 610, '', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(10);

    this.logTexts = [];
    for (let i = 0; i < 3; i++) {
      this.logTexts.push(
        this.add.text(10, 630 + i * 16, '', {
          fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(10)
      );
    }

    // Nivel actual en UI
    this.levelText = this.add.text(700, 610, `Nivel ${levelConfig.level}`, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(10);

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
      const invertedIndex = this.logTexts.length - 1 - i;
      text.setText(this.log[invertedIndex] || '');
    });
  }

  getEnemyAt(x, y) {
    return this.enemies.find(e => e.alive && e.x === x && e.y === y);
  }

  getRandomAttack(actions) {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  handleCombat(enemy) {
    // Jugador ataca al enemigo
    const playerResult = Combat.fight(this.player, enemy);
    const action = this.getRandomAttack(PLAYER_ATTACKS);
    this.addLog(`${action} al goblin y le haces ${playerResult.damage} de daño.`);

    if (playerResult.defeated) {
      enemy.die();
      this.addLog('El goblin ha muerto.');
      return;
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

    const playerActed = newX !== this.playerX || newY !== this.playerY;

    if (playerActed && this.map[newY][newX] !== '#') {
      this.lastMove = time;
      const enemy = this.getEnemyAt(newX, newY);

      if (enemy) {
        this.handleCombat(enemy);
      } else {
        this.playerX = newX;
        this.playerY = newY;
        this.playerText.setPosition(newX * TILE_SIZE, newY * TILE_SIZE);

        // ¿El jugador pisa la escalera?
        if (newX === this.stairsX && newY === this.stairsY) {
          const nextLevelIndex = (this.levelIndex + 1) % LEVELS.length;
          this.registry.set('levelIndex', nextLevelIndex);
          this.scene.restart();
        }
      }
    } else if (!playerActed) {
      this.lastMove = time;
    } else {
      return;
    }

    // Turno de los enemigos con su propio intervalo
    const enemyCanMove = time - this.lastEnemyMove >= ENEMY_MOVE_INTERVAL;
    const enemyCanAttack = time - this.lastEnemyAttack >= ENEMY_ATTACK_INTERVAL;

    if (enemyCanMove) this.lastEnemyMove = time;
    if (enemyCanAttack) this.lastEnemyAttack = time;

    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;

      const blockers = [
        { alive: true, x: this.playerX, y: this.playerY },
        ...this.enemies.filter(e => e !== enemy)
      ];

      const distX = Math.abs(enemy.x - this.playerX);
      const distY = Math.abs(enemy.y - this.playerY);
      const adjacent = distX + distY === 1;

      if (adjacent && enemyCanAttack) {
        const enemyResult = Combat.fight(enemy, this.player);
        const action = this.getRandomAttack(GOBLIN_ATTACKS);
        this.addLog(`El goblin te ${action} y te hace ${enemyResult.damage} de daño.`);
        if (enemyResult.defeated) {
          this.scene.start('GameOverScene');
          return;
        }
      } else if (!adjacent && enemyCanMove) {
        enemy.takeTurn(this.playerX, this.playerY, this.map, blockers);
      }

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
        const colorSet = isWall ? this.colors.wall : this.colors.floor;
        const color = colorSet[visibility];

        const stairsVisibility = this.fov.visibility[this.stairsY][this.stairsX];
        this.stairsText.setVisible(stairsVisibility === 'visible' || stairsVisibility === 'explored');

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