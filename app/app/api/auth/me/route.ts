import { authenticateRequest } from "@/server/auth/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const authentication = await authenticateRequest(request);
    return apiSuccess(
      {
        user: authentication.publicUser,
        sessionExpiresAt: authentication.session.expiresAt.toISOString(),
      },
      requestId,
    );
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
