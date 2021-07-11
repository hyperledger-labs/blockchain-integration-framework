from flask import Flask, render_template, request
from flask_socketio import SocketIO
import json
import time
import asyncio

# from indy import ledger, pool
from indy import pool

from .Settings import Settings
from .IndyConnector import IndyConnector

class SocketIoValidator:
    def __init__(self):
        self.moduleName = "SocketIoValidator"
        self.the_cb = None
        self.indy_dic = {}
        
        # load settings
        self.settings = Settings()

        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'secret!'
        # socketio = SocketIO(app)
        self.socketio = SocketIO(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port, logger=True, engineio_logger=True)
        

        @self.socketio.on('connect')
        def handle_connect():
            # print('on connect (sessionid: ' + request.sid + ')')
            print(f'on connect (sessionid: {request.sid})')
            self.session_dict[request.sid] = self.getValidatorInstance()

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print('on disconnect')
            del self.session_dict[request.sid]

        @self.socketio.on('startMonitor')
        def handle_startMonitor():
            print('on startMonitor')
            clientId = None
            cb = None
            self.session_dict[request.sid].startMonitor(clientId, cb)
            def the_cb(resp): return self.cb_helper(request.sid, resp)

        @self.socketio.on('stopMonitor')
        def handle_stopMonitor():
            print('on startMonitor')
            self.session_dict[request.sid].stopMonitor()

        @self.socketio.on('nop')
        def handle_nop():
            print('received nop')
            self.session_dict[request.sid].nop()

        @self.socketio.on('test-event')
        def handle_event():
            self.session_dict[request.sid].cb('data-from-blockchain')

        @self.socketio.on('request2')
        def handle_execSyncFunction(requestData):
            print('received request2')
            print(f"##requestData:  {requestData}")
            
            result = self.session_dict[request.sid].execSyncFunction(None, None, requestData)
            
            resp_obj = self.build_res_obj(200, requestData["reqId"], result)
            respJson = json.dumps(resp_obj)
            self.socketio.emit("response", respJson);

        self.session_dict = {}

    def build_res_obj(self, status_code, req_id, result):
        ## signed_results = ValidatorAuthentication.sign(result)
        signed_results = result
    
        res_obj = {}
        res_obj["status"] = status_code
        res_obj["data"] = signed_results
        if req_id is not None:
            res_obj["id"] = req_id
            
        return res_obj

    def run(self):
        """Run Validator"""
        # self.init_indy();
        self.socketio.run(self.app, host='0.0.0.0', port=self.settings.validatorSettings.port)

    def cb_helper(self, sessionid, answer):
        print(f'cb helper: {self.session_dict[request.sid]}')
        return self.session_dict[sessionid].cb(answer)

    def getValidatorInstance(self):
        print(f'##called getValidatorInstance()')
        return IndyConnector(self.socketio, request.sid, self.indy_dic)

    # for INDY
    def init_indy(self):
        """ Initialization process for INDY """
        print(f'##called init_indy()')
        self.run_coroutine(self.open_pool)
        time.sleep(1)

    # for INDY
    async def open_pool(self):
        # open the pool and get handler
        # self.pool_handle = await pool.open_pool_ledger('pool1', None)
        self.indy_dic['pool_handle'] = await pool.open_pool_ledger('pool1', None)
        print(f"##{self.moduleName} set pool_handle.")

    # for INDY
    def run_coroutine(self, coroutine, loop=None):
        print(f'##called run_coroutine()')
        if loop is None:
            loop = asyncio.get_event_loop()
        loop.run_until_complete(coroutine())

