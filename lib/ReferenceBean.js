/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 17:31
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
const path = require('path');
const assert = require('assert');
module.exports = class ReferenceBean {
    constructor(provider, loadBalance) {
        let keys = Reflect.ownKeys(new.target.prototype);
        for (let method of keys) {
            let descriptor = Reflect.getOwnPropertyDescriptor(new.target.prototype, method);
            if (method != 'constructor' && !descriptor.get && !descriptor.set && typeof descriptor.value == 'function') {
                Reflect.set(new.target.prototype, method, new Proxy(new.target.prototype[method], {
                    async apply(target, that, args) {
                        if (!Reflect.has(that.type.Client.prototype, target.name))
                            return Reflect.apply(target, that, args);
                        let address = provider.allServerAddressList(that.service, that.version, that.type);
                        let invoker = loadBalance.selector(address, target.name);
                        assert.ok(invoker, `service:${that.service} version:${that.version} is not server online`);
                        let params = [target.name];
                        [...args].forEach(arg => {
                            params.push(arg)
                        });
                        return await Reflect.apply(invoker.invoker, invoker, [target.name].concat(args));
                    }
                }));
            }
        }
    }
    static instance(provider, loadBalance) {
        if (!this._instance) {
            this._instance = Reflect.construct(this, [provider, loadBalance]);
        }
        return this._instance;
    }
    get service() {
        for (let key of Reflect.ownKeys(require.cache)) {
            let module = require.cache[key];
            if (module.exports == this.type) {
                return key.substring(key.lastIndexOf(path.sep) + 1, key.length - 3);
            }
        }
    }
    get version() {
        return '1.0.0'
    }
    get type() {
        throw new ReferenceError('type is null');
    }
};