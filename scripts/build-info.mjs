import { execFileSync } from 'node:child_process';

export function buildInfo(root, siteUrl, options = {}) {
  const git = args => {
    try { return execFileSync('git', ['-C', root, ...args], {encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim(); }
    catch { return null; }
  };
  const commitSha = options.commitSha ?? process.env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
  if (commitSha !== null && !/^[a-f0-9]{40,64}$/i.test(commitSha)) throw new Error('build-info: commitSha 必须是完整 Git SHA');
  const source = options.source ?? process.env.BUILD_SOURCE ?? (process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local');
  if (typeof source !== 'string' || !source.trim()) throw new Error('build-info: source 必须是非空文字');
  const date = new Date(options.builtAt ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new Error('build-info: builtAt 必须是有效时间');
  return {
    commitSha,
    builtAt: date.toISOString(),
    source,
    siteUrl,
    workingTreeDirty: Boolean(git(['status', '--porcelain', '--untracked-files=no'])),
    ...(process.env.GITHUB_ACTIONS === 'true' ? {
      runUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    } : {})
  };
}
