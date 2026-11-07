import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const validEnvironment = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost:27017",
  JWT_SECRET: "a-secret-value-with-at-least-32-characters",
  APP_ORIGIN: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("applies safe backend defaults", () => {
    const environment = parseServerEnv(validEnvironment);

    expect(environment.MONGODB_DB_NAME).toBe("city_defense_dev");
    expect(environment.SESSION_TTL_SECONDS).toBe(604800);
    expect(environment.BCRYPT_SALT_ROUNDS).toBe(12);
    expect(environment.JWT_ISSUER).toBe("city-defense-api");
  });

  it("rejects a short JWT secret", () => {
    expect(() => parseServerEnv({ ...validEnvironment, JWT_SECRET: "too-short" })).toThrow(
      "JWT_SECRET",
    );
  });

  it("converts empty optional OpenAI values to undefined", () => {
    const environment = parseServerEnv({
      ...validEnvironment,
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    });

    expect(environment.OPENAI_API_KEY).toBeUndefined();
    expect(environment.OPENAI_MODEL).toBeUndefined();
  });
});
