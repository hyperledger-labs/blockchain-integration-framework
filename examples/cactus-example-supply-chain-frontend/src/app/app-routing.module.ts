import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "",
    redirectTo: "bamboo-harvest-list",
    pathMatch: "full",
  },
  {
    path: "bamboo-harvest-list",
    loadChildren: () =>
      import("./bamboo-harvest/bamboo-harvest.module").then(
        (m) => m.BambooHarvestPageModule,
      ),
  },
  {
    path: "bookshelf-list",
    loadChildren: () =>
      import("./bookshelf/bookshelf.module").then((m) => m.BookshelfPageModule),
  },
  {
    path: "shipment-list",
    loadChildren: () =>
      import("./shipment/shipment.module").then((m) => m.ShipmentPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
      relativeLinkResolution: "legacy",
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
