<?php

declare(strict_types=1);

namespace App\Services\Monitoring;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Enums\MonitorCheckStatus;
use App\Enums\MonitorType;
use App\Enums\ServiceStatus;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use App\Services\Incidents\IncidentService;
use App\Services\Uptime\UptimeAggregationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;

class MonitorExecutionService
{
    private const RESTRICTED_IPV6_PREFIXES = [
        '::/128',
        '::1/128',
        'fc00::/7',
        'fe80::/10',
        'ff00::/8',
    ];

    public function __construct(
        private readonly IncidentService $incidentService,
        private readonly UptimeAggregationService $uptimeAggregationService,
    )
    {
    }

    public function execute(Monitor $monitor): MonitorCheck
    {
        $monitor->loadMissing('service.organization');

        if (! $this->isTargetAllowed($monitor)) {
            /** @var MonitorCheck $check */
            $check = MonitorCheck::query()->create([
                'monitor_id' => $monitor->id,
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => 'Target blocked by monitoring security policy',
                'checked_at' => now(),
            ]);

            $this->handleIncidentLifecycle($monitor, $check);
            $this->uptimeAggregationService->aggregateServiceForDate($monitor->service, CarbonImmutable::now());

            return $check;
        }

        $result = match ($monitor->type) {
            MonitorType::Http => $this->runHttpCheck($monitor),
            MonitorType::Tcp => $this->runTcpCheck($monitor),
            MonitorType::Ping => $this->runPingCheck($monitor),
            default => [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => 'Unsupported monitor type',
            ],
        };

        /** @var MonitorCheck $check */
        $check = MonitorCheck::query()->create([
            'monitor_id' => $monitor->id,
            'status' => $result['status'],
            'response_time_ms' => $result['response_time_ms'],
            'status_code' => $result['status_code'],
            'error_message' => $result['error_message'],
            'checked_at' => now(),
        ]);

        $this->handleIncidentLifecycle($monitor, $check);
        $this->uptimeAggregationService->aggregateServiceForDate($monitor->service, CarbonImmutable::now());

        return $check;
    }

    /**
     * @return array{status: MonitorCheckStatus, response_time_ms: int, status_code: int|null, error_message: string|null}
     */
    private function runHttpCheck(Monitor $monitor): array
    {
        $startedAt = microtime(true);

        try {
            $response = Http::timeout(max(1, $monitor->timeout_ms / 1000))
                ->withoutRedirecting()
                ->send($monitor->method->value, $monitor->url);

            $responseTimeMs = (int) round((microtime(true) - $startedAt) * 1000);
            $statusCode = $response->status();

            return [
                'status' => $statusCode === $monitor->expected_status_code
                    ? MonitorCheckStatus::Up
                    : MonitorCheckStatus::Degraded,
                'response_time_ms' => $responseTimeMs,
                'status_code' => $statusCode,
                'error_message' => null,
            ];
        } catch (\Throwable $exception) {
            return [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => $exception->getMessage(),
            ];
        }
    }

    /**
     * @return array{status: MonitorCheckStatus, response_time_ms: int, status_code: int|null, error_message: string|null}
     */
    private function runTcpCheck(Monitor $monitor): array
    {
        $target = preg_replace('#^[a-z]+://#i', '', trim($monitor->url)) ?? '';
        $target = explode('/', $target, 2)[0] ?? '';
        $host = $this->extractHostFromHostLikeValue($target);
        $parsedPort = parse_url(sprintf('tcp://%s', $target), PHP_URL_PORT);
        $port = is_int($parsedPort) ? $parsedPort : 80;

        if (! is_string($host) || $host === '') {
            return [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => 'TCP target is invalid',
            ];
        }

        $startedAt = microtime(true);

        $socket = @fsockopen($host, $port, $errno, $errstr, max(1, $monitor->timeout_ms / 1000));

        if ($socket === false) {
            return [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => sprintf('TCP connection failed: %s (%d)', $errstr, $errno),
            ];
        }

        fclose($socket);

        return [
            'status' => MonitorCheckStatus::Up,
            'response_time_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'status_code' => 200,
            'error_message' => null,
        ];
    }

    /**
     * @return array{status: MonitorCheckStatus, response_time_ms: int, status_code: int|null, error_message: string|null}
     */
    private function runPingCheck(Monitor $monitor): array
    {
        $host = $this->extractTargetHost($monitor);

        if (! is_string($host) || $host === '') {
            return [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => 'Ping target is invalid',
            ];
        }

        $startedAt = microtime(true);
        $pingOutput = [];
        $exitCode = 1;
        @exec(sprintf('ping -c 1 -W 1 %s', escapeshellarg($host)), $pingOutput, $exitCode);

        if ($exitCode !== 0) {
            return [
                'status' => MonitorCheckStatus::Down,
                'response_time_ms' => 0,
                'status_code' => null,
                'error_message' => 'Ping request failed',
            ];
        }

        return [
            'status' => MonitorCheckStatus::Up,
            'response_time_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'status_code' => 200,
            'error_message' => null,
        ];
    }

