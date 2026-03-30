#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

DEV_BRANCH="${DEV_BRANCH:-develop}"
PROD_BRANCH="${PROD_BRANCH:-main}"

VERSION_FILE="${ROOT_DIR}/VERSION"
API_VERSION_FILE="${ROOT_DIR}/api/VERSION"

VERSION_REGEX='^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'

usage() {
  cat <<EOF
Usage:
  git release                # auto mode (prepare on ${DEV_BRANCH}, publish on ${PROD_BRANCH})
  git release prepare        # choose next version, update VERSION files, commit on ${DEV_BRANCH}
  git release publish        # tag current ${PROD_BRANCH} commit and create GitHub release
  git release help
EOF
}

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

ensure_clean_worktree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Working tree is not clean. Commit or stash your changes first." >&2
    exit 1
  fi
}

validate_version() {
  local version="$1"
  if ! [[ "${version}" =~ ${VERSION_REGEX} ]]; then
    echo "Invalid version: ${version}" >&2
    exit 1
  fi
}

latest_tag() {
  git fetch origin --tags --quiet
  git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1
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

prompt_next_version() {
  local latest="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<<"${latest}"

  local next_patch next_minor next_major
  next_patch="${major}.${minor}.$((patch + 1))"
  next_minor="${major}.$((minor + 1)).0"
  next_major="$((major + 1)).0.0"

  echo
  echo "Latest version: v${latest}"
  echo "Pick next release type:"
  echo "  1) patch -> v${next_patch}"
  echo "  2) minor -> v${next_minor}"
  echo "  3) major -> v${next_major}"
  echo "  4) custom"
  printf "Choice [1-4]: "

  local choice
  read -r choice

  case "${choice}" in
    ""|1)
      echo "${next_patch}"
      ;;
    2)
      echo "${next_minor}"
      ;;
    3)
      echo "${next_major}"
      ;;
    4)
      local custom
      printf "Enter version (example 1.4.0): "
      read -r custom
      validate_version "${custom}"
      echo "${custom}"
      ;;
    *)
      echo "Invalid choice." >&2
      exit 1
      ;;
  esac
}

prepare_release() {
  local branch
  branch="$(current_branch)"

  if [[ "${branch}" != "${DEV_BRANCH}" ]]; then
    echo "Release preparation must run on '${DEV_BRANCH}' (current: ${branch})." >&2
    exit 1
  fi

  ensure_clean_worktree

  local latest selected
  latest="$(latest_version)"
  selected="$(prompt_next_version "${latest}")"
  validate_version "${selected}"

  local tag="v${selected}"

  if git rev-parse "${tag}" >/dev/null 2>&1; then
    echo "Tag ${tag} already exists." >&2
    exit 1
  fi

  echo "${selected}" > "${VERSION_FILE}"
  echo "${selected}" > "${API_VERSION_FILE}"

  git add VERSION api/VERSION

  if git diff --cached --quiet; then
    echo "Version files already set to ${selected}. Nothing to commit."
    exit 0
  fi

  git commit -m "chore(release): v${selected}"

  echo
  echo "Release version prepared: v${selected}"
  echo "Next steps:"
  echo "  1) git push origin ${DEV_BRANCH}"
  echo "  2) Open/merge PR ${DEV_BRANCH} -> ${PROD_BRANCH}"
  echo "  3) On ${PROD_BRANCH}, run: git release publish"
}

publish_release() {
  local branch
  branch="$(current_branch)"

  if [[ "${branch}" != "${PROD_BRANCH}" ]]; then
    echo "Release publish must run on '${PROD_BRANCH}' (current: ${branch})." >&2
    exit 1
  fi

  ensure_clean_worktree

  git fetch origin "${PROD_BRANCH}" --quiet
  git fetch origin --tags --quiet

  local local_sha remote_sha
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse "origin/${PROD_BRANCH}")"

  if [[ "${local_sha}" != "${remote_sha}" ]]; then
    echo "Local ${PROD_BRANCH} is not up to date with origin/${PROD_BRANCH}. Pull first." >&2
    exit 1
  fi

  local version api_version
  version="$(tr -d '[:space:]' < "${VERSION_FILE}")"
  api_version="$(tr -d '[:space:]' < "${API_VERSION_FILE}")"

  validate_version "${version}"

  if [[ "${api_version}" != "${version}" ]]; then
    echo "VERSION (${version}) and api/VERSION (${api_version}) do not match." >&2
    exit 1
  fi

  local tag
  tag="v${version}"

  if git rev-parse "${tag}" >/dev/null 2>&1; then
    echo "Tag ${tag} already exists." >&2
    exit 1
  fi

  git tag -a "${tag}" -m "Release ${tag}"
  git push origin "${tag}"

  if command -v gh >/dev/null 2>&1; then
    if gh release view "${tag}" >/dev/null 2>&1; then
      echo "GitHub release ${tag} already exists."
    else
      gh release create "${tag}" --verify-tag --generate-notes
      echo "GitHub release created: ${tag}"
    fi
  else
    echo "Tag pushed: ${tag}"
    echo "Install GitHub CLI to auto-create releases, or create the release manually in GitHub."
  fi
}

main() {
  local mode="${1:-auto}"

  case "${mode}" in
    help|-h|--help)
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
        echo "Auto mode supports only '${DEV_BRANCH}' and '${PROD_BRANCH}'. Current branch: ${branch}" >&2
        echo "Use one of:"
        echo "  git release prepare"
        echo "  git release publish"
        exit 1
      fi
      ;;
    *)
      echo "Unknown mode: ${mode}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
