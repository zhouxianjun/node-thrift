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
const Pool = require('generic-pool');
const logger = require('tracer-logger');
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

    get connection() {
        return thrift.createConnection(this.host, this.port, {
            transport: this.config.transport,
            protocol: this.config.protocol
        });
    }

    create() {
        let connection = this.connection;
        connection.on('error', err => {logger.error(`client error `, err);});
        let processor = new thrift.Multiplexer();
        return processor.createClient(this.interfaceName, this.interface, connection);
    }
    async invoker(method, ...args) {
        logger.debug(`${this.interfaceName}:${this.address} invoker:${method} args: ${util.inspect(args)}`);
        logger.debug(`pool.max = ${this.pool.max}`);
        logger.debug(`pool.size = ${this.pool.size}`);
        logger.debug(`pool.available = ${this.pool.available}`);
        let client = await this.pool.acquire(0);
        try {
            return await util.promisify(client[method]).apply(client, args);
        } finally {
            this.pool.release(client);
        }
    }
    destroy() {
        this.pool.drain().then(() => {this.pool.clear();});
    }
};