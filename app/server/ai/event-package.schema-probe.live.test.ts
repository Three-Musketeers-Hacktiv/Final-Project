import { GoogleGenAI } from "@google/genai";
import { describe, expect, it } from "vitest";

import { resetServerEnv } from "@/server/config/env";
import { generatedEventPackageJsonSchema, providerHttpStatus, sanitizeProviderMessage } from "./event-package";
import { packageSchemaProbes, probeFollowUp, type PackageSchemaProbe } from "./event-package.probes";

const enabled = process.env.LIVE_GEMINI_SCHEMA_PROBE === "1";

type ProbeResult = {
  id: string;
  ok: boolean;
  status: number | null;
  message: string;
};

async function runProbe(client: GoogleGenAI, model: string, probe: PackageSchemaProbe | ReturnType<typeof probeFollowUp>): Promise<ProbeResult> {
  try {
    await client.models.generateContent({
      model,
      contents: JSON.stringify({ probe: probe.id }),
      config: {
        systemInstruction: "Return one JSON object that matches the response schema. Use the shortest valid values.",
        responseMimeType: "application/json",
        ...(probe.responseJsonSchema ? { responseJsonSchema: probe.responseJsonSchema } : {}),
        maxOutputTokens: probe.maxOutputTokens,
      },
    });
    return { id: probe.id, ok: true, status: 200, message: "" };
  } catch (error) {
    return {
      id: probe.id,
      ok: false,
      status: providerHttpStatus(error) ?? null,
      message: sanitizeProviderMessage(error),
    };
  }
}

describe.skipIf(!enabled)("live Gemini package schema probes", () => {
  it("changes one request variable per step and records acceptance", async () => {
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is required").toBeTruthy();
    expect(process.env.GEMINI_MODEL, "GEMINI_MODEL is required").toBeTruthy();
    resetServerEnv();
    const model = process.env.GEMINI_MODEL!;
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const results: ProbeResult[] = [];
    const steps = packageSchemaProbes();
    for (const step of steps) {
      const result = await runProbe(client, model, step);
      results.push(result);
      if (step.id === "A" && !result.ok) break;
    }
    const firstFailure = results.find((result) => !result.ok);
    const failedStep = steps.find((step) => step.id === firstFailure?.id);
    if (failedStep) results.push(await runProbe(client, model, probeFollowUp(failedStep)));
    expect(results.length).toBeLessThanOrEqual(8);
    expect(results.every((result) => result.message.length <= 180)).toBe(true);
    expect(JSON.stringify(results)).not.toContain(process.env.GEMINI_API_KEY ?? "missing-key");
    console.info(`schema-probe model=${model} ${JSON.stringify(results.map(({ id, ok, status }) => ({ id, ok, status })))}`);
  }, 120_000);

  it("accepts the production package schema", async () => {
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is required").toBeTruthy();
    expect(process.env.GEMINI_MODEL, "GEMINI_MODEL is required").toBeTruthy();
    resetServerEnv();
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await runProbe(client, process.env.GEMINI_MODEL!, {
      id: "E2",
      responseJsonSchema: generatedEventPackageJsonSchema,
      maxOutputTokens: 800,
    });
    expect(result.ok, result.message).toBe(true);
    expect(result.status).toBe(200);
  }, 30_000);
});
