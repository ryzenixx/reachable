<?php

declare(strict_types=1);

namespace App\Services\System;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class VersionService
{
    /**
     * @return array{
     *   current_version: string,
     *   latest_version: string|null,
     *   latest_release_url: string|null,
     *   update_available: bool,
     *   update_check_enabled: bool,
     *   checked_at: string|null
     * }
     */
    public function summary(): array
    {
        $currentVersion = $this->currentVersion();
        $updateCheckEnabled = (bool) config('version.update_check.enabled', true);

        if (! $updateCheckEnabled) {
            return [
                'current_version' => $currentVersion,
                'latest_version' => null,
                'latest_release_url' => null,
                'update_available' => false,
                'update_check_enabled' => false,
                'checked_at' => null,
            ];
        }

        $latest = $this->latestRelease();

        $latestVersion = $latest['version'];
        $latestReleaseUrl = $latest['url'];

        return [
            'current_version' => $currentVersion,
            'latest_version' => $latestVersion,
            'latest_release_url' => $latestReleaseUrl,
            'update_available' => $this->isUpdateAvailable($currentVersion, $latestVersion),
            'update_check_enabled' => true,
            'checked_at' => $latest['checked_at'],
        ];
    }

    private function currentVersion(): string
    {
        $configured = trim((string) config('version.current', 'dev'));

        if ($configured !== '') {
            return $this->normalizeVersion($configured) ?? 'dev';
        }

        $fromFile = $this->versionFromFile();

        if ($fromFile !== null) {
            return $fromFile;
        }

        return 'dev';
    }

    private function versionFromFile(): ?string
    {
        $candidatePaths = [
            base_path('VERSION'),
            base_path('../VERSION'),
        ];

        foreach ($candidatePaths as $versionFile) {
            if (! is_file($versionFile)) {
                continue;
            }

            $raw = file_get_contents($versionFile);

            if (! is_string($raw)) {
                continue;
            }

            $normalized = $this->normalizeVersion(trim($raw));

            if ($normalized !== null) {
                return $normalized;
            }
        }

        return null;
    }

    /**
     * @return array{version: string|null, url: string|null, checked_at: string|null}
     */
    private function latestRelease(): array
    {
        $repository = trim((string) config('version.update_check.repository', ''));

        if ($repository === '') {
            return [
                'version' => null,
                'url' => null,
                'checked_at' => null,
            ];
        }

        $cacheTtlSeconds = max(60, (int) config('version.update_check.cache_ttl_seconds', 21600));
        $cacheKey = sprintf('version.latest-release.%s', Str::slug($repository, '-'));

        /** @var array{version: string|null, url: string|null, checked_at: string|null} $cached */
        $cached = Cache::remember(
            key: $cacheKey,
            ttl: now()->addSeconds($cacheTtlSeconds),
            callback: function () use ($repository): array {
                return $this->fetchLatestRelease($repository);
            },
        );

        return $cached;
    }

    /**
     * @return array{version: string|null, url: string|null, checked_at: string|null}
     */
    private function fetchLatestRelease(string $repository): array
    {
        $timeoutSeconds = max(2, (int) config('version.update_check.timeout_seconds', 5));

        $response = Http::acceptJson()
            ->timeout($timeoutSeconds)
            ->withHeaders([
                'User-Agent' => 'reachable-update-check',
            ])
            ->get(sprintf('https://api.github.com/repos/%s/releases/latest', $repository));

        if (! $response->ok()) {
            return [
                'version' => null,
                'url' => null,
                'checked_at' => now()->toIso8601String(),
            ];
        }

        $payload = $response->json();

        $tag = is_array($payload) && is_string($payload['tag_name'] ?? null)
            ? (string) $payload['tag_name']
            : null;

        $version = is_string($tag) ? $this->normalizeVersion($tag) : null;
        $releaseUrl = is_array($payload) && is_string($payload['html_url'] ?? null)
            ? (string) $payload['html_url']
            : null;

        return [
            'version' => $version,
            'url' => $releaseUrl,
            'checked_at' => now()->toIso8601String(),
        ];
    }

    private function normalizeVersion(?string $version): ?string
    {
        if (! is_string($version) || trim($version) === '') {
            return null;
        }

        $normalized = ltrim(trim($version), 'vV');

        return $normalized === '' ? null : $normalized;
    }

    private function isUpdateAvailable(string $currentVersion, ?string $latestVersion): bool
    {
        if (! is_string($latestVersion) || $latestVersion === '') {
            return false;
        }

        if (! $this->isSemanticVersion($currentVersion) || ! $this->isSemanticVersion($latestVersion)) {
            return false;
        }

        $currentComparable = explode('+', $currentVersion, 2)[0];
        $latestComparable = explode('+', $latestVersion, 2)[0];

        return version_compare($latestComparable, $currentComparable, '>');
    }

    private function isSemanticVersion(string $version): bool
    {
        return preg_match('/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/', $version) === 1;
    }
}
