'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INSTALL_SCRIPT_VERSION = '3';
const REQUIRED_DIRS = ['agents', 'contracts', 'schemas', 'scripts', 'skills', 'docs'];
const ROOT_FILES = ['README.md', 'README.codex.md', 'INSTALL.md', 'AGENTS.md', '.gitignore'];
const EXCLUDED_DIRS = new Set(['.git', '.subpower', 'node_modules', 'coverage', 'logs', 'tmp']);

function parseArgs(argv) {
  const args = { dryRun: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--dry-run') args.dryRun = true;
    else if (item === '--force') args.force = true;
    else if (item === '--scope') args.scope = argv[++index];
    else if (item === '--target') args.target = argv[++index];
    else throw new Error(`unknown argument: ${item}`);
  }
  return args;
}

function expandHome(target) {
  if (target === '~') return os.homedir();
  if (target.startsWith('~/')) return path.join(os.homedir(), target.slice(2));
  return target;
}

function readPluginMetadata() {
  const pluginJson = path.join(ROOT, '.codex-plugin', 'plugin.json');
  return { path: '.codex-plugin/plugin.json', value: JSON.parse(fs.readFileSync(pluginJson, 'utf8')) };
}

function checkSource() {
  const errors = [];
  const pluginJson = path.join(ROOT, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(pluginJson)) errors.push('missing .codex-plugin/plugin.json');
  else readPluginMetadata();
  for (const dir of REQUIRED_DIRS) {
    if (!fs.statSync(path.join(ROOT, dir), { throwIfNoEntry: false })?.isDirectory()) {
      errors.push(`missing ${dir}/`);
    }
  }
  return errors;
}

function shouldSkip(relPath) {
  const parts = relPath.split(path.sep);
  return parts.some((part) => EXCLUDED_DIRS.has(part));
}

function collectEntries() {
  const entries = [];
  const excluded = [];
  function visit(abs, rel) {
    if (rel && shouldSkip(rel)) {
      excluded.push(rel);
      return;
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(abs).sort()) {
        visit(path.join(abs, child), rel ? path.join(rel, child) : child);
      }
      return;
    }
    entries.push(rel);
  }
  for (const dir of ['.codex-plugin', ...REQUIRED_DIRS]) {
    visit(path.join(ROOT, dir), dir);
  }
  for (const file of ROOT_FILES) {
    if (fs.existsSync(path.join(ROOT, file))) entries.push(file);
  }
  for (const excludedDir of EXCLUDED_DIRS) {
    if (fs.existsSync(path.join(ROOT, excludedDir))) excluded.push(excludedDir);
  }
  return { entries: Array.from(new Set(entries)).sort(), excluded: Array.from(new Set(excluded)).sort() };
}

function copyFile(relPath, target, dryRun) {
  const from = path.join(ROOT, relPath);
  const to = path.join(target, relPath);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function sourceCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return 'unknown';
  return result.stdout.trim() || 'unknown';
}

function writeManifest(target, summary, metadata) {
  const manifest = {
    plugin_id: metadata.value.name || 'subpower',
    installed_at: new Date().toISOString(),
    source_root: ROOT,
    scope: summary.scope,
    files: summary.copied,
    excluded: summary.skipped,
    plugin_metadata_path: metadata.path,
    install_script_version: INSTALL_SCRIPT_VERSION,
    source_commit: sourceCommit(),
  };
  fs.writeFileSync(path.join(target, 'subpower-plugin-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function installPlugin(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.scope || !['personal', 'repo'].includes(args.scope)) {
    throw new Error('--scope must be personal or repo');
  }
  if (!args.target) {
    throw new Error('--target is required');
  }
  const target = path.resolve(expandHome(args.target));
  const warnings = [];
  const sourceErrors = checkSource();
  if (sourceErrors.length > 0) {
    throw new Error(sourceErrors.join('; '));
  }
  if (fs.existsSync(target) && !args.force && !args.dryRun) {
    throw new Error(`target already exists: ${target}`);
  }
  if (fs.existsSync(target) && args.force && !args.dryRun) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  if (args.scope === 'personal' && !target.includes(path.join('.codex', 'plugins'))) {
    warnings.push('personal scope target is outside a .codex/plugins path');
  }
  if (args.scope === 'repo' && path.isAbsolute(args.target) && !args.target.startsWith('/tmp/')) {
    warnings.push('repo scope target is absolute; ensure this is an intentional staging directory');
  }

  const copied = [];
  const skipped = [];
  const { entries, excluded } = collectEntries();
  skipped.push(...excluded);
  for (const relPath of entries) {
    if (shouldSkip(relPath)) {
      skipped.push(relPath);
      continue;
    }
    copyFile(relPath, target, args.dryRun);
    copied.push(relPath);
  }
  const summary = { ok: true, scope: args.scope, target, copied, skipped: Array.from(new Set(skipped)).sort(), warnings };
  if (!args.dryRun) {
    summary.manifest = writeManifest(target, summary, readPluginMetadata());
  }
  return summary;
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(installPlugin(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

module.exports = { INSTALL_SCRIPT_VERSION, installPlugin, shouldSkip };
