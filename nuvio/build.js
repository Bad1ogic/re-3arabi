#!/usr/bin/env node
/*
 * Nuvio build script for re-3arabi
 *
 * 1. Bundles every provider in src/providers/<id>.js into providers/<id>.js
 *    (esbuild, CJS, target es2016 so Hermes can run it, cheerio etc. external).
 * 2. Reads each provider's exported metadata and programmatically generates
 *    manifest.json.
 *
 * Usage:
 *   node build.js            # build all providers
 *   node build.js --minify   # build all providers, minified
 */

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src", "providers");
const outDir = path.join(__dirname, "providers");
const manifestPath = path.join(__dirname, "manifest.json");

const EXTERNAL_MODULES = [
  "cheerio-without-node-native",
  "react-native-cheerio",
  "cheerio",
  "crypto-js",
  "axios"
];

function listProviders() {
  if (!fs.existsSync(srcDir)) {
    console.error("src/providers/ not found.");
    process.exit(1);
  }
  return fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".js"))
    .sort();
}

function loadMetadata(file) {
  const meta = require(path.join(srcDir, file)).metadata || {};
  return {
    id: meta.id || file.replace(/\.js$/, ""),
    name: meta.name || file.replace(/\.js$/, ""),
    description: meta.description || "",
    version: meta.version || "1.0.0",
    author: meta.author || "Bad1ogic",
    supportedTypes: meta.supportedTypes || ["movie", "tv"],
    enabled: meta.enabled !== false,
    logo: meta.logo || "",
    contentLanguage: meta.contentLanguage || ["ar"],
    formats: meta.formats || ["mp4", "m3u8"],
    limited: !!meta.limited,
    disabledPlatforms: meta.disabledPlatforms || [],
    supportsExternalPlayer: meta.supportsExternalPlayer !== false,
    filename: "providers/" + (meta.id || file.replace(/\.js$/, "")) + ".js"
  };
}

async function buildProvider(file, minify, meta) {
  const outFile = path.join(outDir, (meta.id || file.replace(/\.js$/, "")) + ".js");
  try {
    await esbuild.build({
      entryPoints: [path.join(srcDir, file)],
      bundle: true,
      outfile: outFile,
      format: "cjs",
      platform: "neutral",
      target: "es2016",
      minify: minify,
      sourcemap: false,
      external: EXTERNAL_MODULES,
      banner: {
        js:
          "/**\n * " +
          meta.name +
          " - Built from nuvio/src/providers/" +
          file +
          "\n * Generated: " +
          new Date().toISOString() +
          "\n */"
      },
      logLevel: "warning"
    });
    const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log("  ✓ " + outFile.replace(__dirname + path.sep, "") + " (" + sizeKB + " KB)");
    return true;
  } catch (err) {
    console.error("  ✗ Failed to build " + file + ": " + err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const minify = args.includes("--minify");

  const files = listProviders();
  console.log("\nBundling " + files.length + " Nuvio provider(s)\n");

  const manifest = [];
  let ok = 0;
  let failed = 0;

  for (const file of files) {
    let meta;
    try {
      meta = loadMetadata(file);
    } catch (err) {
      console.error("  ✗ Skipping " + file + ": cannot load metadata (" + err.message + ")");
      failed++;
      continue;
    }
    const built = await buildProvider(file, minify, meta);
    if (!built) {
      failed++;
      continue;
    }
    manifest.push(meta);
    ok++;
  }

  manifest.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log("\nWrote manifest.json with " + manifest.length + " enabled/tracked provider(s)");
  console.log("Done: " + ok + " built, " + failed + " failed/skipped\n");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});