/**
 * Created by Alone on 2017/3/9.
 */
'use strict';
const nodeThrift = require('../index');
let client = nodeThrift.zk.createClient('127.0.0.1:2181');
client.connect();
let server = new nodeThrift.ServerRegister(client);
server.load('./service/');