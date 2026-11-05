// In-memory cache for raw stats from OpenDota to enable instant rank recalculations
let cachedRawHeroes = null;

/**
 * Fetches all Dota 2 hero data and calculates dynamic win rates based on selected rank brackets [1 to 8]
 */
export async function fetchLiveHeroStats(selectedBrackets = [1, 2, 3, 4, 5, 6, 7, 8]) {
  try {
    if (!cachedRawHeroes) {
      const response = await fetch("https://api.opendota.com/api/heroStats");
      if (!response.ok) throw new Error("Network response was not ok");
      cachedRawHeroes = await response.json();
    }

    const brackets = (selectedBrackets && selectedBrackets.length > 0) 
      ? selectedBrackets 
      : [1, 2, 3, 4, 5, 6, 7, 8];

    return cachedRawHeroes.map((hero) => {
      let picks = 0;
      let wins = 0;

      brackets.forEach((b) => {
        picks += hero[`${b}_pick`] || 0;
        wins += hero[`${b}_win`] || 0;
      });

      const liveWinRate = picks > 0 ? parseFloat(((wins / picks) * 100).toFixed(2)) : 50.0;
      const shortName = hero.name.replace("npc_dota_hero_", "");

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
        baseWinRate: liveWinRate,
        picks: picks,
        wins: wins
      };
    });
  } catch (error) {
    console.error("Failed to fetch live Dota stats:", error);
    return [];
  }
}
