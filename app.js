import { fetchLiveHeroStats } from "./api.js";
import { ROLE_ICONS, ROLE_NAMES } from "./heroes.js";
import { RoshEngine } from "./engine.js";

let engine = null;
let currentSearchQueries = { radiant: {}, dire: {} };
let currentBanFaction = null;

async function init() {
  const rankSelect = document.getElementById("rankSelector");
  const initialRank = rankSelect ? rankSelect.value : "LEGEND";

  const heroes = await fetchLiveHeroStats(initialRank);
  engine = new RoshEngine(heroes);

  setupEventListeners();
  renderAll();
}

function renderAll() {
  renderScores();
  renderColumns("radiant");
  renderColumns("dire");
}

function renderScores() {
  const scores = engine.calculateTeamScores();

  document.getElementById("radiantOriginalTS").textContent = scores.originalRadiant.toFixed(1);
  document.getElementById("radiantCurrentTS").textContent = scores.radiant.toFixed(1);

  document.getElementById("direOriginalTS").textContent = scores.originalDire.toFixed(1);
  document.getElementById("direCurrentTS").textContent = scores.dire.toFixed(1);

  const diffEl = document.getElementById("tsDifferential");
  const sign = scores.diff > 0 ? "+" : "";
  diffEl.textContent = `${sign}${scores.diff.toFixed(1)}`;
  diffEl.className = `text-lg font-black ${scores.diff >= 0 ? "text-gold" : "text-dire"}`;
}

function renderColumns(faction) {
  const container = document.getElementById(`${faction}Columns`);
  if (!container) return;
  container.innerHTML = "";

  const picks = faction === "radiant" ? engine.radiantPicks : engine.direPicks;

  for (let pos = 1; pos <= 5; pos++) {
    const heroId = picks[pos];
    const col = document.createElement("div");
    col.className = "flex flex-col bg-stratzCard border border-stratzBorder rounded-lg overflow-hidden h-[740px]";

    if (heroId) {
      renderPickedColumn(col, faction, pos, heroId);
    } else {
      renderEmptyColumn(col, faction, pos);
    }

    container.appendChild(col);
  }
}

function renderEmptyColumn(col, faction, pos) {
  const searchVal = (currentSearchQueries[faction] && currentSearchQueries[faction][pos]) || "";
  const candidates = engine.getRecommendationsForSlot(faction, pos, searchVal);

  col.innerHTML = `
    <!-- Top Role Icon -->
    <div class="p-2 border-b border-stratzBorder flex justify-center bg-stratzSubCard/40">
      <div class="w-8 h-8 rounded bg-stratzBg border border-stratzBorder flex items-center justify-center text-gray-300" title="${ROLE_NAMES[pos]}">
        ${ROLE_ICONS[pos]}
      </div>
    </div>

    <!-- Search Input -->
    <div class="p-1.5 border-b border-stratzBorder bg-stratzBg/50 flex items-center gap-1">
      <input type="text" placeholder="Hero..." value="${searchVal}" 
        class="slot-search w-full bg-stratzBg text-[11px] text-gray-200 px-2 py-1 rounded border border-stratzBorder focus:outline-none focus:border-gold"
        data-faction="${faction}" data-pos="${pos}">
    </div>

    <!-- Recommendation Rows -->
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1">
      ${candidates.slice(0, 40).map(({ hero, rawTS, bias, biasedScore }) => `
        <div class="candidate-row group flex items-center justify-between p-1 rounded hover:bg-stratzBorder/60 cursor-pointer transition border border-transparent hover:border-stratzBorder"
             data-faction="${faction}" data-pos="${pos}" data-heroid="${hero.id}">
          <div class="flex items-center space-x-1.5 overflow-hidden">
            <img src="${hero.img}" class="w-8 h-5 object-cover rounded" alt="${hero.name}">
            <div class="truncate text-[11px] font-medium text-gray-300 group-hover:text-white">${hero.name}</div>
          </div>
          <div class="text-right flex items-center space-x-1 flex-shrink-0">
            ${bias !== 0 ? `
              <span class="text-[9px] px-1 rounded font-mono ${bias > 0 ? "bg-radiant/20 text-radiant" : "bg-red-500/20 text-red-400"}" title="Personal Bias: ${bias > 0 ? "+" : ""}${bias}">
                ${bias > 0 ? "+" : ""}${bias}
              </span>
            ` : ""}
            <span class="text-xs font-mono font-bold ${biasedScore >= 0 ? "text-gray-200" : "text-gray-500"}">${biasedScore.toFixed(1)}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  col.querySelector(".slot-search").addEventListener("input", (e) => {
    currentSearchQueries[faction][pos] = e.target.value;
    renderColumns(faction);
  });

  col.querySelectorAll(".candidate-row").forEach(row => {
    row.addEventListener("click", () => {
      engine.pickHero(row.dataset.faction, parseInt(row.dataset.pos), parseInt(row.dataset.heroid));
      renderAll();
    });
  });
}

