"use strict";

/*eslint-disable no-console*/

var fs = require("fs");
var path = require("path");
var util = require("util");
var yaml = require("js-yaml");

try {
  var myArgs = process.argv.slice(2);
  //console.log("myArgs: ", myArgs);

  let templateType = myArgs[0];
  let orgName = myArgs[1];
  let hostPort = myArgs[2];
  let containerPort = myArgs[3];
  let mspId = orgName + "MSP";

  if (hostPort === undefined || containerPort === undefined) {
    throw new Error("ports undefined");
  }

  let directory = path.join(__dirname, "docker");
  let filename;
  switch (templateType) {
    case "couch":
      filename = path.join(directory, "docker-compose-couch-org3.yaml");
      break;
    case "compose":
      filename = path.join(directory, "docker-compose-org3.yaml");
      break;
    case "ca":
      filename = path.join(directory, "docker-compose-ca-org3.yaml");
      break;
    default:
      throw new Error("template type not found");
  }

  let contents = fs.readFileSync(filename, "utf8");
  let data = yaml.load(contents);

  console.log(util.inspect(data, true, 10, true));

  switch (templateType) {
    case "couch":
      // l. 26: ports
      data["services"]["couchdb4"]["ports"] = `${hostPort}:${containerPort}`;

      // l. 30: org name
      data["services"][orgName] = data["services"]["peer0.org3.example.com"];
      delete data["services"]["peer0.org3.example.com"];

      // l.33: container port
      data["services"][orgName][
        "environment"
      ][1] = `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb4:${containerPort}`;

      //console.log("After modification");
      //console.log(util.inspect(data, true, 10, true));

      let dumpCouch = yaml.dump(data, {
        flowLevel: 3,
        styles: {
          "!!int": "hexadecimal",
          "!!null": "camelcase",
        },
      });

      //console.log(dumpCouch);

      fs.writeFile(
        path.join(__dirname, "docker", `docker-compose-couch-${orgName}.yaml`),
        dumpCouch,
        function (err) {
          if (err) return console.log(err);
        },
      );

      console.log(`docker/docker-compose-couch-${orgName}.yaml`);
      return;

    case "compose":
      // l.9: volume name;  peer0.org3.example.com:
      data["volumes"] = orgName;

      // l. 17: org name
      data["services"][orgName] = data["services"]["peer0.org3.example.com"];
      delete data["services"]["peer0.org3.example.com"];

      //l.18: container name
      data["services"][orgName]["container_name"] = orgName;

      // CORE_PEER_ID=peer0.org3.example.com
      data["services"][orgName]["environment"][8] = `CORE_PEER_ID=${orgName}`;

      // CORE_PEER_ADDRESS=peer0.org3.example.com:11051
      data["services"][orgName][
        "environment"
      ][9] = `CORE_PEER_ADDRESS=${orgName}:${hostPort}`;

      // CORE_PEER_LISTENADDRESS=0.0.0.0:11051
      data["services"][orgName][
        "environment"
      ][10] = `CORE_PEER_LISTENADDRESS=0.0.0.0:${hostPort}`;

      //       - CORE_PEER_CHAINCODEADDRESS=peer0.org3.example.com:11052
      const chaincodePort = parseInt(hostPort) + 1;
      data["services"][orgName][
        "environment"
      ][11] = `CORE_PEER_CHAINCODEADDRESS=${orgName}:${chaincodePort}`;

      //    CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:11052
      data["services"][orgName][
        "environment"
      ][12] = `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${chaincodePort}`;

      //          - CORE_PEER_GOSSIP_BOOTSTRAP=peer0.org3.example.com:11051
      data["services"][orgName][
        "environment"
      ][13] = `CORE_PEER_GOSSIP_BOOTSTRAP=${orgName}:${hostPort}`;

      //          -       - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.org3.example.com:11051

      data["services"][orgName][
        "environment"
      ][14] = `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${orgName}:${hostPort}`;

      //            - CORE_PEER_LOCALMSPID=Org3MSP

      data["services"][orgName][
        "environment"
      ][15] = `CORE_PEER_LOCALMSPID=${mspId}`;

      /// Volumes
      //         - ../../organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/msp:/etc/hyperledger/fabric/msp
      data["services"][orgName][
        "volumes"
      ][1] = `../../organizations/peerOrganizations/${orgName}/peers/${orgName}/msp:/etc/hyperledger/fabric/msp`;

      //        - ../../organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls:/etc/hyperledger/fabric/tls
      data["services"][orgName][
        "volumes"
      ][2] = `../../organizations/peerOrganizations/${orgName}/peers/${orgName}/tls:/etc/hyperledger/fabric/tls`;

      //         - peer0.org3.example.com:/var/hyperledger/production
      data["services"][orgName][
        "volumes"
      ][3] = `${orgName}:/var/hyperledger/production`;

      data["services"][orgName]["ports"] = `${hostPort}:${hostPort}`;

      let dumpCompose = yaml.dump(data, {
        flowLevel: 3,
        styles: {
          "!!int": "hexadecimal",
          "!!null": "camelcase",
        },
      });

      //console.log(dumpCompose);

      fs.writeFile(
        path.join(__dirname, "docker", `docker-compose-${orgName}.yaml`),
        dumpCompose,
        function (err) {
          if (err) return console.log(err);
        },
      );

      console.log(`docker/docker-compose-${orgName}.yaml`);
      return;

    case "ca":
      const caName = `ca_${orgName}`;
      data["services"][caName] = data["services"]["ca_org3"];
      delete data["services"]["ca_org3"];

      //      - FABRIC_CA_SERVER_CA_NAME=ca-org3
      data["services"][caName][
        "environment"
      ][1] = `FABRIC_CA_SERVER_CA_NAME=${caName}`;

      //      - FABRIC_CA_SERVER_PORT=11054
      data["services"][caName][
        "environment"
      ][3] = `FABRIC_CA_SERVER_PORT=${hostPort}`;

      //      - "11054:11054"
      data["services"][caName]["ports"] = `${hostPort}:${hostPort}`;

      data["services"][caName][
        "volumes"
      ] = `../fabric-ca/${orgName}:/etc/hyperledger/fabric-ca-server`;

      data["services"][caName]["container_name"] = caName;

      let dumpCa = yaml.dump(data, {
        flowLevel: 3,
        styles: {
          "!!int": "hexadecimal",
          "!!null": "camelcase",
        },
      });

      //console.log(dumpCa);

      fs.writeFile(
        path.join(__dirname, "docker", `docker-compose-ca-${orgName}.yaml`),
        dumpCa,
        function (err) {
          if (err) return console.log(err);
        },
      );

      console.log(`docker/docker-compose-ca-${orgName}.yaml`);
      return;
    default:
      throw new Error("template type not found");
  }

  /*
	console.log(yaml.dump(data, {
	flowLevel: 3,
	styles: {
	'!!int'  : 'hexadecimal',
	'!!null' : 'camelcase'
	}
	}));
*/
} catch (err) {
  console.log(err.stack || String(err));
}
