/**
 * RoshEngine: Pairwise TrueSynergy, 10-Slot Picked Log Matrix, Swap Deltas, and Personal Bias.
 */
export class RoshEngine {
  constructor(heroes = []) {
    this.heroes = heroes;
    this.heroMap = new Map(heroes.map(h => [h.id, h]));
    
    // Draft State
    this.radiantPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.direPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.originalTS = { radiant: 0, dire: 0 };
    this.radiantBans = new Set();
    this.direBans = new Set();

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

  toggleBan(faction, heroId) {
    const banSet = faction === "radiant" ? this.radiantBans : this.direBans;
    if (banSet.has(heroId)) {
      banSet.delete(heroId);
    } else {
      banSet.add(heroId);
    }
  }

  resetDraft() {
    this.radiantPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.direPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.originalTS = { radiant: 0, dire: 0 };
    this.radiantBans.clear();
    this.direBans.clear();
  }

  /**
   * Pairwise synergy/counter score between two heroes
   */
  getPairwiseInteraction(heroA_id, heroB_id, isAlly) {
    // Deterministic pseudo-interaction based on hero attributes & roles
    const a = this.heroMap.get(heroA_id);
    const b = this.heroMap.get(heroB_id);
    if (!a || !b) return 0;

    let delta = 0;
    if (isAlly) {
      // Complementary roles (e.g. Carry + Support) have positive synergy
      if ((a.roles.includes("Carry") && b.roles.includes("Support")) ||
          (a.roles.includes("Support") && b.roles.includes("Carry"))) {
        delta += 1.8;
      } else if (a.roles.includes("Initiator") && b.roles.includes("Nuker")) {
        delta += 1.2;
      } else {
        delta += 0.5;
      }
    } else {
      // Counter heuristics (e.g., Nukers counter squishy Carries, Durable counters Nukers)
      if (b.roles.includes("Disabler") && a.roles.includes("Escape")) {
        delta -= 2.1;
      } else if (b.roles.includes("Durable") && a.roles.includes("Nuker")) {
        delta -= 1.5;
      } else {
        delta -= 0.8;
      }
    }
    return parseFloat(delta.toFixed(1));
  }

  /**
   * Returns the complete 10-row Picked Log matrix for a picked hero
   */
  getPickedLog(heroId, pos, faction) {
    const hero = this.heroMap.get(heroId);
    if (!hero) return [];

    const isRadiant = faction === "radiant";
    const allies = isRadiant ? this.radiantPicks : this.direPicks;
    const enemies = isRadiant ? this.direPicks : this.radiantPicks;

    const rows = [];

    // Rows 1-5: Radiant slots
    for (let p = 1; p <= 5; p++) {
      const slotHeroId = isRadiant ? allies[p] : enemies[p];
      if (slotHeroId === heroId) {
        // Self base role score
        rows.push({
          pos: p,
          faction: "radiant",
          hero: hero,
          isSelf: true,
          value: parseFloat((hero.liveWinRate - 50.0).toFixed(1))
        });
      } else if (slotHeroId) {
        const slotHero = this.heroMap.get(slotHeroId);
        const val = this.getPairwiseInteraction(heroId, slotHeroId, isRadiant);
        rows.push({
          pos: p,
          faction: "radiant",
          hero: slotHero,
          isSelf: false,
          value: isRadiant ? val : -val
        });
      } else {
        rows.push({ pos: p, faction: "radiant", hero: null, isSelf: false, value: null });
      }
    }

    // Rows 6-10: Dire slots
    for (let p = 1; p <= 5; p++) {
      const slotHeroId = !isRadiant ? allies[p] : enemies[p];
      if (slotHeroId === heroId) {
        rows.push({
          pos: p,
          faction: "dire",
          hero: hero,
          isSelf: true,
          value: parseFloat((hero.liveWinRate - 50.0).toFixed(1))
        });
      } else if (slotHeroId) {
        const slotHero = this.heroMap.get(slotHeroId);
        const val = this.getPairwiseInteraction(heroId, slotHeroId, !isRadiant);
        rows.push({
          pos: p,
          faction: "dire",
          hero: slotHero,
          isSelf: false,
          value: !isRadiant ? val : -val
        });
      } else {
        rows.push({ pos: p, faction: "dire", hero: null, isSelf: false, value: null });
      }
    }

    return rows;
  }

  calculateHeroTrueSynergy(heroId, pos, faction) {
    const log = this.getPickedLog(heroId, pos, faction);
    let total = 0;
    for (const r of log) {
      if (r.value !== null) total += r.value;
    }
    return parseFloat(total.toFixed(1));
  }

  evaluateSwapDelta(faction, fromPos, toPos) {
    const picks = faction === "radiant" ? this.radiantPicks : this.direPicks;
    const heroA = picks[fromPos];
    const heroB = picks[toPos];
    if (!heroA) return 0;

    const currentScore = this.calculateHeroTrueSynergy(heroA, fromPos, faction) +
      (heroB ? this.calculateHeroTrueSynergy(heroB, toPos, faction) : 0);

    const swappedScore = this.calculateHeroTrueSynergy(heroA, toPos, faction) +
      (heroB ? this.calculateHeroTrueSynergy(heroB, fromPos, faction) : 0);

    return parseFloat((swappedScore - currentScore).toFixed(1));
  }

  calculateTeamScores() {
    let radiantTS = 0;
    let direTS = 0;

    for (let pos = 1; pos <= 5; pos++) {
      if (this.radiantPicks[pos]) radiantTS += this.calculateHeroTrueSynergy(this.radiantPicks[pos], pos, "radiant");
      if (this.direPicks[pos]) direTS += this.calculateHeroTrueSynergy(this.direPicks[pos], pos, "dire");
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

  getRecommendationsForSlot(faction, targetPos, searchQuery = "") {
    const pickedSet = new Set([
      ...Object.values(this.radiantPicks).filter(Boolean),
      ...Object.values(this.direPicks).filter(Boolean),
      ...Array.from(this.radiantBans),
      ...Array.from(this.direBans)
    ]);

    const candidates = [];
    const query = searchQuery.toLowerCase().trim();

    for (const hero of this.heroes) {
      if (pickedSet.has(hero.id)) continue;
      if (query && !hero.name.toLowerCase().includes(query)) continue;

      const rawTS = this.calculateHeroTrueSynergy(hero.id, targetPos, faction);
      const bias = this.getBias(hero.id);
      const biasedScore = parseFloat((rawTS + bias).toFixed(1));

      candidates.push({ hero, rawTS, bias, biasedScore });
    }

    return candidates.sort((a, b) => b.biasedScore - a.biasedScore);
  }
}
