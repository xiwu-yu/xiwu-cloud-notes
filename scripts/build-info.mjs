import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

export function buildInfo(root, siteUrl, options = {}) {
  const git = args => execFileSync('git', ['-C', root, ...args], {encoding:'utf8', stdio:['ignore','pipe','ignore']});
  let commitSha = null;
  let workingTreeDirty = null;
  try {
    // 被复制到仓库内的 fixture/预览目录不能冒用父仓库的提交。
    if (realpathSync(git(['rev-parse', '--show-toplevel']).trim()) !== realpathSync(root)) throw new Error('not repository root');
    const head = git(['rev-parse', '--verify', 'HEAD']).trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(head)) throw new Error('invalid Git SHA');
    commitSha = head;
    // 尊重 .gitignore 排除依赖、报告和生成产物；包含未 git add 的源码。
    workingTreeDirty = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).length > 0;
    // 即使有人误把实际构建输入加入 ignore，也不能把它归为干净来源。
    if (!workingTreeDirty && options.buildInputs?.length) {
      const tracked = new Set(git(['ls-files', '--cached', '-z', '--', ...options.buildInputs]).split('\0'));
      workingTreeDirty = options.buildInputs.some(path => !tracked.has(path));
    }
  } catch { workingTreeDirty = null; }
  const source = options.source ?? process.env.BUILD_SOURCE ?? (process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local');
  if (typeof source !== 'string' || !source.trim()) throw new Error('build-info: source 必须是非空文字');
  const date = new Date(options.builtAt ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new Error('build-info: builtAt 必须是有效时间');
  return {
    commitSha,
    builtAt: date.toISOString(),
    source,
    siteUrl,
    workingTreeDirty,
    ...(process.env.GITHUB_ACTIONS === 'true' ? {
      runUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    } : {})
  };
}
