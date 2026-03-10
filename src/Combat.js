export default class Combat {
  static fight(attacker, defender) {
    const damage = this.calculateDamage(attacker.attack, defender.defense);
    defender.hp -= damage;
    return {
      damage,
      defeated: defender.hp <= 0
    };
  }

  static calculateDamage(attack, defense) {
    // Daño base es ataque menos defensa
    const base = Math.max(1, attack - defense);
    // Variación aleatoria de ±30% del daño base (mínimo 1)
    const variation = Math.max(1, Math.floor(base * 0.3));
    return base + Math.floor(Math.random() * (variation * 2 + 1)) - variation;
  }
}