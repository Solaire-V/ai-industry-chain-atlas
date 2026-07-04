import { buildAtlasDataFreshness } from "@/lib/atlas/data-freshness";
import { atlasRepository } from "@/lib/atlas/repository";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

const jsonHeaders = {
  "Cache-Control": CACHE_CONTROL,
  "Content-Type": "application/json",
};

export async function GET() {
  const snapshot = await atlasRepository.getSnapshot();
  return new Response(JSON.stringify(buildAtlasDataFreshness(snapshot)), {
    status: 200,
    headers: jsonHeaders,
  });
}
