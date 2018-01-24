const fs = require('fs')
const https = require('https')
const axios = require('axios')


const ca = fs.readFileSync('./cert/srca.cer.pem')

const BrowserUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36"
const headers = {
    'Connection': 'keep-alive',
    'Host': 'kyfw.12306.cn',
    'User-Agent': BrowserUA,
    "Referer": "https://kyfw.12306.cn/otn/leftTicket/init",
    "Origin":"https://kyfw.12306.cn",
    "X-Requested-With":"XMLHttpRequest"
}

module.exports = axios.create({
    baseURL: 'https://kyfw.12306.cn',
    timeout: 5000,
    agent: new https.Agent({ ca }),
    headers
})
