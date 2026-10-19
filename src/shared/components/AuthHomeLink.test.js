import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

describe("auth back-to-landing link", () => {
  it("points to the landing route", async () => {
    const [link, app] = await Promise.all([read("./AuthHomeLink.jsx"), read("../../App.jsx")]);
    assert.match(link, /<Link to="\/"/);
    assert.match(app, /path="\/" element={<LandingPage \/>}/);
  });

  for (const page of ["Login", "Register"]) {
    it(`is rendered at the top of the ${page} form column`, async () => {
      const source = await read(`../pages/${page}.jsx`);
      assert.match(source, /<section className="signin-section has-home-link">\s*<AuthHomeLink \/>/);
    });
  }
});
