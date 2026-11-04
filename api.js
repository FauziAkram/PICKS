// Map rank dropdown values to OpenDota rank bracket numbers
// 1: Herald, 2: Guardian, 3: Crusader, 4: Archon, 5: Legend, 6: Ancient, 7: Divine, 8: Immortal
const RANK_MAPPING = {
  "GUARDIAN_HERALD": [1, 2],
  "CRUSADER": [3],
  "ARCHON": [4],
  "LEGEND": [5],
  "ANCIENT": [6],
  "DIVINE_IMMORTAL": [7, 8]
};

// Cache for live matchup counter data to minimize network calls
const matchupCache = new Map();

/**
 * Fetches all live Dota 2 hero data and calculates dynamic win rates based on the chosen rank.
 */
export async function fetchLiveHeroStats(selectedRank = "LEGEND") {
  try {
    const response = await fetch("https://api.opendota.com/api/heroStats");
    if (!response.ok) throw new Error("Network response was not ok");
    const rawHeroes = await response.json();

    const brackets = RANK_MAPPING[selectedRank] || [5];

    return rawHeroes.map((hero) => {
      // Sum picks and wins for the selected rank brackets
      let picks = 0;
      let wins = 0;

      brackets.forEach((b) => {
        picks += hero[`${b}_pick`] || 0;
        wins += hero[`${b}_win`] || 0;
      });

      // Calculate live win percentage (default to 50% if sample size is tiny)
      const liveWinRate = picks > 0 ? parseFloat(((wins / picks) * 100).toFixed(2)) : 50.0;

      // Extract short name for official Valve CDN portrait images
      // e.g. "npc_dota_hero_antimage" -> "antimage"
      const shortName = hero.name.replace("npc_dota_hero_", "");

      // Assign default primary position heuristic from hero roles
      let defaultPos = 1;
      if (hero.roles.includes("Hard Support")) defaultPos = 5;
      else if (hero.roles.includes("Support")) defaultPos = 4;
      else if (hero.roles.includes("Initiator") || hero.roles.includes("Durable")) defaultPos = 3;
      else if (hero.roles.includes("Nuker") && hero.primary_attr === "int") defaultPos = 2;
      else if (hero.roles.includes("Carry")) defaultPos = 1;

      return {
        id: hero.id,
        name: hero.localized_name,
        shortName: shortName,
        img: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${shortName}.png`,
        primaryAttr: hero.primary_attr,
        roles: hero.roles,
        defaultPos: defaultPos,
        liveWinRate: liveWinRate,
        picks: picks,
        wins: wins
      };
    });
  } catch (error) {
    console.error("Failed to fetch live Dota stats:", error);
    return [];
  }
}

/**
 * Fetches live counter and advantage data for a specific hero vs all other heroes
 */
export async function fetchHeroMatchups(heroId) {
  if (matchupCache.has(heroId)) {
    return matchupCache.get(heroId);
  }

  try {
    const response = await fetch(`https://api.opendota.com/api/heroes/${heroId}/matchups`);
    if (!response.ok) return {};
    const matchups = await response.json();

    // Map: enemyHeroId -> matchup win rate advantage
    const lookup = {};
    matchups.forEach((m) => {
      // win rate when playing against this enemy
      const vsWinRate = m.games_played > 0 ? (m.wins / m.games_played) * 100 : 50;
      // Advantage relative to 50%
      lookup[m.hero_id] = parseFloat((vsWinRate - 50).toFixed(2));
    });

    matchupCache.set(heroId, lookup);
    return lookup;
  } catch (err) {
    console.error(`Error fetching matchups for hero ${heroId}:`, err);
    return {};
  }
}
