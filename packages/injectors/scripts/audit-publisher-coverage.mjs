#!/usr/bin/env node

/**
 * Verify that every publisher module recovered from a reference extension has
 * a maintained injector source in this monorepo.  Publisher names are not
 * always source filenames: a few products share an implementation, so the
 * aliases below are intentionally explicit and reviewable.
 *
 * Usage:
 *   node packages/injectors/scripts/audit-publisher-coverage.mjs <recovered-src>
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const recoveredRoot = process.argv[2];
if (!recoveredRoot) {
  console.error("Usage: audit-publisher-coverage.mjs <recovered-src>");
  process.exit(2);
}

const sourceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../src");
const publisherRoot = path.join(path.resolve(recoveredRoot), "publisher", "publishers");

// Names in the built extension describe products, while our source tree uses
// the canonical implementation/platform name.
const aliases = {
  163: "article/netease.ts",
  // The bundle uses the short Bluesky product key.
  bsky: "dynamic/bluesky.ts",
  caifuhao: "article/eastmoney.ts",
  dongchehao: "article/dongchedi.ts",
  iqiyi: "video/iqiyi.ts",
  jike: "dynamic/okjike.ts",
  neteasecloudmusic: "podcast/netease.ts",
  pintererst: "dynamic/pinterest.ts",
  shipinhao: "video/weixinchannel.ts",
  sohutv: "video/sohu.ts",
  // The built-in demo component is bundled under publishers but is not a
  // publishing adapter and therefore has no maintained injector counterpart.
  plasmo: null,
  yidiainzixun: "article/yidianzixun.ts",
  zhihuzhuanlan: "article/zhihu.ts",
};

const files = fs
  .readdirSync(publisherRoot)
  .filter((file) => file.endsWith(".js"))
  .map((file) => file.slice(0, -3))
  .sort();

const sourceFiles = new Set();
for (const category of ["article", "dynamic", "podcast", "video"]) {
  const categoryRoot = path.join(sourceRoot, category);
  for (const file of fs.readdirSync(categoryRoot)) {
    if (file.endsWith(".ts")) sourceFiles.add(`${category}/${file}`);
  }
}

const missing = [];
const nonPublishers = [];
const resolved = files.map((name) => {
  if (name === "plasmo") {
    nonPublishers.push(name);
    return { name, source: "(bundled demo component; not an adapter)" };
  }
  const candidate = aliases[name] || ["article", "dynamic", "podcast", "video"]
    .map((category) => `${category}/${name}.ts`)
    .find((file) => sourceFiles.has(file));
  if (!candidate) missing.push(name);
  return { name, source: candidate || null };
});

console.log(`Reference publishers: ${files.length}`);
console.log(`Covered by maintained injectors: ${files.length - missing.length - nonPublishers.length}`);
if (nonPublishers.length) console.log(`Non-publisher bundle modules: ${nonPublishers.join(", ")}`);
for (const item of resolved) console.log(`  ${item.name} -> ${item.source || "MISSING"}`);
if (missing.length) {
  console.error(`Missing injector source for ${missing.length} publisher(s): ${missing.join(", ")}`);
  process.exit(1);
}
console.log("Publisher coverage: OK");
