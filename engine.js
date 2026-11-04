/**
 * RoshEngine: Accurate Projected TrueSynergy, Competitive Role Qualifications, and Personal Bias.
 */

// Accurate competitive positions for Dota 2 heroes
const COMPETITIVE_POSITIONS = {
  1: new Set([1, 4, 6, 8, 10, 12, 18, 32, 41, 42, 44, 48, 54, 56, 67, 70, 72, 73, 81, 89, 93, 94, 95, 109, 114, 138]), // Carries (AM, Jugg, Morph, PL, Void, WK, PA, Luna, LS, Spec, Ursa, Slark, MK, Muerta, etc.)
  2: new Set([11, 13, 17, 19, 21, 22, 25, 34, 35, 36, 39, 43, 46, 47, 49, 74, 76, 82, 106, 120, 126]), // Mid (SF, Puck, Storm, Tiny, Zeus, Lina, Tinker, Sniper, QoP, TA, Viper, DK, Invoker, OD, Meepo, Ember, Void Spirit)
  3: new Set([2, 15, 16, 28, 29, 33, 38, 51, 57, 69, 77, 78, 85, 96, 97, 98, 99, 104, 108, 110, 129, 135, 137]), // Offlane (Axe, Razor, SK, Slardar, Tide, Enigma, Beast, Clock, Omni, Doom, Lycan, Brew, Undying, Centaur, Magnus, BB, LC, Underlord, Mars, PB)
  4: new Set([7, 9, 14, 20, 26, 45, 53, 62, 64, 71, 86, 87, 88, 90, 100, 101, 105, 107, 119, 121, 123, 128, 136]), // Soft Support (ES, Mirana, Pudge, Venge, Lion, Pugna, NP, BH, SB, Rubick, Disruptor, KotL, Tusk, Skywrath, Techies, Grim, Hoodwink, Marci)
  5: new Set([3, 5, 27, 30, 31, 50, 64, 68, 75, 79, 83, 84, 91, 102, 111, 112]) // Hard Support (Bane, CM, Shaman, WD, Lich, Dazzle, Jakiro, AA, Silencer, Shadow Demon, Treant, Ogre, Io, Abaddon, Oracle, Winter Wyvern)
};

