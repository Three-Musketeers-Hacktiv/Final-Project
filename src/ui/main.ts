import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  gameConfig,
  getEffectiveStats,
  getRepairCost,
  getWavePreview,
  repairCity,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type ActionResult,
  type GameState,
} from "../game/index";
import { advanceDay, applyPreferredUpgrade, createAutoRun, type AutoPauseReason } from "./autoRun";

const SAVE_KEY = "fantasy-try-ui-v1";
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("missing #app");

let notice = "";
let state = loadState();
let fromAuto = false;

const auto = createAutoRun({
  getState: () => state,
  applyAdvance: () => {
    fromAuto = true;
    const result = advanceDay(state);
    apply(result);
    fromAuto = false;
    return result;
  },
  applyUpgrade: () => {
    const result = applyPreferredUpgrade(state);
    if (!result.ok) return result;
    fromAuto = true;
    apply(result);
    fromAuto = false;
    return result;
  },
  onChange: () => render(),
  isHidden: () => document.hidden,
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) auto.onHidden();
  else render();
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.action === "auto-upgrade") auto.setAutoUpgrade(target.checked);
});

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.action;
  if (!action) return;
  if (action === "new") {
    auto.toManual();
    state = createInitialState({ runId: `run-${Date.now()}` });
    notice = "";
    persist();
    render();
    return;
  }
  if (action === "auto-on") return auto.enable();
  if (action === "auto-off") return auto.toManual();
  if (action === "auto-resume") return auto.resume();
  if (action === "upgrade-wall") return apply(upgradeWall(state));
  if (action === "upgrade-troops") return apply(upgradeTroops(state));
  if (action === "upgrade-city") return apply(upgradeCity(state));
  if (action === "repair") return apply(repairCity(state));
  if (action === "end") return apply(advanceDay(state));
  if (action === "battle") return apply(startBattle(state));
  if (action === "report") return apply(continueFromReport(state));
  if (action.startsWith("choice:")) return apply(chooseEventOption(state, action.slice(7)));
  if (action.startsWith("reward:")) return apply(chooseReward(state, action.slice(7)));
});

render();

window.setInterval(() => {
  if (!auto.snapshot().running) return;
  const node = document.querySelector("[data-countdown]");
  if (!node) return;
  const seconds = Math.ceil(auto.snapshot().remainingMs / 1000);
  node.textContent = `Auto · berjalan · ${seconds} dtk`;
}, 250);

function apply(result: ActionResult): void {
  const previous = state;
  if (!result.ok) {
    notice = `${result.error.code}: ${result.error.message}`;
    if (!fromAuto) render();
    return;
  }
  notice = "";
  state = result.state;
  persist();
  if (!fromAuto) {
    auto.afterUserAction(previous);
    render();
  }
}

function persist(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadState(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return createInitialState({ runId: "run-try" });
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== 4 || typeof parsed.day !== "number" || typeof parsed.wallLevel !== "number") {
      notice = "Save uji rusak. Tekan Permainan baru. Data lama tidak dihapus otomatis.";
      return createInitialState({ runId: "run-try" });
    }
    return parsed;
  } catch {
    notice = "Save uji tidak bisa dibaca. Tekan Permainan baru.";
    return createInitialState({ runId: "run-try" });
  }
}

function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (char) =>
    char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : char === '"' ? "&quot;" : "&#39;",
  );
}

