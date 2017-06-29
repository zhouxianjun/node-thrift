/**
 * Created with JetBrains Idea.
 * User: Along(Gary)
 * Date: 3/11/17
 * Time: 11:17 AM
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
const minimatch = require('minimatch');
const QS = require('querystring');
const Utils = require('../util/Utils');
// method=aa&method=bb&consumeHost=aa&consumeHost=bb&providerAddress=192.*&providerAddress=127.*
const Router = class Router {
    constructor(host, routers) {
        this['host'] = host;
        this['routers'] = Utils.urlParse(routers);
    }

    update(routers) {
        this.routers = Utils.urlParse(routers);
    }

    match(method, providers) {
        if (this.routers && this.routers.size) {
            let result = new Map();
            for (let router of this.routers) {
                let matchMethod = Router.matchRouter(router.method || [], method);
                let matchConsumerHost = Router.matchRouter(router.consumeHost || [], this.host);
                if (matchMethod && matchConsumerHost) {
                    Router.matchProviders(result, providers, router.providerAddress || []);
                }
            }
            return result;
        }
        return providers;
    }

    static matchRouter(router, str) {
        router = Array.isArray(router) ? router : router.split(',');
        if (router.length === 0) return true;
        for (let m of router) {
            if (minimatch(str, m)) {
                return true;
            }
        }
        return false;
    }

    static matchProviders(result, providers, providerAddress) {
        if (!providers || providers.size === 0) return providers;
        for (let [provider, invoker] of providers) {
            let p = QS.parse(provider);
            if (Router.matchRouter(providerAddress, `${p.host}:${p.port}`)) {
                result.set(provider, invoker);
            }
        }
    }
};
module.exports = Router;