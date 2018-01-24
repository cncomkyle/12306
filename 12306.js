const fs = require('fs')
const instance = require('./service')
var Qs = require('qs')

const stationsPath = './stations.json'
// const cookiesPath = './cookies.json'

// 验证码8个小图的坐标 按常规思维 1 ~ 8 代表8个小图
const positions = ['', '40,42', '115,41', '181,43', '251,38', '33,116', '113,113', '180,113',  '247,114']

const existStations = fs.existsSync(stationsPath)
if (!existStations) console.warn('请先执行node initStations初始化火车站信息')
let stations = existStations ? require(stationsPath) : []

const defaultFilters = {
    types: ['K', 'T', 'D', 'G', 'Z', 'C'],
    seats: ['商务', '一等座', '二等座', '高软卧', '软卧', '动卧', '硬卧', '软座', '硬座', '无座'],
    startHourFrom: 0,
    startHourTo: 24
}

// const existCookies = fs.existsSync(cookiesPath)
// let cookies = existCookies ? require(cookiesPath) : {}
let cookies = {
    RAIL_DEVICEID: 'V7nK_z_EawJM7dMXcBdbn4pVOzFhuk30RNnPfL3PCXpB0gnS3HpmnoRmOztRZAU0IgXDGLyfhV2AqIhX7SuyCjThPBEg8Dsi94hsTUA5n05chrnMfy5gLEDR6-zdjZI-YMDnZVL8S6Mld38Nev2FVScb-ARgWBNC',
    RAIL_EXPIRATION: '1517002278290'
}


/**
 * 查询车次 返回值 Pormise
 * @param {*} fromName 出发站 全拼或汉字
 * @param {*} toName 目的站 全拼或汉字
 * @param {*} date 出发日期
 * @param {*} filters 条件筛选 见defaultFilters格式
 */
function findTickets (fromName, toName, date, filters) {
    return new Promise((resolve, reject) => {
        filters = Object.assign(defaultFilters, filters)
        let from = getStationCode(fromName)
        let to = getStationCode(toName)
        if (!from) return reject(new Error('出发地设置错误或更新站点信息后重试'))
        if (!to) return reject(new Error('目的地设置错误或更新站点信息后重试'))
        if (!date) return reject(new Error('请选择日期'))
        let fromCode = from.code
        let toCode = to.code
        let url = `/otn/leftTicket/queryZ?leftTicketDTO.train_date=${date}&leftTicketDTO.from_station=${fromCode}&leftTicketDTO.to_station=${toCode}&purpose_codes=ADULT`
        console.log(`正在查询：${from.name}--${to.name}(${date})`)
        instance.get(url).then(({ data, headers }) => {
            console.log(`查询时间：${new Date(headers.date).toLocaleString()}`)
            if (data.status && data.httpstatus === 200) {
                const {result, map } = data.data
                if (result) {
                    let trains = result.map(item => getTrainInfo(item, map, filters)).filter(item => item)
                    // .filter(item => item['预定'])
                    if (!trains || !trains.length) {
                        console.log('没有开通该线路哦')
                    } else {
                        var item = trains[0]
                        console.log(`${Object.keys(item).join('\t')}\n${'-'.repeat(68)}`)
                    }
                    trains.forEach(item => {
                        console.log(`${Object.values(item).map(value => typeof(value) === 'string' && value.replace('<br/>', ' ')).join('\t')}`)
                    })
                    resolve({
                        fromName: from.name,
                        toName: to.name,
                        date: date,
                        filters: filters,
                        data: trains
                    })
                }
                console.log('------------------------------success-------------------------------')
        
            } else {
                // console.log(JSON.stringify(data))
                reject(new Error(data.messages))
                throw new Error(data.messages)
            }
        }).catch(err => {
            reject(err)
            console.log('------------error-----------') 
        })
    })
}

// 获取12306验证码图片 保存到 ./imageCode.jpg 文件
function getCheckImage () {
    return new Promise((resolve, reject) => {
        instance.get('/passport/captcha/captcha-image?login_site=E&module=login&rand=sjrand&'+Math.random(), {
            responseType: 'arraybuffer'
        }).then(({data, headers}) => {
            setCookies(headers['set-cookie'])
            fs.writeFile('./imageCode.jpg', data, "binary", err => err ? reject(err) : resolve())
        }).catch(err => {
            reject(err)
        })
    })
}

// 提交验证码 格式为字符串 多个则以逗号、竖线或空格分开
// 如选择第一个小图和第8个小图 则传递 '1,8'
function submitCheckCode (checkStr) {
    let postData = Qs.stringify({
        answer: getAnswer(checkStr),
        login_site: 'E',
        rand: 'sjrand'
    })
    return new Promise((resolve, reject) => {
        instance.post('/passport/captcha/captcha-check', postData).then(({data, headers}) => {
            setCookies(headers['set-cookie'])
            data.result_code === '4' ? resolve() : reject(new Error(data.result_message))
        }).catch(err => {
            reject(err)
        })
    })
}

