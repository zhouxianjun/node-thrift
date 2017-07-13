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
const ReferenceBean = require('../test/client/DemoService');
provider.load('./client/');
provider.on('ready', () => {
    console.log('ready.....');
    let i = 0;
    let demoService = ReferenceBean.instance();
    setInterval(async () => {
        i++;
        (async n => {
            try {
                let result = await demoService.say(`Alone-${n}`);
                console.log(`result-${n}`, result);
            } catch (err) {
                console.log(err.stack);
            }
        })(i);
    }, 3000);
});
