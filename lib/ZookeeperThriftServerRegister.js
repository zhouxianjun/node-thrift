/**
 * Created by Alone on 2017/3/6.
 */
'use strict';
const path = require('path');
const walk = require('walk');
const logger = require('tracer-logger');
const util = require('util');
const thrift = require('thrift');
const zookeeper = require('node-zookeeper-client');
const QS = require('querystring');
const ip = require('ip');
const Utils = require('./util/Utils');
const ServerRegister = class ZookeeperThriftServerRegister extends require('events') {
    constructor(client, config = {}) {
        super();
        this['config'] = Object.assign({
            host: ip.address() || '127.0.0.1',
            port: 9090,
            warmup: 10 * 60 * 10000,
            root: 'rpc',
            namespace: 'thrift',
            transport: thrift.TFramedTransport,
            protocol: thrift.TCompactProtocol
        }, config);
        this['client'] = client;
        this['root'] = `/${this.config.root}/${this.config.namespace}`;
        this['processor'] = new thrift.MultiplexedProcessor();
        this['server'] = thrift.createMultiplexServer(this.processor, this.config);

        this.server.listen(this.config.port);
        logger.info(`thrift server listen to ${this.config.host}:${this.config.port}`);
        this.server.on('error', err => {logger.error(`server error`, err)});
    }

    async register(service, version, address) {
        let servicePath = `${this.root}/${service}/${version}/providers`;
        await util.promisify(this.client.mkdirp).apply(this.client, [servicePath, null]);
        let existsKey = await util.promisify(this.client.exists).apply(this.client, [`${servicePath}/${address}`, null]);
        if (!existsKey) {
            let createPath = await util.promisify(this.client.create).apply(this.client, [`${servicePath}/${address}`, null, zookeeper.CreateMode.EPHEMERAL]);
            logger.info(`register path:${createPath} for zookeeper.`);
        }
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
                    if (service && service.thrift && service.version) {
                        let address = {
                            host: this.config.host,
                            port: this.config.port,
                            weight: service.weight || 100,
                            start: new Date().getTime(),
                            warmup: this.config.warmup,
                            methods: Utils.getMethods(service.prototype).join(),
                            attr: service.attr || '',
                            pid: process.pid
                        };
                        let name = service.name || result.name.substring(0, result.name.length - '.js'.length);
                        await this.register(name, service.version, QS.stringify(address, null, null, {encodeURIComponent: (str) => {return str;}}));
                        this.processor.registerProcessor(name, new service.thrift.Processor(Reflect.construct(service, [])));
                        logger.info(`register processor ${name} - ${path.resolve(__dirname, result.path)}`);
                    }
                } catch (err) {
                    logger.error('加载thrift:%s:%s异常.', fileStat.name, root, err);
                } finally {
                    next();
                }
            })();
        });
        watch.on('end', () => {this.emit('ready');});
    }
};
module.exports = ServerRegister;