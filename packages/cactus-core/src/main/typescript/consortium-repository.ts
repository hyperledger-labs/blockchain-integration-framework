import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { CactusNode, ConsortiumDatabase } from "@hyperledger/cactus-core-api";

export interface IConsortiumRepositoryOptions {
  logLevel?: LogLevelDesc;
  db: ConsortiumDatabase;
}

/**
 * Class responsible for making it convenient for developers to query the
 * `ConsortiumDatabase` model type which is a flat data structure storing
 * all the different types of entities for Consortium representation such as
 * `CactusNode`, `ConsortiumMember`, `Ledger` etc..
 */
export class ConsortiumRepository {
  public static readonly CLASS_NAME = "ConsortiumRepository";

  private readonly log: Logger;
  private readonly db: ConsortiumDatabase;

  public get className(): string {
    return ConsortiumRepository.CLASS_NAME;
  }

  constructor(public readonly options: IConsortiumRepositoryOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.db, `${fnTag} arg options.db`);
    Checks.truthy(options.db.cactusNode, `${fnTag} arg options.db.cactusNode`);
    this.db = options.db;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get consortiumDatabase(): ConsortiumDatabase {
    return this.options.db;
  }

  public get allNodes(): CactusNode[] {
    return this.options.db.cactusNode;
  }

  /**
   * Queries the complete list of nodes within the consortium to obtain a sub-
   * set of `CactusNode`s which are connected to a `Ledger` with the given
   * `ledgerId`.
   * @param ledgerId The ID of the ledger to filter nodes based on.
   * @throws {Error} If `ledgerId` is falsy or blank.
   */
  public nodesWithLedger(ledgerId: string): CactusNode[] {
    const fnTag = `${this.className}#nodesWithLedger()`;
    Checks.nonBlankString(ledgerId, `${fnTag}:ledgerId`);

    return this.allNodes.filter((cn) => cn.ledgerIds.includes(ledgerId));
  }
}
