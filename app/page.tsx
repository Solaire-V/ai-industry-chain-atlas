import { AtlasApp } from "@/components/atlas/atlas-app";
import { parseAtlasQuery } from "@/lib/atlas/query-state";
import { fixtureAtlasRepository } from "@/lib/atlas/repository";

type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function Home({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const [snapshot, rawSearchParams] = await Promise.all([
    fixtureAtlasRepository.getSnapshot(),
    searchParams,
  ]);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue !== undefined) params.set(key, firstValue);
  }

  return (
    <main>
      <AtlasApp
        initialSnapshot={snapshot}
        initialQuery={parseAtlasQuery(params)}
      />
    </main>
  );
}
