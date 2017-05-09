/**
 * Created by alone on 17-5-9.
 */
'use strict';
const util = require('util');
const Filter = require('../lib/filter/Filter');
const logger = require('tracer-logger');
module.exports = class HelloFilter extends Filter {
    selector(ctx, providerMap, routers, configurators, args) {
        logger.debug(`selector hello filter ${util.inspect(ctx)} ${util.inspect(args)}`);
    }

    before(ctx, invoker, args) {
        logger.debug(`before hello filter ${util.inspect(ctx)} ${util.inspect(args)}`);
        return true;
    }

    after(ctx, result, args) {
        logger.debug(`after hello filter ${util.inspect(ctx)} ${util.inspect(args)} ${util.inspect(result)}`);
    }
};