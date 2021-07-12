import { IPluginObjectStore } from "./i-plugin-object-store";

export function isIPluginObjectStore(x: unknown): x is IPluginObjectStore {
  return (
    !!x &&
    typeof (x as IPluginObjectStore).get === "function" &&
    typeof (x as IPluginObjectStore).getInstanceId === "function" &&
    typeof (x as IPluginObjectStore).getPackageName === "function" &&
    typeof (x as IPluginObjectStore).has === "function" &&
    typeof (x as IPluginObjectStore).set === "function"
  );
}
