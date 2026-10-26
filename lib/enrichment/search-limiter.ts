import type { SearchProvider } from "./news";

/** One shared budget for the provider calls of one coordinated build request. */
export function limitSearchProvider(provider: SearchProvider, concurrency = 4): SearchProvider {
  concurrency = Math.max(1, Math.min(8, Math.trunc(concurrency) || 1));
  let active = 0;
  const queue: Array<() => void> = [];
  const pump = () => { while (active < concurrency && queue.length) queue.shift()!(); };
  return {
    name: provider.name,
    search(query, signal, options) {
      return new Promise((resolve, reject) => {
        const cancel = () => {
          const index = queue.indexOf(start);
          if (index >= 0) queue.splice(index, 1);
          signal.removeEventListener("abort", cancel);
          reject(signal.reason);
        };
        const start = () => {
          signal.removeEventListener("abort", cancel);
          if (signal.aborted) { reject(signal.reason); return; }
          active++;
          Promise.resolve().then(() => provider.search(query, signal, options)).then(resolve, reject)
            .finally(() => { active--; pump(); });
        };
        if (signal.aborted) { reject(signal.reason); return; }
        signal.addEventListener("abort", cancel, { once: true });
        queue.push(start); pump();
      });
    },
  };
}
