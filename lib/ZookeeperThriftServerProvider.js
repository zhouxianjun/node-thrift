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
const ip = require('ip');
const ReferenceBean = require('./ReferenceBean');
const InvokerFactory = require('./invoker/factory/InvokerFactory');
const LoadBalance = require('./loadbalance/LoadBalance');
const Router = require('./router/Router');
const DisabledFilter = require('./filter/DisabledFilter');
module.exports = class ZookeeperThriftServerProvider extends require('events') {
    constructor(client, config = {}) {
        super();
        this['client'] = client;
        this['config'] = merge({
            host: ip.address() || '127.0.0.1',
            root: 'rpc',
            namespace: 'thrift',
            router: Router,
            filters: [new DisabledFilter()]
        }, config);
        this['root'] = `/${this.config.root}/${this.config.namespace}`;
        this['cache'] = new Map();
        this['address'] = new Map();

        assert.ok(this.config.invoker instanceof InvokerFactory, 'invoker must be InvokerFactory');
        assert.ok(this.config.loadBalance instanceof LoadBalance, 'loadBalance must be LoadBalance');
        assert(this.config.router == Router, 'router must be Router');
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
                        let router = Reflect.construct(this.config.router, [this.config.host]);
                        let bean = service.instance(this.config.loadBalance, this.config.invoker, router, this.config.filters);
                        let children = await this.listener(bean, 'providers');
                        await this.listener(bean, 'routers');
                        await this.listener(bean, 'configurators');
                        bean.providers = children;
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

    async listener(bean, type) {
        await pify(this.client.mkdirp).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/${type}`, null]);
        return await pify(this.client.getChildren).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/${type}`, async () => {
            await this.watcher(bean, type);
        }]);
    }

    async watcher(bean, type) {
        let children = await this.listener(bean, type);
        if (Array.isArray(children)) {
            bean[type] = children;
        }
    }
};