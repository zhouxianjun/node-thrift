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
        for (let [provider, invoker] of providerMap) {
            for (let configurator of configurators) {
                let config = QS.parse(configurator);
                if (config.disabled) {
                    let addressArray = config.disabled.split(',');
                    let p = QS.parse(provider);
                    if (addressArray.includes(`${p.host}:${p.port}`)) {
                        providerMap.delete(provider);
                    }
                }
            }
        }
    }
};