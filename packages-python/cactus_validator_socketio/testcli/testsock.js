// NOTE: Run pip install socket.io-client.
const io = require('socket.io-client');
const url = "http://localhost:8000";
const socket = io(url, {
    //transports: [ 'websocket', 'polling']
});

socket.on('connect', () => {
    console.log('connect');
    console.log(socket.id);
    const transport = socket.io.engine.transport.name;
    console.log(transport);
    //socket.emit('mymessage', 'hoge');
});

socket.on('mymessage', () => {
    console.log('received mymessage');
});

socket.on('response', (respData) => {
    console.log('received response from Validator');
    // console.log(`##response : ${JSON.stringify(respData)}`);
    const respObj = JSON.parse(respData);
    console.log(`response(Obj) is ${JSON.stringify(respObj)}`);
});

// socket.emit('nop');
socket.emit('startMonitor');

socket.emit('test-event');

setTimeout(() => {
    console.log('call request2!');

    args_schema = "{\"reqId\":1624420883330729255,\"identifier\":\"8TAyhNonMhWGNRiRHRhs5C\",\"operation\":{\"type\":\"107\",\"dest\":\"HxuDdJmNSxboTCwLf8FN1j\",\"data\":{\"name\":\"Job-Certificate\",\"version\":\"0.2\"}},\"protocolVersion\":2}";
    args_credential_definition = "{\"reqId\":1624437652192258330,\"identifier\":\"JbYRZdQeSkjxYKW61NReHN\",\"operation\":{\"type\":\"108\",\"ref\":14,\"signature_type\":\"CL\",\"origin\":\"DnZczRFF5iyiYgLMeFdHpk\",\"tag\":\"TAG1\"},\"protocolVersion\":2}";

    // Call Validator
    const requestData = {
        contract: {"channelName": "mychannel", "contractName": "indysomething"},
        method: {type: "evaluateTransaction", command: "indy_ledger_submit_request"},
        args: args_credential_definition,
        reqId: "reqID_test"
    };

    socket.emit('request2', requestData);

},  2000);


setTimeout(() => {
    console.log('call nop!');
    socket.emit('nop');
},  2000);
