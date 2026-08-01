import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const routesRoot = path.join(sourceRoot, 'routes');

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listSourceFiles(entryPath);
      }
      return /\.(?:ts|tsx)$/.test(entry.name) && entry.name !== 'routeTree.gen.ts' ? [entryPath] : [];
    }),
  );
  return nestedFiles.flat();
}

function normalizePath(value: string) {
  if (value === '/') return value;
  return value.replace(/\/$/, '');
}

function publicPathFromRouteId(routeId: string) {
  const segments = routeId.split('/').filter((segment) => segment && !segment.startsWith('_'));
  return normalizePath(`/${segments.join('/')}`);
}

function routeMatchesPath(routePattern: string, targetPath: string) {
  const normalizedPattern = normalizePath(routePattern);
  const normalizedTarget = normalizePath(targetPath);

  if (normalizedPattern === normalizedTarget) return true;

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const targetSegments = normalizedTarget.split('/').filter(Boolean);

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    if (patternSegment === '$') {
      return targetSegments.length >= index;
    }
    if (targetSegments[index] === undefined) return false;
    if (patternSegment?.startsWith('$')) continue;
    if (patternSegment !== targetSegments[index]) return false;
  }

  return patternSegments.length === targetSegments.length;
}

const sourceFiles = await listSourceFiles(sourceRoot);
const sourceEntries = await Promise.all(
  sourceFiles.map(async (filePath) => ({
    filePath,
    source: await readFile(filePath, 'utf8'),
  })),
);

const routePatterns = new Set<string>();
const routeDeclarationPattern = /createFileRoute\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const { source } of sourceEntries) {
  for (const match of source.matchAll(routeDeclarationPattern)) {
    if (match[1]) routePatterns.add(publicPathFromRouteId(match[1]));
  }
}

const navigationPatterns = [
  /(?:to|href)\s*=\s*(?:\{\s*)?['"](\/[^/'"?#\s}][^'"?#\s}]*)['"]/g,
  /(?:to|href)\s*:\s*['"](\/[^/'"?#\s}][^'"?#\s}]*)['"]/g,
  /window\.location\.href\s*=\s*['"](\/[^/'"?#\s}][^'"?#\s}]*)['"]/g,
];

const missingRoutes: string[] = [];
for (const { filePath, source } of sourceEntries) {
  for (const navigationPattern of navigationPatterns) {
    for (const match of source.matchAll(navigationPattern)) {
      const targetPath = match[1];
      if (!targetPath || targetPath.startsWith('/api/')) continue;
      if (/\.(?:ico|png|jpe?g|webp|svg|webmanifest)$/.test(targetPath)) continue;
      if (![...routePatterns].some((routePattern) => routeMatchesPath(routePattern, targetPath))) {
        missingRoutes.push(`${path.relative(projectRoot, filePath)} -> ${targetPath}`);
      }
    }
  }
}

assert.deepEqual(missingRoutes, [], `Internal navigation points to missing routes:\n${missingRoutes.join('\n')}`);

assert.ok(routePatterns.has('/extension'), 'The public /extension route must exist.');
assert.ok(routePatterns.has('/on-task'), 'The extension /on-task handoff route must exist.');

const onTaskSource = await readFile(path.join(routesRoot, '_default', 'on-task.tsx'), 'utf8');
assert.equal(
  onTaskSource.includes("status: 'deferred'"),
  false,
  '/on-task must not regress to a deferred placeholder.',
);
assert.equal(
  onTaskSource.includes('until extension API and server functions are migrated'),
  false,
  '/on-task must keep its task claim and publish implementation.',
);

const taskApiSource = await readFile(path.join(routesRoot, 'api', 'extension', 'task.ts'), 'utf8');
assert.equal(
  taskApiSource.includes('taskData: body.taskData'),
  false,
  'Extension tasks must persist validated taskData instead of the untrusted request body.',
);
assert.ok(
  taskApiSource.includes('taskData: validatedData.taskData'),
  'Extension task persistence must keep the validated payload.',
);

const taskTypesSource = await readFile(path.join(routesRoot, 'api', 'extension', '-types.ts'), 'utf8');
assert.ok(
  taskTypesSource.includes("z.discriminatedUnion('taskType'"),
  'Extension taskType and taskData must remain bound by a discriminated union.',
);

const pingSource = await readFile(path.join(routesRoot, 'api', 'extension', 'ping.ts'), 'utf8');
assert.ok(
  pingSource.includes('createTaskHandoffToken'),
  'Extension task URLs must keep their signed handoff credential.',
);
assert.ok(
  pingSource.includes('IMMEDIATE_TASK_TIMEOUT_MS') && pingSource.includes('ACTIVE_TASK_TIMEOUT_MS'),
  'Extension task polling must expire stale immediate and abandoned active tasks.',
);

console.log(`Migration regression checks passed for ${routePatterns.size} routes.`);
