export default class FOV {
  constructor(map) {
    this.map = map;
    this.height = map.length;
    this.width = map[0].length;

    // Estado de visibilidad de cada celda
    // 'hidden' → nunca vista
    // 'visible' → dentro del radio de la antorcha
    // 'explored' → vista antes pero fuera del radio ahora
    this.visibility = [];
    for (let y = 0; y < this.height; y++) {
      this.visibility[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.visibility[y][x] = 'hidden';
      }
    }
  }

  // Calcula qué celdas son visibles desde (originX, originY) con un radio dado
  compute(originX, originY, radius) {
    // Primero marcamos todas las celdas visibles anteriores como exploradas
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.visibility[y][x] === 'visible') {
          this.visibility[y][x] = 'explored';
        }
      }
    }

    // Lanzamos rayos en 360 grados desde el jugador
    for (let angle = 0; angle < 360; angle++) {
      this.castRay(originX, originY, angle, radius);
    }

    // El jugador siempre ve su propia celda
    this.visibility[originY][originX] = 'visible';
  }

  castRay(originX, originY, angle, radius) {
    // Convertimos el ángulo a radianes y calculamos dirección
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    let x = originX;
    let y = originY;

    // Avanzamos a lo largo del rayo hasta el radio máximo
    for (let step = 0; step < radius; step++) {
      x += dx;
      y += dy;

      const cellX = Math.round(x);
      const cellY = Math.round(y);

      // Si el rayo sale del mapa, paramos
      if (cellX < 0 || cellX >= this.width || cellY < 0 || cellY >= this.height) {
        break;
      }

      // Marcamos la celda como visible
      this.visibility[cellY][cellX] = 'visible';

      // Si el rayo choca con una pared, paramos (no atraviesa paredes)
      if (this.map[cellY][cellX] === '#') {
        break;
      }
    }
  }
}