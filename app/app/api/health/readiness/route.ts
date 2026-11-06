import { getServerEnv } from "@/server/config/env";
import { pingDatabase } from "@/server/db/mongodb";
import { apiFailure, apiSuccess, getRequestId } from "@/server/http/response";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    getServerEnv();
    await pingDatabase();

    return apiSuccess({ status: "ready", database: "reachable" }, requestId);
  } catch (error) {
    console.error("Readiness check failed", { requestId, error });
    return apiFailure(503, "SERVICE_NOT_READY", "Service dependencies are not ready", requestId);
  }
}
