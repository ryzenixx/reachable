<x-mail::message>
# Confirm subscription

You requested status updates for **{{ $organization->name }}**.

<x-mail::button :url="$confirmUrl">
Confirm Subscription
</x-mail::button>

If you didn't make this request, you can safely ignore this email.

Thanks,
{{ config('app.name') }}
</x-mail::message>
