/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 14:30
 *                 _ooOoo_
 *                o8888888o
 *                88" . "88
 *                (| -_- |)
 *                O\  =  /O
 *             ____/`---'\____
 *           .'  \\|     |//  `.
 *           /  \\|||  :  |||//  \
 *           /  _||||| -:- |||||-  \
 *           |   | \\\  -  /// |   |
 *           | \_|  ''\---/''  |   |
 *           \  .-\__  `-`  ___/-. /
 *         ___`. .'  /--.--\  `. . __
 *      ."" '<  `.___\_<|>_/___.'  >'"".
 *     | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *     \  \ `-.   \_ __\ /__ _/   .-` /  /
 *======`-.____`-.___\_____/___.-`____.-'======
 *                   `=---='
 *^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           佛祖保佑       永无BUG
 */
'use strict';
const merge = require('merge');
const PoolInvoker = require('../PoolInvoker');
module.exports = class PoolInvokerFactory extends require('./InvokerFactory') {
    /**
     * config
     * `maxActive` - pool
     * `idleTime` - pool
     * `transport` - thrift
     * `protocol` - thrift
     * `timeOut` - pool
     * @param config
     */
    constructor(config) {
        super();
        this['config'] = merge(config, {
            maxActive: 100,
            idleTime: 180000
        });
    }
    set transport(transport) {
        this.config.transport = transport;
    }
    set protocol(protocol) {
        this.config.protocol = protocol;
    }
    set maxActive(maxActive) {
        this.config.maxActive = maxActive;
    }
    set idleTime(idleTime) {
        this.config.idleTime = idleTime;
    }
    newInvoker(service, address, type) {
        return new PoolInvoker(address, type, service, this.config);
    }
};