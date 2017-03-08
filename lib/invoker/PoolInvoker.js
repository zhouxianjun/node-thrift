/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:34
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
const thrift = require('thrift');
const Q = require('q');
const domain = require('domain');
const merge = require('merge');
const Pool = require('generic-pool');
const logger = require('tracer-logger');
const thunkify = require('thunkify');
const util = require('util');
module.exports = class PoolInvoker extends require('./AbstractInvoker') {
    constructor(address, interfaceClass, interfaceName, config) {
        super(address, interfaceClass, interfaceName);
        this['config'] = config;
        this['pool'] = new Pool.createPool({
            create: () => {
                return Promise.resolve(this.create());
            },
            destroy: client => {
                client.output && client.output.close();
                client.input && client.input.close();
                return Promise.resolve();
            }
        }, {
            acquireTimeoutMillis: this.config.timeOut,
            max: this.config.maxActive,
            idleTimeoutMillis: this.config.idleTime
        });
    }
    create() {
        let connection = thrift.createConnection(this.host, this.port, {
            transport: this.transport,
            protocol: this.protocol
        });
        let processor = new thrift.Multiplexer();
        return processor.createClient(this.interfaceName, this.interface, connection);
    }
    async invoker(method, ...args) {
        logger.debug(`${this.interfaceName}:${this.address} invoker:${method} args: ${util.inspect(args)}`);
        logger.debug(`pool.max = ${this.pool.max}`);
        logger.debug(`pool.size = ${this.pool.size}`);
        logger.debug(`pool.available = ${this.pool.available}`);
        let client = await this.pool.acquire();
        await co(function *() {});
        this.pool.acquire().then(client => {
            Reflect.apply(client[method], client, args);
        });
        this.$prop.pool.acquire((err, client) => {
            if (err) {
                logger.error('get %s:%s pool error', this.$prop.service, this.$prop.address, err);
                return;
            }
            try {
                if (this.$prop.timeOut) {
                    client._createTime = new Date().getTime();
                    client._defer = defer;
                }
                args.push((err, result) => {
                    this.$prop.pool.release(client);
                    let d = domain.create();
                    d.on('error', err => {logger.error('invoker service:%s address:%s method: %s error', this.$prop.service, this.$prop.address, method, err)});
                    if (err) {
                        d.run(() => {defer.reject(err);});
                        return;
                    }
                    d.run(() => {defer.resolve(result);});
                });
                Reflect.apply(client[method], client, args);
            } catch (err) {
                this.$prop.pool.release(client);
                defer.reject(err);
            }
        }, 0);
        return defer.promise;
    }
    destroy() {
        this.$prop.pool.drain(() => {this.$prop.pool.destroyAllNow(null);});
    }
};