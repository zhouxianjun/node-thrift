/**
 * Created by Alone on 2017/3/8.
 */
'use strict';
const V = require('../lib/ZookeeperThriftServerProvider');
let v = new V();
v.on('ready', () => {
    console.log('ok');
});
v.load();