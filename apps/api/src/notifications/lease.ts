export async function withLeaseRenewal<T>(
  initialLease: Date,
  renew: (currentLease: Date) => Promise<Date | undefined>,
  send: () => Promise<T>,
) {
  let lease = initialLease;
  let renewal = Promise.resolve();
  const timer = setInterval(() => {
    renewal = renewal
      .then(async () => {
        const next = await renew(lease);
        if (next) lease = next;
      })
      .catch((error) => {
        console.error("Failed to renew notification lease:", error);
      });
  }, 60_000);

  let outcome: { success: true; value: T } | { success: false; error: unknown };
  try {
    outcome = { success: true, value: await send() };
  } catch (error) {
    outcome = { success: false, error };
  } finally {
    clearInterval(timer);
    await renewal;
  }
  return { lease, outcome };
}