function renderPickedColumn(col, faction, pos, heroId) {
  const hero = engine.heroMap.get(heroId);
  const currentTS = engine.calculateHeroTrueSynergy(heroId, pos, faction);
  const logRows = engine.getPickedLog(heroId, pos, faction);

  col.innerHTML = `
    <!-- Hero Portrait -->
    <div class="relative group">
      <img src="${hero.img}" class="w-full h-20 object-cover" alt="${hero.name}">
      <button class="btn-unpick absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white rounded w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition" 
              data-faction="${faction}" data-pos="${pos}" title="Unpick hero">✕</button>
      <div class="absolute bottom-1 left-1.5 text-[11px] font-bold text-white drop-shadow">${hero.name}</div>
    </div>

    <!-- Scores Bar -->
    <div class="p-2 border-b border-stratzBorder bg-stratzSubCard/60 flex items-center justify-between text-xs">
      <div class="flex items-center space-x-1 text-gray-400">
        ${ROLE_ICONS[pos]}
        <span class="text-[10px]">Pos ${pos}</span>
      </div>
      <div class="text-right">
        <span class="text-xs font-black font-mono ${currentTS >= 0 ? "text-white" : "text-red-400"}">${currentTS.toFixed(1)}</span>
        <span class="text-[9px] text-gray-400 block">Current TS</span>
      </div>
    </div>

    <!-- Role Swap Rows with Deltas -->
    <div class="p-1 border-b border-stratzBorder bg-stratzBg/30 space-y-0.5">
      ${[1, 2, 3, 4, 5].filter(p => p !== pos).map(targetPos => {
        const delta = engine.evaluateSwapDelta(faction, pos, targetPos);
        const isPositive = delta > 0;
        return `
          <button class="btn-swap w-full flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] ${isPositive ? "bg-radiant/10 text-radiant hover:bg-radiant/20" : "text-gray-400 hover:text-white hover:bg-stratzBorder/50"} transition"
                  data-faction="${faction}" data-from="${pos}" data-to="${targetPos}">
            <div class="flex items-center space-x-1">
              <span class="opacity-70">${ROLE_ICONS[targetPos]}</span>
              <span>Pos ${targetPos}</span>
            </div>
            <div class="flex items-center space-x-1 font-mono">
              <span>${delta > 0 ? "+" : ""}${delta.toFixed(1)}</span>
              <span>⇄</span>
            </div>
          </button>
        `;
      }).join("")}
    </div>

    <!-- 10-Row Picked Log Matrix (Matching Screenshot) -->
    <div class="flex-1 overflow-y-auto p-1 space-y-0.5 text-[10px] font-mono">
      ${logRows.map(row => {
        if (!row.hero) {
          return `
            <div class="flex items-center justify-between px-1.5 py-0.5 text-gray-600 opacity-40">
              <div class="w-4 h-4 flex items-center justify-center">${ROLE_ICONS[row.pos]}</div>
              <span>-</span>
            </div>
          `;
        }
        return `
          <div class="flex items-center justify-between px-1.5 py-0.5 rounded ${row.isSelf ? "bg-stratzBorder/40" : ""}">
            <div class="flex items-center space-x-1.5 overflow-hidden">
              <img src="${row.hero.img}" class="w-4 h-3 rounded object-cover" alt="">
              <span class="truncate text-gray-300 ${row.isSelf ? "font-bold text-white" : ""}">${row.hero.name}</span>
            </div>
            <span class="${row.value > 0 ? "text-radiant font-bold" : row.value < 0 ? "text-red-400 font-bold" : "text-gray-400"}">
              ${row.value > 0 ? "+" : ""}${row.value.toFixed(1)}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;

  col.querySelector(".btn-unpick").addEventListener("click", () => {
    engine.unpickHero(faction, pos);
    renderAll();
  });

  col.querySelectorAll(".btn-swap").forEach(btn => {
    btn.addEventListener("click", () => {
      engine.swapHeroes(btn.dataset.faction, parseInt(btn.dataset.from), parseInt(btn.dataset.to));
      renderAll();
    });
  });
}

function setupEventListeners() {
  document.getElementById("btnResetDraft").addEventListener("click", () => {
    engine.resetDraft();
    renderAll();
  });

  document.getElementById("rankSelector").addEventListener("change", async (e) => {
    const updatedHeroes = await fetchLiveHeroStats(e.target.value);
    engine.setHeroes(updatedHeroes);
    renderAll();
  });

  // Ban Modals
  document.getElementById("btnRadiantBans").addEventListener("click", () => openBanModal("radiant"));
  document.getElementById("btnDireBans").addEventListener("click", () => openBanModal("dire"));

  // Bias Modal
  const biasModal = document.getElementById("biasModal");
  document.getElementById("btnOpenBiasModal").addEventListener("click", () => {
    renderBiasModal();
    biasModal.classList.remove("hidden");
  });
  document.getElementById("btnCloseBiasModal").addEventListener("click", () => {
    biasModal.classList.add("hidden");
    renderAll();
  });
}

