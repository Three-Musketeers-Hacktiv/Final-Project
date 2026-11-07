import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores and verifies a bcrypt hash", async () => {
    const hash = await hashPassword("secret123", 4);

    expect(hash).not.toContain("secret123");
    expect(hash.startsWith("$2")).toBe(true);
    await expect(verifyPassword("secret123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
