import { assertTrustedOrigin } from "@/server/auth/origin";
import { authenticateRequest } from "@/server/auth/service";
import { createRunSchema } from "@/server/game/schemas";
import { createRun } from "@/server/game/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";
import { parseJsonBody } from "@/server/http/request";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertTrustedOrigin(request);
    const authentication = await authenticateRequest(request);
    const input = await parseJsonBody(request, createRunSchema);
    const result = await createRun(authentication.user, input);
    return apiSuccess(
      { runId: result.run._id.toHexString(), game: result.game, replayed: result.replayed },
      requestId,
      { status: result.replayed ? 200 : 201 },
    );
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
