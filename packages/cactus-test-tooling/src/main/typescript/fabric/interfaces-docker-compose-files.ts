export interface IDockerFabricComposeCouchDbTemplate {
  services: IDockerFabricComposeCouchDbTemplateService;
}

export interface IDockerFabricComposeCouchDbTemplateService {
  [key: string]: IDockerCouchdb4;
}

export interface IDockerCouchdb4 {
  ports: string;
  [key: string]: string;
}

export interface IDockerFabricComposeTemplate {
  volumes: string;
  services: IDockerFabricComposeCouchDbTemplateService;
}