function openBanModal(faction) {
  currentBanFaction = faction;
  let banModal = document.getElementById("banModal");
  if (!banModal) {
    banModal = document.createElement("div");
    banModal.id = "banModal";
    banModal.className = "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center";
    banModal.innerHTML = `
      <div class="bg-stratzCard border border-stratzBorder rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-stratzBorder pb-3 mb-4">
          <h3 id="banModalTitle" class="text-base font-bold text-white">Select Bans</h3>
          <button id="btnCloseBanModal" class="text-gray-400 hover:text-white text-lg font-bold">✕</button>
        </div>
        <input type="text" id="banSearchInput" placeholder="Filter hero..." class="w-full bg-stratzBg border border-stratzBorder rounded px-3 py-1.5 text-xs text-white focus:outline-none mb-3">
        <div id="banGrid" class="grid grid-cols-6 gap-2 max-h-96 overflow-y-auto"></div>
      </div>
    `;
    document.body.appendChild(banModal);

    document.getElementById("btnCloseBanModal").addEventListener("click", () => {
      banModal.classList.add("hidden");
      renderAll();
    });
  }

  document.getElementById("banModalTitle").textContent = `Select Bans for ${faction.toUpperCase()}`;
  banModal.classList.remove("hidden");
  renderBanGrid();
}

function renderBanGrid() {
  const container = document.getElementById("banGrid");
  const banSet = currentBanFaction === "radiant" ? engine.radiantBans : engine.direBans;
  const query = (document.getElementById("banSearchInput").value || "").toLowerCase();

  container.innerHTML = engine.heroes
    .filter(h => h.name.toLowerCase().includes(query))
    .map(hero => {
      const isBanned = banSet.has(hero.id);
      return `
        <div class="ban-hero-item relative rounded overflow-hidden cursor-pointer border ${isBanned ? "border-red-500 opacity-60 grayscale" : "border-stratzBorder hover:border-gold"} transition"
             data-heroid="${hero.id}">
          <img src="${hero.img}" class="w-full h-12 object-cover" alt="${hero.name}">
          ${isBanned ? `<span class="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl">🚫</span>` : ""}
          <div class="text-[9px] text-center truncate px-1 bg-black/80 text-gray-300">${hero.name}</div>
        </div>
      `;
    }).join("");

  container.querySelectorAll(".ban-hero-item").forEach(item => {
    item.addEventListener("click", () => {
      engine.toggleBan(currentBanFaction, parseInt(item.dataset.heroid));
      renderBanGrid();
    });
  });

  document.getElementById("banSearchInput").oninput = renderBanGrid;
}

function renderBiasModal() {
  const container = document.getElementById("biasHeroList");
  if (!container) return;

  container.innerHTML = `
    <div class="mb-3">
      <input type="text" id="biasSearchInput" placeholder="Filter hero to adjust bias..." 
        class="w-full bg-stratzBg border border-stratzBorder rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold">
    </div>
    <div id="biasHeroRows" class="space-y-2"></div>
  `;

  const rowsContainer = document.getElementById("biasHeroRows");

  function drawRows(query = "") {
    rowsContainer.innerHTML = "";
    const filtered = engine.heroes.filter(h => h.name.toLowerCase().includes(query.toLowerCase()));

    filtered.forEach(hero => {
      const currentBias = engine.getBias(hero.id);
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-2 bg-stratzSubCard/40 border border-stratzBorder rounded";
      row.innerHTML = `
        <div class="flex items-center space-x-2">
          <img src="${hero.img}" class="w-8 h-5 object-cover rounded" alt="${hero.name}">
          <span class="font-medium text-gray-200">${hero.name}</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="btn-preset bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="-20">Never (-20)</button>
          <button class="btn-preset bg-stratzBorder hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="0">Reset (0)</button>
          <button class="btn-preset bg-radiant/20 hover:bg-radiant/30 text-radiant px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="5">Comfort (+5)</button>
          <button class="btn-preset bg-amber-500/20 hover:bg-amber-500/30 text-gold px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="10">Main (+10)</button>
          <span class="w-8 text-right font-mono font-bold ${currentBias > 0 ? "text-radiant" : currentBias < 0 ? "text-red-400" : "text-gray-400"}">
            ${currentBias > 0 ? "+" : ""}${currentBias}
          </span>
        </div>
      `;

      row.querySelectorAll(".btn-preset").forEach(btn => {
        btn.addEventListener("click", () => {
          engine.saveBias(parseInt(btn.dataset.heroid), parseFloat(btn.dataset.val));
          drawRows(document.getElementById("biasSearchInput").value);
        });
      });

      rowsContainer.appendChild(row);
    });
  }

  drawRows();
  document.getElementById("biasSearchInput").addEventListener("input", (e) => drawRows(e.target.value));
}

window.addEventListener("DOMContentLoaded", init);
