import { isIP } from "node:net";
import { Address4, Address6 } from "ip-address";

export const clientIpHeader = "x-reachable-client-ip";

function parseAddress(value: string) {
  const family = isIP(value);
  if (family === 4) return new Address4(value);
  if (family === 6) {
    const address = new Address6(value);
    return address.is4() && value.toLowerCase().startsWith("::ffff:") ? address.to4() : address;
  }
  return undefined;
}

function parseTrustedProxies(value: string | undefined) {
  if (!value) return [];
  return value.split(",").map((entry) => {
    const network = entry.trim();
    const [host, prefix, ...extra] = network.split("/");
    if (extra.length || !parseAddress(host) || (prefix !== undefined && !/^\d+$/.test(prefix))) {
      throw new Error("TRUSTED_PROXY_IPS must contain valid IP addresses or CIDR ranges");
    }
    try {
      const family = isIP(host);
      if (family === 4) return new Address4(network);
      if (host.toLowerCase().startsWith("::ffff:"))
        throw new Error("Mapped IPv6 proxy ranges are not supported");
      return new Address6(network);
    } catch {
      throw new Error("TRUSTED_PROXY_IPS must contain valid IP addresses or CIDR ranges");
    }
  });
}

const trustedProxies = parseTrustedProxies(process.env.TRUSTED_PROXY_IPS);

export function withClientIp(request: Request, peerIp: string | undefined) {
  const headers = new Headers(request.headers);
  headers.delete(clientIpHeader);
  const peer = peerIp && parseAddress(peerIp);
  const trusted = peer && trustedProxies.some((proxy) => peer.isInSubnet(proxy));
  const client = trusted ? parseAddress(headers.get("x-real-ip")?.trim() ?? "") : peer;
  if (trusted && !client) return undefined;
  if (client) headers.set(clientIpHeader, client.correctForm());
  return new Request(request, { headers });
}
