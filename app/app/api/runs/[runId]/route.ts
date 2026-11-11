import { authenticateRequest } from "@/server/auth/service";
import { getGameById } from "@/server/game/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const authentication = await authenticateRequest(request);
    const { runId } = await params;
    const result = await getGameById(authentication.user._id, runId);
    return apiSuccess({ runId: result.run._id.toHexString(), game: result.game }, requestId);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
