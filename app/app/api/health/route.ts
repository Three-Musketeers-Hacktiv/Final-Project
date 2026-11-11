import { getEngineCompatibility } from "@/server/game-engine/adapter";

export async function GET() {
  const engine = getEngineCompatibility();

  return Response.json({
    success: true,
    data: {
      service: "fantasy-city-defense-backend",
      status: "ok",
      engine,
    },
  });
}