    private function handleIncidentLifecycle(Monitor $monitor, MonitorCheck $check): void
    {
        $service = $monitor->service;

        $recentChecks = $monitor->checks()
            ->latest('checked_at')
            ->limit(2)
            ->get();

        $hasConsecutiveFailures = $recentChecks->count() === 2
            && $recentChecks->every(static fn (MonitorCheck $item): bool => $item->status === MonitorCheckStatus::Down);

        $activeIncident = Incident::query()
            ->where('organization_id', $service->organization_id)
            ->where('status', '!=', IncidentStatus::Resolved->value)
            ->where('title', sprintf('Auto incident: %s monitor failure', $service->name))
            ->first();

        if ($hasConsecutiveFailures && $activeIncident === null) {
            $service->status = ServiceStatus::MajorOutage;
            $service->save();

            $this->incidentService->createIncident(
                organization: $service->organization,
                title: sprintf('Auto incident: %s monitor failure', $service->name),
                status: IncidentStatus::Investigating,
                impact: IncidentImpact::Major,
                serviceIds: [$service->id],
                initialMessage: sprintf('Automatic detection after consecutive monitor failures for %s', $service->name),
            );

            return;
        }

        if ($check->status === MonitorCheckStatus::Up && $activeIncident instanceof Incident) {
            $service->status = ServiceStatus::Operational;
            $service->save();

            $this->incidentService->updateIncident(
                incident: $activeIncident,
                status: IncidentStatus::Resolved,
            );
        }
    }

    private function isTargetAllowed(Monitor $monitor): bool
    {
        if ($this->allowsPrivateTargets()) {
            return true;
        }

        $host = $this->extractTargetHost($monitor);

        if (! is_string($host) || $host === '') {
            return false;
        }

        if ($this->isLocalHostname($host)) {
            return false;
        }

        $ips = $this->resolveHostIps($host);

        if ($ips === []) {
            return false;
        }

        foreach ($ips as $ip) {
            if ($this->isRestrictedIp($ip)) {
                return false;
            }
        }

        return true;
    }

    private function allowsPrivateTargets(): bool
    {
        return (bool) config('reachable.monitoring.allow_private_targets', false);
    }

    private function extractTargetHost(Monitor $monitor): ?string
    {
        return match ($monitor->type) {
            MonitorType::Http => $this->extractHostFromHttpUrl($monitor->url),
            MonitorType::Tcp, MonitorType::Ping => $this->extractHostFromHostLikeValue($monitor->url),
            default => null,
        };
    }

    private function extractHostFromHttpUrl(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return null;
        }

        return mb_strtolower($host);
    }

    private function extractHostFromHostLikeValue(string $value): ?string
    {
        $target = preg_replace('#^[a-z]+://#i', '', trim($value)) ?? '';
        $target = explode('/', $target, 2)[0] ?? '';
        $target = trim($target);

        if ($target === '') {
            return null;
        }

        $host = parse_url(sprintf('tcp://%s', $target), PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return null;
        }

        return mb_strtolower($host);
    }

    private function isLocalHostname(string $host): bool
    {
        $normalized = mb_strtolower(trim($host));

        return in_array($normalized, ['localhost', 'host.docker.internal'], true)
            || str_ends_with($normalized, '.local')
            || str_ends_with($normalized, '.localhost');
    }

    /**
     * @return list<string>
     */
    private function resolveHostIps(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [$host];
        }

        $resolved = [];

        $ipv4 = gethostbynamel($host);
        if (is_array($ipv4)) {
            $resolved = [...$resolved, ...$ipv4];
        }

        $ipv6Records = dns_get_record($host, DNS_AAAA);
        if (is_array($ipv6Records)) {
            foreach ($ipv6Records as $record) {
                if (! isset($record['ipv6']) || ! is_string($record['ipv6'])) {
                    continue;
                }

                $resolved[] = $record['ipv6'];
            }
        }

        return array_values(array_unique(array_filter(
            $resolved,
            static fn (string $ip): bool => filter_var($ip, FILTER_VALIDATE_IP) !== false,
        )));
    }

    private function isRestrictedIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            ) === false;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            foreach (self::RESTRICTED_IPV6_PREFIXES as $cidr) {
                if ($this->ipInCidr($ip, $cidr)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $prefix] = explode('/', $cidr, 2);
        $ipBin = inet_pton($ip);
        $subnetBin = inet_pton($subnet);

        if ($ipBin === false || $subnetBin === false || strlen($ipBin) !== strlen($subnetBin)) {
            return false;
        }

        $prefixLength = (int) $prefix;
        $bytes = intdiv($prefixLength, 8);
        $bits = $prefixLength % 8;

        if ($bytes > 0 && substr($ipBin, 0, $bytes) !== substr($subnetBin, 0, $bytes)) {
            return false;
        }

        if ($bits === 0) {
            return true;
        }

        $mask = ((0xFF00 >> $bits) & 0xFF);
        $ipByte = ord($ipBin[$bytes]);
        $subnetByte = ord($subnetBin[$bytes]);

        return ($ipByte & $mask) === ($subnetByte & $mask);
    }
}
