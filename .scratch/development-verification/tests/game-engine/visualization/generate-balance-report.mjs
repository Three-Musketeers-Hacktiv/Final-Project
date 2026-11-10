import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const reportsDir = join(here, "..", "reports");
const outDir = join(reportsDir, "balance-visual-2026-11-10");
const chartsDir = join(outDir, "charts");

const UPGRADE = ["attack", "defense", "economy", "balanced"];
const HARD_STRATEGIES = ["attack", "defense", "economy", "balanced", "knownWin"];
const REWARDS = ["survival", "fortify", "treasury"];
const WAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const STRATEGY_FILL = {
  attack: "#1f4e79",
  defense: "#8a5a2a",
  economy: "#2f6b4f",
  balanced: "#5c4d7a",
  skip: "#5e6670",
  knownWin: "#7a4e2d",
};

function load(name) {
  return JSON.parse(readFileSync(join(reportsDir, name), "utf8"));
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function pct(part, total) {
  if (total === 0) return 0;
  return round1((part / total) * 100);
}

function num(value) {
  return String(value).replace(".", ",");
}

function pctLabel(part, total) {
  return `${part}/${total} (${num(pct(part, total))}%)`;
}

function lossWave(row) {
  if (row.phase !== "gameOver") return null;
  const match = typeof row.loss === "string" ? row.loss.match(/wave (\d+)/) : null;
  const fromText = match ? Number(match[1]) : null;
  const fromCleared = row.wavesCleared + 1;
  if (fromText != null && fromText !== fromCleared) {
    throw new Error(`Wave kalah tidak cocok untuk ${row.runId}: teks ${fromText}, cleared+1 ${fromCleared}`);
  }
  return fromCleared;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatMedian(value) {
  if (value == null) return "ΓÇö";
  return num(value);
}

function assertUnique(rows, keyFn, label) {
  const seen = new Set();
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) throw new Error(`Run ganda di ${label}: ${key}`);
    seen.add(key);
  }
}

function summarize(rows) {
  const unfinished = rows.filter((row) => row.phase !== "victory" && row.phase !== "gameOver");
  const finished = rows.filter((row) => row.phase === "victory" || row.phase === "gameOver");
  const wins = finished.filter((row) => row.phase === "victory").length;
  const losses = finished.filter((row) => row.phase === "gameOver").length;
  if (wins + losses !== finished.length) throw new Error("Hitungan menang/kalah tidak tertutup");
  const winPct = pct(wins, finished.length);
  const lossPct = pct(losses, finished.length);
  if (finished.length > 0 && Math.abs(winPct + lossPct - 100) > 0.11) {
    throw new Error(`Persentase tidak 100: ${winPct} + ${lossPct}`);
  }
  const lossWaves = finished.filter((row) => row.phase === "gameOver").map(lossWave);
  return {
    sample: rows.length,
    finished: finished.length,
    unfinished: unfinished.length,
    wins,
    losses,
    winPct,
    lossPct,
    medianLossWave: median(lossWaves),
    lossWaves,
  };
}

function group(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function defs() {
  return `<defs>
    <pattern id="lossHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="7" fill="#8b3a3a"/>
      <line x1="0" y1="0" x2="0" y2="7" stroke="#f6ebe6" stroke-width="2.2"/>
    </pattern>
    <pattern id="winSolid" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#2a6f4e"/>
    </pattern>
  </defs>`;
}

function axis100(x, y, height, width) {
  const ticks = [0, 25, 50, 75, 100];
  return ticks
    .map((tick) => {
      const yy = y + height - (tick / 100) * height;
      return `<line x1="${x - 6}" y1="${yy}" x2="${x}" y2="${yy}" stroke="#5c564e"/>
        <text x="${x - 10}" y="${yy + 4}" text-anchor="end" font-size="12" fill="#3d3832">${tick}</text>
        <line x1="${x}" y1="${yy}" x2="${x + width}" y2="${yy}" stroke="#e4ddd2" stroke-width="1"/>`;
    })
    .join("");
}

function footer(x, y, lines) {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * 18}" font-size="13" fill="#5c564e">${esc(line)}</text>`)
    .join("");
}

