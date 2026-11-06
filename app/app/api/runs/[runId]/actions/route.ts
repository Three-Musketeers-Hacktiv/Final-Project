import { assertTrustedOrigin } from "@/server/auth/origin";
import { authenticateRequest } from "@/server/auth/service";
import { submitActionSchema } from "@/server/game/schemas";
import { submitGameAction } from "@/server/game/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";
import { parseJsonBody } from "@/server/http/request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const requestId = getRequestId(request);
  try {
    assertTrustedOrigin(request);
    const authentication = await authenticateRequest(request);
    const input = await parseJsonBody(request, submitActionSchema);
    const { runId } = await params;
    const result = await submitGameAction(authentication.user._id, runId, input);
    return apiSuccess(result, requestId);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