function render(): void {
  const stats = getEffectiveStats(state);
  const wave = getWavePreview(state);
  const hpPct = Math.round((state.cityHp / state.cityMaxHp) * 100);
  const repairCost = getRepairCost();
  const effects = describeEffects(state);

  app!.innerHTML = `
    <header>
      <h1>Fantasy City Defense</h1>
      <p>Uji mesin · contoh Auto ada di panel kanan · bukan UI produk. Save: ${SAVE_KEY}.</p>
    </header>
    ${notice ? `<div class="banner" role="alert">${esc(notice)}</div>` : ""}
    ${autoHtml()}
    <section class="grid">
      <article class="panel">
        <h2>Kota · hari ${esc(state.day)} · ${esc(state.phase)}</h2>
        <dl>
          <dt>Gold</dt><dd>${esc(state.gold)}</dd>
          <dt>HP</dt><dd>${esc(state.cityHp)} / ${esc(state.cityMaxHp)}</dd>
          <dt>Tembok</dt><dd>${esc(state.wallLevel)} / ${esc(gameConfig.maxTrackLevel)} · ${esc(stats.wallCost)} gold</dd>
          <dt>Pasukan</dt><dd>${esc(state.troopLevel)} / ${esc(gameConfig.maxTrackLevel)} · ${esc(stats.troopCost)} gold</dd>
          <dt>Kota</dt><dd>${esc(state.cityLevel)} / ${esc(gameConfig.maxTrackLevel)} · ${esc(stats.cityCost)} gold</dd>
          <dt>Pemasukan</dt><dd>${esc(stats.dailyIncome)}</dd>
          <dt>Attack</dt><dd>${esc(stats.attack)}</dd>
          <dt>Defense</dt><dd>${esc(stats.defense)}</dd>
          <dt>Aksi hari ini</dt><dd>${state.actionUsedToday ? "terpakai" : "tersisa"}</dd>
        </dl>
        <div class="bar" aria-label="HP kota ${hpPct}%"><span style="width:${hpPct}%"></span></div>
        <div class="actions">${actionsHtml(stats.wallCost, stats.troopCost, stats.cityCost, repairCost)}</div>
      </article>
      <article class="panel">
        <h2>Ancaman berikutnya</h2>
        ${
          wave
            ? `<dl>
                <dt>Wave</dt><dd>${esc(wave.name)} · hari ${esc(wave.day)}</dd>
                <dt>HP musuh</dt><dd>${esc(wave.hp)}</dd>
                <dt>Attack musuh</dt><dd>${esc(wave.attack)}</dd>
              </dl>`
            : "<p>Tidak ada wave tersisa.</p>"
        }
        <h2 style="margin-top:14px">Efek</h2>
        <p>${effects.length ? effects.map(esc).join("<br>") : "Tidak ada."}</p>
      </article>
    </section>
    ${reportHtml()}
  `;
}

const PAUSE_LABEL: Record<AutoPauseReason, string> = {
  event: "event wajib",
  battle: "hari battle",
  report: "laporan battle",
  reward: "pilih reward",
  ended: "permainan selesai",
  hidden: "tab tersembunyi",
  rejected: "lanjut hari ditolak",
};

function autoHtml(): string {
  const view = auto.snapshot();
  const seconds = Math.ceil(view.remainingMs / 1000);
  const status = view.mode === "manual"
    ? "Manual"
    : view.running
      ? `Auto · berjalan · ${seconds} dtk`
      : `Auto · dijeda · ${PAUSE_LABEL[view.pauseReason ?? "rejected"]}`;
  const toggle = view.mode === "manual"
    ? `<button type="button" data-action="auto-on">Nyalakan Auto</button>`
    : `<button type="button" data-action="auto-off">Manual</button>`;
  const resume = view.mode === "auto" && !view.running && state.phase === "preparation" && !document.hidden
    ? `<button type="button" class="primary" data-action="auto-resume">Lanjutkan auto</button>`
    : "";
  const hint = view.autoUpgrade
    ? view.actionStillAvailable
      ? `<p class="hint">Auto upgrade menyala. Gold belum cukup untuk jalur berikutnya, aksi hari ini masih tersisa.</p>`
      : `<p class="hint">Auto upgrade membeli pasukan, lalu tembok, lalu kota — satu kali per hari.</p>`
    : view.actionStillAvailable
      ? `<p class="hint">Aksi ekonomi masih tersedia. Auto hanya melewati hari, tidak membeli.</p>`
      : "";
  const upgradeToggle = view.mode === "auto"
    ? `<label class="check"><input type="checkbox" data-action="auto-upgrade" ${view.autoUpgrade ? "checked" : ""}> Auto upgrade</label>`
    : "";
  return `
    <section class="panel auto-panel">
      <h2>Kalender · contoh tiket Auto</h2>
      <p data-countdown>${esc(status)}</p>
      ${hint}
      <div class="actions">${toggle}${resume}${upgradeToggle}</div>
    </section>
  `;
}

