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
const QS = require('querystring');
const util = require('util');
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
const DisabledFilter = require('./filter/BasicFilter');
const FILTER_METHOD = ['seqid', 'new_seqid'];
const LOADED = Symbol('loaded');
const DYNAMIC = Symbol('dynamic');
const CACHE_INSTANCE = new Map();
const ServerProvider = class ZookeeperThriftServerProvider extends require('events') {
    constructor(client, config = {}) {
        super();
        this['client'] = client;
        this['config'] = Object.assign({
            host: ip.address() || '127.0.0.1',
            root: 'rpc',
            namespace: 'thrift',
            router: Router,
            filters: []
        }, config);
        if (!Array.isArray(this.config.filters)) {
            this.config.filters = [];
        }
        this.config.filters.push(new DisabledFilter());
        this['root'] = `/${this.config.root}/${this.config.namespace}`;
        this['cache'] = new Map();
        this['address'] = new Map();
        this[LOADED] = false;
        this[DYNAMIC] = new Map();

        assert.ok(this.config.invoker instanceof InvokerFactory, 'invoker must be InvokerFactory');
        assert.ok(this.config.loadBalance instanceof LoadBalance, 'loadBalance must be LoadBalance');
        assert(this.config.router === Router, 'router must be Router');
    }

    loadType(root, filter) {
        return this.scanning(root, true, filter);
    }

    static instance(type) {
        return CACHE_INSTANCE.get(type);
    }

    scanning(root, dynamic = false, filter = ['node_modules']) {
        if (this[LOADED]) {
            logger.warn('It has been loaded');
            return;
        }
        let watch = walk.walk(root, {
            followLinks: true,
            filters: filter
        });
        this[LOADED] = true;
        return new Promise(ok => {
            watch.on('file', async (root, fileStat, next) => {
                try {
                    let result = Utils.load(root, fileStat);
                    let service = result.object;
                    await this.loadObject(service, dynamic ? result.basename : false);
                } catch (err) {
                    logger.error('加载ReferenceBean:%s:%s异常.', fileStat.name, root, err);
                } finally {
                    next();
                }
            });
            watch.on('end', () => {
                this.emit('ready');
                ok();
            });
        });
    }

    load(root, filter) {
        return this.scanning(root, false, filter);
    }

    async loadObject(service, basename) {
        let dynamic = !!basename;
        if (dynamic && (typeof service['Processor'] !== 'function' || typeof service['Client'] !== 'function')) {
            return;
        }
        if (!dynamic && (!service || Reflect.getPrototypeOf(service) !== ReferenceBean)) {
            return;
        }

        let router = Reflect.construct(this.config.router, [this.config.host]);
        let obj;
        if (dynamic) {
            let script = `class ${basename} extends ReferenceBean {\n\tget type() {\n\t\treturn service;\n\t}`;
            let keys = Reflect.ownKeys(service['Client'].prototype);
            for (let key of keys) {
                if (FILTER_METHOD.includes(key) || key.startsWith('send_') || key.startsWith('recv_')) {
                    continue;
                }
                script = script.concat(`\n\t${key}(){}`);
            }
            script = script.concat('\n}');
            logger.debug(`dynamic object: \n${script}`);
            obj = eval(script);
            this[DYNAMIC].set(service, obj);
        } else {
            obj = service;
        }
        let bean = obj.instance(this.config, router);
        await this.register(bean);
        bean.providers = await this.listener(bean, 'providers');
        bean.routers = await this.listener(bean, 'routers');
        bean.configurators = await this.listener(bean, 'configurators');
        CACHE_INSTANCE.set(bean.type, bean);
    }

    dynamic(type) {
        return this[DYNAMIC].get(type);
    }

    async listener(bean, type) {
        await util.promisify(this.client.mkdirp).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/${type}`, null]);
        return await util.promisify(this.client.getChildren).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/${type}`, async () => {
            await this.watcher(bean, type);
        }]);
    }

    async watcher(bean, type) {
        let children = await this.listener(bean, type);
        if (Array.isArray(children)) {
            bean[type] = children;
        }
    }

    async register(bean) {
        let address = {
            host: this.config.host,
            start: new Date().getTime(),
            methods: Utils.getMethods(Reflect.getPrototypeOf(bean)).join(),
            attr: bean.attr || '',
            pid: process.pid
        };
        await util.promisify(this.client.mkdirp).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/consumers`, null]);
        await util.promisify(this.client.create).apply(this.client, [`${this.root}/${bean.service}/${bean.version}/consumers/${QS.stringify(address, null, null, {encodeURIComponent: (str) => {return str;}})}`, null, zookeeper.CreateMode.EPHEMERAL]);
    }
};
module.exports = ServerProvider;