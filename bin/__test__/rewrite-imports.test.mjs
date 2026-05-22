import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { rewriteImports, resolveConfig, routeDest } from "../slintcn.mjs";

const cwd = "/proj";

describe("resolveConfig", () => {
  it("fills defaults when nothing is provided", () => {
    const c = resolveConfig({}, cwd);
    assert.equal(c.style, "default");
    assert.equal(c.outDir, "/proj/ui/slintcn");
    assert.equal(c.themeDir, "/proj/ui/slintcn/theme");
    assert.equal(c.componentsDir, "/proj/ui/slintcn/components");
  });

  it("derives theme/components dirs from custom outDir", () => {
    const c = resolveConfig({ outDir: "src/ui" }, cwd);
    assert.equal(c.outDir, "/proj/src/ui");
    assert.equal(c.themeDir, "/proj/src/ui/theme");
    assert.equal(c.componentsDir, "/proj/src/ui/components");
  });

  it("honors explicit themeDir / componentsDir", () => {
    const c = resolveConfig(
      { outDir: "ui/slintcn", themeDir: "shared/tokens", componentsDir: "src/ui/parts" },
      cwd,
    );
    assert.equal(c.themeDir, "/proj/shared/tokens");
    assert.equal(c.componentsDir, "/proj/src/ui/parts");
  });
});

describe("routeDest", () => {
  it("routes theme/ files to themeDir", () => {
    const c = resolveConfig({ themeDir: "shared/tokens" }, cwd);
    assert.equal(routeDest("theme/tokens.slint", c), "/proj/shared/tokens/tokens.slint");
    assert.equal(routeDest("theme/palette.slint", c), "/proj/shared/tokens/palette.slint");
  });

  it("routes components/ files to componentsDir", () => {
    const c = resolveConfig({ componentsDir: "src/parts" }, cwd);
    assert.equal(routeDest("components/button.slint", c), "/proj/src/parts/button.slint");
  });

  it("routes blocks/ files to blocksDir (default + explicit)", () => {
    const def = resolveConfig({}, cwd);
    assert.equal(def.blocksDir, "/proj/ui/slintcn/blocks");
    assert.equal(routeDest("blocks/sign-in.slint", def), "/proj/ui/slintcn/blocks/sign-in.slint");
    const custom = resolveConfig({ blocksDir: "src/templates" }, cwd);
    assert.equal(routeDest("blocks/dashboard.slint", custom), "/proj/src/templates/dashboard.slint");
  });
});

describe("rewriteImports", () => {
  it("is a no-op under default layout (consumer at outDir/components, theme at outDir/theme)", () => {
    const config = resolveConfig({}, cwd);
    const dest = routeDest("components/button.slint", config);
    const src = `import { Tokens } from "../theme/tokens.slint";\nexport component Button {}\n`;
    const out = rewriteImports(src, config, dest);
    assert.match(out, /from "\.\.\/theme\/tokens\.slint"/);
  });

  it("rewrites a theme import when themeDir is moved away from outDir", () => {
    const config = resolveConfig({ outDir: "ui/slintcn", themeDir: "shared/tokens" }, cwd);
    const dest = routeDest("components/button.slint", config);
    // dest = /proj/ui/slintcn/components/button.slint
    // theme = /proj/shared/tokens/tokens.slint
    // expected: ../../../shared/tokens/tokens.slint
    const src = `import { Tokens } from "../theme/tokens.slint";`;
    const out = rewriteImports(src, config, dest);
    assert.match(out, /from "\.\.\/\.\.\/\.\.\/shared\/tokens\/tokens\.slint"/);
  });

  it("rewrites a sibling component import when componentsDir is non-default", () => {
    // Hypothetical Wave 2 case: a Dialog importing Button.
    const config = resolveConfig(
      { outDir: "ui/slintcn", componentsDir: "src/ui/parts" },
      cwd,
    );
    const dest = routeDest("components/dialog.slint", config);
    // dest = /proj/src/ui/parts/dialog.slint
    // sibling button = /proj/src/ui/parts/button.slint
    // expected: ./button.slint
    const src = `import { Button } from "../components/button.slint";`;
    const out = rewriteImports(src, config, dest);
    assert.match(out, /from "\.\/button\.slint"/);
  });

  it("rewrites multiple imports in one file independently", () => {
    const config = resolveConfig(
      { outDir: "ui/slintcn", themeDir: "shared/tokens", componentsDir: "src/ui/parts" },
      cwd,
    );
    const dest = routeDest("components/dialog.slint", config);
    const src = [
      `import { Tokens } from "../theme/tokens.slint";`,
      `import { Button } from "../components/button.slint";`,
      `import { Foo } from "std-widgets.slint";`,
      ``,
    ].join("\n");
    const out = rewriteImports(src, config, dest);
    // Theme path goes up to /proj/, into shared/tokens.
    assert.match(out, /from ".*shared\/tokens\/tokens\.slint"/);
    // Sibling component stays in same dir.
    assert.match(out, /from "\.\/button\.slint"/);
    // Unrelated import passes through.
    assert.match(out, /from "std-widgets\.slint"/);
  });
});
