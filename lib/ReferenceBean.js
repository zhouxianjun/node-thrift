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
const QS = require('querystring');
const util = require('util');
const logger = require('tracer-logger');
const Utils = require('./util/Utils');
const LoadBalance = require('./loadbalance/LoadBalance');
const InvokerFactory = require('./invoker/factory/InvokerFactory');
const Router = require('./router/Router');
const Filter = require('./filter/Filter');
const instance = Symbol();
module.exports = class ReferenceBean {
    constructor(symbol, loadBalance, invokerFactory, router, filters) {
        if (!symbol || symbol !== instance)
            throw new ReferenceError('Cannot be instantiated, please use static instance function');
        assert(loadBalance instanceof LoadBalance, 'loadBalance must be LoadBalance');
        assert(invokerFactory instanceof InvokerFactory, 'invokerFactory must be InvokerFactory');
        assert(router instanceof Router, 'router must be Router');
        assert(filters || (filters && Array.isArray(filters)), 'filters must be Array');
        if (filters && filters.length) {
            for (let filter of filters) {
                assert(filter instanceof Filter, 'filter must be Filter');
            }
        }
        this['loadBalance'] = loadBalance;
        this['invokerFactory'] = invokerFactory;
        this['router'] = router;
        this['filters'] = filters;
        this['providerCache'] = new Map();
        this['routerCache'] = new Set();
        this['configuratorCache'] = new Set();
        this.init();
    }
    static instance(loadBalance, invokerFactory, router, filters) {
        if (!this._instance) {
            this._instance = Reflect.construct(this, [instance, loadBalance, invokerFactory, router, filters]);
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
                    apply: ReferenceBean.proxyMethod
                }));
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

    updateProviders(providers) {
        this.providers = providers;
    }

    set routers(routers) {
        this.router.updateRouters(routers);
        this.routerCache.clear();
        this.routerCache = new Set(routers);
    }

    updateRouters(routers) {
        this.routers = routers;
    }

    set configurators(configurators) {
        this.configuratorCache.clear();
        this.configuratorCache = new Set(configurators);
    }

    updateConfigurators(configurators) {
        this.configurators = configurators;
    }

    checkMethod(method) {
        let result = new Map();
        for (let [provider, invoker] of this.providerCache) {
            let p = QS.parse(provider);
            if (p.methods.split(',').includes(method)) {
                result.set(provider, invoker);
            }
        }

        if (this.providerCache.size > 0 && result.size <= 0) {
            throw ReferenceError(`service:${this.service} version:${this.version} method: ${method} not found`);
        }
        return result;
    }

    static async proxyMethod(target, that, args) {
        if (!Reflect.has(that.type.Client.prototype, target.name)) {
            logger.debug(`service:${that.service} version:${that.version} method: ${target.name} is local`);
            return Reflect.apply(target, that, args);
        }

        // 检查生产者是否含有当前函数
        let checkMethodResult = that.checkMethod(target.name);
        // 路由匹配
        let routerResult = that.router.match(target.name, checkMethodResult);
        let ctx = {
            method: target.name,
            service: that.service,
            version: that.version
        };
        // 执行过滤器选择生产者
        let selector = ReferenceBean.filterMethod(that.filters, 'selector', true, ctx, routerResult, that.routerCache, that.configuratorCache, args);
        if (selector === false) {
            return null;
        }
        // 负载均衡选举
        let invoker = that.loadBalance.selector(routerResult.values(), target.name);
        assert.ok(invoker, `service:${that.service} version:${that.version} is not server online`);
        // 调用过滤器before 返回 不等于 true则认为不往下执行 直接返回
        let before = await ReferenceBean.filterMethod(that.filters, 'before', true, ctx, invoker, args);
        if (before !== true) {
            ReferenceBean.filterMethod(that.filters, 'after', true, ctx, before, args);
            return before;
        }
        // 远程调用
        let result = await Reflect.apply(invoker.invoker, invoker, [target.name].concat(args));
        // 执行过滤器 after
        ReferenceBean.filterMethod(that.filters, 'after', false, ctx, result, args);
        return result;
    }

    static filterMethod(filters, method, isResult, ...args) {
        if (filters && filters.length) {
            for (let filter of filters) {
                let result = Reflect.apply(filter[method], filter, args);
                if (isResult) {
                    return result;
                }
            }
        }
    }
};