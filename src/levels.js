export const LEVELS = [
  {
    level: 1,
    mapWidth: 50,
    mapHeight: 37,
    colors: {
      wall:  { visible: '#aaaaaa', explored: '#444444', hidden: '#000000' },
      floor: { visible: '#888888', explored: '#222222', hidden: '#000000' },
      stairs: '#ffff00'
    },
    enemies: [
      { symbol: 'g', name: 'goblin', color: '#ff6600', hp: 10, attack: 4, defense: 1, visionRadius: 6, count: 'perRoom' }
    ]
  },
  {
    level: 2,
    mapWidth: 55,
    mapHeight: 40,
    colors: {
      wall:  { visible: '#bb8855', explored: '#553322', hidden: '#000000' },
      floor: { visible: '#997755', explored: '#331111', hidden: '#000000' },
      stairs: '#ffff00'
    },
    enemies: [
      { symbol: 'g', name: 'goblin',color: '#ff6600', hp: 12, attack: 4, defense: 1, visionRadius: 6, count: 3 },
      { symbol: 'o', name: 'orco', color: '#ff0000', hp: 20, attack: 6, defense: 3, visionRadius: 8, count: 1 }
    ]
  },
  {
    level: 3,
    mapWidth: 60,
    mapHeight: 42,
    colors: {
      wall:  { visible: '#6688aa', explored: '#223344', hidden: '#000000' },
      floor: { visible: '#445566', explored: '#111822', hidden: '#000000' },
      stairs: '#ffff00'
    },
    enemies: [
      { symbol: 'g', name: 'goblin', color: '#ff6600', hp: 14, attack: 5, defense: 1, visionRadius: 6, count: 'perRoom' },
      { symbol: 'o', name: 'orco', color: '#ff0000', hp: 25, attack: 6, defense: 3, visionRadius: 8, count: 1 }
    ]
  }
];

export const BOSS_LEVELS = {
  // Aquí irán los niveles prediseñados de boss fight en el futuro
};