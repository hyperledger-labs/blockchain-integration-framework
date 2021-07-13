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

interface ApiPluginLedgerConnectorCordaService {

    fun deployContractJarsV1(deployContractJarsV1Request: DeployContractJarsV1Request?): DeployContractJarsSuccessV1Response

    fun diagnoseNodeV1(diagnoseNodeV1Request: DiagnoseNodeV1Request?): DiagnoseNodeV1Response

    fun getPrometheusMetricsV1(): kotlin.String

    fun invokeContractV1(invokeContractV1Request: InvokeContractV1Request?): InvokeContractV1Response

    fun listFlowsV1(listFlowsV1Request: ListFlowsV1Request?): ListFlowsV1Response

    fun networkMapV1(body: kotlin.Any?): List<NodeInfo>
}
