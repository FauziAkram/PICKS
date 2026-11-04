import { fetchLiveHeroStats } from "./api.js";
import { ROLE_ICONS, ROLE_NAMES } from "./heroes.js";
import { RoshEngine } from "./engine.js";

let engine = null;
let currentSearchQueries = { radiant: {}, dire: {} };

async function init() {
  const rankSelect = document.getElementById("rankSelector");
  const initialRank = rankSelect ? rankSelect.value : "LEGEND";

  // Fetch live stats from Dota 2 API
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
    col.className = "flex flex-col bg-stratzCard border border-stratzBorder rounded-lg overflow-hidden h-[720px]";

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

    <!-- Scrollable Candidate Recommendation List -->
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

  // Attach search input listener
  const input = col.querySelector(".slot-search");
  input.addEventListener("input", (e) => {
    currentSearchQueries[faction][pos] = e.target.value;
    renderColumns(faction);
  });

  // Attach pick click listeners
  col.querySelectorAll(".candidate-row").forEach(row => {
    row.addEventListener("click", () => {
      const f = row.dataset.faction;
      const p = parseInt(row.dataset.pos);
      const hId = parseInt(row.dataset.heroid);
      engine.pickHero(f, p, hId);
      renderAll();
    });
  });
}

function renderPickedColumn(col, faction, pos, heroId) {
  const hero = engine.heroMap.get(heroId);
  const currentTS = engine.calculateHeroTrueSynergy(heroId, pos, faction);

  col.innerHTML = `
    <!-- Hero Portrait Header -->
    <div class="relative group">
      <img src="${hero.img}" class="w-full h-20 object-cover" alt="${hero.name}">
      <button class="btn-unpick absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition" 
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

    <!-- Role Swap Recommendations -->
    <div class="p-1.5 border-b border-stratzBorder bg-stratzBg/30 space-y-1">
      <span class="text-[9px] uppercase font-bold tracking-widest text-gray-400 px-1">Role Swaps</span>
      ${[1, 2, 3, 4, 5].filter(p => p !== pos).map(targetPos => `
        <button class="btn-swap w-full flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] text-gray-400 hover:text-white hover:bg-stratzBorder/50 transition"
                data-faction="${faction}" data-from="${pos}" data-to="${targetPos}">
          <div class="flex items-center space-x-1">
            <span class="opacity-70">${ROLE_ICONS[targetPos]}</span>
            <span>Pos ${targetPos}</span>
          </div>
          <span class="text-gold font-mono">⇄</span>
        </button>
      `).join("")}
    </div>

    <!-- Picked Log Matrix Breakdown -->
    <div class="flex-1 overflow-y-auto p-1.5 space-y-1 text-[11px]">
      <span class="text-[9px] uppercase font-bold tracking-widest text-gray-400 px-1">Synergy Log</span>
      <div class="bg-stratzBg/40 border border-stratzBorder rounded p-1.5 space-y-1">
        <div class="flex items-center justify-between text-gray-300">
          <span>Live Win Rate</span>
          <span class="font-mono text-gray-200">${hero.liveWinRate}%</span>
        </div>
        <div class="flex items-center justify-between text-gray-400">
          <span>Role Base Delta</span>
          <span class="font-mono text-gold">${(hero.liveWinRate - 50).toFixed(1)}</span>
        </div>
      </div>
    </div>
  `;

  // Attach unpick listener
  col.querySelector(".btn-unpick").addEventListener("click", () => {
    engine.unpickHero(faction, pos);
    renderAll();
  });

  // Attach swap listeners
  col.querySelectorAll(".btn-swap").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.faction;
      const from = parseInt(btn.dataset.from);
      const to = parseInt(btn.dataset.to);
      engine.swapHeroes(f, from, to);
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

  // Rank Selector Change
  document.getElementById("rankSelector").addEventListener("change", async (e) => {
    const updatedHeroes = await fetchLiveHeroStats(e.target.value);
    engine.setHeroes(updatedHeroes);
    renderAll();
  });

  // Bias Modal Open/Close
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
        <div class="flex items-center space-x-3">
          <button class="btn-preset bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="-20">Never Play (-20)</button>
          <button class="btn-preset bg-stratzBorder hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="0">Reset (0)</button>
          <button class="btn-preset bg-radiant/20 hover:bg-radiant/30 text-radiant px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="5">Comfort (+5)</button>
          <button class="btn-preset bg-amber-500/20 hover:bg-amber-500/30 text-gold px-2 py-0.5 rounded text-[10px]" data-heroid="${hero.id}" data-val="10">Main (+10)</button>
          <span class="w-10 text-right font-mono font-bold ${currentBias > 0 ? "text-radiant" : currentBias < 0 ? "text-red-400" : "text-gray-400"}">
            ${currentBias > 0 ? "+" : ""}${currentBias}
          </span>
        </div>
      `;

      row.querySelectorAll(".btn-preset").forEach(btn => {
        btn.addEventListener("click", () => {
          const hId = parseInt(btn.dataset.heroid);
          const val = parseFloat(btn.dataset.val);
          engine.saveBias(hId, val);
          drawRows(document.getElementById("biasSearchInput").value);
        });
      });

      rowsContainer.appendChild(row);
    });
  }

  drawRows();

  document.getElementById("biasSearchInput").addEventListener("input", (e) => {
    drawRows(e.target.value);
  });
}

// Boot up
window.addEventListener("DOMContentLoaded", init);
