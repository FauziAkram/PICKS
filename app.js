import { fetchLiveHeroStats } from "./api.js";
import { HEROES, ROLE_ICONS, ROLE_NAMES, heroMatchesQuery } from "./heroes.js";
import { RoshEngine } from "./engine.js";

const SWAP_ICON = `
  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M7 16V4m0 0L3 8m4-4l4 4m10 4v12m0 0l4-4m-4 4l-4-4"/>
  </svg>
`;

let engine = new RoshEngine(HEROES);
let currentSearchQueries = { radiant: {}, dire: {} };
let currentBanFaction = "radiant";
let activeRanks = new Set([1, 2, 3, 4, 5, 6, 7, 8]); // Default: All Ranks (General)

function init() {
  setupEventListeners();
  renderAll();

  // Load live stats across all ranks
  fetchLiveHeroStats(Array.from(activeRanks)).then(liveHeroes => {
    if (liveHeroes && liveHeroes.length > 0) {
      engine.setHeroes(liveHeroes);
      renderAll();
    }
  });
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
    col.id = `col-${faction}-${pos}`;

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

    <!-- Scrollable Candidate Recommendation List -->
    <div class="candidate-list-container flex-1 overflow-y-auto p-1.5 space-y-1"></div>
  `;

  const listContainer = col.querySelector(".candidate-list-container");
  updateCandidateList(listContainer, faction, pos, searchVal);

  const input = col.querySelector(".slot-search");
  input.addEventListener("input", (e) => {
    const query = e.target.value;
    if (!currentSearchQueries[faction]) currentSearchQueries[faction] = {};
    currentSearchQueries[faction][pos] = query;

    // PRESERVE FOCUS: Only update the candidate list, DO NOT re-render the input!
    updateCandidateList(listContainer, faction, pos, query);
  });
}

function updateCandidateList(container, faction, pos, query) {
  const candidates = engine.getRecommendationsForSlot(faction, pos, query);

  container.innerHTML = candidates.slice(0, 40).map(({ hero, rawTS, bias, biasedScore }) => `
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
  `).join("");

  container.querySelectorAll(".candidate-row").forEach(row => {
    row.addEventListener("click", () => {
      engine.pickHero(row.dataset.faction, parseInt(row.dataset.pos), parseInt(row.dataset.heroid));
      renderAll();
    });
  });
}

function renderPickedColumn(col, faction, pos, heroId) {
  const hero = engine.heroMap.get(heroId);
  const currentTS = engine.calculateProjectedTrueSynergy(heroId, pos, faction);
  const logRows = engine.getPickedLog(heroId, pos, faction);

  col.innerHTML = `
    <!-- Hero Portrait -->
    <div class="relative group">
      <img src="${hero.img}" class="w-full h-20 object-cover" alt="${hero.name}">
      <button class="btn-unpick absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white rounded w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition cursor-pointer" 
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

    <!-- Role Swap Rows with Deltas and SVG Icons -->
    <div class="p-1 border-b border-stratzBorder bg-stratzBg/30 space-y-0.5">
      ${[1, 2, 3, 4, 5].filter(p => p !== pos).map(targetPos => {
        const delta = engine.evaluateSwapDelta(faction, pos, targetPos);
        const isPositive = delta > 0;
        return `
          <button class="btn-swap w-full flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] ${isPositive ? "bg-radiant/10 text-radiant hover:bg-radiant/20" : "text-gray-400 hover:text-white hover:bg-stratzBorder/50"} transition cursor-pointer"
                  data-faction="${faction}" data-from="${pos}" data-to="${targetPos}">
            <div class="flex items-center space-x-1">
              <span class="opacity-70">${ROLE_ICONS[targetPos]}</span>
              <span>Pos ${targetPos}</span>
            </div>
            <div class="flex items-center space-x-1 font-mono">
              <span>${delta > 0 ? "+" : ""}${delta.toFixed(1)}</span>
              <span>${SWAP_ICON}</span>
            </div>
          </button>
        `;
      }).join("")}
    </div>

    <!-- 10-Row Picked Log Matrix -->
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
  // Reset Draft
  document.getElementById("btnResetDraft").addEventListener("click", () => {
    engine.resetDraft();
    renderAll();
  });

  // Rank Selector Buttons
  setupRankButtons();

  // Ban Modals
  document.getElementById("btnRadiantBans").addEventListener("click", () => openBanModal("radiant"));
  document.getElementById("btnDireBans").addEventListener("click", () => openBanModal("dire"));
  document.getElementById("btnCloseBanModal").addEventListener("click", closeBanModal);

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

function setupRankButtons() {
  const rankButtons = document.querySelectorAll(".rank-btn");

  rankButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const rankVal = btn.dataset.rank;

      if (rankVal === "all") {
        if (activeRanks.size === 8) {
          activeRanks.clear();
          activeRanks.add(5); // Default to Legend if all turned off
        } else {
          activeRanks = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
        }
      } else {
        const num = parseInt(rankVal);
        if (activeRanks.has(num)) {
          if (activeRanks.size > 1) activeRanks.delete(num);
        } else {
          activeRanks.add(num);
        }
      }

      // Update styling of rank buttons
      updateRankButtonStyles();

      // Recalculate live stats instantly across active ranks
      const updatedHeroes = await fetchLiveHeroStats(Array.from(activeRanks));
      if (updatedHeroes && updatedHeroes.length > 0) {
        engine.setHeroes(updatedHeroes);
        renderAll();
      }
    });
  });
}

