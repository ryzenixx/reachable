#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

git config alias.release '!f(){ bash scripts/git-release.sh "$@"; }; f'

echo "Installed local alias:"
echo "  git release"
echo
echo "Examples:"
echo "  git release           # auto mode"
echo "  git release prepare"
echo "  git release publish"
