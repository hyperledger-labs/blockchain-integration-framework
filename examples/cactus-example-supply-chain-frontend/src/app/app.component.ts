import { Component } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent {
  public selectedIndex = 0;
  public appPages = [
    {
      title: "Bamboo Harvests",
      url: "/bamboo-harvest-list",
      icon: "leaf",
    },
    {
      title: "Bookshelves",
      url: "/bookshelf-list",
      icon: "book",
    },
    {
      title: "Shipment",
      url: "/shipment-list",
      icon: "cube",
    },
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
  ) {
    this.initializeApp();
  }

  initializeApp(): void {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
}
