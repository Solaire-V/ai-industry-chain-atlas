import {
  handleMarketRefresh,
  methodNotAllowedResponse,
} from "@/lib/atlas/market-refresh";
import { atlasRepository } from "@/lib/atlas/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) =>
  handleMarketRefresh({ request, repository: atlasRepository });

export const POST = (request: Request) =>
  handleMarketRefresh({ request, repository: atlasRepository });

export const PUT = methodNotAllowedResponse;
export const PATCH = methodNotAllowedResponse;
export const DELETE = methodNotAllowedResponse;
