<x-mail::message>
# Incident resolved

**{{ $incident->title }}** for **{{ $incident->organization->name }}** is now resolved.

<x-mail::button :url="$statusPageUrl">
View Status Page
</x-mail::button>

<x-mail::subcopy>
Unsubscribe any time: {{ $unsubscribeUrl }}
</x-mail::subcopy>
</x-mail::message>
