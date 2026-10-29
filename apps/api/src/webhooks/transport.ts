import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { createHmac } from "node:crypto";
import { Address4, Address6 } from "ip-address";
import { DeliveryFailure } from "../notifications/failures";

export function parseWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      value.length > 2048
    )
      return undefined;
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(hostname) && !isPublicAddress(hostname)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function isPublicAddress(address: string) {
  try {
    const family = isIP(address);
    return family === 4
      ? new Address4(address).isGlobal()
      : family === 6
        ? new Address6(address).isGlobal()
        : false;
  } catch {
    return false;
  }
}

export async function sendWebhook(
  destination: string,
  secret: string,
  eventId: string,
  body: string,
) {
  const url = parseWebhookUrl(destination);
  if (!url) throw new DeliveryFailure("destination");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(hostname);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const records = family
    ? [{ address: hostname, family }]
    : await Promise.race([
        lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new DeliveryFailure("timeout")), 5000);
        }),
      ]).finally(() => clearTimeout(timer));
  if (!records.length || records.some(({ address }) => !isPublicAddress(address)))
    throw new DeliveryFailure("destination");
  const selected = records[0];
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${eventId}.${timestamp}.${body}`)
    .digest("base64");
  await new Promise<void>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "POST",
        agent: false,
        minVersion: "TLSv1.2",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "user-agent": "Reachable-Webhook/1.0",
          "webhook-id": eventId,
          "webhook-timestamp": timestamp,
          "webhook-signature": `v1,${signature}`,
        },
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [selected]);
          else callback(null, selected.address, selected.family);
        },
      },
      (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300)
          resolve();
        else reject(new DeliveryFailure("http", response.statusCode));
      },
    );
    const timer = setTimeout(() => req.destroy(new DeliveryFailure("timeout")), 10000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}
