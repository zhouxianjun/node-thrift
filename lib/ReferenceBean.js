/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 17:31
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
const path = require('path');
const assert = require('assert');
const queryString = require('querystring');
const util = require('util');
const logger = require('tracer-logger');
const Utils = require('./util/Utils');
const instance = Symbol();
module.exports = class ReferenceBean {
    constructor(symbol, loadBalance, invokerFactory) {
        if (!symbol || symbol !== instance)
            throw new ReferenceError('Cannot be instantiated, please use static instance function');
        this['loadBalance'] = loadBalance;
        this['invokerFactory'] = invokerFactory;
        this['methodStatus'] = new Map();
        this['providerCache'] = new Map();
        this.init();
    }
    static instance(loadBalance, invokerFactory) {
        if (!this._instance) {
            this._instance = Reflect.construct(this, [instance, loadBalance, invokerFactory]);
        }
        return this._instance;
    }

    init() {
        let prototype = Reflect.getPrototypeOf(this);
        let keys = Reflect.ownKeys(prototype);
        for (let method of keys) {
            let descriptor = Reflect.getOwnPropertyDescriptor(prototype, method);
            if (method != 'constructor' && !descriptor.get && !descriptor.set && typeof descriptor.value == 'function') {
                Reflect.set(prototype, method, new Proxy(prototype[method], {
                    apply: this.proxyMethod
                }));
                this.methodStatus.set(method, false);
            }
        }
    }

    get service() {
        for (let key of Reflect.ownKeys(require.cache)) {
            let module = require.cache[key];
            if (module.exports == this.type) {
                return key.substring(key.lastIndexOf(path.sep) + 1, key.length - 3);
            }
        }
    }
    get version() {
        return '1.0.0'
    }
    get type() {
        throw new ReferenceError('type is null');
    }

    set providers(urls) {
        logger.debug(`${this.service}-${this.version} providers changed: \n${urls.join('\n')}`);
        let setUrls = new Set(urls);
        for (let [address, invoker] of this.providerCache) {
            if (!setUrls.has(address)) {
                invoker.destroy();
                this.providerCache.delete(address);
                logger.info(`zookeeper unsubscribe ${this.service}-${this.version} for ${address}`);
            }
        }

        for (let address of setUrls) {
            if (!this.providerCache.has(address)) {
                this.providerCache.set(address, this.invokerFactory.newInvoker(this.service, address, this.type));
                logger.info(`zookeeper subscribe ${this.service}-${this.version} for ${address}`);
            }
        }
    }

    set routers(urls) {

    }

    set configurators(urls) {

    }

    async proxyMethod(target, that, args) {
        if (!Reflect.has(that.type.Client.prototype, target.name))
            return Reflect.apply(target, that, args);

        let invoker = that.loadBalance.selector(that.providerCache.values(), target.name);
        assert.ok(invoker, `service:${that.service} version:${that.version} is not server online`);
        let params = [target.name];
        [...args].forEach(arg => {
            params.push(arg)
        });
        return await Reflect.apply(invoker.invoker, invoker, [target.name].concat(args));
    }
};

let haveProvider = (providers, provider) => {
    for (let p of providers) {
        if (`${provider.host}:${provider.port}` === `${p.host}:${p.port}`) {
            return p;
        }
    }
    return false;
};