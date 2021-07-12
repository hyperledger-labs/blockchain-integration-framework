import type { IPFS } from "ipfs-core-types";
import type { EndpointConfig } from "ipfs-http-client";

export interface IIpfsHttpClient extends IPFS {
  getEndpointConfig: () => EndpointConfig;
}

export function isIpfsHttpClientOptions(x: unknown): x is IIpfsHttpClient {
  if (!x) {
    return false;
  }
  return (
    typeof (x as IIpfsHttpClient).add === "function" &&
    typeof (x as IIpfsHttpClient).addAll === "function" &&
    typeof (x as IIpfsHttpClient).bitswap === "object" &&
    typeof (x as IIpfsHttpClient).block === "object" &&
    typeof (x as IIpfsHttpClient).bootstrap === "object" &&
    typeof (x as IIpfsHttpClient).cat === "function" &&
    typeof (x as IIpfsHttpClient).commands === "function" &&
    typeof (x as IIpfsHttpClient).config === "object" &&
    typeof (x as IIpfsHttpClient).dag === "object" &&
    typeof (x as IIpfsHttpClient).dht === "object" &&
    typeof (x as IIpfsHttpClient).diag === "object" &&
    typeof (x as IIpfsHttpClient).dns === "function" &&
    typeof (x as IIpfsHttpClient).files === "object" &&
    typeof (x as IIpfsHttpClient).get === "function" &&
    typeof (x as IIpfsHttpClient).getEndpointConfig === "function" &&
    typeof (x as IIpfsHttpClient).id === "function" &&
    typeof (x as IIpfsHttpClient).isOnline === "function" &&
    typeof (x as IIpfsHttpClient).key === "object" &&
    typeof (x as IIpfsHttpClient).log === "object" &&
    typeof (x as IIpfsHttpClient).ls === "function" &&
    typeof (x as IIpfsHttpClient).mount === "function" &&
    typeof (x as IIpfsHttpClient).name === "object" &&
    typeof (x as IIpfsHttpClient).object === "object" &&
    typeof (x as IIpfsHttpClient).pin === "object" &&
    typeof (x as IIpfsHttpClient).ping === "function" &&
    typeof (x as IIpfsHttpClient).pubsub === "object" &&
    // typeof (x as IIpfsHttpClient).refs === "function" &&
    typeof (x as IIpfsHttpClient).repo === "object" &&
    typeof (x as IIpfsHttpClient).resolve === "function" &&
    typeof (x as IIpfsHttpClient).start === "function" &&
    typeof (x as IIpfsHttpClient).stats === "object" &&
    typeof (x as IIpfsHttpClient).stop === "function" &&
    typeof (x as IIpfsHttpClient).swarm === "object" &&
    typeof (x as IIpfsHttpClient).version === "function"
  );
}
