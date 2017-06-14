/**
 * Created with JetBrains Idea.
 * User: Along(Gary)
 * Date: 3/12/17
 * Time: 2:21 PM
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
const Filter = require('./Filter');
module.exports = class BasicFilter extends Filter {
    selector(ctx, providerMap, routers, configurators, args) {
        if (!configurators || configurators.length <= 0) {
            return;
        }

        for (let configurator of configurators) {
            let config = QS.parse(configurator);
            this.disableConsumer(ctx, config);
            if (this.shieldedConsumer(ctx, config) === false) return false;
            this.configProvider(providerMap, config);
            this.selectorProvider(providerMap, config);
        }
    }

    selectorProvider(providerMap, config) {
        if (config.disabled) {
            let addressArray = config.disabled.split(',');
            for (let [provider, invoker] of providerMap) {
                let p = QS.parse(provider);
                if (addressArray.includes(`${p.host}:${p.port}`)) {
                    providerMap.delete(provider);
                }
            }
        }
    }

    configProvider(providerMap, config) {
        if (config['override']) {
            for (let [provider, invoker] of providerMap) {
                let p = QS.parse(provider);
                if (config['override'] === `${p.host}:${p.port}`) {
                    Reflect.ownKeys(invoker.params).forEach(key => {
                        config[key] !== undefined && (invoker.params[key] = config[key]);
                    });
                }
            }
        }
    }

    disableConsumer(ctx, config) {
        if (config['consumer_disabled']) {
            let addressArray = config['consumer_disabled'].split(',');
            if (addressArray.includes(`${ctx.host}`)) {
                throw new Error(`consumer ${ctx.host} is disabled`);
            }
        }
    }

    shieldedConsumer(ctx, config) {
        if (config['shielded']) {
            let addressArray = config['shielded'].split(',');
            if (addressArray.includes(`${ctx.host}`)) {
                return false;
            }
        }
    }
};