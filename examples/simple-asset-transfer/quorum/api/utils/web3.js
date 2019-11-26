const Web3 = require('web3');
const config = require('../config/config');

const rpcApiHost = `http://${config.web3.host[`${process.platform}`]}:${config.web3.rpcPort}`;
const web3Provider = new Web3.providers.HttpProvider(rpcApiHost);
const web3 = new Web3(web3Provider);
web3.eth.defaultAccount = config.web3.ethKey;
module.exports = web3;
