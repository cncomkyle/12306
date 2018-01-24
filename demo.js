var {findTickets, getCheckImage, submitCheckCode, login, getPassengers, getPassengerDTOs} = require('./12306.js')
var config = require('./config.js')

if (!config.username || !config.password) console.warn('请打开config.js配置12306账号信息')

exports.a = function a () {
    // 获取验证码
    getCheckImage ().then(data => {
        console.log('验证码已更新,请打开imageCode.jpg文件验证并登录')
    }).catch(err => console.log('验证码获取失败' + err.message))
}

exports.b = function b () {
    var str = Array.prototype.join.call(arguments, ',')
    // 提交验证码
    submitCheckCode(str).then(data => {
        console.log('验证码验证成功')
    }).catch(err => {
        a()
        console.log(err.message)
    })
}

exports.auto = function b () {
    var str = Array.prototype.join.call(arguments, ',')    
    // 提交验证码
    submitCheckCode(str).then(data => {
        console.log('验证码验证成功')
        // 登录
        return login(config.username, config.password)
    }).then(user => {
        console.log('欢迎您，' + user.username)
        // 获取乘客信息
        return getPassengers()
    }).then(data => {
        console.log('常用联系人：', data.map(item => item.passenger_name))
    }).catch(err => {
        console.log(err)
    })
}

exports.c = function c () {
    // 登录
    login(config.username, config.password).then(user => {
        console.log('欢迎你，' + user.username)
    }).catch(err => {
        // console.log(err)
        console.log('登录失败：' + err.message)
    })
}

exports.d = function d () {
    // 获取乘客信息 登录后可调用
    getPassengers().then(data => {
        console.log('常用联系人:', data.map(item => item.passenger_name))
    }).catch(err => {
        console.log(err.message)
    })
}

exports.e = function e () {
    // 获取乘客信息 登录后可调用
    getPassengerDTOs().then(data => {
        console.log('常用联系人:', data.map(item => item.passenger_name))
    }).catch(err => {
        console.log(err)
    })
}


exports.f = function f () {
    // 查票 站点可全拼或汉字
    findTickets('guangzhou', '武汉', '2018-02-10', {
        types: ['G'],
        seats: ['二等座'],
        startHourFrom: 9,
        startHourTo: 24
    }).then(data => {
        console.log('可预订车次数量：' + data.data.filter(item => item['预定']).length)
    }).catch(err => console.log(err))
}
