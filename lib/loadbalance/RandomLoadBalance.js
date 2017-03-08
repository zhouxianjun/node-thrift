/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 16:15
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
module.exports = class RandomLoadBalance extends require('./AbstractLoadBalance') {
    doSelect(invokers, method) {
        let length = invokers.size; // 总个数
        let totalWeight = 0; // 总权重
        let sameWeight = true; // 权重是否都一样
        let array = [...invokers];
        for (let i = 0; i < length; i++) {
            let weight = this.getWeight(array[i]);
            totalWeight += weight; // 累计总权重
            if (sameWeight && i > 0 && weight != this.getWeight(array[i - 1])) {
                sameWeight = false; // 计算所有权重是否一样
            }
        }
        if (totalWeight > 0 && !sameWeight) {
            // 如果权重不相同且权重大于0则按总权重数随机
            let offset = Math.floor(Math.random() * totalWeight);
            // 并确定随机值落在哪个片断上
            for (let invoker of invokers.values()) {
                offset -= this.getWeight(invoker);
                if (offset < 0) {
                    return invoker;
                }
            }
        }
        // 如果权重相同或权重为0则均等随机
        return array[Math.floor(Math.random() * length)];
    }
};