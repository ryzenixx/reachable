#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck disable=SC2016
git config alias.release '!f(){ repo_root="$(git rev-parse --show-toplevel)" || exit 1; bash "$repo_root/scripts/git-release.sh" "$@"; }; f'

echo "Installed local alias:"
echo "  git release"
echo
echo "Examples:"
echo "  git release           # auto mode"
echo "  git release prepare"
echo "  git release publish"
