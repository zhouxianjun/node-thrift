/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:31
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
 *     | | :  `- \`.`\ _ /`.`/ - ` : | |
 *     \  \ `-.   \_ __\ /__ _/   .-` /  /
 *======`-.____`-.___\_____/___.-`____.-'======
 *                   `=---='
 *^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           佛祖保佑       永无BUG
 */
module.exports = class Invoker {
    get address(){throw new ReferenceError('this is interface method.');}

    get host(){throw new ReferenceError('this is interface method.');}

    get port(){throw new ReferenceError('this is interface method.');}

    get weight(){throw new ReferenceError('this is interface method.');}

    get startTime(){throw new ReferenceError('this is interface method.');}

    get warmup(){throw new ReferenceError('this is interface method.');}

    get interface(){throw new ReferenceError('this is interface method.');}

    get interfaceName(){throw new ReferenceError('this is interface method.');}

    get attr(){return ''};

    clone(){return this};

    invoker(method, ...args){throw new ReferenceError('this is interface method.');}

    isAvailable(){return true;}

    validate(){return true;}

    destroy(){throw new ReferenceError('this is interface method.');}
};