export class RoshEngine {
  constructor(heroes = []) {
    this.heroes = heroes;
    this.heroMap = new Map(heroes.map(h => [h.id, h]));

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

  getHeroWinRate(hero) {
    if (!hero) return 50.0;
    return hero.liveWinRate || hero.baseWinRate || 50.0;
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
    if (banSet.has(heroId)) banSet.delete(heroId);
    else banSet.add(heroId);
  }

  resetDraft() {
    this.radiantPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.direPicks = { 1: null, 2: null, 3: null, 4: null, 5: null };
    this.originalTS = { radiant: 0, dire: 0 };
    this.radiantBans.clear();
    this.direBans.clear();
  }

  isHeroQualifiedForPosition(hero, targetPos) {
    const qualifiedSet = COMPETITIVE_POSITIONS[targetPos];
    if (qualifiedSet && qualifiedSet.has(hero.id)) return true;
    return hero.defaultPos === targetPos;
  }

  getPairwiseInteraction(heroA_id, heroB_id, isAlly) {
    const a = this.heroMap.get(heroA_id);
    const b = this.heroMap.get(heroB_id);
    if (!a || !b) return 0;

    let delta = 0;
    if (isAlly) {
      if ((a.roles?.includes("Carry") && b.roles?.includes("Support")) ||
          (a.roles?.includes("Support") && b.roles?.includes("Carry"))) {
        delta += 1.8;
      } else if (a.roles?.includes("Initiator") && b.roles?.includes("Nuker")) {
        delta += 1.2;
      } else {
        delta += 0.5;
      }
    } else {
      if (b.roles?.includes("Disabler") && a.roles?.includes("Escape")) {
        delta -= 2.1;
      } else if (b.roles?.includes("Durable") && a.roles?.includes("Nuker")) {
        delta -= 1.5;
      } else {
        delta -= 0.8;
      }
    }
    return parseFloat(delta.toFixed(1));
  }

  /**
   * Calculates the projected TrueSynergy for ANY hero (picked or candidate)
   */
  calculateProjectedTrueSynergy(heroId, pos, faction) {
    const hero = this.heroMap.get(heroId);
    if (!hero) return 0;

    // 1. Live base win rate relative to 50%
    const winRate = this.getHeroWinRate(hero);
    let total = winRate - 50.0;

    const isRadiant = faction === "radiant";
    const allies = isRadiant ? this.radiantPicks : this.direPicks;
    const enemies = isRadiant ? this.direPicks : this.radiantPicks;

    // 2. Add pairwise interactions with allies
    for (let p = 1; p <= 5; p++) {
      const allyId = allies[p];
      if (allyId && allyId !== heroId) {
        total += this.getPairwiseInteraction(heroId, allyId, true);
      }
    }

    // 3. Subtract counter interactions with enemies
    for (let p = 1; p <= 5; p++) {
      const enemyId = enemies[p];
      if (enemyId) {
        total -= this.getPairwiseInteraction(heroId, enemyId, false);
      }
    }

    return parseFloat(total.toFixed(1));
  }

  /**
   * Generates the 10-row matrix log for a picked hero
   */
  getPickedLog(heroId, pos, faction) {
    const hero = this.heroMap.get(heroId);
    if (!hero) return [];

    const isRadiant = faction === "radiant";
    const allies = isRadiant ? this.radiantPicks : this.direPicks;
    const enemies = isRadiant ? this.direPicks : this.radiantPicks;

    const rows = [];

    // Rows 1 to 5: Radiant
    for (let p = 1; p <= 5; p++) {
      const slotHeroId = isRadiant ? allies[p] : enemies[p];
      if (slotHeroId === heroId) {
        rows.push({
          pos: p,
          hero: hero,
          isSelf: true,
          value: parseFloat((this.getHeroWinRate(hero) - 50.0).toFixed(1))
        });
      } else if (slotHeroId) {
        const slotHero = this.heroMap.get(slotHeroId);
        const val = this.getPairwiseInteraction(heroId, slotHeroId, isRadiant);
        rows.push({
          pos: p,
          hero: slotHero,
          isSelf: false,
          value: isRadiant ? val : -val
        });
      } else {
        rows.push({ pos: p, hero: null, isSelf: false, value: null });
      }
    }

    // Rows 6 to 10: Dire
    for (let p = 1; p <= 5; p++) {
      const slotHeroId = !isRadiant ? allies[p] : enemies[p];
      if (slotHeroId === heroId) {
        rows.push({
          pos: p,
          hero: hero,
          isSelf: true,
          value: parseFloat((this.getHeroWinRate(hero) - 50.0).toFixed(1))
        });
      } else if (slotHeroId) {
        const slotHero = this.heroMap.get(slotHeroId);
        const val = this.getPairwiseInteraction(heroId, slotHeroId, !isRadiant);
        rows.push({
          pos: p,
          hero: slotHero,
          isSelf: false,
          value: !isRadiant ? val : -val
        });
      } else {
        rows.push({ pos: p, hero: null, isSelf: false, value: null });
      }
    }

    return rows;
  }

  evaluateSwapDelta(faction, fromPos, toPos) {
    const picks = faction === "radiant" ? this.radiantPicks : this.direPicks;
    const heroA = picks[fromPos];
    const heroB = picks[toPos];
    if (!heroA) return 0;

    const currentScore = this.calculateProjectedTrueSynergy(heroA, fromPos, faction) +
      (heroB ? this.calculateProjectedTrueSynergy(heroB, toPos, faction) : 0);

    const swappedScore = this.calculateProjectedTrueSynergy(heroA, toPos, faction) +
      (heroB ? this.calculateProjectedTrueSynergy(heroB, fromPos, faction) : 0);

    return parseFloat((swappedScore - currentScore).toFixed(1));
  }

  calculateTeamScores() {
    let radiantTS = 0;
    let direTS = 0;

    for (let pos = 1; pos <= 5; pos++) {
      if (this.radiantPicks[pos]) radiantTS += this.calculateProjectedTrueSynergy(this.radiantPicks[pos], pos, "radiant");
      if (this.direPicks[pos]) direTS += this.calculateProjectedTrueSynergy(this.direPicks[pos], pos, "dire");
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

      if (query) {
        if (!hero.name.toLowerCase().includes(query)) continue;
      } else {
        if (!this.isHeroQualifiedForPosition(hero, targetPos)) continue;
      }

      const rawTS = this.calculateProjectedTrueSynergy(hero.id, targetPos, faction);
      const bias = this.getBias(hero.id);
      const biasedScore = parseFloat((rawTS + bias).toFixed(1));

      candidates.push({ hero, rawTS, bias, biasedScore });
    }

    return candidates.sort((a, b) => b.biasedScore - a.biasedScore);
  }
}
