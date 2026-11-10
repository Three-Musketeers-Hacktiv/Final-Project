export function ok(state) {
    return { ok: true, state };
}
export function fail(code, message) {
    return { ok: false, error: { code, message } };
}
export function isEnded(state) {
    return state.phase === "gameOver" || state.phase === "victory";
}
