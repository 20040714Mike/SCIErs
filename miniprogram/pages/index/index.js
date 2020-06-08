Page({

  /**
   * 页面初始数据，
   * date 「String」 今天日期
   * items 「List」 今天日历内容
   */
  data: {
    today: {
      "date": "",
      "items": []
    }
  },

  /**
   * 长按登出 
   */
  logout: function () {
    wx.showModal({
      title: 'Logout',
      content: 'Click \'Yes\' if you want to logout.',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      success(res) {
        if (res.confirm) {

          wx.removeStorageSync('cookies')
          wx.redirectTo({
            url: '/pages/login/login',
          })
        } else if (res.cancel) {}
      }
    })
  },

  /**
   * 获取当前时间 HHMM （用于判断period）
   */
  getNowHour: function () {
    var D = new Date(); //获取当前时间的时间对象
    var hh = D.getHours(); //获取小时数
    var min = D.getMinutes(); //获取分钟数
    min = (min < 10) ? ("0" + min) : min;
    return hh + "" + min;
  },
  /**
   * 获取今天日期（用于请求日历）
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
  onShow: function (options) {
    this.setData({
      networkErr: false,
    })
    /**
     * 0. 登陆态验证
     * 请求日历接口检测是否能获得数据，若无法获得则跳转之登陆页
     */
    try {
      var that = this
      var cookies = wx.getStorageSync('cookies')
      var sid = wx.getStorageSync('sid')
      if (cookies && sid) {
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
            "theday": "2020-11-13",
            "kind": -1
          },
          url: 'https://www.alevel.com.cn/user/getcalendarbyday/',
          success(res) {
            if (res.data.calendartodayinfo) {
              console.log(res.data.calendartodayinfo) //登陆态正常
            } else {
              wx.redirectTo({
                url: '/pages/login/login' //返回值不包含被日历Info
              })
            }
          }
        })
      } else {
        wx.redirectTo({
          url: '/pages/login/login' //Storage里不存在sid或cookie
        })
      }
    } catch (e) {
      wx.redirectTo({
        url: '/pages/login/login' //出现异常（似乎302返回有的时候会进入这里）
      })
    }


    /**
     * 1. 当日日历
     * 请求日历接口获取当天日历
     */
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
        "theday": that.getNowTime(),
        "kind": -1
      },
      url: 'https://www.alevel.com.cn/user/getcalendarbyday/',
      success(res) {
        try {
          //去除html标签
          var today = res.data.calendarinfo.replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, "").split(/\d\./)

          //轮询返回值写入数组，为方便后续拓展（增加类目显示，点击展示详情）使用Object而非String
          var itemList = []
          var examList = []
          for (var j = 1, len = today.length; j < len; j++) {
            if (today[j].indexOf("[ Examination ]") !== -1) {
              examList.push( {
                "value": today[j].replace("[ Examination ]", "").replace("-- ", "")
              })
            } else {
              itemList.push({
                "value": today[j]
              }
              )
            }
          }

          //写入数据
          that.setData({
            todayItem: itemList[0].value.split('--').pop(),
            today: {
              "date": that.getNowTime(),
              "items": itemList,
            },
            todayExam: {
              "items": examList,
            }
          })
        } catch (e) {}
      },
      fail(e) { //网络请求错误
        that.setData({
          networkErr: true,
          loadModal: false
        })
      }
    })


    /**
     * 2. DB
     * 请求DB接口获取有效DB （这个接口实际作用仍然不明确，还在观察当中）
     */
    wx.request({
      header: {
        'if-modified-since': "0",
        'content-type': "application/x-www-form-urlencoded",
        'accept': "*/*",
        'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookies
      },
      method: "POST",
      url: 'https://www.alevel.com.cn/user/' + sid + '/daily_bulletin/load/',
      success(res) {
        try {
          //写入数据
          that.setData({
            dailyBulletin: {
              "items": res.data.db_list
            }
          })
        } catch (e) {}
      },
      fail(e) { //网络请求错误
        that.setData({
          networkErr: true,
          loadModal: false
        })
      }
    })


    /**
     * 3. 主页
     * 请求主页并通过正则解析内容
     */
    wx.request({
      header: {
        'if-modified-since': "0",
        'content-type': "application/x-www-form-urlencoded",
        'accept': "*/*",
        'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookies
      },
      method: "GET",
      url: 'https://www.alevel.com.cn/user/' + sid + '',
      success(res) {
        try {
          var studentDetail = res.data
            .match(/<div class='sname'>([^<]+)<\/div>[^(o)]+([^<]+)/)
          let formClass = studentDetail[1].split("&nbsp;").pop()
          let graduateYear = studentDetail[2].split(" ").pop().replace('\n', '')

          var studentName = res.data
            .match(/<div class="hb t_12">Welcome <span class="b">([^<]+)<\/span> login alevel.com.cn<\/div>/)[1]
          that.setData({
            formClass: formClass,
            graduateYear: graduateYear,
            studentName: studentName
          })
        } catch (e) {}
      },
      fail(e) { //网络请求错误
        that.setData({
          networkErr: true,
          loadModal: false
        })
      }
    })

    /**
     * 4. 课程表（下一课程）
     */

    //获取当前星期日（0-星期一，1-星期二）
    var today = new Date().getDay() - 1;
    if (today < 5 && today >= 0) {
      let weekdays = ["M", "Tu", "W", "Th", "F"]
      let weekdayDisplay = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri."]
      let currentTime = Number(this.getNowHour())
      var period
      //这里写的好烂但是不知道咋改了
      if (currentTime >= 730 && currentTime < 810) {
        period = "1"
      } else if (currentTime >= 810 && currentTime < 850) {
        period = "2"
      } else if (currentTime >= 900 && currentTime < 940) {
        period = "3"
      } else if (currentTime >= 940 && currentTime < 1020) {
        period = "4"
      } else if (currentTime >= 1040 && currentTime < 1120) {
        period = "5"
      } else if (currentTime >= 1120 && currentTime < 1200) {
        period = "6"
      } else if (currentTime >= 1200 && currentTime < 1240) {
        period = "Lunchtime"
      } else if (currentTime >= 1300 && currentTime < 1340) {
        period = "7"
      } else if (currentTime >= 1340 && currentTime < 1420) {
        period = "8"
      } else if (currentTime >= 1430 && currentTime < 1510) {
        period = "9"
      } else if (currentTime >= 1510 && currentTime < 1550) {
        period = "10"
      } else if (currentTime >= 1600 && currentTime < 1640) {
        period = "11"
      } else if (currentTime >= 1700 && currentTime < 1740) {
        period = "12"
      } else {
        return
      }
      let nowPeriodString = weekdays[today] + period
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
          "sid": wx.getStorageSync('sid').replace("s", "").replace("p", ""), //注意这个接口请求的sid和所有别的地方都不一样，不带字母
          'theyear': that.getNowSemYear()
        },
        url: 'https://www.alevel.com.cn/user/getstudentcourse/',
        success(res) {
          //处理重课或AB周问题，先匹配有几个课，注意这里的返回数组不是正则匹配结果，而是匹配每一次的所有内容
          //也就是说返回length一般为1，两个课则为2，不会进行正则分组匹配
          var tempCourseDataArr = res.data[nowPeriodString]
            .match(/((<div class='\w*'>)*<span class='c1'>)([^<]+)([^(]*\()([^)]+)(\)\()([^)]*)/g)
          var tempArr = []
          if (tempCourseDataArr) { //如果不为null或空
            for (var k = 0; k < tempCourseDataArr.length; k++) {

              //正则匹配从html里面拿信息，这里匹配的返回就是正则分组匹配的数组了
              var tempCourseData = tempCourseDataArr[k]
                .match(/(<div class='(\w*)'>)*(<span class='c1'>)([^<]+)([^(]*\()([^)]+)(\)\()([^)]*)/)

              if (res.data[nowPeriodString] != "" && tempCourseData) {
                if (tempCourseData[2]) { //课程

                  var color = "cyan" //默认icon颜色
                  var disable = false
                  if (tempCourseData[2] == "isntw") { //当存在AB周时，非当周课程将会带isntw这个class
                    //非当周课程直接跳过
                    continue
                  }
                  //数据写入临时数组
                  tempArr.push({
                    "color": color,
                    "disable": disable,
                    "title": "   " + tempCourseData[4],
                    "classroom": tempCourseData[6],
                    "teacher": tempCourseData[8],
                  })
                } else { //社团

                  //数据写入临时数组
                  tempArr.push({
                    "color": "pink",
                    "disable": false,
                    "title": "   " + tempCourseData[4],
                    "classroom": tempCourseData[6],
                    "teacher": tempCourseData[8],
                  })
                }
              }
            }
          }
          //临时数组写入setData
          that.setData({
            nextClass: tempArr[0],
            weekday: weekdayDisplay[today],
            period: period
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
  }
})