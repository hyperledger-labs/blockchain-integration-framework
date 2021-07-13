from abc import ABCMeta, abstractmethod

class AbstractConnector:
    @abstractmethod
    def __init__(self):
        pass

    @abstractmethod
    def getValidatorInformation(self, validatorURL):
        """Get the validator information including version, name, ID, and other information"""
        pass

    @abstractmethod
    def sendSignedTransaction(self, signedTransaction):
        """Request a verifier to execute a ledger operation"""
        pass
    
    @abstractmethod
    def getBalance(self, address):
        """Get balance of an account for native token on a leder"""
        pass
    
    @abstractmethod
    def execSyncFunction(self, address, funcName, args):
        """Execute a synchronous function held by a smart contract"""
        pass
    
    @abstractmethod
    def startMonitor(self, clientId, cb):
        """Request a validator to start monitoring ledger"""
        pass
    
    @abstractmethod
    def stopMonitor(self, clientId):
        """Request a validator to stop monitoring ledger"""
        pass

    @abstractmethod
    def cb(self, callbackData):
        """Callback function to call when receiving data from Ledger"""
        pass

    @abstractmethod
    def nop(self):
        """Nop function for testing"""
        pass
