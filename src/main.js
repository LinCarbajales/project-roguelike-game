import Phaser from 'phaser';
import MapGenerator from './MapGenerator.js';
import FOV from './FOV.js';
import Enemy from './Enemy.js';
import Potion from './Potion.js';
import Combat from './Combat.js';
import { LEVELS } from './levels.js';

const TILE_SIZE = 16;
const FOV_RADIUS = 6;
const ENEMY_MOVE_INTERVAL = 250;
const ENEMY_ATTACK_INTERVAL = 500;
const ATTACK_COOLDOWN = 300;
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

    this.lastAttack = 0;
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

    // Objeto visual de la espada, invisible por defecto
    this.swordText = this.add.text(0, 0, '/', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setDepth(3).setVisible(false);

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

    // Pociones, siempre count numérico
    this.potions = [];
    const availableRooms = [...rooms.slice(1)];
    for (let i = 0; i < levelConfig.potions; i++) {
      if (availableRooms.length === 0) break;
      const randomIndex = Math.floor(Math.random() * availableRooms.length);
      const room = availableRooms.splice(randomIndex, 1)[0];

      // Bucle para que la poción no coincida con la escalera
      let ex, ey;
      do {
        ex = Math.floor(Math.random() * room.w) + room.x;
        ey = Math.floor(Math.random() * room.h) + room.y;
      } while (ex === this.stairsX && ey === this.stairsY);

      this.potions.push(new Potion(ex, ey, this));
      }

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
    this.wasd = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.lastMove = 0;

    this.updateFOV();
    this.updateUI();

    // La cámara te sigue cuando el mapa es grande
    const mapPixelWidth  = levelConfig.mapWidth  * TILE_SIZE;
    const mapPixelHeight = levelConfig.mapHeight * TILE_SIZE;

    this.cameras.main.setBounds(0, 0, mapPixelWidth, mapPixelHeight);
    this.cameras.main.startFollow(this.playerText, true, 0.1, 0.1);
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

  getPotionAt(x, y) {
    return this.potions.find(e => !e.pickedup && e.x === x && e.y === y);
  }

  getRandomAttack(actions) {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  handleCombat(enemy) {
    // Jugador ataca al enemigo
    const playerResult = Combat.fight(this.player, enemy);
    const action = this.getRandomAttack(PLAYER_ATTACKS);
    this.addLog(`${action} al ${enemy.name} y le haces ${playerResult.damage} de daño.`);

    if (playerResult.defeated) {
      enemy.die();
      this.addLog(`El ${enemy.name} ha muerto.`);
      return;
    }
  }

  handleDirectionalAttack(dx, dy, time) {
    if (time - this.lastAttack < ATTACK_COOLDOWN) return;

    const targetX = this.playerX + dx;
    const targetY = this.playerY + dy;

    let symbol;
    if (dy === 0) {
      symbol = dx > 0 ? '/' : '\\';
    } else {
      symbol = dy > 0 ? '\\' : '/';
    }

    this.swordText.setText(symbol);
    this.swordText.setPosition(targetX * TILE_SIZE, targetY * TILE_SIZE);
    this.swordText.setVisible(true);
    this.time.delayedCall(80, () => this.swordText.setVisible(false));

    this.lastAttack = time;

    const enemy = this.getEnemyAt(targetX, targetY);
    if (enemy) {
      this.handleCombat(enemy);
    } else {
      this.addLog('Golpeas el aire.');
    }
  }

  update(time) {
    // Movimiento con cursor keys
    if (time - this.lastMove >= 150) {
      let newX = this.playerX;
      let newY = this.playerY;

      if (this.cursors.left.isDown)  newX--;
      if (this.cursors.right.isDown) newX++;
      if (this.cursors.up.isDown)    newY--;
      if (this.cursors.down.isDown)  newY++;

      const playerMoved = newX !== this.playerX || newY !== this.playerY;

      if (playerMoved && this.map[newY][newX] !== '#') {
        // Comprobar que no hay enemigo vivo en la casilla destino
        const enemyInWay = this.getEnemyAt(newX, newY);
        if (enemyInWay) return;

        //Si hay poción en la casilla de destino
        const potionInFloor = this.getPotionAt(newX, newY);
        if (potionInFloor) {
          const newHp = Math.min(this.player.hp + 10, this.player.maxHp);
          const healed = newHp - this.player.hp;
          this.addLog(`Recoges la poción de sanación y te curas ${healed} de vida.`);
          this.player.hp = newHp;
          potionInFloor.pickup();
        }

        // Movimiento
        this.lastMove = time;
        this.playerX = newX;
        this.playerY = newY;
        this.playerText.setPosition(newX * TILE_SIZE, newY * TILE_SIZE);

        if (newX === this.stairsX && newY === this.stairsY) {
          const nextLevelIndex = (this.levelIndex + 1) % LEVELS.length;
          this.registry.set('levelIndex', nextLevelIndex);
          this.scene.restart();
          return;
        }
      } else if (!playerMoved) {
        this.lastMove = time;
      }
    }

    // Ataque con WASD
    if (this.wasd.left.isDown)  this.handleDirectionalAttack(-1,  0, time);
    if (this.wasd.right.isDown) this.handleDirectionalAttack( 1,  0, time);
    if (this.wasd.up.isDown)    this.handleDirectionalAttack( 0, -1, time);
    if (this.wasd.down.isDown)  this.handleDirectionalAttack( 0,  1, time);

    // Turno enemigo — siempre independiente
    this.triggerEnemyTurn(time);

    this.updateFOV();
    this.updateUI();
  }

  triggerEnemyTurn(time) {
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
        this.addLog(`El ${enemy.name} te ${action} y te hace ${enemyResult.damage} de daño.`);
        if (enemyResult.defeated) {
          this.scene.start('GameOverScene');
          return;
        }
      } else if (!adjacent && enemyCanMove) {
        enemy.takeTurn(this.playerX, this.playerY, this.map, blockers);
      }

      enemy.updateVisibility(this.fov.visibility);
    });
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

    if (this.potions) {
      this.potions.forEach(potion => potion.updateVisibility(this.fov.visibility));
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
      this.registry.set('levelIndex', 0);
      this.registry.set('player', { hp: 30, maxHp: 30, attack: 6, defense: 2 });
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