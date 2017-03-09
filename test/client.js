/**
 * Created by Alone on 2017/3/9.
 */
'use strict';
const thrift = require('thrift');
const nodeThrift = require('../index');
let client = nodeThrift.zk.createClient('127.0.0.1:2181');
client.connect();
const ServerProvider = nodeThrift.ServerProvider;
let provider = new ServerProvider(client, {
    invoker: new nodeThrift.invoker.factory.PoolInvokerFactory({
        transport: thrift.TFramedTransport,
        protocol: thrift.TCompactProtocol
    }),
    loadBalance: new nodeThrift.loadBalance.RoundRobinLoadBalance()
});
const ReferenceBean = require('../test/client/DemoService');
provider.load('./client/');
provider.on('ready', () => {
    console.log('ready.....');
    let demoService = ReferenceBean.instance();
    setInterval(() => {
        demoService.say('Alone').then(result => {
            console.log('result', result);
        }).catch(err => {
            console.log(err.stack);
        });
    }, 2000);
});