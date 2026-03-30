#!/usr/bin/env bash
set -euo pipefail

DEV_BRANCH="${DEV_BRANCH:-develop}"
PROD_BRANCH="${PROD_BRANCH:-main}"

VERSION_FILE="VERSION"
API_VERSION_FILE="api/VERSION"

# Keep versioning intentionally simple for release flow: X.Y.Z
VERSION_REGEX='^[0-9]+\.[0-9]+\.[0-9]+$'

ASSUME_YES=false
USE_GH=true
SKIP_FETCH=false
REQUESTED_VERSION=""

log() {
  printf '%s\n' "$*" >&2
}

info() {
  log "$*"
}

die() {
  log "Error: $*"
  exit 1
}

usage() {
  cat <<EOF
Usage:
  git release [auto|prepare|publish|help] [options]

Modes:
  auto (default)
    - On ${DEV_BRANCH}: prepare next release (bump + commit)
    - On ${PROD_BRANCH}: publish release (tag + push + optional GitHub release)
  prepare
    - Run prepare flow explicitly on ${DEV_BRANCH}
  publish
    - Run publish flow explicitly on ${PROD_BRANCH}

Options:
  --version X.Y.Z  Set version directly for prepare mode (skip bump prompt)
  --yes, -y        Skip confirmation prompts
  --no-gh          Do not create GitHub release via gh CLI
  --no-fetch       Skip git fetch checks (not recommended)
  --help, -h       Show this help
EOF
}

ensure_repo_root() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not inside a git repository."
  fi

  local root
  root="$(git rev-parse --show-toplevel)"
  cd "${root}"
}

ensure_files_exist() {
  [[ -f "${VERSION_FILE}" ]] || die "Missing ${VERSION_FILE}"
  [[ -f "${API_VERSION_FILE}" ]] || die "Missing ${API_VERSION_FILE}"
}

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

ensure_branch() {
  local expected="$1"
  local current
  current="$(current_branch)"

  if [[ "${current}" != "${expected}" ]]; then
    die "Must run on branch '${expected}' (current: '${current}')."
  fi
}

ensure_clean_worktree() {
  local dirty
  dirty="$(git status --porcelain --untracked-files=normal)"
  if [[ -n "${dirty}" ]]; then
    die "Working tree is not clean. Commit/stash changes first."
  fi
}

validate_version() {
  local version="$1"
  if ! [[ "${version}" =~ ${VERSION_REGEX} ]]; then
    die "Invalid version '${version}'. Expected format X.Y.Z"
  fi
}

version_from_file() {
  local file="$1"
  tr -d '[:space:]' < "${file}"
}

tag_exists_locally() {
  local tag="$1"
  git show-ref --verify --quiet "refs/tags/${tag}"
}

tag_exists_remote() {
  local tag="$1"
  git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1
}

fetch_tags() {
  if [[ "${SKIP_FETCH}" == true ]]; then
    info "Skipping fetch (--no-fetch)."
    return
  fi

  info "Fetching tags from origin..."
  if ! git fetch origin --tags --prune; then
    die "Failed to fetch tags from origin. Check network/auth (SSH key, agent, permissions)."
  fi
}

fetch_branch() {
  local branch="$1"

  if [[ "${SKIP_FETCH}" == true ]]; then
    return
  fi

  info "Fetching origin/${branch}..."
  git fetch origin "${branch}" --prune
}

latest_tag() {
  git for-each-ref \
    --sort=-version:refname \
    --format='%(refname:short)' \
    refs/tags \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | head -n1 || true
}

latest_version() {
  local tag
  tag="$(latest_tag)"
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

compute_bumps() {
  local version="$1"
  local major minor patch

  IFS='.' read -r major minor patch <<< "${version}"

  BUMP_PATCH="${major}.${minor}.$((patch + 1))"
  BUMP_MINOR="${major}.$((minor + 1)).0"
  BUMP_MAJOR="$((major + 1)).0.0"
}

is_version_greater() {
  local current="$1"
  local candidate="$2"

  [[ "$(printf '%s\n%s\n' "${current}" "${candidate}" | sort -V | tail -n1)" == "${candidate}" && "${current}" != "${candidate}" ]]
}

confirm() {
  local prompt="$1"

  if [[ "${ASSUME_YES}" == true ]]; then
    return 0
  fi

  printf '%s [y/N]: ' "${prompt}" >&2
  local answer
  read -r answer
  [[ "${answer}" =~ ^([yY][eE][sS]|[yY])$ ]]
}

prompt_next_version() {
  local current="$1"

  if [[ -n "${REQUESTED_VERSION}" ]]; then
    NEXT_VERSION="${REQUESTED_VERSION}"
    validate_version "${NEXT_VERSION}"
    return
  fi

  compute_bumps "${current}"

  if [[ ! -t 0 ]]; then
    die "Non-interactive shell detected. Use --version X.Y.Z or run interactively."
  fi

  log ""
  log "Latest release: v${current}"
  log "Choose next version:"
  log "  1) patch -> v${BUMP_PATCH}"
  log "  2) minor -> v${BUMP_MINOR}"
  log "  3) major -> v${BUMP_MAJOR}"
  log "  4) custom"
  printf 'Choice [1-4]: ' >&2

  local choice
  read -r choice

  case "${choice}" in
    ""|1)
      NEXT_VERSION="${BUMP_PATCH}"
      ;;
    2)
      NEXT_VERSION="${BUMP_MINOR}"
      ;;
    3)
      NEXT_VERSION="${BUMP_MAJOR}"
      ;;
    4)
      printf 'Enter custom version (X.Y.Z): ' >&2
      read -r NEXT_VERSION
      ;;
    *)
      die "Invalid choice '${choice}'."
      ;;
  esac

  validate_version "${NEXT_VERSION}"
}

