/**
 * Created by Alone on 2017/3/7.
 */
module.exports = class Demo {
    static get thrift() {
        return require('../thrift/Demo');
    }
    static get version() {
        return '1.0.0';
    }
    async say(name){
        let random = Math.floor(Math.random() * 10 + 1);
        if (random % 2 === 0) {
            console.log(`sleep...${name}`);
            await sleep(60 * 1000);
        }
        console.log(`say ok ${name}`);
        return name;
    }
};

function sleep(ms) {
    return new Promise(ok => setTimeout(() => ok(), ms));
}