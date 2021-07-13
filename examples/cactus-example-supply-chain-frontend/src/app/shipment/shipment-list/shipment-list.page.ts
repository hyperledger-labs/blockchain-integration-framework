import { Component, Inject, OnInit } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  Shipment,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { BESU_DEMO_LEDGER_ID } from "../../../constants";
import { ShipmentDetailPage } from "../shipment-detail/shipment-detail.page";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-shipment-list",
  templateUrl: "./shipment-list.page.html",
  styleUrls: [],
})
export class ShipmentListPage implements OnInit {
  private readonly log: Logger;
  private shipments: Shipment[];
  private _supplyChainApi: SupplyChainApi | undefined;

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    @Inject(BESU_DEMO_LEDGER_ID) private readonly ledgerId: string,
  ) {
    this.shipments = [];
    this.log = LoggerProvider.getOrCreate({ label: "ShipmentListPage" });
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
      this.ledgerId,
      SupplyChainApi,
    );
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    const { data } = await this.supplyChainApi.listShipmentV1();
    const { data: shipments } = data;
    this.shipments = shipments;
    this.log.debug(`Fetched Shipment data: %o`, shipments);
  }

  async clickShowDetail(shipment: Shipment) {
    this.log.debug("clickShowDetail()", shipment);

    const modal = await this.modalController.create({
      component: ShipmentDetailPage,
      componentProps: {
        shipment,
      },
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const shipment2 = overlayEventDetail.data as Shipment;
    this.log.debug("clickShowDetail() detail presented OK", shipment2);

    if (shipment2) {
      this.log.warn(`Upserting Shipment not yet implemented. Skipping.`);
      // TODO: Implement upsert method on the Solidity contract.
    }
  }

  async clickAddNew() {
    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: ShipmentDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const shipment = overlayEventDetail.data as Shipment;
    this.log.debug("clickAddNew() detail presented OK", shipment);
    if (shipment) {
      const res = await this.supplyChainApi.insertShipmentV1({ shipment });
      this.log.debug(`New Shipment inserted OK`, res);
      await this.loadData();
    }
  }
}