ensure_main_synced() {
  fetch_branch "${PROD_BRANCH}"

  local ahead behind
  read -r behind ahead <<< "$(git rev-list --left-right --count "HEAD...origin/${PROD_BRANCH}")"

  if [[ "${behind}" -ne 0 || "${ahead}" -ne 0 ]]; then
    die "Local ${PROD_BRANCH} is not synced with origin/${PROD_BRANCH} (behind: ${behind}, ahead: ${ahead})."
  fi
}

prepare_release() {
  ensure_files_exist
  ensure_branch "${DEV_BRANCH}"
  ensure_clean_worktree
  fetch_tags

  local latest_tag_version current_root_version current_api_version current_base next_tag
  latest_tag_version="$(latest_version)"
  current_root_version="$(version_from_file "${VERSION_FILE}")"
  current_api_version="$(version_from_file "${API_VERSION_FILE}")"

  validate_version "${latest_tag_version}"
  validate_version "${current_root_version}"
  validate_version "${current_api_version}"

  if [[ "${current_root_version}" != "${current_api_version}" ]]; then
    die "${VERSION_FILE} (${current_root_version}) and ${API_VERSION_FILE} (${current_api_version}) must match before preparing a release."
  fi

  current_base="$(max_version "${latest_tag_version}" "${current_root_version}")"

  prompt_next_version "${current_base}"

  if ! is_version_greater "${current_base}" "${NEXT_VERSION}"; then
    die "Next version (${NEXT_VERSION}) must be greater than current base (${current_base})."
  fi

  next_tag="v${NEXT_VERSION}"

  if tag_exists_locally "${next_tag}" || tag_exists_remote "${next_tag}"; then
    die "Tag ${next_tag} already exists."
  fi

  info "Preparing release ${next_tag} on ${DEV_BRANCH}."
  if ! confirm "Continue"; then
    die "Cancelled."
  fi

  printf '%s\n' "${NEXT_VERSION}" > "${VERSION_FILE}"
  printf '%s\n' "${NEXT_VERSION}" > "${API_VERSION_FILE}"

  git add "${VERSION_FILE}" "${API_VERSION_FILE}"
  if git diff --cached --quiet; then
    die "Selected version is already present in ${VERSION_FILE} and ${API_VERSION_FILE}. Choose a higher version."
  fi
  git commit -m "chore(release): ${next_tag}"

  log ""
  log "Release prepared successfully: ${next_tag}"
  log "Next steps:"
  log "  1) git push origin ${DEV_BRANCH}"
  log "  2) merge ${DEV_BRANCH} into ${PROD_BRANCH}"
  log "  3) checkout ${PROD_BRANCH} && git release publish"
}

publish_release() {
  ensure_files_exist
  ensure_branch "${PROD_BRANCH}"
  ensure_clean_worktree
  fetch_tags
  ensure_main_synced

  local root_version api_version tag
  root_version="$(version_from_file "${VERSION_FILE}")"
  api_version="$(version_from_file "${API_VERSION_FILE}")"

  validate_version "${root_version}"
  validate_version "${api_version}"

  if [[ "${root_version}" != "${api_version}" ]]; then
    die "${VERSION_FILE} (${root_version}) and ${API_VERSION_FILE} (${api_version}) must match."
  fi

  tag="v${root_version}"

  if tag_exists_locally "${tag}" || tag_exists_remote "${tag}"; then
    die "Tag ${tag} already exists."
  fi

  info "Publishing release ${tag} from ${PROD_BRANCH}."
  if ! confirm "Create and push tag ${tag}"; then
    die "Cancelled."
  fi

  git tag -a "${tag}" -m "Release ${tag}"
  git push origin "${tag}"

  if [[ "${USE_GH}" == false ]]; then
    log "Tag pushed: ${tag}"
    return
  fi

  if ! command -v gh >/dev/null 2>&1; then
    log "Tag pushed: ${tag}"
    log "GitHub CLI not installed. Create the GitHub release manually."
    return
  fi

  if ! gh auth status >/dev/null 2>&1; then
    log "Tag pushed: ${tag}"
    log "GitHub CLI is not authenticated. Run 'gh auth login' to enable auto release creation."
    return
  fi

  if gh release view "${tag}" >/dev/null 2>&1; then
    log "GitHub release already exists: ${tag}"
    return
  fi

  gh release create "${tag}" --verify-tag --generate-notes
  log "GitHub release created: ${tag}"
}

parse_args() {
  MODE="auto"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      auto|prepare|publish|help)
        MODE="$1"
        shift
        ;;
      --yes|-y)
        ASSUME_YES=true
        shift
        ;;
      --no-gh)
        USE_GH=false
        shift
        ;;
      --no-fetch)
        SKIP_FETCH=true
        shift
        ;;
      --version)
        shift
        [[ $# -gt 0 ]] || die "--version requires a value (X.Y.Z)."
        REQUESTED_VERSION="$1"
        shift
        ;;
      --help|-h)
        MODE="help"
        shift
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

run_mode() {
  case "${MODE}" in
    help)
      usage
      ;;
    prepare)
      prepare_release
      ;;
    publish)
      publish_release
      ;;
    auto)
      local branch
      branch="$(current_branch)"

      if [[ "${branch}" == "${DEV_BRANCH}" ]]; then
        prepare_release
      elif [[ "${branch}" == "${PROD_BRANCH}" ]]; then
        publish_release
      else
        die "Auto mode works only on ${DEV_BRANCH} or ${PROD_BRANCH} (current: ${branch})."
      fi
      ;;
    *)
      die "Unknown mode: ${MODE}"
      ;;
  esac
}

main() {
  ensure_repo_root
  parse_args "$@"
  run_mode
}

main "$@"
