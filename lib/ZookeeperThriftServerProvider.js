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
const logger = require('tracer-logger');
const Utils = require('./util/Utils');
const ReferenceBean = require('./ReferenceBean');
module.exports = class ZookeeperThriftServerProvider {
    constructor(client, config = {}) {
        this['client'] = client;
        this['config'] = merge(config, {
            root: 'rpc',
            namespace: 'thrift'
        });
        this['root'] = `/${this.config.root}/${this.config.namespace}`;
        this['cache'] = new Map();
        this['address'] = new Map();
    }

    async load(root, filter) {
        walk.walkSync(root, {
            followLinks: true,
            filters: filter || ['node_modules'],
            listeners: {
                file: async (root, fileStat, next) => {
                    try {
                        let result = Utils.load(root, fileStat);
                        let service = result.object;
                        if (service && Reflect.getPrototypeOf(service) == ReferenceBean) {
                            let bean = service.instance();
                            let children = await this.listener(bean);
                            this.notify(bean, children);
                        }
                    } catch (err) {
                        logger.error('加载thrift:%s:%s异常.', fileStat.name, root, err);
                    }
                    next();
                },
                errors: (root, nodeStatsArray, next) => {
                    nodeStatsArray.forEach(n => {
                        logger.error("[ERROR] " + n);
                    });
                    next();
                },
                end: () => {
                    logger.info('文件thrift加载完成!');
                }
            }
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
        logger.info(`provider service ${children}`);
        this.notify(bean, children);
    }

    notify(bean, children) {
        if (Array.isArray(children)) {
            for (let child of children) {
                logger.debug(`notify path: ${child}`);
                let keySymbol = Symbol.for(`${bean.service}:${bean.version}`);
                logger.info(`zookeeper subscribe ${Symbol.keyFor(keySymbol)}-${child}`);
                if (!this.address.has(keySymbol))
                    this.address.set(keySymbol, new Set());
                this.address.get(keySymbol).add(child);
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
};