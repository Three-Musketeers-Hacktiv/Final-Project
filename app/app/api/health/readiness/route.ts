import { getServerEnv } from "@/server/config/env";
import { pingDatabase } from "@/server/db/mongodb";
import { apiFailure, apiSuccess, getRequestId } from "@/server/http/response";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const env = getServerEnv();
    const aiConfigured = Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL);
    if (env.NODE_ENV === "production" && !aiConfigured) {
      throw new Error("OpenAI runtime configuration is required in production");
    }
    await pingDatabase();

    return apiSuccess(
      { status: "ready", database: "reachable", ai: aiConfigured ? "configured" : "fallback-only" },
      requestId,
    );
  } catch (error) {
    console.error("Readiness check failed", { requestId, error });
    return apiFailure(503, "SERVICE_NOT_READY", "Service dependencies are not ready", requestId);
  }
}
