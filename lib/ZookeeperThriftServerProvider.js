/**
 * Created with JetBrains Idea.
 * User: Along(Gary)
 * Date: 3/8/17
 * Time: 7:32 PM
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
const pify = require('pify');
const zookeeper = require('node-zookeeper-client');
const walk = require('walk');
const assert = require('assert');
const logger = require('tracer-logger');
const Utils = require('./util/Utils');
const ReferenceBean = require('./ReferenceBean');
const InvokerFactory = require('./invoker/factory/InvokerFactory');
const LoadBalance = require('./loadbalance/LoadBalance');
module.exports = class ZookeeperThriftServerProvider extends require('events') {
    constructor(client, config = {}) {
        super();
        this['client'] = client;
        this['config'] = merge({
            root: 'rpc',
            namespace: 'thrift'
        }, config);
        this['root'] = `/${this.config.root}/${this.config.namespace}`;
        this['cache'] = new Map();
        this['address'] = new Map();

        assert.ok(config.invoker instanceof InvokerFactory, 'invoker must be InvokerFactory');
        assert.ok(config.loadBalance instanceof LoadBalance, 'loadBalance must be LoadBalance');
    }

    load(root, filter) {
        let watch = walk.walk(root, {
            followLinks: true,
            filters: filter || ['node_modules']
        });
        watch.on('file', (root, fileStat, next) => {
            (async () => {
                try {
                    let result = Utils.load(root, fileStat);
                    let service = result.object;
                    if (service && Reflect.getPrototypeOf(service) == ReferenceBean) {
                        let bean = service.instance(this, this.config.loadBalance);
                        let children = await this.listener(bean);
                        this.notify(bean, children);
                    }
                } catch (err) {
                    logger.error('加载ReferenceBean:%s:%s异常.', fileStat.name, root, err);
                } finally {
                    next();
                }
            })();
        });
        watch.on('end', () => {
            this.emit('ready');
        });
    }

    async listener(bean) {
        await pify(this.client.mkdirp).apply(this.client, [`${this.root}/${bean.service}/${bean.version}`, null]);
        return await pify(this.client.getChildren).apply(this.client, [`${this.root}/${bean.service}/${bean.version}`, async () => {
            await this.watcher(bean);
        }]);
    }

    async watcher(bean) {
        let children = await this.listener(bean);
        logger.info(`provider ${bean.service}-${bean.version} service size ${children.length}`);
        this.notify(bean, children);
    }

    notify(bean, children) {
        if (Array.isArray(children)) {
            let keySymbol = Symbol.for(`${bean.service}:${bean.version}`);
            // 没有一个服务的时候 清空本地地址
            if (children.length == 0 && this.address.has(keySymbol)) {
                this.address.delete(keySymbol);
            }
            for (let child of children) {
                logger.debug(`notify ${bean.service}-${bean.version} server: ${child}`);
                if (!this.address.has(keySymbol)) {
                    this.address.set(keySymbol, new Set());
                }
                if (!this.address.get(keySymbol).has(child)) {
                    this.address.get(keySymbol).add(child);
                    logger.info(`zookeeper subscribe ${Symbol.keyFor(keySymbol)}-${child}`);
                }
            }

            //销毁不存在的服务
            for (let [key, value] of this.cache) {
                if (!this.address.has(key)) {
                    for (let invoker of value.values()){
                        logger.info(`zookeeper unsubscribe ${Symbol.keyFor(key)}-${invoker.address}`);
                        invoker.destroy();
                    }
                    this.cache.delete(key);
                    continue;
                }

                //销毁不存在的地址
                let addressList = this.address.get(key);
                for (let invoker of value.values()){
                    let available = invoker.isAvailable();
                    for (let invokerAddress of addressList.values()) {
                        if (invokerAddress != invoker.address) {
                            available = false;
                            break;
                        }
                    }
                    if (!available) {
                        logger.info(`zookeeper unsubscribe ${Symbol.keyFor(key)}-${invoker.address}`);
                        invoker.destroy();
                        value.delete(invoker);
                    }
                }
            }
        }
    }

    allServerAddressList(service, version, type) {
        let key = Symbol.for(`${service}:${version}`);
        let addressList = this.address.get(key);
        if (!addressList) return null;
        if (!this.cache.has(key)) {
            this.cache.set(key, new Set());
        }
        let cache = this.cache.get(key);
        for (let address of addressList.values()) {
            if (!this.hasForCache(cache, address)) {
                let value = this.config.invoker.newInvoker(service, address, type);
                cache.add(value);
            }
        }
        let addresses = cache;
        return addresses == null ? null : new Set(addresses);
    }

    hasForCache(cache, address) {
        for (let invoker of cache.values()) {
            if (invoker.address == address) {
                return true;
            }
        }
        return false;
    }
};