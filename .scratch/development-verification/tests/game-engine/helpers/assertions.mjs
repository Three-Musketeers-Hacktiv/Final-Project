import { expect } from "vitest";
import { freezeJson } from "./roundTrip.mjs";
export function expectError(result, code) {
    expect(result.ok).toBe(false);
    if (!result.ok)
        expect(result.error.code).toBe(code);
}
/** Panggil aksi dan pastikan objek state masukan tidak berubah. */
export function callWithoutMutating(state, run) {
    const before = freezeJson(state);
    const result = run(state);
    expect(freezeJson(state)).toBe(before);
    return result;
}
