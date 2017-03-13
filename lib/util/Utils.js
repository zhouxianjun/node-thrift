/**
 * Created by zhouxianjun on 16-5-6.
 */
'use strict';
const path = require('path');
const QS = require('querystring');
const methodsFilter = ['constructor'];
module.exports = class Utils {
    static load(root, fileStat) {
        let base = path.join(root, fileStat.name);
        if(fileStat.name.endsWith('.js')) {
            let pwd = path.relative(__dirname, base);
            if (!pwd.startsWith('.') && !pwd.startsWith('/')) {
                pwd = './' + pwd;
            }
            let indexOf = base.indexOf(':');
            if (!base.startsWith('/') && indexOf != -1) {
                base = base.substring(0, indexOf).toUpperCase() + base.substring(indexOf);
            }
            return {
                path: pwd,
                name: fileStat.name,
                basePath: base,
                object: require.cache[base] || require(pwd)
            };
        }
        return {};
    }

    static getMethods(bean) {
        let methods = Reflect.ownKeys(bean);
        for (let i = 0; i < methods.length; i++) {
            let descriptor = Reflect.getOwnPropertyDescriptor(bean, methods[i]);
            if (methodsFilter.includes(methods[i]) || descriptor.get || descriptor.set || typeof descriptor.value != 'function') {
                methods.splice(i, 1);
            }
        }
        return methods;
    }

    static urlParse(urls) {
        let urlSet = new Set(urls);
        let result = new Set();
        for (let url of urlSet) {
            result.add(QS.parse(url));
        }
        return result;
    }
};
