import type { GetObjectRequestV1 } from "../../generated/openapi/typescript-axios";
import type { GetObjectResponseV1 } from "../../generated/openapi/typescript-axios";
import type { HasObjectRequestV1 } from "../../generated/openapi/typescript-axios";
import type { SetObjectRequestV1 } from "../../generated/openapi/typescript-axios";
import type { SetObjectResponseV1 } from "../../generated/openapi/typescript-axios";
import type { HasObjectResponseV1 } from "../../generated/openapi/typescript-axios";
import type { ICactusPlugin } from "../i-cactus-plugin";
import type { IPluginWebService } from "../web-service/i-plugin-web-service";

/**
 * Common interface to be implemented by classes that act as plugins behind
 * object stores.
 */
export interface IPluginObjectStore extends ICactusPlugin, IPluginWebService {
  has(req: HasObjectRequestV1): Promise<HasObjectResponseV1>;
  get(req: GetObjectRequestV1): Promise<GetObjectResponseV1>;
  set(req: SetObjectRequestV1): Promise<SetObjectResponseV1>;
}