function chartWinLoss(byDifficulty) {
  const height = 250;
  const base = 340;
  const lefts = { normal: 78, hard: 530 };
  let body = "";
  body += `<rect x="742" y="16" width="16" height="16" fill="url(#winSolid)"/>
    <text x="764" y="29" font-size="13" fill="#241f1a">menang</text>
    <rect x="840" y="16" width="16" height="16" fill="url(#lossHatch)"/>
    <text x="862" y="29" font-size="13" fill="#241f1a">kalah</text>`;
  for (const difficulty of ["normal", "hard"]) {
    const x0 = lefts[difficulty];
    body += `<text x="${x0 + 150}" y="72" text-anchor="middle" font-size="18" fill="#241f1a">${difficulty}</text>`;
    body += axis100(x0, 84, height, 340);
    UPGRADE.forEach((strategy, index) => {
      const stat = byDifficulty[difficulty][strategy];
      const x = x0 + 28 + index * 82;
      const winH = (stat.winPct / 100) * height;
      const lossH = height - winH;
      const yTop = base - height;
      const yWin = base - winH;
      body += `<rect x="${x}" y="${yWin}" width="48" height="${Math.max(winH, 0)}" fill="url(#winSolid)"/>`;
      body += `<rect x="${x}" y="${yTop}" width="48" height="${Math.max(lossH, 0)}" fill="url(#lossHatch)"/>`;
      body += `<text x="${x + 24}" y="362" text-anchor="middle" font-size="13" fill="#241f1a">${strategy}</text>`;
      body += `<text x="${x + 24}" y="380" text-anchor="middle" font-size="11" fill="#5c564e">n=${stat.finished}</text>`;
      body += `<text x="${x + 24}" y="396" text-anchor="middle" font-size="11" fill="#3d3832">${pctLabel(stat.wins, stat.finished)}</text>`;
      if (winH >= 28) {
        body += `<text x="${x + 24}" y="${yWin + winH / 2 + 4}" text-anchor="middle" font-size="11" fill="#f4fff8">${stat.wins}</text>`;
      }
      if (lossH >= 28) {
        body += `<text x="${x + 24}" y="${yTop + lossH / 2 + 4}" text-anchor="middle" font-size="11" fill="#fff8f4">${stat.losses}</text>`;
      }
    });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 460" role="img">
  <title>Persentase menang dan kalah per strategi, repair di bawah 80 persen HP</title>
  <rect width="980" height="460" fill="#f7f3ec"/>
  ${defs()}
  <text x="40" y="32" font-size="20" fill="#241f1a">Menang dan kalah per strategi</text>
  ${body}
  ${footer(40, 424, [
    "Dataset pasangan. Repair di bawah 80% HP. Reward standard. n=6 tiap batang.",
    "Hijau solid = menang. Merah bergaris = kalah. Simulasi strategi otomatis, bukan win rate pemain.",
  ])}
</svg>`;
}

function chartRepair(pairs) {
  const height = 200;
  const base = 286;
  const lefts = { normal: 86, hard: 530 };
  let body = "";
  for (const difficulty of ["normal", "hard"]) {
    const x0 = lefts[difficulty];
    body += `<text x="${x0 + 160}" y="64" text-anchor="middle" font-size="18" fill="#241f1a">${difficulty}</text>`;
    for (const tick of [0, 50, 100]) {
      const yy = base - (tick / 100) * height;
      body += `<line x1="${x0}" y1="${yy}" x2="${x0 + 340}" y2="${yy}" stroke="#e4ddd2"/>
        <text x="${x0 - 8}" y="${yy + 4}" text-anchor="end" font-size="12" fill="#3d3832">${tick}</text>`;
    }
    UPGRADE.forEach((strategy, index) => {
      const pair = pairs[difficulty][strategy];
      const x = x0 + 28 + index * 82;
      for (const [offset, key, fill] of [
        [0, "off", "#c4b8a8"],
        [26, "on", "#2a6f4e"],
      ]) {
        const stat = pair[key];
        const h = Math.max((stat.winPct / 100) * height, stat.winPct === 0 ? 3 : 0);
        body += `<rect x="${x + offset}" y="${base - h}" width="22" height="${h}" fill="${fill}" stroke="#241f1a" stroke-width="0.6"/>`;
      }
      const delta = round1(pair.on.winPct - pair.off.winPct);
      const sign = delta > 0 ? "+" : "";
      body += `<text x="${x + 24}" y="308" text-anchor="middle" font-size="13" fill="#241f1a">${strategy}</text>`;
      body += `<text x="${x + 24}" y="326" text-anchor="middle" font-size="12" fill="#3d3832">${sign}${num(delta)} poin</text>`;
      body += `<text x="${x + 24}" y="344" text-anchor="middle" font-size="11" fill="#5c564e">n=${pair.off.finished}/${pair.on.finished}</text>`;
    });
  }
  const hardNote = (strategy) => {
    const pair = pairs.hard[strategy];
    return `${strategy} ${formatMedian(pair.off.medianLossWave)} menjadi ${formatMedian(pair.on.medianLossWave)}`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 500" role="img">
  <title>Perubahan persentase menang saat repair di bawah 80 persen HP</title>
  <rect width="980" height="500" fill="#f7f3ec"/>
  <text x="40" y="32" font-size="20" fill="#241f1a">Pengaruh repair pada strategi yang sama</text>
  ${body}
  ${footer(40, 372, [
    "Batang kiri abu-abu = tanpa repair. Batang kanan hijau = repair jika HP di bawah 80% MaxHP.",
    "Angka di bawah batang adalah selisih poin persentase menang. Seed runId sama.",
    "Repair memakai gold dan jatah aksi hari itu, jadi upgrade hari itu tertunda.",
    `Hard, median wave tempat kalah: ${hardNote("attack")}. ${hardNote("defense")}.`,
    `Hard, lanjutan: ${hardNote("economy")}. ${hardNote("balanced")}.`,
    "Simulasi strategi otomatis, bukan win rate pemain. Sumbu 0 sampai 100% kemenangan.",
  ])}
</svg>`;
}

function heatColor(winPct) {
  if (winPct === 0) return "#f3e4dc";
  if (winPct < 34) return "#e7c7b4";
  if (winPct < 67) return "#b7d0c2";
  return "#7eae96";
}

function chartHeatmap(cells) {
  const x0 = 160;
  const y0 = 90;
  const cw = 150;
  const ch = 64;
  let body = "";
  REWARDS.forEach((reward, index) => {
    body += `<text x="${x0 + index * cw + cw / 2}" y="78" text-anchor="middle" font-size="14" fill="#241f1a">${reward}</text>`;
  });
  HARD_STRATEGIES.forEach((strategy, row) => {
    body += `<text x="148" y="${y0 + row * ch + 38}" text-anchor="end" font-size="14" fill="#241f1a">${strategy}</text>`;
    REWARDS.forEach((reward, col) => {
      const cell = cells[strategy][reward];
      const x = x0 + col * cw;
      const y = y0 + row * ch;
      body += `<rect x="${x}" y="${y}" width="${cw - 8}" height="${ch - 8}" fill="${heatColor(cell.winPct)}" stroke="#241f1a"/>
        <text x="${x + (cw - 8) / 2}" y="${y + 28}" text-anchor="middle" font-size="16" fill="#241f1a">${num(cell.winPct)}%</text>
        <text x="${x + (cw - 8) / 2}" y="${y + 46}" text-anchor="middle" font-size="12" fill="#3d3832">${cell.wins}/${cell.finished}</text>`;
    });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 500" role="img">
  <title>Persentase menang hard menurut strategi dan kebijakan reward</title>
  <rect width="680" height="500" fill="#f7f3ec"/>
  <text x="24" y="32" font-size="20" fill="#241f1a">Hard: strategi dan kebijakan reward</text>
  ${body}
  ${footer(24, 430, [
    "Hanya dataset hard-eval. Tiap sel n=6.",
    "knownWin memperbaiki kota di dalam aturan strateginya sendiri,",
    "bukan flag repair yang sama dengan empat strategi lain.",
    "Simulasi strategi otomatis, bukan win rate pemain.",
  ])}
</svg>`;
}

function chartWaves(seriesList) {
  const height = 140;
  const panelH = 210;
  let body = "";
  seriesList.forEach((panel, panelIndex) => {
    const y = 70 + panelIndex * panelH;
    const totals = WAVES.map((wave) =>
      panel.counts.filter((item) => item.wave === wave).reduce((sum, item) => sum + item.value, 0),
    );
    const max = Math.max(1, ...totals);
    body += `<text x="48" y="${y - 8}" font-size="15" fill="#241f1a">${esc(panel.title)} (kekalahan n=${panel.lossCount})</text>`;
    WAVES.forEach((wave, index) => {
      const plot = height - 16;
      const bucket = panel.counts.filter((item) => item.wave === wave);
      const x = 86 + index * 86;
      let stacked = 0;
      for (const item of bucket) {
        const barH = (item.value / max) * plot;
        const yBar = y + height - stacked - barH;
        stacked += barH;
        body += `<rect x="${x}" y="${yBar}" width="36" height="${barH}" fill="${STRATEGY_FILL[item.strategy]}"/>`;
        if (barH >= 14) {
          body += `<text x="${x + 18}" y="${yBar + barH / 2 + 4}" text-anchor="middle" font-size="11" fill="#f7f3ec">${item.value}</text>`;
        }
      }
      if (totals[index] > 0) {
        body += `<text x="${x + 18}" y="${y + height - stacked - 4}" text-anchor="middle" font-size="11" fill="#241f1a">${totals[index]}</text>`;
      }
      body += `<text x="${x + 18}" y="${y + height + 18}" text-anchor="middle" font-size="12" fill="#3d3832">${wave}</text>`;
    });
  });
  const legendY = 70 + seriesList.length * panelH + 8;
  const legend = Object.entries(STRATEGY_FILL)
    .map(([name, color], index) => {
      const x = 48 + (index % 6) * 140;
      return `<rect x="${x}" y="${legendY}" width="14" height="14" fill="${color}"/><text x="${x + 20}" y="${legendY + 12}" font-size="13" fill="#241f1a">${name}</text>`;
    })
    .join("");
  const svgH = legendY + 78;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 ${svgH}" role="img">
  <title>Jumlah kekalahan per wave</title>
  <rect width="980" height="${svgH}" fill="#f7f3ec"/>
  <text x="40" y="32" font-size="20" fill="#241f1a">Wave tempat kalah</text>
  ${body}
  ${legend}
  ${footer(40, legendY + 36, [
    "Hanya permainan yang kalah. Wave 8 berarti tujuh wave sebelumnya sudah dilewati.",
    "Sumbu tegak adalah jumlah kekalahan pada panel itu, bukan persentase. Simulasi strategi otomatis.",
  ])}
</svg>`;
}

function waveCounts(rows, strategies) {
  const losses = rows.filter((row) => row.phase === "gameOver");
  const counts = [];
  for (const strategy of strategies) {
    for (const wave of WAVES) {
      const value = losses.filter((row) => row.strategy === strategy && lossWave(row) === wave).length;
      if (value > 0) counts.push({ strategy, wave, value });
    }
  }
  return { lossCount: losses.length, counts };
}

function tableRows(groups) {
  const lines = [
    "| Difficulty | Strategi | Repair | Kebijakan reward | Sampel | Menang | Kalah | Win % | Loss % | Median wave tempat kalah |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const groupRow of groups) {
    lines.push(
      `| ${groupRow.difficulty} | ${groupRow.strategy} | ${groupRow.repair} | ${groupRow.reward} | ${groupRow.stat.finished} | ${groupRow.stat.wins} | ${groupRow.stat.losses} | ${num(groupRow.stat.winPct)}% | ${num(groupRow.stat.lossPct)}% | ${formatMedian(groupRow.stat.medianLossWave)} |`,
    );
  }
  return lines.join("\n");
}

function htmlTable(groups) {
  const head = ["Difficulty", "Strategi", "Repair", "Kebijakan reward", "Sampel", "Menang", "Kalah", "Win %", "Loss %", "Median wave tempat kalah"]
    .map((cell) => `<th>${cell}</th>`)
    .join("");
  const body = groups
    .map(
      (groupRow) => `<tr>
        <td>${esc(groupRow.difficulty)}</td>
        <td>${esc(groupRow.strategy)}</td>
        <td>${esc(groupRow.repair)}</td>
        <td>${esc(groupRow.reward)}</td>
        <td>${groupRow.stat.finished}</td>
        <td>${groupRow.stat.wins}</td>
        <td>${groupRow.stat.losses}</td>
        <td>${num(groupRow.stat.winPct)}%</td>
        <td>${num(groupRow.stat.lossPct)}%</td>
        <td>${formatMedian(groupRow.stat.medianLossWave)}</td>
      </tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildReport(summary) {
  const normalRepair = UPGRADE.map((strategy) => summary.chartA.normal[strategy]);
  const allNormalRepairWin = normalRepair.every((stat) => stat.wins === stat.finished && stat.finished === 6);
  const hardBalanced = summary.chartB.hard.balanced;
  return `# Laporan grafik balancing

10 November 2026. Angka dihitung ulang oleh generator dari JSON simulasi, bukan dari jumlah tes yang lulus.

## Sumber

- \`tests/game-engine/reports/paired-simulation-latest.json\`: 108 permainan selesai. Empat strategi upgrade ditambah skip. Difficulty normal dan hard. Repair \`off\` dan \`below80\` pada seed yang sama (\`sim-pair-1\` sampai \`sim-pair-6\`). Event \`scoredEventChoice\`. Reward \`standard\`.
- \`tests/game-engine/reports/hard-eval-latest.json\`: 90 permainan selesai, hanya hard. Lima strategi dan tiga kebijakan reward. Seed yang sama.

Dua dataset tidak digabung menjadi satu persentase.

Repair \`below80\`: jika HP kota di bawah 80% HP maksimum dan gold cukup, hari itu dipakai untuk repair. Upgrade hari itu tidak terjadi. Repair menghabiskan gold dan jatah aksi.

\`knownWin\` hanya ada di evaluasi hard. Strategi itu juga memperbaiki kota di bawah 80% HP, tetapi urutan upgrade dan ambang belanjanya berbeda. Jangan membaca selisihnya sebagai efek reward semata.

Tidak ada permainan yang gagal atau tidak selesai. Kekalahan berarti fase \`gameOver\`. Wave tempat kalah = jumlah wave yang sudah dilewati + 1. Contoh: \`wavesCleared\` 7 berarti kalah melawan wave 8.

Tim belum menetapkan target persentase kemenangan. Laporan ini tidak menilai apakah suatu angka ΓÇ£cukupΓÇ¥ terhadap target.

## Fakta

Pada dataset pasangan dengan repair di bawah 80% HP, keempat strategi di normal menang ${allNormalRepairWin ? "6/6" : "tidak seragam"}. Tanpa repair, keempat strategi di normal menang 0/6. Skip, yang tidak belanja, juga 0/6 dan kalah di wave 1.

Di hard, repair menaikkan persentase menang pada keempat strategi. Balanced dengan repair menang ${hardBalanced.on.wins}/${hardBalanced.on.finished} (${num(hardBalanced.on.winPct)}%). Tanpa repair, balanced menang ${hardBalanced.off.wins}/${hardBalanced.off.finished}. Selisihnya ${num(round1(hardBalanced.on.winPct - hardBalanced.off.winPct))} poin persentase. Pada 48 pasangan strategi upgrade, repair tidak pernah memperpendek wave yang dicapai.

Evaluasi hard menemukan ${summary.hardVictories} kemenangan dari 90 permainan. Kemenangan itu ada pada economy dan balanced. Attack, defense, dan knownWin tidak menang pada 6 seed untuk ketiga kebijakan reward.

Wave kalah yang paling sering pada evaluasi hard tercantum di \`data-summary.json\` bagian \`hardLossLeaders\`.

## Interpretasi

Repair adalah syarat yang membedakan hasil pada sampel ini, terutama di normal. Menang 6/6 dengan repair tidak cukup untuk menyebut difficulty normal terlalu mudah. Strategi yang sama tanpa repair kalah semuanya. Yang terukur adalah efek aturan otomatis ini, bukan pemain manusia.

Di hard, kemenangan tidak tersebar rata. Economy dan balanced menemukan jalur menang. Attack dan defense, pada aturan repair dan reward yang diuji, sering berhenti pada wave 7 sampai 10. Itu bisa berarti tekanan stat monster pada wave tersebut, atau berarti dua strategi upgrade itu kurang cocok dengan aturan repair 80%. Keduanya mungkin benar sekaligus. Data ini tidak memisahkan keduanya sampai ada playtest atau simulasi yang mengubah satu faktor saja.

Pilihan reward di hard mengubah hasil di dalam economy dan balanced. Fortify dan treasury menang lebih sering daripada survival pada sampel 6 seed. Attack dan defense tetap kalah pada ketiga kebijakan, jadi reward saja tidak membuka kemenangan untuk kedua strategi itu.

## Keterbatasan

Enam \`runId\` bukan sampel pemain. Strategi tidak membaca event yang belum muncul, tetapi juga tidak bermain seperti orang. Hasil bukan win rate pemain nyata.

Pengaruh reward hanya diukur di hard. Normal memakai satu kebijakan reward, \`standard\`.

\`knownWin\` tidak setara dengan flag repair strategi lain.

## Rekomendasi

Playtest manusia pada normal dan hard, dengan catatan apakah pemain memperbaiki kota sebelum upgrade. Jika tim ingin melihat reward di normal, jalankan 6 seed yang sama, repair di bawah 80%, empat strategi, dan tiga kebijakan reward (72 permainan) sebagai file baru. Jangan mengubah aturan setelah melihat hasil tanpa memberi versi baru.

Penilaian terhadap target kemenangan menunggu angka yang disepakati tim.

## Tabel dataset pasangan

Reward pada tabel ini adalah \`standard\`.

${tableRows(summary.tablePaired)}

## Tabel evaluasi hard

Repair pada attack, defense, economy, dan balanced adalah di bawah 80% HP. knownWin memakai aturan internalnya sendiri.

${tableRows(summary.tableHard)}
`;
}

function buildHtml(svgs, summary) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <title>Laporan grafik balancing</title>
  <style>
    body { margin: 0; background: #f7f3ec; color: #241f1a; font-family: "Segoe UI", sans-serif; }
    main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { font-size: 32px; font-weight: 650; margin: 0 0 8px; }
    h2 { font-size: 22px; margin: 36px 0 8px; }
    p { line-height: 1.45; max-width: 68ch; }
    figure { margin: 16px 0 28px; background: #f7f3ec; }
    svg { width: 100%; height: auto; display: block; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; background: #fffdf8; }
    th, td { border: 1px solid #d9d0c3; padding: 6px 8px; text-align: left; }
    th { background: #efe7da; }
    .note { font-size: 14px; color: #3d3832; }
  </style>
</head>
<body>
  <main>
    <h1>Balancing simulasi strategi</h1>
    <p>Grafik ini membandingkan hasil strategi otomatis pada enam runId yang sama. Ini bukan win rate pemain. Tim belum menetapkan target persentase kemenangan.</p>
    <p class="note">Sumber: paired-simulation-latest.json dan hard-eval-latest.json. Dua dataset tidak digabung.</p>
    <h2>Menang dan kalah per strategi</h2>
    <p>Hanya dataset pasangan, repair di bawah 80% HP, reward standard. Skip tidak masuk batang: kontrol itu kalah 6/6 di wave 1 pada normal dan hard.</p>
    <figure>${svgs.winLoss}</figure>
    <h2>Repair</h2>
    <p>Setiap pasangan memakai runId, difficulty, prioritas upgrade, event, dan reward yang sama. Yang berubah adalah aturan repair. Repair memakai gold dan jatah aksi, jadi upgrade hari itu tertunda.</p>
    <figure>${svgs.repair}</figure>
    <h2>Reward di hard</h2>
    <p>Hanya hard-eval. Jangan dibandingkan langsung dengan batang repair di atas, karena kebijakan reward dan cakupan strateginya berbeda.</p>
    <figure>${svgs.heat}</figure>
    <h2>Wave tempat kalah</h2>
    <p>Hanya permainan yang kalah. Wave pada sumbu adalah wave yang menghentikan campaign, bukan wave terakhir yang berhasil dilewati.</p>
    <figure>${svgs.waves}</figure>
    <h2>Tabel pasangan</h2>
    ${htmlTable(summary.tablePaired)}
    <h2>Tabel evaluasi hard</h2>
    ${htmlTable(summary.tableHard)}
  </main>
</body>
</html>`;
}

function main() {
  const pairedFile = load("paired-simulation-latest.json");
  const hardFile = load("hard-eval-latest.json");
  const paired = pairedFile.rows;
  const hard = hardFile.rows;
  if (paired.length !== 108) throw new Error(`Paired diharapkan 108, dapat ${paired.length}`);
  if (hard.length !== 90) throw new Error(`Hard diharapkan 90, dapat ${hard.length}`);
  assertUnique(paired, (row) => `${row.runId}|${row.difficulty}|${row.strategy}|${row.repair}`, "paired");
  assertUnique(hard, (row) => `${row.runId}|${row.strategy}|${row.rewardPolicy}`, "hard-eval");

  const chartA = { normal: {}, hard: {} };
  const chartB = { normal: {}, hard: {} };
  for (const difficulty of ["normal", "hard"]) {
    for (const strategy of UPGRADE) {
      const onRows = paired.filter(
        (row) => row.difficulty === difficulty && row.strategy === strategy && row.repair === "below80",
      );
      const offRows = paired.filter(
        (row) => row.difficulty === difficulty && row.strategy === strategy && row.repair === "off",
      );
      chartA[difficulty][strategy] = summarize(onRows);
      chartB[difficulty][strategy] = { off: summarize(offRows), on: summarize(onRows) };
      if (onRows.length !== 6 || offRows.length !== 6) throw new Error(`Sampel strategi tidak 6: ${difficulty} ${strategy}`);
    }
  }

  if (chartA.normal.attack.wins !== 6) throw new Error("Cek normal attack repair tidak 6/6");
  if (chartA.hard.balanced.wins !== 4) throw new Error("Cek hard balanced repair tidak 4/6");
  if (chartB.normal.attack.off.wins !== 0) throw new Error("Cek normal attack tanpa repair tidak 0");

  const cells = {};
  for (const strategy of HARD_STRATEGIES) {
    cells[strategy] = {};
    for (const reward of REWARDS) {
      const rows = hard.filter((row) => row.strategy === strategy && row.rewardPolicy === reward);
      if (rows.length !== 6) throw new Error(`Sel hard tidak 6: ${strategy} ${reward}`);
      cells[strategy][reward] = summarize(rows);
    }
  }
  const hardVictories = hard.filter((row) => row.phase === "victory").length;
  if (hardVictories !== 24) throw new Error(`Victory hard-eval diharapkan 24, dapat ${hardVictories}`);
  if (hardFile.victories !== 24) throw new Error("Field victories pada file sumber bukan 24");

  const wavePanels = [];
  for (const difficulty of ["normal", "hard"]) {
    for (const repair of ["off", "below80"]) {
      const rows = paired.filter((row) => row.difficulty === difficulty && row.repair === repair && row.strategy !== "skip");
      const counted = waveCounts(rows, UPGRADE);
      wavePanels.push({
        title: `Pasangan ${difficulty}, repair ${repair === "off" ? "mati" : "di bawah 80% HP"}`,
        ...counted,
      });
    }
  }
  wavePanels.push({
    title: "Evaluasi hard, semua kebijakan reward",
    ...waveCounts(hard, HARD_STRATEGIES),
  });

  const tablePaired = [];
  for (const difficulty of ["normal", "hard"]) {
    for (const strategy of [...UPGRADE, "skip"]) {
      const repairs = strategy === "skip" ? ["off"] : ["off", "below80"];
      for (const repair of repairs) {
        const rows = paired.filter(
          (row) => row.difficulty === difficulty && row.strategy === strategy && row.repair === repair,
        );
        tablePaired.push({
          difficulty,
          strategy,
          repair: repair === "off" ? "tanpa repair" : "di bawah 80% HP",
          reward: "standard",
          stat: summarize(rows),
        });
      }
    }
  }
  const tableHard = [];
  for (const strategy of HARD_STRATEGIES) {
    for (const reward of REWARDS) {
      tableHard.push({
        difficulty: "hard",
        strategy,
        repair: strategy === "knownWin" ? "aturan knownWin" : "di bawah 80% HP",
        reward,
        stat: cells[strategy][reward],
      });
    }
  }

  const hardLossCounts = {};
  for (const row of hard) {
    if (row.phase !== "gameOver") continue;
    const wave = lossWave(row);
    hardLossCounts[wave] = (hardLossCounts[wave] ?? 0) + 1;
  }
  const hardLossLeaders = Object.entries(hardLossCounts)
    .map(([wave, count]) => ({ wave: Number(wave), count }))
    .sort((left, right) => right.count - left.count);

  const summary = {
    source: {
      paired: "tests/game-engine/reports/paired-simulation-latest.json",
      hardEval: "tests/game-engine/reports/hard-eval-latest.json",
      pairedRows: paired.length,
      hardRows: hard.length,
      unfinished: 0,
    },
    repairRule: pairedFile.repairRule,
    chartA,
    chartB,
    chartC: cells,
    hardVictories,
    hardLossLeaders,
    wavePanels: wavePanels.map((panel) => ({ title: panel.title, lossCount: panel.lossCount })),
    tablePaired,
    tableHard,
    targetWinRate: null,
  };

  const svgs = {
    winLoss: chartWinLoss(chartA),
    repair: chartRepair(chartB),
    heat: chartHeatmap(cells),
    waves: chartWaves(wavePanels),
  };

  mkdirSync(chartsDir, { recursive: true });
  writeFileSync(join(chartsDir, "win-loss-by-strategy.svg"), svgs.winLoss);
  writeFileSync(join(chartsDir, "repair-effect.svg"), svgs.repair);
  writeFileSync(join(chartsDir, "hard-reward-heatmap.svg"), svgs.heat);
  writeFileSync(join(chartsDir, "loss-wave-distribution.svg"), svgs.waves);
  writeFileSync(join(outDir, "data-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(outDir, "BALANCING_REPORT.md"), buildReport(summary));
  writeFileSync(join(outDir, "index.html"), buildHtml(svgs, summary));
  console.log(`Laporan tertulis di ${outDir}`);
}

main();