// 登录
function login (username, password) {
    return new Promise((resolve, reject) => {
        instance.post('/passport/web/login', Qs.stringify({username, password, appid: 'otn'})).then(({data, headers}) => {
            setCookies(headers['set-cookie'])
            if (data.result_code === 0) {
                instance.post('/passport/web/auth/uamtk', Qs.stringify({appid: 'otn'})).then(({data, headers}) => {
                    setCookies([`tk=${data.newapptk}`])
                    // console.log('获取tk成功:' + data.newapptk)
                    return instance.post('/otn/uamauthclient', Qs.stringify({tk: data.newapptk}))
                }).then(({data, headers}) => {
                    setCookies(headers['set-cookie'])
                    resolve(data)
                }).catch(err => {
                    reject(new Error(err))
                })
            } else {
                reject(new Error(data.result_message))
            }
        }).catch(err => {
            reject(err)
        })
    })
}

// 获取联系人
function getPassengers () {
    return new Promise((resolve, reject) => {
        instance.post('/otn/passengers/query', Qs.stringify({pageIndex:1, pageSize:15})).then(({data}) => {
            resolve(data.data.datas)
        }).catch(err => reject(err))
    })
}

// 获取联系人
function getPassengerDTOs () {
    return new Promise((resolve, reject) => {
        instance.post('/otn/confirmPassenger/getPassengerDTOs', Qs.stringify({_json_att: ''})).then(({data}) => {
            if (data.status === true) {
                resolve(data.data.normal_passengers)
            }
        }).catch(err => reject(err))
    })
}


function getTrainInfo (baseStr, map, filters = defaultFilters) {
    const arr = baseStr.split('|')
    let info = {
        '车次': arr[3],
        // '始发站': map[arr[4]] || arr[4],
        // '终点站': map[arr[5]] || arr[5],
        '出发站': map[arr[6]],
        '目的站': map[arr[7]],
        '开时': arr[8],
        '到时': arr[9],
        '历时': arr[10]
    }
    let _seats = {
        '动卧': '-',
        '高软卧': arr[21] || '-',
        '软卧': arr[23] || '-',
        '软座': arr[24] || '-',
        '无座': arr[26] || '-',
        '硬卧': arr[28] || '-',
        '硬座': arr[29] || '-',
        '二等座': arr[30] || '-',
        '一等座': arr[31] || '-',
        '商务': arr[32] || '-'
    }
    filters.seats.forEach(item => {
        info[item] = _seats[item]
    })
    Object.assign(info, {
        '预定': arr[11] === 'Y',
        '备注': arr[1]
    })
    if (!filters.types.includes(info['车次'][0])) return
    let _hour = info['开时'].split(':')[0]
    if (_hour < filters.startHourFrom || _hour > filters.startHourTo) return
    return info
}

function formatTrains (baseStr, map) {
    const arr = baseStr.split('|')
    return {
        '备注': arr[1],
        '车次': arr[3],
        '始发站': map[arr[4]] || arr[4],
        '终点站': map[arr[5]] || arr[5],
        '出发地': map[arr[6]],
        '目的地': map[arr[7]],
        '出发时间': arr[8],
        '到达时间': arr[9],
        '历时': arr[10],
        '预定': arr[11] === 'Y',
        '动卧': '-',
        '高软卧': arr[21] || '-',
        '软卧': arr[23] || '-',
        '软座': arr[24] || '-',
        '无座': arr[26] || '-',
        '硬卧': arr[28] || '-',
        '硬座': arr[29] || '-',
        '二等座': arr[30] || '-',
        '一等座': arr[31] || '-',
        '商务': arr[32] || '-',
    }
}

// 通过名称或拼音找出最匹配的火车站
function getStationCode (keyword) {
    return stations.find(item => item.pinyin.indexOf(keyword) === 0 || item.name.indexOf(keyword) === 0)
}

// 火车站名称模糊提示
function getStationsCode (keyword) {
    return stations.filter(item => item.pinyin.indexOf(keyword) === 0 || item.name.indexOf(keyword) === 0)    
}

// 将人眼识别的二维码图片转换成接口所需坐标形式
function getAnswer (str) {
    return Array.from(new Set(str.split(/[,|]|\s+/g).filter(it => it))).map(item => positions[item]).join(',')
}

// 合并请求的cookie 并设给instance
function setCookies (_cookies = []) {
    if (!_cookies) return
    _cookies.forEach(item => {
        var arr = item.split('=')
        cookies[arr[0]] = arr[1] ? arr[1].split(';')[0] : ''
    })
    instance.defaults.headers['Cookie'] = Object.keys(cookies).map(key => `${key}=${cookies[key]}`)
    // fs.writeFile(cookiesPath, JSON.stringify(cookies), "utf-8", err => {})
}


module.exports = {
    findTickets,
    getCheckImage,
    submitCheckCode,
    login,
    getPassengers,
    getPassengerDTOs
}

// 初始化
setCookies()
instance.get('/otn/leftTicket/init').then(({data}) => {
    if (/\"(\/otn\/dynamicJs\/\w+)\"/.test(data)) {
        instance.get(RegExp.$1)
    }
})
