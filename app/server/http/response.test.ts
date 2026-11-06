import { describe, expect, it } from "vitest";
import { z } from "zod";

import { handleRouteError } from "./response";

describe("handleRouteError", () => {
  it("does not expose internal errors", async () => {
    const response = handleRouteError(new Error("database-secret"), "request-1");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("database-secret");
  });

  it("maps Zod issues to validation fields", async () => {
    const schema = z.object({ username: z.string().min(3) });
    const result = schema.safeParse({ username: "x" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const response = handleRouteError(result.error, "request-2");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.username).toBeDefined();
  });
});
