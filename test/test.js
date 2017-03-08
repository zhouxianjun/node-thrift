/**
 * Created by Alone on 2017/3/8.
 */
'use strict';
const nodeThrift = require('../index');
let client = nodeThrift.zk.createClient('127.0.0.1:2181');
client.connect();
let server = new nodeThrift.ServerRegister(client);
server.load('./service/');

/*const co = require('co');
const thunkify = require('thunkify');
let gen = function *(name) {
    console.log(name);
    return yield thunkify(gen2).apply(gen2, [name]);
};
let gen2 = (name, cb) => {
    console.log('bbb');
    cb(null, 'ok');
};
let th = (fn) => {
    console.log(2);
    return fn();
};
let t = () => {
    th(async() => {
        try {
            let result = await co(gen.bind(co), 'Alone');
            console.log(result);
        } catch (err) {
            console.log(err);
        }
    });
};
t();*/
