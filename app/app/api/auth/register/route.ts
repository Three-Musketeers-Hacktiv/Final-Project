import { assertTrustedOrigin } from "@/server/auth/origin";
import { consumeAuthRateLimit } from "@/server/auth/rate-limit";
import { registerSchema } from "@/server/auth/schemas";
import { registerUser } from "@/server/auth/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";
import { parseJsonBody } from "@/server/http/request";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJsonBody(request, registerSchema);
    await consumeAuthRateLimit("register", request);
    const result = await registerUser(input);
    return apiSuccess(result, requestId, { status: 201 });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
