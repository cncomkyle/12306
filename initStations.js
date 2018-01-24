var fs = require('fs')
var axios = require('axios')
const stationsPath = './stations.json'

axios.get('https://kyfw.12306.cn/otn/resources/js/framework/station_name.js?station_version=1.9044').then(({data}) => {
    var arr = data.split('|')
    var stations = []
    for (var i = 0; i < arr.length - 1; i += 5) {
        stations.push({
            name: arr[i + 1],
            code: arr[i + 2],
            pinyin: arr[i + 3]
        })
    }
    stations.sort((a, b) => a.pinyin > b.pinyin ? 1 : -1)
    fs.writeFile(stationsPath, JSON.stringify(stations, null, 4), "utf-8", function(err) {
        console.log(err || `已初始化全国${stations.length}所火车站`)
    })
})