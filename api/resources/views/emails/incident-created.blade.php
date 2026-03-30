<x-mail::message>
# New incident detected

**{{ $incident->title }}** has been reported for **{{ $incident->organization->name }}**.

Status: **{{ $incident->status->value ?? $incident->status }}**
Impact: **{{ $incident->impact->value ?? $incident->impact }}**

<x-mail::button :url="$statusPageUrl">
View Status Page
</x-mail::button>

<x-mail::subcopy>
Unsubscribe any time: {{ $unsubscribeUrl }}
</x-mail::subcopy>
</x-mail::message>