function updateRankButtonStyles() {
  const isAll = activeRanks.size === 8;
  const btnAll = document.getElementById("btnRankAll");
  if (btnAll) {
    btnAll.className = `rank-btn px-2 py-0.5 rounded text-[10px] font-bold transition border ${
      isAll ? "border-gold bg-gold/20 text-gold" : "border-stratzBorder bg-stratzBg text-gray-400"
    }`;
  }

  document.querySelectorAll(".rank-btn[data-rank]").forEach(btn => {
    const r = parseInt(btn.dataset.rank);
    if (!isNaN(r)) {
      const isActive = activeRanks.has(r);
      btn.className = `rank-btn px-1.5 py-0.5 rounded text-[10px] font-medium transition border ${
        isActive ? "border-stratzBorder bg-stratzBorder/70 text-white" : "border-transparent bg-transparent text-gray-500 opacity-60"
      }`;
    }
  });
}

function openBanModal(faction) {
  currentBanFaction = faction;
  const modal = document.getElementById("banModal");
  document.getElementById("banModalTitle").textContent = `Select Bans for ${faction.toUpperCase()}`;
  modal.classList.remove("hidden");
  renderBanGrid();
}

function closeBanModal() {
  document.getElementById("banModal").classList.add("hidden");
  renderAll();
}

function renderBanGrid() {
  const container = document.getElementById("banGrid");
  const banSet = currentBanFaction === "radiant" ? engine.radiantBans : engine.direBans;
  const searchInput = document.getElementById("banSearchInput");
  const query = (searchInput ? searchInput.value : "").toLowerCase();

  container.innerHTML = engine.heroes
    .filter(h => heroMatchesQuery(h, query))
    .map(hero => {
      const isBanned = banSet.has(hero.id);
      return `
        <div class="ban-hero-item relative rounded overflow-hidden cursor-pointer border ${isBanned ? "border-red-500 opacity-50 grayscale" : "border-stratzBorder hover:border-gold"} transition"
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

  searchInput.oninput = renderBanGrid;
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
    const filtered = engine.heroes.filter(h => heroMatchesQuery(h, query));
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
          <button class="btn-preset bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px] cursor-pointer" data-heroid="${hero.id}" data-val="-20">Never (-20)</button>
          <button class="btn-preset bg-stratzBorder hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] cursor-pointer" data-heroid="${hero.id}" data-val="0">Reset (0)</button>
          <button class="btn-preset bg-radiant/20 hover:bg-radiant/30 text-radiant px-2 py-0.5 rounded text-[10px] cursor-pointer" data-heroid="${hero.id}" data-val="5">Comfort (+5)</button>
          <button class="btn-preset bg-amber-500/20 hover:bg-amber-500/30 text-gold px-2 py-0.5 rounded text-[10px] cursor-pointer" data-heroid="${hero.id}" data-val="10">Main (+10)</button>
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
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
}
