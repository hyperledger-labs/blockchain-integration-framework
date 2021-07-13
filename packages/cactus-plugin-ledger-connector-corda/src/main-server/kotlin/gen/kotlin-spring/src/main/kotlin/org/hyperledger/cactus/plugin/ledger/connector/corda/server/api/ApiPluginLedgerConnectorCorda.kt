package org.hyperledger.cactus.plugin.ledger.connector.corda.server.api

import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsBadRequestV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsSuccessV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DeployContractJarsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.DiagnoseNodeV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.InvokeContractV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Request
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.ListFlowsV1Response
import org.hyperledger.cactus.plugin.ledger.connector.corda.server.model.NodeInfo
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

import org.springframework.web.bind.annotation.*
import org.springframework.validation.annotation.Validated
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.beans.factory.annotation.Autowired

import javax.validation.Valid
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min
import javax.validation.constraints.NotNull
import javax.validation.constraints.Pattern
import javax.validation.constraints.Size

import kotlin.collections.List
import kotlin.collections.Map

@RestController
@Validated
@RequestMapping("\${api.base-path:}")
class ApiPluginLedgerConnectorCordaController(@Autowired(required = true) val service: ApiPluginLedgerConnectorCordaService) {


    @PostMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/deploy-contract-jars"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun deployContractJarsV1( @Valid @RequestBody(required = false) deployContractJarsV1Request: DeployContractJarsV1Request?
): ResponseEntity<DeployContractJarsSuccessV1Response> {
        return ResponseEntity(service.deployContractJarsV1(deployContractJarsV1Request), HttpStatus.valueOf(200))
    }


    @PostMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/diagnose-node"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun diagnoseNodeV1( @Valid @RequestBody(required = false) diagnoseNodeV1Request: DiagnoseNodeV1Request?
): ResponseEntity<DiagnoseNodeV1Response> {
        return ResponseEntity(service.diagnoseNodeV1(diagnoseNodeV1Request), HttpStatus.valueOf(200))
    }


    @GetMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics"],
        produces = ["text/plain"]
    )
    fun getPrometheusMetricsV1(): ResponseEntity<kotlin.String> {
        return ResponseEntity(service.getPrometheusMetricsV1(), HttpStatus.valueOf(200))
    }


    @PostMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/invoke-contract"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun invokeContractV1( @Valid @RequestBody(required = false) invokeContractV1Request: InvokeContractV1Request?
): ResponseEntity<InvokeContractV1Response> {
        return ResponseEntity(service.invokeContractV1(invokeContractV1Request), HttpStatus.valueOf(200))
    }


    @PostMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/list-flows"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun listFlowsV1( @Valid @RequestBody(required = false) listFlowsV1Request: ListFlowsV1Request?
): ResponseEntity<ListFlowsV1Response> {
        return ResponseEntity(service.listFlowsV1(listFlowsV1Request), HttpStatus.valueOf(200))
    }


    @PostMapping(
        value = ["/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/network-map"],
        produces = ["application/json"],
        consumes = ["application/json"]
    )
    fun networkMapV1( @Valid @RequestBody(required = false) body: kotlin.Any?
): ResponseEntity<List<NodeInfo>> {
        return ResponseEntity(service.networkMapV1(body), HttpStatus.valueOf(200))
    }
}
