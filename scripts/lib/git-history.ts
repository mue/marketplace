import fse from 'fs-extra';
import crypto from 'crypto';
import type { SimpleGit, DefaultLogFields, LogResult } from 'simple-git';

import type { BuildCacheData } from '../types.js';

type GitLogResult = LogResult<DefaultLogFields>;

export interface GitTimestamps {
  created_at: string;
  updated_at: string;
}

export async function computeFileHash(filePath: string): Promise<string> {
  const content = await fse.readFile(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export async function fetchGitHistory(
  allPaths: string[],
  cache: BuildCacheData,
  git: SimpleGit,
): Promise<Map<string, GitTimestamps>> {
  const result = new Map<string, GitTimestamps>();

  const fileHashes = new Map<string, string>();
  await Promise.all(
    allPaths.map(async (path) => {
      fileHashes.set(path, await computeFileHash(path));
    }),
  );

  const pathsNeedingFetch: string[] = [];
  let cacheHits = 0;

  for (const path of allPaths) {
    const fileHash = fileHashes.get(path)!;
    const cached = cache.gitHistory[path];

    if (cached && cached.contentHash === fileHash) {
      result.set(path, { created_at: cached.created_at, updated_at: cached.updated_at });
      cacheHits++;
    } else {
      pathsNeedingFetch.push(path);
    }
  }

  console.log(`Cache hits: ${cacheHits}/${allPaths.length} files`);

  if (pathsNeedingFetch.length === 0) {
    console.log('All git history loaded from cache');
    return result;
  }

  console.log(`Fetching git history for ${pathsNeedingFetch.length} changed files...`);

  try {
    const allHistory = await Promise.all(
      pathsNeedingFetch.map((path) =>
        git
          .log<DefaultLogFields>({ file: path, strictDate: true })
          .then((history) => ({ path, history }))
          .catch((err): { path: string; history: GitLogResult | null } => {
            console.warn(`Warning: Could not get git history for ${path}`, err);
            return { path, history: null };
          }),
      ),
    );

    for (const { path, history } of allHistory) {
      if (history && history.latest) {
        const timestamps: GitTimestamps = {
          updated_at: new Date(history.latest.date).toISOString(),
          created_at: new Date(history.all[history.all.length - 1].date).toISOString(),
        };

        result.set(path, timestamps);
        cache.gitHistory[path] = { ...timestamps, contentHash: fileHashes.get(path)! };
      }
    }

    console.log(`Fetched git history for ${pathsNeedingFetch.length} files`);
  } catch (e) {
    console.error('Error fetching git history:', e);
  }

  return result;
}
