import { collectSources } from './catalog/fetch.mjs';
await collectSources(new URL('../.cache/catalog',import.meta.url).pathname);
