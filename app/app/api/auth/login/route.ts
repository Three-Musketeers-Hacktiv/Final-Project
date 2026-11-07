import { assertTrustedOrigin } from "@/server/auth/origin";
import { consumeAuthRateLimit } from "@/server/auth/rate-limit";
import { loginSchema } from "@/server/auth/schemas";
import { attachLoginCookie, loginUser } from "@/server/auth/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";
import { parseJsonBody } from "@/server/http/request";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJsonBody(request, loginSchema);
    await consumeAuthRateLimit("login", request, input.username);
    const result = await loginUser(input, request);
    const response = apiSuccess(
      { user: result.user, sessionExpiresAt: result.expiresAt.toISOString() },
      requestId,
    );
    attachLoginCookie(response, result.token, result.expiresAt);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
