/**
 * RoshEngine: Computes TrueSynergy, differentials, lane swaps, and applies personal bias.
 */
export class RoshEngine {
  constructor(heroes = []) {
    this.heroes = heroes;
    this.heroMap = new Map(heroes.map(h => [h.id, h]));
    
    // Draft State: 5 Radiant slots, 5 Dire slots (indexed 1 to 5)
    this.radiantPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.direPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.originalTS = { radiant: 0, dire: 0 };
    this.bans = new Set();

    // Load saved personal hero biases from browser storage
    this.personalBias = this.loadBiases();
  }

  loadBiases() {
    try {
      const saved = localStorage.getItem("rosh_personal_bias");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  saveBias(heroId, biasValue) {
    if (biasValue === 0) {
      delete this.personalBias[heroId];
    } else {
      this.personalBias[heroId] = parseFloat(biasValue);
    }
    localStorage.setItem("rosh_personal_bias", JSON.stringify(this.personalBias));
  }

  getBias(heroId) {
    return this.personalBias[heroId] || 0;
  }

  setHeroes(heroes) {
    this.heroes = heroes;
    this.heroMap = new Map(heroes.map(h => [h.id, h]));
  }

  pickHero(faction, pos, heroId) {
    const picks = faction === "radiant" ? this.radiantPicks : this.direPicks;
    picks[pos] = heroId;

    // Record initial snapshot for Original TrueSynergy lock
    const currentScores = this.calculateTeamScores();
    if (this.originalTS.radiant === 0 && currentScores.radiant !== 0) {
      this.originalTS.radiant = currentScores.radiant;
    }
    if (this.originalTS.dire === 0 && currentScores.dire !== 0) {
      this.originalTS.dire = currentScores.dire;
    }
  }

  unpickHero(faction, pos) {
    const picks = faction === "radiant" ? this.radiantPicks : this.direPicks;
    picks[pos] = null;
  }

  swapHeroes(faction, posA, posB) {
    const picks = faction === "radiant" ? this.radiantPicks : this.direPicks;
    const temp = picks[posA];
    picks[posA] = picks[posB];
    picks[posB] = temp;
  }

  resetDraft() {
    this.radiantPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.direPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.originalTS = { radiant: 0, dire: 0 };
    this.bans.clear();
  }

  /**
   * Computes individual TrueSynergy for a picked hero
   */
  calculateHeroTrueSynergy(heroId, pos, faction) {
    const hero = this.heroMap.get(heroId);
    if (!hero) return 0;

    // 1. Live base win rate relative to 50%
    let score = hero.liveWinRate - 50.0;

    const allies = faction === "radiant" ? this.radiantPicks : this.direPicks;
    const enemies = faction === "radiant" ? this.direPicks : this.radiantPicks;

    // Pairwise heuristics based on role synergy & matchups
    for (let p = 1; p <= 5; p++) {
      const allyId = allies[p];
      if (allyId && allyId !== heroId) {
        // Natural position synergy bonus
        score += 0.8;
      }
      const enemyId = enemies[p];
      if (enemyId) {
        // Natural counter interaction delta
        score -= 0.6;
      }
    }

    return parseFloat(score.toFixed(1));
  }

  /**
   * Computes Team TrueSynergies and Differential
   */
  calculateTeamScores() {
    let radiantTS = 0;
    let direTS = 0;

    for (let pos = 1; pos <= 5; pos++) {
      if (this.radiantPicks[pos]) {
        radiantTS += this.calculateHeroTrueSynergy(this.radiantPicks[pos], pos, "radiant");
      }
      if (this.direPicks[pos]) {
        direTS += this.calculateHeroTrueSynergy(this.direPicks[pos], pos, "dire");
      }
    }

    radiantTS = parseFloat(radiantTS.toFixed(1));
    direTS = parseFloat(direTS.toFixed(1));
    const diff = parseFloat((radiantTS - direTS).toFixed(1));

    return {
      radiant: radiantTS,
      dire: direTS,
      diff: diff,
      originalRadiant: this.originalTS.radiant || radiantTS,
      originalDire: this.originalTS.dire || direTS
    };
  }

  /**
   * Generates candidate recommendations for a specific column slot, ranked by Biased Score
   */
  getRecommendationsForSlot(faction, targetPos, searchQuery = "") {
    const pickedSet = new Set([
      ...Object.values(this.radiantPicks).filter(Boolean),
      ...Object.values(this.direPicks).filter(Boolean),
      ...Array.from(this.bans)
    ]);

    const candidates = [];
    const query = searchQuery.toLowerCase().trim();

    for (const hero of this.heroes) {
      if (pickedSet.has(hero.id)) continue;
      if (query && !hero.name.toLowerCase().includes(query)) continue;

      const rawTS = this.calculateHeroTrueSynergy(hero.id, targetPos, faction);
      const bias = this.getBias(hero.id);
      const biasedScore = parseFloat((rawTS + bias).toFixed(1));

      candidates.push({
        hero,
        rawTS,
        bias,
        biasedScore
      });
    }

    // Sort by Biased Score descending (highest recommendation first)
    return candidates.sort((a, b) => b.biasedScore - a.biasedScore);
  }
}
