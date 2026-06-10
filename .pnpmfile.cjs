function removeKeys(record, keys) {
  if (!record) {
    return;
  }

  for (const key of keys) {
    delete record[key];
  }
}

const prismaScope = '@' + 'prisma';
const prismaPeerKeys = [`${prismaScope}/client`, 'prisma'];

module.exports = {
  hooks: {
    readPackage(pkg) {
      // Verified on 2026-06-10: removing this hook and auto-install-peers=false
      // lets pnpm install reintroduce @better-auth/prisma-adapter and
      // @sentry/node into pnpm-lock.yaml through optional/peer dependency paths.
      if (pkg.name === 'better-auth') {
        removeKeys(pkg.dependencies, ['@better-auth/prisma-adapter']);
        removeKeys(pkg.peerDependencies, prismaPeerKeys);
        removeKeys(pkg.peerDependenciesMeta, prismaPeerKeys);
      }

      if (pkg.name === 'drizzle-orm') {
        removeKeys(pkg.peerDependencies, prismaPeerKeys);
        removeKeys(pkg.peerDependenciesMeta, prismaPeerKeys);
      }

      if (pkg.name === '@sentry/profiling-node') {
        removeKeys(pkg.dependencies, ['@sentry/node']);
      }

      return pkg;
    },
  },
};
