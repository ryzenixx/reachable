#!/usr/bin/env bash
set -euo pipefail

DEV_BRANCH="${DEV_BRANCH:-develop}"
PROD_BRANCH="${PROD_BRANCH:-main}"

VERSION_FILE="VERSION"
API_VERSION_FILE="api/VERSION"
VERSION_REGEX='^[0-9]+\.[0-9]+\.[0-9]+$'

log() {
  printf '%s\n' "$*" >&2
}

die() {
  log "Error: $*"
  exit 1
}

ensure_repo_root() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not inside a git repository."
  fi

  cd "$(git rev-parse --show-toplevel)"
}

ensure_required_files() {
  [[ -f "${VERSION_FILE}" ]] || die "Missing ${VERSION_FILE}"
  [[ -f "${API_VERSION_FILE}" ]] || die "Missing ${API_VERSION_FILE}"
}

ensure_on_branch() {
  local expected="$1"
  local current
  current="$(git rev-parse --abbrev-ref HEAD)"
  [[ "${current}" == "${expected}" ]] || die "Run this command on '${expected}' (current: '${current}')."
}

ensure_clean_worktree() {
  local dirty
  dirty="$(git status --porcelain --untracked-files=normal)"
  [[ -z "${dirty}" ]] || die "Working tree is not clean. Commit/stash changes first."
}

validate_version() {
  local version="$1"
  [[ "${version}" =~ ${VERSION_REGEX} ]] || die "Invalid version '${version}'. Expected X.Y.Z"
}

version_from_file() {
  tr -d '[:space:]' < "$1"
}

latest_tag_version() {
  local tag
  tag="$(git for-each-ref --sort=-version:refname --format='%(refname:short)' refs/tags | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 || true)"
  if [[ -z "${tag}" ]]; then
    echo "0.0.0"
    return
  fi
  echo "${tag#v}"
}

max_version() {
  local left="$1"
  local right="$2"
  if [[ "$(printf '%s\n%s\n' "${left}" "${right}" | sort -V | tail -n1)" == "${left}" ]]; then
    echo "${left}"
  else
    echo "${right}"
  fi
}

is_version_greater() {
  local current="$1"
  local candidate="$2"
  [[ "$(printf '%s\n%s\n' "${current}" "${candidate}" | sort -V | tail -n1)" == "${candidate}" && "${current}" != "${candidate}" ]]
}

tag_exists() {
  local tag="$1"
  if git show-ref --verify --quiet "refs/tags/${tag}"; then
    return 0
  fi
  git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1
}

switch_branch() {
  local branch="$1"
  if git switch "${branch}" >/dev/null 2>&1; then
    return
  fi
  git checkout "${branch}" >/dev/null
}

sync_branch_with_origin() {
  local branch="$1"
  log "Syncing ${branch} with origin/${branch}..."
  switch_branch "${branch}"
  git pull --ff-only origin "${branch}"
}

prompt_next_version() {
  local base="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<< "${base}"

  local patch_bump minor_bump major_bump
  patch_bump="${major}.${minor}.$((patch + 1))"
  minor_bump="${major}.$((minor + 1)).0"
  major_bump="$((major + 1)).0.0"

  log ""
  log "Current base version: v${base}"
  log "Choose next version:"
  log "  1) patch -> v${patch_bump}"
  log "  2) minor -> v${minor_bump}"
  log "  3) major -> v${major_bump}"
  log "  4) custom"
  printf 'Choice [1-4]: ' >&2

  local choice selected
  read -r choice

  case "${choice}" in
    ""|1) selected="${patch_bump}" ;;
    2) selected="${minor_bump}" ;;
    3) selected="${major_bump}" ;;
    4)
      printf 'Enter custom version (X.Y.Z): ' >&2
      read -r selected
      ;;
    *)
      die "Invalid choice '${choice}'."
      ;;
  esac

  validate_version "${selected}"
  is_version_greater "${base}" "${selected}" || die "Selected version must be greater than ${base}."
  echo "${selected}"
}

