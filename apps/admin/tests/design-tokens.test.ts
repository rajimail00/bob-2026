import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8").toLowerCase();

describe("approved admin design tokens", () => {
  it.each(["#55986c", "#585858", "#9e9e9e", "#008000", "#b31f1f", "#1c1c1c", "#ffffff"])("contains %s", (value) => {
    expect(css).toContain(value);
  });

  it("uses only the approved Inter weight scale", () => {
    const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map((match) => Number(match[1]));
    expect(new Set(weights)).toEqual(new Set([400, 500, 600, 700]));
  });
});
