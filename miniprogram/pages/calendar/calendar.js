// miniprogram/pages/assessments/assessments.js
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
   * 下面的日历切换时请求
   */
  getCalendarByDate(thedaystr) {
    var cookies = wx.getStorageSync('cookies')
    var that = this
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
        "theday": thedaystr,
        "kind": -1
      },
      url: 'https://www.alevel.com.cn/user/getcalendarbyday/',
      success(res) {
        var theday = res.data.calendarinfo.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").split(/\d\./)
        console.log(theday)
        var itemListT = []
        for (var j = 1, len = theday.length; j < len; j++) {
          itemListT[j - 1] = {
            "value": theday[j]
          }
        }
        that.setData({
          theday: {
            "date": thedaystr,
            "items": itemListT,
            "nextday": res.data.nextday,
            "preday": res.data.preday,
          }
        })
      }
    })
  },

  //监听日历切换按钮
  changeDayButton(event) {
    var thedaystr = this.data.theday.preday
    if (event.target.dataset.type == "1") {
      thedaystr = this.data.theday.nextday
    }
    this.getCalendarByDate(thedaystr)

  },

  onLoad: function (options) {
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
              console.log(res.data.calendartodayinfo)
            } else {
              wx.redirectTo({
                url: '/pages/login/login'
              })
            }
          }
        })
      } else {
        wx.redirectTo({
          url: '/pages/login/login'
        })
      }
    } catch (e) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }

    /**
     * 同login.js
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
        var today = res.data.calendarinfo.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").split(/\d\./)
        var nextDay = res.data.nextday

        var itemList = []
        for (var j = 1, len = today.length; j < len; j++) {
          itemList[j - 1] = {
            "value": today[j]
          }
        }
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
            "theday": nextDay,
            "kind": -1
          },
          url: 'https://www.alevel.com.cn/user/getcalendarbyday/',
          success(res) {
            var theday = res.data.calendarinfo.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").split(/\d\./)
            console.log(theday)
            var itemListT = []
            for (var j = 1, len = theday.length; j < len; j++) {
              itemListT[j - 1] = {
                "value": theday[j]
              }
            }

            that.setData({
              today: {
                "date": that.getNowTime(),
                "items": itemList
              },
              theday: {
                "date": nextDay,
                "items": itemListT,
                "nextday": res.data.nextday,
                "preday": res.data.preday,
              }
            })
          },
          fail(e) { //网络请求错误
            that.setData({
              networkErr: true,
              loadModal: false
            })
          }
        })
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
          console.log(res.data.db_list)
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
  },


  //监听日期选择器
  DateChange(e) {
    this.getCalendarByDate(e.detail.value)
  }
})