create_github_release_if_possible() {
  local tag="$1"
  local origin_url
  origin_url="$(git remote get-url origin 2>/dev/null || true)"

  if [[ "${origin_url}" != *github.com* ]]; then
    log "Tag pushed: ${tag}"
    log "Origin is not a GitHub remote, skipping gh release creation."
    return
  fi

  if ! command -v gh >/dev/null 2>&1; then
    log "Tag pushed: ${tag}"
    log "GitHub CLI not found, create the release manually if needed."
    return
  fi

  if ! gh auth status >/dev/null 2>&1; then
    log "Tag pushed: ${tag}"
    log "GitHub CLI not authenticated, run 'gh auth login' to auto-create releases."
    return
  fi

  if gh release view "${tag}" >/dev/null 2>&1; then
    log "GitHub release already exists: ${tag}"
    return
  fi

  if gh release create "${tag}" --verify-tag --generate-notes; then
    log "GitHub release created: ${tag}"
  else
    log "Tag pushed: ${tag}"
    log "GitHub release creation failed via gh CLI, create it manually if needed."
  fi
}

main() {
  if [[ $# -ne 0 ]]; then
    die "This command has no modes/options. Use only: git release"
  fi

  ensure_repo_root
  ensure_required_files
  ensure_on_branch "${DEV_BRANCH}"
  ensure_clean_worktree

  log "Fetching branches and tags from origin..."
  git fetch origin --tags --prune
  git fetch origin "${DEV_BRANCH}" "${PROD_BRANCH}" --prune

  log "Initial branch synchronization..."
  sync_branch_with_origin "${DEV_BRANCH}"
  sync_branch_with_origin "${PROD_BRANCH}"
  sync_branch_with_origin "${DEV_BRANCH}"

  local root_version api_version tag_version next_version next_tag
  local prepared_version_already_in_files=false
  root_version="$(version_from_file "${VERSION_FILE}")"
  api_version="$(version_from_file "${API_VERSION_FILE}")"
  tag_version="$(latest_tag_version)"

  validate_version "${root_version}"
  validate_version "${api_version}"
  validate_version "${tag_version}"
  [[ "${root_version}" == "${api_version}" ]] || die "${VERSION_FILE} and ${API_VERSION_FILE} must match."

  next_version="$(prompt_next_version "${tag_version}")"
  next_tag="v${next_version}"

  if is_version_greater "${tag_version}" "${root_version}"; then
    if [[ "${next_version}" != "${root_version}" ]] && ! is_version_greater "${root_version}" "${next_version}"; then
      die "VERSION files are already at ${root_version}. Select ${root_version} or a higher version."
    fi
  fi

  tag_exists "${next_tag}" && die "Tag ${next_tag} already exists."

  if [[ "${next_version}" == "${root_version}" ]] && is_version_greater "${tag_version}" "${root_version}"; then
    prepared_version_already_in_files=true
  fi

  printf '%s\n' "${next_version}" > "${VERSION_FILE}"
  printf '%s\n' "${next_version}" > "${API_VERSION_FILE}"

  git add "${VERSION_FILE}" "${API_VERSION_FILE}"
  if git diff --cached --quiet; then
    if [[ "${prepared_version_already_in_files}" == true ]]; then
      log "Version ${next_version} is already prepared on ${DEV_BRANCH}, skipping version commit."
    else
      die "No changes to commit for version ${next_version}."
    fi
  else
    log "Creating release commit on ${DEV_BRANCH}..."
    git commit -m "chore(release): ${next_tag}"
  fi

  log "Pushing ${DEV_BRANCH}..."
  git push origin "${DEV_BRANCH}"

  log "Switching to ${PROD_BRANCH}..."
  switch_branch "${PROD_BRANCH}"

  log "Merging ${DEV_BRANCH} into ${PROD_BRANCH}..."
  git merge --no-edit "${DEV_BRANCH}"

  log "Pushing ${PROD_BRANCH}..."
  git push origin "${PROD_BRANCH}"

  log "Creating and pushing tag ${next_tag}..."
  git tag -a "${next_tag}" -m "Release ${next_tag}"
  git push origin "${next_tag}"

  create_github_release_if_possible "${next_tag}"

  log "Final branch synchronization..."
  sync_branch_with_origin "${PROD_BRANCH}"
  sync_branch_with_origin "${DEV_BRANCH}"

  log ""
  log "Release completed successfully: ${next_tag}"
}

main "$@"
