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
module.exports = class extends require('./InvokerFactory') {
    constructor(transportClass, protocolClass, maxActive = 100, idleTime = 180000, timeOut, timeOutInterval) {
        super();
        this.$prop = merge(this.$prop || {}, {
            transportClass: null,
            protocolClass: null,
            maxActive: null,
            idleTime: null
        });
        this.$prop.transportClass = transportClass;
        this.$prop.protocolClass = protocolClass;
        this.$prop.maxActive = maxActive;
        this.$prop.idleTime = idleTime;
        this.$prop.timeOut = timeOut;
        this.$prop.timeOutInterval = timeOutInterval;
    }
    set transportClass(transportClass) {
        this.$prop.transportClass = transportClass;
    }
    set protocolClass(protocolClass) {
        this.$prop.protocolClass = protocolClass;
    }
    set maxActive(maxActive) {
        this.$prop.maxActive = maxActive;
    }
    set idleTime(idleTime) {
        this.$prop.idleTime = idleTime;
    }
    newInvoker(service, address, type) {
        return new PoolInvoker(service, address, type, this.$prop.transportClass,
            this.$prop.protocolClass, this.$prop.maxActive, this.$prop.idleTime,
            this.$prop.timeOut, this.$prop.timeOutInterval);
    }
};