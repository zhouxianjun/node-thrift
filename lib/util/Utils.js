/**
 * Created by zhouxianjun on 16-5-6.
 */
'use strict';
const path = require('path');
const thunkify = require('thunkify');
const zookeeper = require('node-zookeeper-client');
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

    static * createZkPath(client, path) {
        let pathArray = path.split('/');
        let parent = '';
        for(let p of pathArray) {
            if (p) {
                let createPath = parent ? `${parent}/${p}` : `/${p}`;
                try {
                    yield thunkify(client.create).apply(client, [createPath, null, zookeeper.CreateMode.PERSISTENT]);
                } catch (err) {
                    if (err.getCode && err.getCode() != zookeeper.Exception.NODE_EXISTS) {
                        throw err;
                    }
                }
                parent += `/${p}`;
            }
        }
        return path == parent;
    }
};
