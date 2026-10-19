import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWideTile, matchesAudience, splitWords, trackPointer } from "./motion.js";
import { capabilities } from "./content.js";

describe("landing motion helpers", () => {
  it("splits Arabic text on whitespace only, keeping each word whole", () => {
    assert.deepEqual(splitWords("  إلى   تجربة حقيقية "), ["إلى", "تجربة", "حقيقية"]);
    assert.deepEqual(splitWords(""), []);
    assert.deepEqual(splitWords(undefined), []);
  });

  it("matches capability audiences, with shared items visible under every filter", () => {
    assert.equal(matchesAudience("students", "all"), true);
    assert.equal(matchesAudience("students", "students"), true);
    assert.equal(matchesAudience("students", "organizations"), false);
    assert.equal(matchesAudience("both", "organizations"), true);
  });

  it("fills every three-column bento row with the current capability list", () => {
    const spans = capabilities.items.map((_, index) => (isWideTile(index) ? 2 : 1));
    let row = 0;
    for (const span of spans) {
      row += span;
      assert.ok(row <= 3, "a tile overflows its row");
      if (row === 3) row = 0;
    }
    assert.equal(row, 0, "the last bento row is not full");
  });

  it("offers a filter for each audience used by the capabilities", () => {
    const filterIds = capabilities.filters.map((filter) => filter.id);
    assert.equal(filterIds[0], "all");
    for (const item of capabilities.items) {
      if (item.audience !== "both") assert.ok(filterIds.includes(item.audience), `no filter for ${item.audience}`);
    }
  });

  it("puts capability illustrations only on wide tiles, with known art keys", () => {
    capabilities.items.forEach((item, index) => {
      if (!item.art) return;
      assert.ok(["discovery", "match", "profile"].includes(item.art), `unknown art ${item.art}`);
      assert.ok(isWideTile(index), `${item.title} has art but is not a wide tile`);
    });
  });

  it("writes the pointer position relative to the element", () => {
    const props = {};
    const element = {
      getBoundingClientRect: () => ({ left: 100, top: 40 }),
      style: { setProperty: (name, value) => (props[name] = value) },
    };
    trackPointer({ currentTarget: element, clientX: 130, clientY: 90 });
    assert.deepEqual(props, { "--mx": "30px", "--my": "50px" });
  });
});
