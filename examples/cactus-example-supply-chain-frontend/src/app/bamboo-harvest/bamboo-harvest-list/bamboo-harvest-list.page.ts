import { Component, Inject, OnInit } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  BambooHarvest,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { QUORUM_DEMO_LEDGER_ID } from "../../../constants";
import { BambooHarvestDetailPage } from "../bamboo-harvest-detail/bamboo-harvest-detail.page";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-bamboo-harvest-list",
  templateUrl: "./bamboo-harvest-list.page.html",
  styleUrls: [],
})
export class BambooHarvestListPage implements OnInit {
  private readonly log: Logger;
  private bambooHarvests: BambooHarvest[];
  private _supplyChainApi: SupplyChainApi | undefined;

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    @Inject(QUORUM_DEMO_LEDGER_ID) private readonly quorumLedgerId: string,
  ) {
    this.bambooHarvests = [];
    this.log = LoggerProvider.getOrCreate({ label: "BambooHarvestListPage" });
  }

  public get supplyChainApi(): SupplyChainApi {
    if (!this._supplyChainApi) {
      throw new Error(`InvalidStateError: _supplyChainApi not initialized.`);
    } else {
      return this._supplyChainApi;
    }
  }

  async ngOnInit(): Promise<void> {
    this._supplyChainApi = await this.baseClient.ofLedger(
      this.quorumLedgerId,
      SupplyChainApi,
    );
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    const { data } = await this.supplyChainApi.apiV1ListBambooHarvest();
    const { data: bambooHarvests } = data;
    this.bambooHarvests = bambooHarvests;
    this.log.debug(`Fetched BambooHarvest data: %o`, bambooHarvests);
  }

  async clickShowDetail(bambooHarvest: BambooHarvest): Promise<void> {
    this.log.debug("clickShowDetail()", bambooHarvest);

    const modal = await this.modalController.create({
      component: BambooHarvestDetailPage,
      componentProps: {
        bambooHarvest,
      },
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bambooHarvest2 = overlayEventDetail.data as BambooHarvest;
    this.log.debug("clickShowDetail() detail presented OK", bambooHarvest2);

    if (bambooHarvest2) {
      this.log.warn(`Upserting BambooHarvest not yet implemented. Skipping.`);
      // TODO: Implement upsert method on the Solidity contract.
    }
  }

  async clickAddNew(): Promise<void> {
    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: BambooHarvestDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bambooHarvest = overlayEventDetail.data as BambooHarvest;
    this.log.debug("clickAddNew() detail presented OK", bambooHarvest);
    if (bambooHarvest) {
      const res = await this.supplyChainApi.apiV1InsertBambooHarvest({
        bambooHarvest,
      });
      this.log.debug(`New BambooHarvest inserted OK`, res);
      await this.loadData();
    }
  }
}
