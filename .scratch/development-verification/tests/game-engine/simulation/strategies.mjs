/**
 * Aturan belanja simulasi. Semua strategi memakai pilihan event yang sama
 * (`scoredEventChoice`) supaya perbedaan hasil datang dari cara menghabiskan
 * jatah harian, bukan dari pilihan event yang acak.
 *
 * - attack: utamakan troops, lalu wall, lalu city
 * - defense: utamakan wall, lalu troops, lalu city
 * - economy: utamakan city, lalu troops, lalu wall
 * - balanced: upgrade jalur yang levelnya paling rendah
 * - skip: tidak belanja. Hari persiapan langsung dilanjut
 */
export const SIM_STRATEGIES = [
    { id: "attack", spend: "troops" },
    { id: "defense", spend: "wall" },
    { id: "economy", spend: "city" },
    { id: "balanced", spend: "balanced" },
    { id: "skip", spend: "skip" },
];
export const SIM_DIFFICULTIES = ["easy", "normal", "hard"];
