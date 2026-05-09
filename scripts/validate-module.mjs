#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const failures = [];

function rel(...parts) {
  return path.join(...parts).replaceAll(path.sep, "/");
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(absolute(relativePath), "utf8"));
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function walk(relativeDir, extensions) {
  const results = [];
  const start = absolute(relativeDir);
  if (!existsSync(start)) return results;

  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        visit(full);
      } else if (extensions.some((ext) => full.endsWith(ext))) {
        results.push(path.relative(root, full).replaceAll(path.sep, "/"));
      }
    }
  };

  visit(start);
  return results;
}

function checkManifest() {
  const manifest = readJson("module.json");
  if (!manifest) return;

  check(manifest.id === "draw-steel-plus", "module.json: id changed");
  check(
    manifest.compatibility?.minimum?.startsWith("14."),
    "module.json: expected Foundry v14 minimum compatibility",
  );
  check(
    manifest.relationships?.systems?.some((system) => system.id === "draw-steel"),
    "module.json: missing Draw Steel system relationship",
  );

  for (const scriptPath of manifest.esmodules ?? []) {
    check(existsSync(absolute(scriptPath)), `module.json: missing ${scriptPath}`);
  }

  for (const stylePath of manifest.styles ?? []) {
    check(existsSync(absolute(stylePath)), `module.json: missing ${stylePath}`);
  }

  for (const language of manifest.languages ?? []) {
    check(
      existsSync(absolute(language.path)),
      `module.json: missing language file ${language.path}`,
    );
    if (language.path) readJson(language.path);
  }
}

function checkCssImports() {
  const mainCssPath = "styles/main.css";
  if (!existsSync(absolute(mainCssPath))) return;

  const source = readFileSync(absolute(mainCssPath), "utf8");
  const importPattern = /@import\s+(?:url\(["']?([^"')]+)["']?\)|["']([^"']+)["'])/g;
  for (const match of source.matchAll(importPattern)) {
    const importPath = match[1] ?? match[2];
    if (!importPath || /^(?:https?:)?\/\//.test(importPath)) continue;
    const resolved = rel(path.dirname(mainCssPath), importPath);
    check(existsSync(absolute(resolved)), `${mainCssPath}: missing ${importPath}`);
  }
}

function checkCssSelectors() {
  for (const cssPath of walk("styles", [".css"])) {
    const lines = readFileSync(absolute(cssPath), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*&/.test(line)) {
        failures.push(`${cssPath}:${index + 1}: raw nesting selector is invalid`);
      }
      if (/\.sheet\s*&/.test(line)) {
        failures.push(`${cssPath}:${index + 1}: parent selector is invalid`);
      }
    });
  }
}

function normalizeTemplateRef(reference) {
  if (reference.startsWith("systems/")) return null;
  if (reference.startsWith("templates/generic/")) return null;
  if (reference.startsWith("${MODULE_PATH}/")) {
    return reference.slice("${MODULE_PATH}/".length);
  }
  if (reference.startsWith("modules/${MODULE_ID}/")) {
    return reference.slice("modules/${MODULE_ID}/".length);
  }
  if (reference.startsWith("modules/draw-steel-plus/")) {
    return reference.slice("modules/draw-steel-plus/".length);
  }
  return reference.startsWith("templates/") ? reference : null;
}

function checkTemplateRefs() {
  const files = [...walk("scripts", [".js", ".mjs"]), ...walk("templates", [".hbs"])];
  const refPattern =
    /((?:systems\/draw-steel\/|\$\{MODULE_PATH\}\/|modules\/\$\{MODULE_ID\}\/|modules\/draw-steel-plus\/)?templates\/[^`"'\s)]+?\.hbs)/g;

  for (const file of files) {
    const source = readFileSync(absolute(file), "utf8");
    for (const match of source.matchAll(refPattern)) {
      const localRef = normalizeTemplateRef(match[1]);
      if (!localRef) continue;
      check(existsSync(absolute(localRef)), `${file}: missing template ${match[1]}`);
    }
  }
}

function checkScriptSyntax() {
  for (const scriptPath of walk("scripts", [".js", ".mjs"])) {
    const result = spawnSync(process.execPath, ["--check", absolute(scriptPath)], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      failures.push(
        `${scriptPath}: JavaScript syntax check failed\n${result.stderr.trim()}`,
      );
    }
  }
}

checkManifest();
checkCssImports();
checkCssSelectors();
checkTemplateRefs();
checkScriptSyntax();

if (failures.length) {
  console.error("Module validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Module validation passed.");
