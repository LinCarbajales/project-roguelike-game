export default class Potion {
  constructor(x, y, scene, config = {}) {
    this.x = x;
    this.y = y;
    this.symbol = config.symbol || '!';
    this.name = config.name || 'poción';
    this.color = config.color || '#ff0000';
    this.pickedup = false;

    this.text = scene.add.text(
      x * 16, y * 16,
      this.symbol,
      { fontSize: '16px', color: this.color, fontFamily: 'monospace' }
    ).setDepth(1);
  }

  pickup() {
    this.pickedup = true;
    this.text.destroy();
  }

  updateVisibility(fovVisibility) {
    if (!this.pickedup) {
      const visibility = fovVisibility[this.y][this.x];
      this.text.setVisible(visibility === 'visible' || visibility === 'explored');
    }
  }
}