import { verticalSlice } from "@/content/seed/vertical-slice";
import { atlasSnapshotSchema, type AtlasSnapshot } from "@/lib/atlas/schema";
import {
  createSupabaseAtlasRepository,
  type AtlasRepositoryEnv,
} from "@/lib/atlas/supabase-repository";

export interface AtlasRepository {
  getSnapshot(): Promise<AtlasSnapshot>;
}

export const fixtureAtlasRepository: AtlasRepository = {
  async getSnapshot() {
    return atlasSnapshotSchema.parse(verticalSlice);
  },
};

export const createAtlasRepository = (
  env: AtlasRepositoryEnv = process.env,
): AtlasRepository => {
  if (env.ATLAS_DATA_SOURCE === "supabase") {
    return createSupabaseAtlasRepository(env);
  }

  return fixtureAtlasRepository;
};

export const atlasRepository = createAtlasRepository();
