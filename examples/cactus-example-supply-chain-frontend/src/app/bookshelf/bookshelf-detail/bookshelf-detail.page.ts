import { v4 as uuidv4 } from "uuid";

import { Component, Inject, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { ModalController } from "@ionic/angular";

import { ApiClient } from "@hyperledger/cactus-api-client";

import {
  BambooHarvest,
  Bookshelf,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { QUORUM_DEMO_LEDGER_ID } from "src/constants";

@Component({
  selector: "app-bookshelf-detail",
  templateUrl: "./bookshelf-detail.page.html",
  styleUrls: [],
})
export class BookshelfDetailPage implements OnInit {
  private readonly log: Logger;
  private _supplyChainApi: SupplyChainApi | undefined;
  public form: FormGroup;
  @Input()
  public bookshelf: Bookshelf;
  public bambooHarvests: BambooHarvest[];
  public bambooHarvestIds: string[];

  constructor(
    private readonly baseClient: ApiClient,
    @Inject(QUORUM_DEMO_LEDGER_ID) private readonly quorumLedgerId: string,
    public readonly modalController: ModalController,
    public readonly formBuilder: FormBuilder,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "BookshelfDetailPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.bookshelf);

    this._supplyChainApi = await this.baseClient.ofLedger(
      this.quorumLedgerId,
      SupplyChainApi,
    );

    if (!this.bookshelf) {
      this.bookshelf = {
        id: uuidv4(),
        shelfCount: 5,
        bambooHarvestId: "",
      };
    }
    this.form = this.formBuilder.group({
      id: [this.bookshelf.id, Validators.required],
      shelfCount: [this.bookshelf.shelfCount, Validators.required],
      bambooHarvestId: [this.bookshelf.bambooHarvestId, Validators.required],
    });

    await this.loadData();
  }

  private async loadData(): Promise<void> {
    const { data } = await this.supplyChainApi.apiV1ListBambooHarvest();
    const { data: bambooHarvests } = data;
    this.bambooHarvests = bambooHarvests;
    this.log.debug(`Fetched BambooHarvest data: %o`, bambooHarvests);
    this.bambooHarvestIds = this.bambooHarvests.map((bh) => bh.id);
    this.log.debug(`BambooHarvest IDs: %o`, this.bambooHarvestIds);
  }

  onClickFormSubmit(value: any): void {
    this.log.debug("form submitted", value);
    this.bookshelf = value;
    this.modalController.dismiss(this.bookshelf);
  }

  onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
