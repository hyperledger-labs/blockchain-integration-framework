from abc import ABCMeta, abstractmethod

import json
import time
from indy import ledger
import asyncio

from .AbstractConnector import AbstractConnector

class IndyConnector(AbstractConnector):
    def __init__(self, socketio, sessionid, indy_dic):
        self.moduleName = "IndyConnector"
        self.indy_dic = indy_dic
        print(f"##{self.moduleName}.__init__")

    def getValidatorInformation(self, validatorURL):
        """Get the validator information including version, name, ID, and other information"""
        print(f"##{self.moduleName}.getValidatorInformation()")

    def sendSignedTransaction(self, signedTransaction):
        """Request a verifier to execute a ledger operation"""
        print(f"##{self.moduleName}.sendSignedTransaction()")
    
    def getBalance(self, address):
        """Get balance of an account for native token on a leder"""
        print(f"##{self.moduleName}.getBalance()")
    
    def execSyncFunction(self, address, funcName, args):
        """Execute a synchronous function held by a smart contract"""
        print(f"##{self.moduleName}.execSyncFunction()")
        
        command = args['method']['command']
        if command== 'indy_ledger_submit_request':
            return self.load_schema_or_credential_definition(args['args'])
            
        print(f"##{self.moduleName} unknown command : {command}")
        return "unknown command."
    
    
    def load_schema_or_credential_definition(self, args):
        """Execute a synchronous function held by a smart contract"""
        print(f"##{self.moduleName}.load_schema_or_credential_definition()")

        pool_handle = self.indy_dic['pool_handle']
        responseStr = self.run_coroutine_ensure_previous_request_applied(pool_handle, args, lambda response: response['result']['data'] is not None)
        
        response = json.loads(responseStr)
        
        return response
    
    def startMonitor(self, clientId, cb):
        """Request a validator to start monitoring ledger"""
        print(f"##{self.moduleName}.startMonitor()")
    
    def stopMonitor(self, clientId):
        """Request a validator to stop monitoring ledger"""
        print(f"##{self.moduleName}.stopMonitor()")

    def cb(self, callbackData):
        """Callback function to call when receiving data from Ledger"""
        print(f"##{self.moduleName}.cb()")

    def nop(self):
        """Nop function for testing"""
        print(f"##{self.moduleName}.nop()")

    async def ensure_previous_request_applied(self, pool_handle, checker_request, checker):
        for _ in range(3):
            response = json.loads(await ledger.submit_request(pool_handle, checker_request))
            try:
                if checker(response):
                    return json.dumps(response)
            except TypeError:
                pass
            time.sleep(5)

    def run_coroutine_ensure_previous_request_applied(self, pool_handle, checker_request, checker, loop=None):
        if loop is None:
            loop = asyncio.get_event_loop()
        results = loop.run_until_complete(self.ensure_previous_request_applied(pool_handle, checker_request, checker))
        return results
