#!/usr/bin/env bash
# scripts/push-data.sh - V2026.06.16
# 把本輪 notify.js 產生的事件（data/events-*.ndjson）累積推到 repo 的「data」分支。
# 用獨立分支：main 保持乾淨、且不會觸發 Vercel 重新部署。
# App 的「數據」分頁從 raw.githubusercontent 的 data 分支直接讀取。
set -uo pipefail

ls data/events-*.ndjson >/dev/null 2>&1 || { echo "本輪無事件，略過 push"; exit 0; }

git config user.name "court-watch-bot"
git config user.email "court-watch-bot@users.noreply.github.com"

WT=/tmp/databranch
for attempt in 1 2 3; do
  rm -rf "$WT"
  git worktree prune 2>/dev/null || true

  if git fetch origin data 2>/dev/null; then
    git worktree add "$WT" data >/dev/null 2>&1 || { echo "worktree add 失敗"; sleep 3; continue; }
    ( cd "$WT" && git pull --rebase origin data >/dev/null 2>&1 || true )
  else
    # data 分支尚不存在 → 建立 orphan 分支
    git worktree add --detach "$WT" >/dev/null 2>&1
    ( cd "$WT" && git checkout --orphan data >/dev/null 2>&1 && git rm -rf . >/dev/null 2>&1 || true )
  fi

  mkdir -p "$WT/data"
  for f in data/events-*.ndjson; do
    cat "$f" >> "$WT/data/$(basename "$f")"
  done

  if ( cd "$WT" \
        && git add data \
        && git commit -m "data: $(date -u +%FT%TZ) ($(cat data/events-*.ndjson | wc -l) lines)" >/dev/null 2>&1 \
        && git push origin HEAD:data >/dev/null 2>&1 ); then
    echo "事件已推到 data 分支（第 $attempt 次嘗試）"
    git worktree remove --force "$WT" 2>/dev/null || true
    exit 0
  fi

  echo "push 第 $attempt 次失敗（可能撞到並發），重試…"
  git worktree remove --force "$WT" 2>/dev/null || true
  sleep $((attempt * 3))
done

echo "push 連續失敗，本輪事件留待下輪一起補（事件檔在 main 工作區，不影響）"
exit 0
