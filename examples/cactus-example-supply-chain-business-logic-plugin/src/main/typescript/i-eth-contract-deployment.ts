export interface IEthContractDeployment {
  address: string;
  abi: unknown;
  bytecode: string;
  contractName: string;
  keychainId: string;
}
