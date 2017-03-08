/**
 * Created by Alone on 2017/3/7.
 */
module.exports = class DemoService {
    static get thrift() {
        return require('../thrift/Demo');
    }
    static get version() {
        return '1.0.0';
    }
    say(){
        console.log('ok');
    }
};