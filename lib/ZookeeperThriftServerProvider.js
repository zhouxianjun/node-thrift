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
                        let bean = service.instance(this.config.loadBalance, this.config.invoker);
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
        return await pify(this.client.getChildren).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/providers`, async () => {
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
            bean.providers = children;
        }
    }
};