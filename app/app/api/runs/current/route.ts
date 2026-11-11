import { authenticateRequest } from "@/server/auth/service";
import { getCurrentGame } from "@/server/game/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const authentication = await authenticateRequest(request);
    const result = await getCurrentGame(authentication.user._id);
    return apiSuccess({ runId: result.run._id.toHexString(), game: result.game }, requestId);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
