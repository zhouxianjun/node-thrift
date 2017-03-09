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
const queryString = require('querystring');
const merge = require('merge');
module.exports = class AbstractInvoker extends require('./Invoker') {
    constructor(address, interfaceClass, interfaceName) {
        super();
        this.params = merge({
            address: address,
            interface: interfaceClass,
            interfaceName: interfaceName
        }, queryString.parse(address));
    }

    get address(){return this.params.address;}

    get host(){return this.params.host;}

    get port(){return this.params.port;}

    get weight(){return this.params.weight;}

    get startTime(){return this.params.start;}

    get warmup(){return this.params.warmup;}

    get interface(){return this.params.interface;}

    get interfaceName(){return this.params.interfaceName;}
};