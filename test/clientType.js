/**
 * Created by Alone on 2017/3/9.
 */
'use strict';
const thrift = require('thrift');
const trc = require('../index');
const HelloFilter = require('./HelloFilter');
let client = trc.zk.createClient('127.0.0.1:2181');
client.connect();
let provider = new trc.ServerProvider(client, {
    invoker: new trc.invoker.factory.PoolInvokerFactory({
        transport: thrift.TFramedTransport,
        protocol: thrift.TCompactProtocol
    }),
    loadBalance: new trc.loadBalance.RoundRobinLoadBalance(),
    filters: [new HelloFilter()]
});
provider.loadType('./thrift/');
provider.on('ready', () => {
    console.log('ready.....');
    let type = require('./thrift/Demo');
    let demoService = trc.ServerProvider.instance(type);
    let dynamic = provider.dynamic(type);
    console.log(dynamic);
    setInterval(() => {
        demoService.say('Alone').then(result => {
            console.log('result', result);
        }).catch(err => {
            console.log(err.stack);
        });
    }, 2000);
});
