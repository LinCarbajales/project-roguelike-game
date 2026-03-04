export default class MapGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  generate() {
    // 1. Empezamos con todo paredes
    const map = this.createEmptyMap();

    // 2. Generamos habitaciones aleatorias
    const rooms = this.createRooms(map);

    // 3. Conectamos las habitaciones con pasillos
    this.connectRooms(map, rooms);

    // Devolvemos el mapa y las habitaciones
    return { map, rooms };
  }

  createEmptyMap() {
    const map = [];
    for (let y = 0; y < this.height; y++) {
      map[y] = [];
      for (let x = 0; x < this.width; x++) {
        map[y][x] = '#';
      }
    }
    return map;
  }

  createRooms(map) {
    const rooms = [];
    const numRooms = 6;
    const minSize = 4;
    const maxSize = 8;
    const maxAttempts = 50;

    for (let i = 0; i < numRooms; i++) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < maxAttempts) {
        attempts++;

        // Tamaño aleatorio
        const w = Phaser.Math.Between(minSize, maxSize);
        const h = Phaser.Math.Between(minSize, maxSize);

        // Posición aleatoria (dejamos margen de 1 para las paredes del borde)
        const x = Phaser.Math.Between(1, this.width - w - 1);
        const y = Phaser.Math.Between(1, this.height - h - 1);

        const newRoom = { x, y, w, h };

        // Comprobamos que no se solapa con otra habitación
        const overlaps = rooms.some(room => this.roomsOverlap(newRoom, room));

        if (!overlaps) {
          this.carveRoom(map, newRoom);
          rooms.push(newRoom);
          placed = true;
        }
      }
    }

    return rooms;
  }

  roomsOverlap(a, b) {
    // Margen de 1 para que no queden pegadas
    return (
      a.x <= b.x + b.w + 1 &&
      a.x + a.w + 1 >= b.x &&
      a.y <= b.y + b.h + 1 &&
      a.y + a.h + 1 >= b.y
    );
  }

  carveRoom(map, room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        map[y][x] = '.';
      }
    }
  }

  connectRooms(map, rooms) {
    // Conectamos cada habitación con la siguiente en orden
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = this.getRoomCenter(rooms[i]);
      const b = this.getRoomCenter(rooms[i + 1]);
      this.carveTunnel(map, a, b);
    }
  }

  getRoomCenter(room) {
    return {
      x: Math.floor(room.x + room.w / 2),
      y: Math.floor(room.y + room.h / 2)
    };
  }

  carveTunnel(map, a, b) {
    // Primero horizontal, luego vertical (forma de L)
    let x = a.x;
    while (x !== b.x) {
      map[a.y][x] = '.';
      x += x < b.x ? 1 : -1;
    }
    let y = a.y;
    while (y !== b.y) {
      map[y][b.x] = '.';
      y += y < b.y ? 1 : -1;
    }
  }
}