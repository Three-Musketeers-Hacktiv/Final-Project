/** Salin state lewat JSON, sama seperti save/load debug tanpa storage. */
export function roundTrip(state) {
    return JSON.parse(JSON.stringify(state));
}
export function freezeJson(state) {
    return JSON.stringify(state);
}
