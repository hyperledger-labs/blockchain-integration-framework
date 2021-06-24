import { Component, Inject, OnInit } from "@angular/core";

import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { ApiClient } from "@hyperledger/cactus-api-client";
import {
  Bookshelf,
  DefaultApi as SupplyChainApi,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { BESU_DEMO_LEDGER_ID } from "../../../constants";
import { BookshelfDetailPage } from "../bookshelf-detail/bookshelf-detail.page";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-bookshelf-list",
  templateUrl: "./bookshelf-list.page.html",
  styleUrls: [],
})
export class BookshelfListPage implements OnInit {
  private readonly log: Logger;
  private bookshelves: Bookshelf[];
  private _supplyChainApi: SupplyChainApi | undefined;

  constructor(
    private readonly baseClient: ApiClient,
    private readonly modalController: ModalController,
    @Inject(BESU_DEMO_LEDGER_ID) private readonly ledgerId: string,
  ) {
    this.bookshelves = [];
    this.log = LoggerProvider.getOrCreate({ label: "BookshelfListPage" });
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
    const { data } = await this.supplyChainApi.apiV1ListBookshelf();
    const { data: bookshelves } = data;
    this.bookshelves = bookshelves;
    this.log.debug(`Fetched Bookshelf data: %o`, bookshelves);
  }

  async clickShowDetail(bookshelf: Bookshelf): Promise<void> {
    this.log.debug("clickShowDetail()", bookshelf);

    const modal = await this.modalController.create({
      component: BookshelfDetailPage,
      componentProps: {
        bookshelf,
      },
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bookshelf2 = overlayEventDetail.data as Bookshelf;
    this.log.debug("clickShowDetail() detail presented OK", bookshelf2);

    if (bookshelf2) {
      this.log.warn(`Upserting Bookshelf not yet implemented. Skipping.`);
      // TODO: Implement upsert method on the Solidity contract.
    }
  }

  async clickAddNew(): Promise<void> {
    this.log.debug(`clickAddNew()`);
    const modal = await this.modalController.create({
      component: BookshelfDetailPage,
    });
    modal.present();
    const overlayEventDetail = await modal.onDidDismiss();
    const bookshelf = overlayEventDetail.data as Bookshelf;
    this.log.debug("clickAddNew() detail presented OK", bookshelf);
    if (bookshelf) {
      const res = await this.supplyChainApi.apiV1InsertBookshelf({
        bookshelf,
      });
      this.log.debug(`New Bookshelf inserted OK`, res);
      await this.loadData();
    }
  }
}
