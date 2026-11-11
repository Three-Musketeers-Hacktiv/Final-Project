import { assertTrustedOrigin } from "@/server/auth/origin";
import { logoutUser } from "@/server/auth/service";
import { apiSuccess, getRequestId, handleRouteError } from "@/server/http/response";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertTrustedOrigin(request);
    const response = apiSuccess({ loggedOut: true }, requestId);
    await logoutUser(request, response);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
