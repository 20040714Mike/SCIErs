Page({

  /**
   * 页面初始数据，
   * tabCur 「int」当前分栏
   * scrollLeft 「int」 在周末增加课之前无用，处理分栏滚动用
   * weekday 「list」 日期缩写（index与tabCur对应）
   * courseData 「list」 index与tabCur对应，每一天为下列Object的数组
   *  {
   *    "icon": 图标,"color": 颜色,"disable": 是否禁用,
   *    "num": period,"title": 课程名,"classroom": 教室
   *  }
   * 
   */
  data: {
    tabCur: 0,
    navtitle: "Classroom",
    scrollLeft: 0,
    weekday: ["Mon.", "Tue.", "Wed.", "Thu.", "Fri."],
    courseData: [],
  },


  /**
   * 处理分栏切换
   */
  tabSelect(e) {
    this.setData({
      tabCur: e.currentTarget.dataset.id,
      scrollLeft: (e.currentTarget.dataset.id - 1) * 60
    })
  },


  /** 
   * 获取当前日期
   */
  getNowTime: function () {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    if (month < 10) {
      month = '0' + month;
    };
    if (day < 10) {
      day = '0' + day;
    };
    var formatDate = year + '-' + month + '-' + day;
    return formatDate;
  },

  /**
   * 获取当前所在semester，
   * 若月份小于8则返回前一年，大于八则返回当年
   */
  getNowSemYear() {
    var now = new Date()
    var year = now.getFullYear()
    var month = now.getMonth() + 1
    if (month < 8) {
      year = year - 1
    }
    return year;
  },


  /**
   * 生命周期函数 - 页面加载时自动执行
   */
  onLoad: function (options) {
    var roomNum = options.room.toString()
    console.log(roomNum)
    this.setData({
      navtitle: roomNum
    })

    /** 
     * 1. 请求课程表
     */

    //获取当前星期日（1-星期一，2-星期二）
    var today = new Date().getDay();
    this.setData({
      tabCur: today - 1
    })
    var cookies = wx.getStorageSync('cookies')
    var sid = wx.getStorageSync('sid')
    //iconDict为科目对应图标
    var that = this
    var iconDict = {
      'Econ': "moneybag",
      'Busi': "moneybag",
      'Engl': "comment",
      'PSHE': "friend",
      'Math': "roundadd",
      'Musi': "musicfill",
      'Dram': "cardboard",
      "Art-": "colorlens",
      "Japa": "message",
      "Span": "message",
      "Phys": "creative",
      "Chin": "message",
      "Chem": "magic",
      "Comp": "keyboard",
      "PE-G": "group",
      "PE-A": "group",
      "Hist": "write",
      "Psyc": "write",
      "Geog": "location"
    }

    //请求课程表接口，由于返回为json不需要解析直接使用小程序请求
    wx.request({
      header: {
        'if-modified-since': "0",
        'content-type': "application/x-www-form-urlencoded",
        'accept': "*/*",
        'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookies
      },
      method: "POST",
      data: {
        r: roomNum,
        d: that.getNowTime()
      },
      url: 'https://www.alevel.com.cn/user/classroom/booking/get_arrangement_by_ajax/',
      success(res) {

        //遍历返回值准备 - 返回的json的key为 weekdays+ps，如M1，Th9
        var weekdays = ["M", "Tu", "W", "Th", "F"]
        var ps = ['1', '2', '3', '4', '5', '6', 'Lunchtime', '7', '8', '9', '10', '11', '12']
        var pps = ['1', '2', '3', '4', '5', '6', 'Lunch', '7', '8', '9', '10', '11', '12']

        var tempArr = [] //临时变量，同全局变量courseData
        var dataObj = res.data.room_data

        for (var i = 0; i < weekdays.length; i++) { //每一天
          tempArr[i] = []
          for (var j = 0; j < ps.length; j++) { //每一节课

            //处理重课或AB周问题，先匹配有几个课，注意这里的返回数组不是正则匹配结果，而是匹配每一次的所有内容
            //也就是说返回length一般为1，两个课则为2，不会进行正则分组匹配
            var tempCourseDataArr = dataObj[weekdays[i] + ps[j]]
              .match(/((<div class='\w*'>)*<span class='c1'>)([^<]+)([^(]*\()([^)]+)(\)\()([^)]*)/g)

            if (tempCourseDataArr) { //如果不为null或空
              for (var k = 0; k < tempCourseDataArr.length; k++) {

                //正则匹配从html里面拿信息，这里匹配的返回就是正则分组匹配的数组了
                var tempCourseData = tempCourseDataArr[k]
                  .match(/(<div class='(\w*)'>)*(<span class='c1'>)([^<]+)([^(]*\()([^)]+)(\)\()([^)]*)/)

                if (dataObj[weekdays[i] + ps[j]] != "" && tempCourseData) {
                  if (tempCourseData[2]) { //课程

                    var cStart = tempCourseData[4].substring(0, 4) //获取课程名前四个字母并判定icon
                    if (iconDict.hasOwnProperty(cStart)) {
                      var icon = iconDict[cStart]
                    } else {
                      var icon = "write" //若没有icon，则使用默认icon铅笔
                    }
                    var color = "cyan" //默认icon颜色
                    var disable = false
                    if (tempCourseData[2] == "isntw") { //当存在AB周时，非当周课程将会带isntw这个class
                      //非当周课程显示灰色
                      color = "gray"
                      disable = true
                    }
                    //数据写入临时数组
                    tempArr[i].push({
                      "icon": icon,
                      "color": color,
                      "disable": disable,
                      "num": pps[j],
                      "title": "   " + tempCourseData[4],
                      "classroom": tempCourseData[6],
                      "teacher": tempCourseData[8],
                    })
                  } else { //社团

                    //数据写入临时数组
                    tempArr[i].push({
                      "icon": "friendfamous",
                      "color": "pink",
                      "disable": false,
                      "num": pps[j],
                      "title": "   " + tempCourseData[4],
                      "classroom": tempCourseData[6],
                      "teacher": tempCourseData[8],
                    })
                  }
                }
              }
            }
          }
        }

        //临时数组写入setData
        that.setData({
          courseData: tempArr,
          loadModal: false
        })

      },
      fail(e) { //网络错误
        that.setData({
          networkErr: true,
          loadModal: false
        })
      }
    })


  }

})