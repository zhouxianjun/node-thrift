/**
 * Created by Alone on 2017/3/9.
 */
'use strict';
const nodeThrift = require('../index');
let client = nodeThrift.zk.createClient('127.0.0.1:2181');
client.connect();
let serverA = new nodeThrift.ServerRegister(client);
serverA.on('ready', () => {
    console.log('serverA stared...');
});
serverA.load('./service/');

let serverB = new nodeThrift.ServerRegister(client, {
    port: 8090
});
serverB.on('ready', () => {
    console.log('serverB stared...');
});
serverB.load('./service/');

process.on('uncaughtException', (err) => {
    console.log(err.stack);
});