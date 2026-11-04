// Official Valve Steam CDN Hero Portrait Helper
export const getHeroImg = (shortName) => 
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${shortName}.png`;

// STRATZ Role Icons (SVG)
export const ROLE_ICONS = {
  1: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>`, // Pos 1 Sword
  2: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>`, // Pos 2 Crosshair/Mid
  3: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, // Pos 3 Shield
  4: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`, // Pos 4 Flame
  5: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.9-2.3L2.3 14.5a1.7 1.7 0 0 1 2.4-2.4L7 14"/></svg>` // Pos 5 Hand
};

export const ROLE_NAMES = {
  1: "Carry",
  2: "Mid",
  3: "Offlane",
  4: "Soft Support",
  5: "Hard Support"
};

// Roster of Dota 2 Heroes with default lane qualifications and Valve short names
export const HEROES = [
  { id: 1, name: "Anti-Mage", shortName: "antimage", defaultPos: 1, baseWinRate: 51.2 },
  { id: 2, name: "Axe", shortName: "axe", defaultPos: 3, baseWinRate: 52.4 },
  { id: 3, name: "Bane", shortName: "bane", defaultPos: 5, baseWinRate: 49.8 },
  { id: 4, name: "Bloodseeker", shortName: "bloodseeker", defaultPos: 1, baseWinRate: 49.5 },
  { id: 5, name: "Crystal Maiden", shortName: "crystal_maiden", defaultPos: 5, baseWinRate: 52.8 },
  { id: 6, name: "Drow Ranger", shortName: "drow_ranger", defaultPos: 1, baseWinRate: 50.6 },
  { id: 7, name: "Earthshaker", shortName: "earthshaker", defaultPos: 4, baseWinRate: 51.5 },
  { id: 8, name: "Juggernaut", shortName: "juggernaut", defaultPos: 1, baseWinRate: 51.8 },
  { id: 9, name: "Mirana", shortName: "mirana", defaultPos: 4, baseWinRate: 48.9 },
  { id: 10, name: "Morphling", shortName: "morphling", defaultPos: 1, baseWinRate: 47.5 },
  { id: 11, name: "Shadow Fiend", shortName: "nevermore", defaultPos: 2, baseWinRate: 50.1 },
  { id: 12, name: "Phantom Lancer", shortName: "phantom_lancer", defaultPos: 1, baseWinRate: 51.9 },
  { id: 13, name: "Puck", shortName: "puck", defaultPos: 2, baseWinRate: 49.2 },
  { id: 14, name: "Pudge", shortName: "pudge", defaultPos: 4, baseWinRate: 50.8 },
  { id: 15, name: "Razor", shortName: "razor", defaultPos: 3, baseWinRate: 50.3 },
  { id: 16, name: "Sand King", shortName: "sand_king", defaultPos: 3, baseWinRate: 52.1 },
  { id: 17, name: "Storm Spirit", shortName: "storm_spirit", defaultPos: 2, baseWinRate: 50.7 },
  { id: 18, name: "Sven", shortName: "sven", defaultPos: 1, baseWinRate: 51.0 },
  { id: 19, name: "Tiny", shortName: "tiny", defaultPos: 2, baseWinRate: 49.6 },
  { id: 20, name: "Vengeful Spirit", shortName: "vengefulspirit", defaultPos: 5, baseWinRate: 53.2 },
  { id: 21, name: "Windranger", shortName: "windrunner", defaultPos: 2, baseWinRate: 50.4 },
  { id: 22, name: "Zeus", shortName: "zuus", defaultPos: 2, baseWinRate: 52.6 },
  { id: 25, name: "Lina", shortName: "lina", defaultPos: 2, baseWinRate: 51.1 },
  { id: 26, name: "Lion", shortName: "lion", defaultPos: 5, baseWinRate: 49.3 },
  { id: 27, name: "Shadow Shaman", shortName: "shadow_shaman", defaultPos: 5, baseWinRate: 51.4 },
  { id: 28, name: "Slardar", shortName: "slardar", defaultPos: 3, baseWinRate: 53.0 },
  { id: 29, name: "Tidehunter", shortName: "tidehunter", defaultPos: 3, baseWinRate: 51.7 },
  { id: 30, name: "Witch Doctor", shortName: "witch_doctor", defaultPos: 5, baseWinRate: 52.9 },
  { id: 31, name: "Lich", shortName: "lich", defaultPos: 5, baseWinRate: 52.0 },
  { id: 32, name: "Riki", shortName: "riki", defaultPos: 1, baseWinRate: 51.3 },
  { id: 33, name: "Enigma", shortName: "enigma", defaultPos: 3, baseWinRate: 50.5 },
  { id: 34, name: "Tinker", shortName: "tinker", defaultPos: 2, baseWinRate: 48.7 },
  { id: 35, name: "Sniper", shortName: "sniper", defaultPos: 2, baseWinRate: 51.6 },
  { id: 36, name: "Necrophos", shortName: "necrolyte", defaultPos: 2, baseWinRate: 52.2 },
  { id: 38, name: "Beastmaster", shortName: "beastmaster", defaultPos: 3, baseWinRate: 51.0 },
  { id: 39, name: "Queen of Pain", shortName: "queenofpain", defaultPos: 2, baseWinRate: 49.9 },
  { id: 41, name: "Faceless Void", shortName: "faceless_void", defaultPos: 1, baseWinRate: 50.8 },
  { id: 42, name: "Wraith King", shortName: "skeleton_king", defaultPos: 1, baseWinRate: 52.5 },
  { id: 44, name: "Phantom Assassin", shortName: "phantom_assassin", defaultPos: 1, baseWinRate: 50.9 },
  { id: 45, name: "Pugna", shortName: "pugna", defaultPos: 4, baseWinRate: 50.1 },
  { id: 46, name: "Templar Assassin", shortName: "templar_assassin", defaultPos: 2, baseWinRate: 50.7 },
  { id: 47, name: "Viper", shortName: "viper", defaultPos: 2, baseWinRate: 51.8 },
  { id: 48, name: "Luna", shortName: "luna", defaultPos: 1, baseWinRate: 51.4 },
  { id: 49, name: "Dragon Knight", shortName: "dragon_knight", defaultPos: 2, baseWinRate: 51.5 },
  { id: 50, name: "Dazzle", shortName: "dazzle", defaultPos: 5, baseWinRate: 50.6 },
  { id: 53, name: "Nature's Prophet", shortName: "furion", defaultPos: 4, baseWinRate: 48.8 },
  { id: 54, name: "Lifestealer", shortName: "life_stealer", defaultPos: 1, baseWinRate: 51.6 },
  { id: 56, name: "Clinkz", shortName: "clinkz", defaultPos: 1, baseWinRate: 50.2 },
  { id: 57, name: "Omniknight", shortName: "omniknight", defaultPos: 3, baseWinRate: 52.3 },
  { id: 64, name: "Jakiro", shortName: "jakiro", defaultPos: 5, baseWinRate: 52.4 },
  { id: 67, name: "Spectre", shortName: "spectre", defaultPos: 1, baseWinRate: 52.7 },
  { id: 70, name: "Ursa", shortName: "ursa", defaultPos: 1, baseWinRate: 51.9 },
  { id: 74, name: "Invoker", shortName: "invoker", defaultPos: 2, baseWinRate: 49.5 },
  { id: 75, name: "Silencer", shortName: "silencer", defaultPos: 5, baseWinRate: 50.5 },
  { id: 82, name: "Meepo", shortName: "meepo", defaultPos: 2, baseWinRate: 53.1 },
  { id: 84, name: "Ogre Magi", shortName: "ogre_magi", defaultPos: 5, baseWinRate: 51.7 },
  { id: 86, name: "Rubick", shortName: "rubick", defaultPos: 4, baseWinRate: 48.5 },
  { id: 93, name: "Slark", shortName: "slark", defaultPos: 1, baseWinRate: 51.1 },
  { id: 99, name: "Bristleback", shortName: "bristleback", defaultPos: 3, baseWinRate: 51.8 },
  { id: 104, name: "Legion Commander", shortName: "legion_commander", defaultPos: 3, baseWinRate: 51.4 },
  { id: 106, name: "Ember Spirit", shortName: "ember_spirit", defaultPos: 2, baseWinRate: 50.1 },
  { id: 114, name: "Monkey King", shortName: "monkey_king", defaultPos: 1, baseWinRate: 49.8 },
  { id: 121, name: "Grimstroke", shortName: "grimstroke", defaultPos: 4, baseWinRate: 49.4 },
  { id: 123, name: "Hoodwink", shortName: "hoodwink", defaultPos: 4, baseWinRate: 50.2 },
  { id: 137, name: "Primal Beast", shortName: "primal_beast", defaultPos: 3, baseWinRate: 51.3 },
  { id: 138, name: "Muerta", shortName: "muerta", defaultPos: 1, baseWinRate: 49.7 }
];

// Helper lookup map by ID
export const HERO_MAP = new Map(HEROES.map(h => [h.id, h]));
