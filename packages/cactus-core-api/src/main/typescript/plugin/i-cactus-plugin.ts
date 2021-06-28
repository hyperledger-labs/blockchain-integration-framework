/**
 * The common interface definition that plugin classes can use to inherit from
 * when defining their own options interface for their constructors.
 *
 * Not all plugins need to have a unique plugin ID, so if the plugin you are
 * working does not, it is okay to provide a dummy implementation, but it is
 * not really recommended. Instead the constructor of your plugin should
 * generate one automatically at runtime if you definitely do not want the
 * caller of your plugin class to have to provide an instanceID.
 *
 * For example if you have a ledger called `FooBar` then this could be seen as
 * a recommended implementation:
 *
 * ```typescript
 *
 * interface IPluginLedgerConnectorFooBarOptions extends ICactusPluginOptions {
 *   logLevel?: LogLevelDesc;
 *   // your other FooBar specific parameters here
 * }
 *
 * class PluginLedgerConnectorFooBar implements ICactusPlugin {
 *   constructor(public readonly options: IPluginLedgerConnectorFooBarOptions) {
 *     // your constructor logic here
 *   }
 *
 *   public getInstanceId(): string {
 *     // this works because your {IPluginLedgerConnectorFooBarOptions}
 *     // inherits from the ICactusPluginOptions interface.
 *     return this.options.instanceId;
 *   }
 * ```
 *
 */
export interface ICactusPluginOptions {
  instanceId: string;
}

/**
 * This is the common base for all other plugin interface definitions to have as a parent.
 */
export interface ICactusPlugin {
  /**
   * Returns a string that uniquely identifies the specific instance of a plugin
   * from other instances that may have been created from the exact same class.
   * We need this to cover scenarios where identical plugin implementations
   * need to be used because for example you have two different deployments of
   * the same kind of ledger, leading to you needing two separate instances of
   * the same kind of plugin in the plugin registry as well.
   *
   * @see {ICactusPluginOptions} For further details relevant to the instanceId
   */
  getInstanceId(): string;

  /**
   * Returns the NodeJS/npm package name of the plugin which is used to identify
   * plugin instances at runtime and differentiate them from other types of plugins.
   *
   * Important: This is not just uniquely identifying the plugin aspect, but the
   * implementation as well.
   * For example a plugin aspect would we `ledger-connector` or `storage` and
   * implementations are the ones within those
   * aspects such as `plugin-ledger-connector-besu` or
   * `plugin-storage-kv-in-memory`.
   * Also important: There can be two plugin instances that have the same
   * package name and yet serve different purposes in cases like when you have
   * two ledger connector plugins connecting to the same kind of ledger, but
   * different instances of it (e.g. two companies both have their own private
   * Hyperledger Besu deployment)
   */
  getPackageName(): string;

  onPluginInit(): Promise<unknown>;
}

export function isICactusPlugin(x: unknown): x is ICactusPlugin {
  return (
    !!x &&
    typeof (x as ICactusPlugin).getPackageName === "function" &&
    typeof (x as ICactusPlugin).getInstanceId === "function"
  );
}
