import { verticalSlice } from "@/content/seed/vertical-slice";
import { atlasSnapshotSchema, type AtlasSnapshot } from "@/lib/atlas/schema";

export interface AtlasRepository {
  getSnapshot(): Promise<AtlasSnapshot>;
}

export const fixtureAtlasRepository: AtlasRepository = {
  async getSnapshot() {
    return atlasSnapshotSchema.parse(verticalSlice);
  },
};
