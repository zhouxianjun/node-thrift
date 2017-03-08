/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:37
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
module.exports = class AbstractInvoker extends require('./Invoker') {
    constructor(address, interfaceClass, interfaceName) {
        super();
        let hostname = address.split(":");
        this['weight'] = hostname.length >= 3 ? parseInt(hostname[2]) : 100;
        this['startTime'] = hostname.length >= 4 ? parseInt(hostname[3]) : 0;
        this['warmup'] = hostname.length >= 5 ? parseInt(hostname[4]) : 0;
        this['host'] = hostname[0];
        this['port'] = parseInt(hostname[1]);
        this['interface'] = interfaceClass;
        this['interfaceName'] = interfaceName;
        this['address'] = address;
    }
};