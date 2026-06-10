import { buildNamespaces } from './build';

const modules = import.meta.glob<{ default: Record<string, unknown> }>('../locales/zh-CN/*.json', {
  eager: true,
});

export default buildNamespaces(modules);
