// miniprogram/pages/assessments/assessments.js
Page({
  /**
   * 页面初始数据
   * assessments数组每一项如下
   * {
   *  "course": 课程名
   *  "value": [
   *    "date": 日期
   *    "title": 标题
   *    "mark": 得分或等级
   *    "outof": 总分或A-U
   *    "avg": 平均分
   *    "bgColor": 绿-formal，黄-informal
   *  ]
   * }
   */
  data: {
    assessments: [],
    loadModal: true
  },

  /**
   * 生命周期函数 - 页面加载时自动执行
   */
  onLoad: function () {
    /**
     * 0. 登陆态验证
     * 请求日历接口检测是否能获得数据，若无法获得则跳转之登陆页
     * 同时准备好cookie及sid变量
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


    /*     
     * 请求云函数获取用户assessment列表
     */
    var that = this
    wx.cloud.callFunction({
      name: 'getAssessment',
      data: {
        cookie: cookies,
        sid: sid
      },
      success: function (res) {
        if (res.result.stats == "ok") {
          var courses = []
          var data = res.result.data
          for (var i = 0; i < data.length; i++) {  //按课程分类
            courses[i] = data[i].course.split(".").pop()
          }
          that.setData({
            assessments: data,
            loadModal: false,
            course: courses,
            tabCur: 0,
            coursesLength: courses.length
          })
        } else {
          that.setData({  //读不到数据
            loadModal: false,
          })
        }
      },
      fail: function (error) {  //网路错误
        console.log(error)
        that.setData({
          loadModal: false,
          networkErr: true, 
        })
      }
    })

  },

  /**
   * 监听分栏切换 
   */
  tabSelect(e) {
    this.setData({
      tabCur: e.currentTarget.dataset.id,
      scrollLeft: (e.currentTarget.dataset.id - 1) * 60
    })
  },
})