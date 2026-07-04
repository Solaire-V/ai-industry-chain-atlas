import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("vercel cron configuration", () => {
  it("runs the protected market refresh endpoint after the A-share close on weekdays", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };

    expect(config.crons).toEqual([
      {
        path: "/api/atlas/admin/refresh-market",
        schedule: "30 12 * * 1-5",
      },
    ]);
  });
});