function actionsHtml(wallCost: number, troopCost: number, cityCost: number, repairCost: number): string {
  const fresh = `<button type="button" data-action="new">Permainan baru</button>`;
  if (state.phase === "event" && state.activeEvent) {
    const choices = state.activeEvent.choices
      .map(
        (choice) =>
          `<button type="button" class="primary" data-action="choice:${esc(choice.id)}">${esc(choice.label)} (${choice.goldCost > 0 ? `${choice.goldCost} gold` : "Free"})</button>`,
      )
      .join("");
    return `${choices}${fresh}`;
  }
  if (state.phase === "battleReady") {
    return `<button type="button" class="primary" data-action="battle">Mulai battle</button>${fresh}`;
  }
  if (state.phase === "battleReport") {
    return `<button type="button" class="primary" data-action="report">Lanjut laporan</button>${fresh}`;
  }
  if (state.phase === "reward") {
    const rewardSet = gameConfig.waveRewards.find((entry) => entry.afterWave === state.wavesCleared);
    const rewards = (rewardSet?.options ?? [])
      .map(
        (reward) =>
          `<button type="button" class="primary" data-action="reward:${esc(reward.id)}">${esc(reward.label)}</button>`,
      )
      .join("");
    return `${rewards}${fresh}`;
  }
  if (state.phase === "gameOver" || state.phase === "victory") {
    return fresh;
  }
  return `
    <button type="button" data-action="upgrade-wall">Tembok (${esc(wallCost)})</button>
    <button type="button" data-action="upgrade-troops">Pasukan (${esc(troopCost)})</button>
    <button type="button" data-action="upgrade-city">Kota (${esc(cityCost)})</button>
    <button type="button" data-action="repair">Perbaiki (${esc(repairCost)})</button>
    <button type="button" class="primary" data-action="end">Lanjut hari</button>
    ${fresh}
  `;
}

function reportHtml(): string {
  const result = state.battleResult;
  if (!result) return "";
  const rows = result.rounds
    .map(
      (round) =>
        `<li>Ronde ${esc(round.round)} · ke musuh ${esc(round.damageToMonster)} · ke kota ${esc(round.damageToCity)} · HP ${esc(round.cityHpAfter)} / ${esc(round.monsterHpAfter)}</li>`,
    )
    .join("");
  return `
    <section class="panel" style="margin-top:12px">
      <h2>Laporan wave ${esc(result.wave)} · ${result.won ? "bertahan" : "kalah"}</h2>
      <p>HP hilang ${esc(result.cityHpLost)} · ronde ${esc(result.rounds.length)} · ATK ${esc(result.cityAttack)} · DEF ${esc(result.cityDefense)}</p>
      <ol class="log">${rows}</ol>
    </section>
  `;
}

function describeEffects(current: GameState): string[] {
  const lines: string[] = [];
  const defense = current.effects.defenseByWave;
  if (defense[1]) lines.push(`Defense +${defense[1]} untuk wave 1`);
  if (defense[2]) lines.push(`Defense +${defense[2]} untuk wave 2`);
  if (current.effects.upgradeDiscountRate > 0) {
    lines.push(
      `Diskon upgrade ${Math.round(current.effects.upgradeDiscountRate * 100)}% sampai wave ${current.effects.upgradeDiscountUntilWave ?? "?"}`,
    );
  }
  if (current.effects.prepIncomeBonus > 0) {
    lines.push(`Pemasukan +${current.effects.prepIncomeBonus} pada hari 11–19`);
  }
  return lines;
}
