import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("atlas mobile layout CSS", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("keeps horizontal scrolling on the viewport-width wrapper and min width on content", () => {
    expect(css).toMatch(/\.relationship-scroll\s*\{[^}]*width:\s*100%[^}]*overflow:\s*auto/);
    expect(css).toMatch(/\.relationship-canvas\s*\{[^}]*min-width:\s*760px/);
    expect(css).not.toMatch(/\.relationship-scroll,\s*\n\s*\.relationship-canvas\s*\{[^}]*min-width/);
  });

  it("reflows the narrow header into rows and offsets the workspace below controls", () => {
    const narrow = css.match(/@media \(max-width: 639px\)\s*\{([\s\S]*)$/)?.[1] ?? "";
    expect(narrow).toMatch(/\.atlas-header\s*\{[^}]*grid-template-rows:/);
    expect(narrow).toMatch(/\.relationship-controls\s*\{[^}]*grid-row:\s*2/);
    expect(narrow).toMatch(/\.relationship-workspace\s*\{[^}]*padding-top:/);
  });
});
