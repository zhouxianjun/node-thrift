/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 16:04
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
module.exports = class AbstractLoadBalance extends require('./LoadBalance'){
    selector(invokers, method) {
        if (invokers == null || invokers.size <= 0)
            return null;
        if (invokers.size == 1)
            return [...invokers][0];
        return this.doSelect(invokers, method);
    }

    doSelect(invokers, method) {
        throw new ReferenceError('this is interface method.');
    }

    getWeight(invoker) {
        // 先获取provider配置的权重（默认100）
        let weight = invoker.weight;
        if (weight > 0) {
            let timestamp = invoker.startTime;
            if (timestamp > 0) {
                // 计算出启动时长
                let uptime = (new Date().getTime() - timestamp);
                // 获取预热时间（默认600000，即10分钟）
                let warmup = invoker.warmup;
                // 如果启动时长小于预热时间，则需要降权。 权重计算方式为启动时长占预热时间的百分比乘以权重，
                // 如启动时长为20000ms，预热时间为60000ms，权重为120，则最终权重为 120 * （1/3) = 40，
                // 注意calculateWarmupWeight使用float进行计算，因此结果并不精确。
                if (uptime > 0 && uptime < warmup) {
                    weight = this.calculateWarmupWeight(uptime, warmup, weight);
                }
            }
        }
        return weight;
    }

    calculateWarmupWeight(uptime, warmup, weight) {
        let ww = uptime / (warmup / weight);
        return ww < 1 ? 1 : (ww > weight ? weight : ww);
    }
};