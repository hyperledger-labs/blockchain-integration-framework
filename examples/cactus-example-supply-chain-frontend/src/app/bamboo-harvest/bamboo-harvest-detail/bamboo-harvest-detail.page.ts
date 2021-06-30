import { v4 as uuidv4 } from "uuid";

import { Component, Inject, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { ModalController } from "@ionic/angular";

import { ApiClient } from "@hyperledger/cactus-api-client";
import { BambooHarvest } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

import { QUORUM_DEMO_LEDGER_ID } from "../../../constants";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

@Component({
  selector: "app-bamboo-harvest-detail",
  templateUrl: "./bamboo-harvest-detail.page.html",
  styleUrls: [],
})
export class BambooHarvestDetailPage implements OnInit {
  private readonly log: Logger;
  public form: FormGroup;
  @Input()
  public bambooHarvest: BambooHarvest;

  constructor(
    private readonly baseClient: ApiClient,
    public readonly modalController: ModalController,
    public readonly formBuilder: FormBuilder,
    @Inject(QUORUM_DEMO_LEDGER_ID) private readonly quorumLedgerId: string,
  ) {
    this.log = LoggerProvider.getOrCreate({ label: "BambooHarvestDetailPage" });
  }

  async ngOnInit(): Promise<void> {
    this.log.debug("component initialized.", this.bambooHarvest);

    if (!this.bambooHarvest) {
      this.bambooHarvest = {
        id: uuidv4(),
        harvester: "Captain Lumberjack Logging Corporation",
        location: "London, NW1 2DB, United Kingdom",
        startedAt: new Date(2020, 6, 10, 7, 0, 0, 0).toJSON(),
        endedAt: new Date(2020, 6, 10, 16, 0, 0, 0).toJSON(),
      };
    }

    this.form = this.formBuilder.group({
      id: [this.bambooHarvest.id, Validators.required],
      location: [this.bambooHarvest.location, Validators.required],
      startedAt: [this.bambooHarvest.startedAt, Validators.required],
      endedAt: [this.bambooHarvest.endedAt, Validators.required],
      harvester: [this.bambooHarvest.harvester, Validators.required],
    });
  }

  public onClickFormSubmit(value: any): void {
    this.log.debug("form submitted", value);
    this.bambooHarvest = value;
    this.modalController.dismiss(this.bambooHarvest);
  }

  public onClickBtnCancel(): void {
    this.log.debug("form submission cancelled by user");
    this.modalController.dismiss();
  }
}
