// Monorepo root lint-staged: only lint root-level files and apps/web/
// Other apps (desktop, backend, video-stt-worker) and packages have their own toolchains
const isWebOrRoot = (f) => {
  if (!f.includes('/apps/') && !f.includes('/packages/')) return true;
  if (f.includes('/apps/web/')) return true;
  return false;
};

export default {
  '*.{js,ts,jsx,tsx,mjs,cjs}': (filenames) => {
    const filtered = filenames.filter(isWebOrRoot);
    return filtered.length > 0 ? [`eslint ${filtered.join(' ')}`] : [];
  },
  '*.{css,scss,sass,less}': (filenames) => {
    const filtered = filenames.filter(isWebOrRoot);
    return filtered.length > 0 ? [`stylelint --allow-empty-input ${filtered.join(' ')}`] : [];
  },
};
