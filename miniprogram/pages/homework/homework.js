Page({

  /**
   * 页面初始数据，
   * loadModal 「boolean」 是否显示读取浮层
   *   - 进入时先显示
   */
  data: {
    loadModal: true
  },


  /**
   * 生命周期函数 - 页面加载时自动执行
   */
  onLoad: function () {
    /**
     * 登陆态验证
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
        url: '/pages/login/login'
      })
    }


    /**
     * 请求作业List
     * 由于返回为HTML，小程序处理略麻烦，使用云函数转发数据
     */
    var that = this
    wx.cloud.callFunction({
      name: 'getHomework',
      data: {
        cookie: cookies,
        sid: sid
      },
      success: function (res) {
        if (res.result.stats == "ok") {
          var data = res.result.data

          /* 保留内容 若后续需要增加按课程分类可修改此处
          var courses = []
          for (var i = 0; i < data.length; i++) {
            courses[i] = data[i].course.split(".").pop()
          } */

          that.setData({
            homework: data,
            loadModal: false,
          })
        } else { //网络请求错误 （服务器请求cms错误）
          that.setData({
            loadModal: false,
            networkErr: true,
          })
        }
      },
      fail: function (error) {
        that.setData({ //网络请求错误
          loadModal: false,
          networkErr: true,
        })
      }
    })
  },


  /**
   * 隐藏确认浮层并清理临时完成作业ID
   */
  hideModal() {
    this.setData({
      tempDoneId: null,
      confirmDoneModal: false,
    })
  },

  /**
   * 点击完成作业时弹窗并存入临时作业ID
   */
  doneHomework(event) {
    this.setData({
      tempDoneId: event.target.dataset.id,
      confirmDoneModal: true,
    })
  },


  /**
   * 用户点击确认完成作业后请求CMS标记完成
   */
  doneHomeworkSure() {
    this.setData({
      loadModal: true,
      confirmDoneModal: false,
    })

    //各种数据准备
    var doneId = this.data.tempDoneId
    var that = this
    var cookies = wx.getStorageSync('cookies')
    var sid = wx.getStorageSync('sid')

    wx.request({
      header: {
        'if-modified-since': "0",
        'content-type': "application/x-www-form-urlencoded",
        'accept': "*/*",
        'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": cookies
      },
      method: "GET",
      url: 'https://www.alevel.com.cn/user/' + sid + '/homework/marktofinished/' + doneId + '/',
      success(res) {
        
        //请求完成后重新获取homework列表
        wx.cloud.callFunction({
          name: 'getHomework',
          data: {
            cookie: cookies,
            sid: sid
          },
          success: function (res) {
            if (res.result.stats == "ok") {
              var courses = []
              var data = res.result.data
              for (var i = 0; i < data.length; i++) {
                courses[i] = data[i].course.split(".").pop()
              }
              that.setData({
                homework: data,
                loadModal: false,
              })
            } else {
              that.setData({
                loadModal: false
              })
            }
          },
          fail: function (error) {  //获取作业列表时网络错误
            that.setData({
              networkErr: true,
              loadModal: false
            })
          }
        })
      },
      fail(e) {  //请求完成时网络错误
        that.setData({
          networkErr: true,
          loadModal: false
        })
      }
    })
  }
})