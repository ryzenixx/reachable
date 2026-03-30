.PHONY: install-git-commands

install-git-commands:
	@repo_root="$$(git rev-parse --show-toplevel 2>/dev/null)" || { \
		echo "Error: run this command inside the git repository."; \
		exit 1; \
	}; \
	git config alias.release '!f(){ repo_root="$$(git rev-parse --show-toplevel)" || exit 1; bash "$$repo_root/scripts/git-release.sh" "$$@"; }; f'; \
	echo "Installed git command: git release"
