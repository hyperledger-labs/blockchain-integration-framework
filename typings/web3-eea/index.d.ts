declare module "web3-eea" {
    import type Web3 from "web3";
    import type { TransactionConfig } from "web3-eth";
    import type BN from "bn.js";

    export default function EEAClient(web3: IWeb3Instance, chainId: number): IWeb3InstanceExtended;

    export interface IWeb3Instance {
        currentProvider: any;
        extend: (...args: any[]) => any;
    }

    export interface IEeaWeb3Extension {
        /**
         * Send the Raw transaction to the Besu node
         */
        sendRawTransaction: (options: ISendRawTransactionOptions) => Promise<string>;
    }

    export interface IWeb3InstanceExtended extends Web3 {
        eea: IEeaWeb3Extension;
        priv: IPrivWeb3Extension;
        privx: IPrivxWeb3Extension;
    }

    export interface IPrivxWeb3Extension {
        /**
         * Creates an on chain privacy group
         */
        createPrivacyGroup(options: ICreatePrivacyGroupOptions): Promise<IPrivateTransactionReceipt>;
        /**
         * @deprecated
         */
        findOnChainPrivacyGroup(options: IFindOnChainPrivacyGroupOptions): Promise<unknown>;
        /**
         * Remove a member from an on-chain privacy group
         */
        removeFromPrivacyGroup(options: IRemoveFromPrivacyGroupOptions): Promise<IPrivateTransactionReceipt>;
        /**
         * Add to an existing on-chain privacy group
         */
        addToPrivacyGroup(options: IAddToPrivacyGroupOptions): Promise<IPrivateTransactionReceipt>;
        /**
         * Either lock or unlock the privacy group for member adding
         */
        setPrivacyGroupLockState(options: ISetPrivacyGroupLockState): Promise<IPrivateTransactionReceipt>;
    }
    export interface IPrivWeb3Extension {
        /**
         * Generate a privacyGroupId
         * @param options Options passed into `eea_sendRawTransaction`
         * @returns String The base64 encoded keccak256 hash of the participants.
         */
        generatePrivacyGroup(options: IGeneratePrivacyGroupOptions): string;
        /**
         * Returns with the deleted group's ID (same one that was passed in).
         */
        deletePrivacyGroup(options: IDeletePrivacyGroupOptions): Promise<string>;
        /**
         * Returns a list of privacy groups containing only the listed members.
         * For example, if the listed members are A and B, a privacy group
         * containing A, B, and C is not returned.
         */
        findPrivacyGroup(options: IFindPrivacyGroupOptions): Promise<Array<IPrivacyGroup>>;
        distributeRawTransaction(options: IPrivateTransactionConfig, method: string): Promise<unknown>;
        getTransactionCount(options: IGetTransactionCountNoPrivacyGroupIdOptions | IGetTransactionCountWithPrivacyGroupIdOptions): Promise<number>;
        /**
         * Get the private transaction Receipt.
         * @param txHash Transaction Hash of the marker transaction
         * @param enclavePublicKey Public key used to start - up the Enclave
         * @param retries Number of retries to be made to get the private marker transaction receipt. Default: 300
         * @param delay The delay between the retries. Default: 1000
         * @see https://besu.hyperledger.org/en/stable/Reference/API-Objects/#private-transaction-receipt-object
         */
        getTransactionReceipt(
            txHash: string,
            enclavePublicKey: string,
            retries?: number,
            delay?: number,
        ): Promise<IPrivateTransactionReceipt | null>;
        call(options: ICallOptions): Promise<string>;
        /**
         * Subscribe to new logs matching a filter
         *
         * If the provider supports subscriptions, it uses `priv_subscribe`, otherwise
         * it uses polling and `priv_getFilterChanges` to get new logs. Returns an
         * error to the callback if there is a problem subscribing or creating the filter.
         * @param {string} privacyGroupId
         * @param {*} filter
         * @param {function} callback returns the filter/subscription ID, or an error
         * @return {PrivateSubscription} a subscription object that manages the
         * lifecycle of the filter or subscription
         */
        subscribe(privacyGroupId: string, filter: unknown, callback: (err: Error | undefined, filterId: string) => void): Promise<unknown>;
    }

    /**
     * Controls the lifecycle of a private subscription
     */
    export interface IPrivateSubscription {
        /**
         * Returns with a `Promise` of a filter ID.
         */
        subscribe(): Promise<string>;
        on(eventName: string, callback: (...args: unknown[]) => void): this;
        reset(): void;
        unsubscribe(): Promise<unknown>;
    }

    export interface ISendGenericTransactionOptions {
        readonly privateKey: string;
        readonly privateFrom: string;
        readonly privacyGroupId?: string;
        readonly privateFor: string[];
        /**
         * getTransactionCount is used to calculate nonce if omitted.
         */
        readonly nonce?: number;
        /**
         * default value 0
         */
        gasPrice?: number | string | BN;
        /**
         * default value 3000000
         */
        readonly gasLimit?: number;
        readonly to?: string;
        readonly data: string;
        /**
         * Defaults to `"restricted"`
         *
         * Hyperledger Besu only implements `"restricted"` mode of operation.
         */
        readonly restriction?: "restricted" |"unrestricted";
    }

    export interface ISendRawTransactionOptions extends ISendGenericTransactionOptions, TransactionConfig {
        /**
         * Private Key used to sign transaction with
         */
        readonly privateKey: string;
        /**
         * Enclave public key
         */
        readonly privateFrom: string;
        /**
         * Enclave keys to send the transaction to
         */
        readonly privateFor: string[];
        /**
         * Enclave id representing the receivers of the transaction
         */
        readonly privacyGroupId?: string;
        /**
         * (Optional) : If not provided, will be calculated using`eea_getTransctionCount`
         */
        readonly nonce?: number;
        /**
         * The address to send the transaction
         */
        readonly to?: string;
        /**
         * Data to be sent in the transaction
         */
        readonly data: string;
    }

    export interface ISetPrivacyGroupLockState {
        /**
         * Privacy group ID to lock / unlock
         */
        readonly privacyGroupId: string;
        /**
         * Private Key used to sign transaction with
         */
        readonly privateKey: string;
        /**
         * Orion public key
         */
        readonly enclaveKey: string;
        /**
         * boolean indicating whether to lock or unlock
         */
        readonly lock: boolean;
    }

    export interface IAddToPrivacyGroupOptions {
        /**
         * Privacy group ID to add to
         */
        readonly privacyGroupId: string;
        /**
         * Private Key used to sign transaction with
         */
        readonly privateKey: string;
        /**
         * Orion public key
         */
        readonly enclaveKey: string;
        /**
         * list of enclaveKey to pass to the contract to add to the group
         */
        readonly participants: string[];
    }

    export interface IRemoveFromPrivacyGroupOptions {
        /**
         * Privacy group ID to add to
         */
        readonly privacyGroupId: string;
        /**
         * Private Key used to sign transaction with
         */
        readonly privateKey: string;
        /**
         * Orion public key
         */
        readonly enclaveKey: string;
        /**
         * single enclaveKey to pass to the contract to add to the group
         */
        readonly participant: string;
    }

    export interface ICreatePrivacyGroupOptions {
        /**
         * Privacy group ID to add to
         */
        readonly privacyGroupId: string;
        /**
         * Private Key used to sign transaction with
         */
        readonly privateKey: string;
        /**
         * Orion public key
         */
        readonly enclaveKey: string;
        /**
         * list of enclaveKey to pass to the contract to add to the group
         * Expected to be Base64 encoded array of strings.
         */
        readonly participants: string[];
    }

    export interface IFindOnChainPrivacyGroupOptions {
        readonly addresses: string[];
    }

    export interface IGeneratePrivacyGroupOptions {
        readonly privateFor: string[];
        readonly privateFrom: string;
    }

    export interface IDeletePrivacyGroupOptions {
        readonly privacyGroupId: string;
    }

    export interface IFindPrivacyGroupOptions {
        readonly addresses: string[];
    }

    export interface IGetTransactionCountNoPrivacyGroupIdOptions {
        readonly from: string;
        readonly privateFrom: string;
        readonly privateFor: string[];
        readonly privacyGroupId?: string;
    }
    export interface IGetTransactionCountWithPrivacyGroupIdOptions {
        readonly from: string;
        readonly privateFrom?: string;
        readonly privateFor?: string[];
        readonly privacyGroupId: string;
    }

    export interface ICallOptions {
        /**
         * Enclave id representing the receivers of the transaction
         */
        readonly privacyGroupId: string;
        /**
         * Contract address,
         */
        readonly to: string;
        readonly from: string;
        /**
         * Encoded function call(signature + data)
         */
        readonly data: string;
        /**
         * Blocknumber defaults to "latest"
         */
        readonly blockNumber?: IBlockParameter;
    }

    export type IBlockParameter = string | number | "latest" | "earliest" | "pending";

    export interface IPrivateTransactionReceipt {
        /**
         * Data, 32 bytes	Hash of block containing this transaction.
         */
        readonly blockHash: string;
        /**
         * Quantity	Block number of block containing this transaction.
         */
        readonly blockNumber: number;
        /**
         * Data, 20 bytes	Contract address created if a contract creation transaction, otherwise, null.
         */
        readonly contractAddress: string;
        /**
         * Data, 20 bytes	Address of the sender.
         */
        readonly from: string;
        /**
         * Array	Array of log objects generated by this private transaction.
         */
        readonly logs: Array<IEeaLogObject>;
        /**
         * Data, 20 bytes	Address of the receiver, if sending ether, otherwise, null.
         */
        readonly to: string;
        /**
         * Data, 32 bytes	Hash of the private transaction.
         */
        readonly transactionHash: string;
        /**
         * Quantity, Integer	Index position of transaction in the block.
         */
        readonly transactionIndex: number;
        /**
         * String	ABI - encoded string that displays the reason for reverting the transaction.Only available if revert reason is enabled.
         */
        readonly revertReason: string;
        /**
         * Data	RLP - encoded return value of a contract call if a value returns, otherwise, null.
         */
        readonly output: string;
        /**
         * Data, 32 bytes	Hash of the privacy marker transaction.
         */
        readonly commitmentHash: string;
        /**
         * Quantity	Either `0x1` (success) or `0x0` (failure).
         */
        readonly status: string;
        /**
         * Data, 32 bytes	Tessera public key of the sender.
         */
        readonly privateFrom: string;
        /**
         * or privacyGroupId	Array or Data, 32 bytes	Tessera public keys or privacy group ID of the recipients.
         */
        readonly privateFor: string | string[];
        /**
         * Data, 256 bytes	Bloom filter for light clients to quickly retrieve related logs.
         */
        readonly logsBloom: string;
    }

    /**
     * @see https://besu.hyperledger.org/en/stable/Reference/API-Objects/#log-object
     */
    export interface IEeaLogObject {
        /**
         * Tag	true if log removed because of a chain reorganization.false if a valid log.
         */
        readonly removed: string;
        /**
         * Quantity, Integer	Log index position in the block.null when log is pending.
         */
        readonly logIndex: number;
        /**
         * Quantity, Integer	Index position of the starting transaction for the log.null when log is pending.
         */
        readonly transactionIndex: number;
        /**
         * Data, 32 bytes	Hash of the starting transaction for the log.null when log is pending.
         */
        readonly transactionHash: string;
        /**
         * Data, 32 bytes	Hash of the block that includes the log.null when log is pending.
         */
        readonly blockHash: string;
        /**
         * Quantity	Number of block that includes the log.null when log is pending.
         */
        readonly blockNumber: number;
        /**
         * Data, 20 bytes	Address the log originated from.
         */
        readonly address: string;
        /**
         * Data	Non - indexed arguments of the log.
         */
        readonly data: string;
        /**
         * Array of Data, 32 bytes each	Event signature hash and 0 to 3 indexed log arguments.
         */
        readonly topics: string[];
    }

    export interface IPrivateTransactionConfig {
        readonly privateKey: string;
        readonly privateFrom: string;
        readonly privacyGroupId?: string;
        readonly privateFor: string[];
        readonly nonce?: string;
        /**
         * Default value: 0
         */
        readonly gasPrice?: number;
        /**
         * Default value 3000000
         */
        readonly gasLimit?: number;
        readonly to?: string;
        readonly data?: string;
        readonly restriction: string;
    }

    export interface IPrivacyGroup {
        readonly privacyGroupId: string;
        readonly type: PrivacyGroupType;
        readonly name: string;
        readonly description: string;
        readonly members: string[];
    }

    // FIXME - this should be a const enum with the values matching what the
    // Besu API returns (JVM enum)
    export enum PrivacyGroupType {
        LEGACY,
        ONCHAIN,
        PANTHEON
    }
}
