import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./schemas";

describe("authentication schemas", () => {
  it("normalizes a valid username", () => {
    const input = loginSchema.parse({ username: "  Player_01 ", password: "secret123" });
    expect(input.username).toBe("player_01");
  });

  it("rejects password shorter than six characters", () => {
    expect(() => loginSchema.parse({ username: "player_01", password: "12345" })).toThrow();
  });

  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      username: "player_01",
      password: "secret123",
      confirmPassword: "different",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("rejects unknown fields", () => {
    expect(() =>
      loginSchema.parse({ username: "player_01", password: "secret123", admin: true }),
    ).toThrow();
  });
});
