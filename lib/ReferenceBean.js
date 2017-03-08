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
const Q = require('q');
const path = require('path');
module.exports = class ReferenceBean {
    constructor(providerFactory, loadBalance) {
        Reflect.ownKeys(new.target.prototype).forEach(method => {
            let descriptor = Reflect.getOwnPropertyDescriptor(new.target.prototype, method);
            if (method != 'constructor' &&
                descriptor.get === undefined &&
                descriptor.set === undefined &&
                typeof descriptor.value == 'function') {
                Reflect.set(new.target.prototype, method, new Proxy(new.target.prototype[method], {
                    apply(target, that, args) {
                        if (!Reflect.has(that.type.Client.prototype, target.name))
                            return Reflect.apply(target, that, args);
                        let defer = Q.defer();
                        let address = providerFactory.allServerAddressList(that.service, that.version, that.type);
                        let invoker = loadBalance.selector(address, target.name);
                        if (!invoker) {
                            defer.reject(new ReferenceError(`service:${that.service} version:${that.version} is not server online`));
                        } else {
                            let params = [target.name];
                            [...args].forEach(arg => {
                                params.push(arg)
                            });
                            Reflect.apply(invoker.invoker, invoker, params).then(result => {
                                defer.resolve(result);
                            }).catch(err => {
                                defer.reject(err);
                            });
                        }
                        return defer.promise;
                    }
                }));
            }
        });
    }
    static instance(providerFactory, loadBalance) {
        if (!this._instance) {
            this._instance = Reflect.construct(this, [providerFactory, loadBalance]);
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