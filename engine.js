import { heroMatchesQuery } from "./heroes.js";

// Lane matchup weights from DotaBASED / STRATZ regression
const ROLE_MATCHUP_WEIGHTS = {
  "2vs2": 1.60, // Mid 1v1 pressure is the single most decisive lane matchup
  "1vs3": 1.35, // Safelane Carry vs Offlaner
  "3vs1": 1.35,
  "3vs5": 1.20, // Offlane Core vs Safelane Support
  "5vs3": 1.20,
  "1vs4": 1.10, // Safelane Carry vs Soft Support
  "4vs1": 1.10,
  "4vs5": 1.05,
  "5vs4": 1.05,
  "default": 0.85 // Cross-lane teamfight matchups
};

// Lane synergy weights
const ROLE_SYNERGY_WEIGHTS = {
  "1+5": 1.30, // Safelane Core + Hard Support Duo
  "5+1": 1.30,
  "3+4": 1.25, // Offlane Core + Soft Support Duo
  "4+3": 1.25,
  "2+4": 1.10, // Mid + Soft Support Gank synergy
  "4+2": 1.10,
  "default": 0.80
};

const COMPETITIVE_POSITIONS = {
  1: new Set([1, 4, 6, 8, 10, 12, 18, 32, 41, 42, 44, 48, 54, 56, 67, 70, 72, 73, 81, 89, 93, 94, 95, 109, 114, 138]),
  2: new Set([11, 13, 17, 19, 21, 22, 25, 34, 35, 36, 39, 43, 46, 47, 49, 74, 76, 82, 106, 120, 126]),
  3: new Set([2, 15, 16, 28, 29, 33, 38, 51, 57, 69, 77, 78, 85, 96, 97, 98, 99, 104, 108, 110, 129, 135, 137]),
  4: new Set([7, 9, 14, 20, 26, 45, 53, 62, 64, 71, 86, 87, 88, 90, 100, 101, 105, 107, 119, 121, 123, 128, 136]),
  5: new Set([3, 5, 27, 30, 31, 50, 64, 68, 75, 79, 83, 84, 91, 102, 111, 112])
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

    // Cache of raw empirical head-to-head win rate tables: heroId -> { enemyHeroId: winRateVsEnemy }
    this.matchupTables = new Map();
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

  setHeroMatchups(heroId, rawWinRates) {
    this.matchupTables.set(heroId, rawWinRates);
  }

  getHeroWinRate(hero) {
    if (!hero) return 50.0;
    return hero.liveWinRate !== undefined ? hero.liveWinRate : 50.0;
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

  /**
   * CANONICAL ADVANTAGE FORMULA:
   * Advantage(A vs B) = WinRate(A vs B) - BaselineWinRate(A)
   */
  getEmpiricalCounterAdvantage(heroA_id, posA, heroB_id, posB) {
    const heroA = this.heroMap.get(heroA_id);
    const heroB = this.heroMap.get(heroB_id);
    if (!heroA || !heroB) return 0;

    const baseA = this.getHeroWinRate(heroA);
    const baseB = this.getHeroWinRate(heroB);

    let rawAdvantage = 0;
    const tableA = this.matchupTables.get(heroA_id);
    const tableB = this.matchupTables.get(heroB_id);

    if (tableA && tableA[heroB_id] !== undefined) {
      // Direct head-to-head: WinRate(A vs B) - BaseWinRate(A)
      const winRateAvsB = tableA[heroB_id];
      rawAdvantage = winRateAvsB - baseA;
    } else if (tableB && tableB[heroA_id] !== undefined) {
      // By symmetry: WinRate(B vs A) is known, so WinRate(A vs B) = 100 - WinRate(B vs A)
      const winRateBvsA = tableB[heroA_id];
      const winRateAvsB = 100.0 - winRateBvsA;
      rawAdvantage = winRateAvsB - baseA;
    } else {
      // Baseline relative delta if network matchup has not arrived yet
      rawAdvantage = (baseA - baseB) * 0.35;
    }

    // Apply role-to-role lane weight (DotaBASED hierarchy)
    const roleKey = `${posA}vs${posB}`;
    const weight = ROLE_MATCHUP_WEIGHTS[roleKey] || ROLE_MATCHUP_WEIGHTS["default"];

    return parseFloat((rawAdvantage * weight).toFixed(1));
  }

  getEmpiricalSynergy(heroA_id, posA, heroB_id, posB) {
    const roleKey = `${posA}+${posB}`;
    const weight = ROLE_SYNERGY_WEIGHTS[roleKey] || ROLE_SYNERGY_WEIGHTS["default"];

    const heroA = this.heroMap.get(heroA_id);
    const heroB = this.heroMap.get(heroB_id);
    if (!heroA || !heroB) return 0;

    let synBase = 0.5;
    if ((heroA.roles?.includes("Carry") && heroB.roles?.includes("Support")) ||
        (heroA.roles?.includes("Support") && heroB.roles?.includes("Carry"))) {
      synBase = 1.5;
    } else if (heroA.roles?.includes("Initiator") && heroB.roles?.includes("Nuker")) {
      synBase = 1.1;
    }

    return parseFloat((synBase * weight).toFixed(1));
  }

  calculateProjectedTrueSynergy(heroId, targetPos, faction) {
    const hero = this.heroMap.get(heroId);
    if (!hero) return 0;

    // 1. Live win rate baseline (Pos 1 Carry baseline weighted higher per DotaBASED Rank 2)
    const winRate = this.getHeroWinRate(hero);
    const posMultiplier = targetPos === 1 ? 1.25 : targetPos === 2 ? 1.15 : 1.0;
    let total = (winRate - 50.0) * posMultiplier;

    const isRadiant = faction === "radiant";
    const allies = isRadiant ? this.radiantPicks : this.direPicks;
    const enemies = isRadiant ? this.direPicks : this.radiantPicks;

    // 2. Add ally lane synergies
    for (let p = 1; p <= 5; p++) {
      const allyId = allies[p];
      if (allyId && allyId !== heroId) {
        total += this.getEmpiricalSynergy(heroId, targetPos, allyId, p);
      }
    }

    // 3. Add enemy counter advantages (Positive if hero counters enemy, Negative if countered)
    for (let p = 1; p <= 5; p++) {
      const enemyId = enemies[p];
      if (enemyId) {
        total += this.getEmpiricalCounterAdvantage(heroId, targetPos, enemyId, p);
      }
    }

    return parseFloat(total.toFixed(1));
  }

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
        const val = isRadiant 
          ? this.getEmpiricalSynergy(heroId, pos, slotHeroId, p)
          : this.getEmpiricalCounterAdvantage(heroId, pos, slotHeroId, p);
        rows.push({ pos: p, hero: slotHero, isSelf: false, value: val });
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
        const val = !isRadiant
          ? this.getEmpiricalSynergy(heroId, pos, slotHeroId, p)
          : this.getEmpiricalCounterAdvantage(heroId, pos, slotHeroId, p);
        rows.push({ pos: p, hero: slotHero, isSelf: false, value: val });
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
    const query = searchQuery.trim();

    for (const hero of this.heroes) {
      if (pickedSet.has(hero.id)) continue;

      if (query) {
        if (!heroMatchesQuery(hero, query)) continue;
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
