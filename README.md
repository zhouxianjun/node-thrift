
# 如何安装

[Node.js](http://nodejs.org).

npm install trc

---

## 如何使用

### Server:
```javascript
// 引用模块
const trc = require('trc');
// 创建ZK客户端 详情参考:https://github.com/alexguan/node-zookeeper-client
let client = trc.zk.createClient('127.0.0.1:2181');
client.connect();
// 创建服务注册
let server = new trc.ServerRegister(client);
// 监听初始化完成事件
server.on('ready', () => {
    console.log('server stared...');
});
// 加载目录，读取服务
server.load('./service/');
```

### Client
```javascript
const thrift = require('thrift');
// 引用模块
const trc = require('trc');
// 创建ZK客户端 详情参考:https://github.com/alexguan/node-zookeeper-client
let client = trc.zk.createClient('127.0.0.1:2181');
client.connect();
// 服务生产者
const ServerProvider = trc.ServerProvider;
let provider = new ServerProvider(client, {
    // 调用工厂
    invoker: new trc.invoker.factory.PoolInvokerFactory({
        transport: thrift.TFramedTransport,
        protocol: thrift.TCompactProtocol
    }),
    // 负载均衡
    loadBalance: new trc.loadBalance.RoundRobinLoadBalance(),
});
// 这里和往常一样加载需要的服务
const DemoService = require('../test/client/DemoService');
// 加载目录，读取需要监听的生产者
provider.load('./client/');
// 监听初始化完成事件
provider.on('ready', () => {
    console.log('ready.....');
    // 实例化需要的服务
    let demoService = DemoService.instance();
    // 每隔2秒调用服务
    setInterval(() => {
        demoService.say('Alone').then(result => {
            console.log('result', result);
        }).catch(err => {
            console.log(err.stack);
        });
    }, 2000);
});
```

## API
稍后补充...