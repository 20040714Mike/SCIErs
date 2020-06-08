Page({

  /**
   * 页面的初始数据，
   * Picker 「list」 选择器数组，与index对应
   * index 「int」 当前选择的index
   */
  data: {
    picker: ['1(8:00-8:40)', '2(8:40-9:20)', '3(9:30-10:10)', '4(10:10-10:50)', '5(11:10-11:50)', '6(11:50-12:30)', 'Launch Time', '7(13:30-14:10)', '8(14:10-14:50)', '9(15:00-15:40)', '10(15:40-16:20)', '11(16:30-17:30)', '12(17:30-18:30)'],
    index: 0
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
   * Period选择器变化监听
   */
  PickerChange(e) {
    console.log(e);
    this.setData({
      index: e.detail.value
    })
  },

  /** 
   * 日期选择器变化监听
   */
  DateChange(e) {
    this.setData({
      date: e.detail.value
    })
  },

  /**
   * 查询空教室
   * 使用云函数接口
   */
  search() {
    var that = this
    var cookies = wx.getStorageSync('cookies')
    var sid = wx.getStorageSync('sid')
    that.setData({
      loadModal: true
    })

    //注意请求的时候所带的period值，此数组index与全局index对应
    var periodList = ['1', '2', '3', '4', '5', '6', 'Lunchtime', '7', '8', '9', '10', '11', '12', '13']

    wx.cloud.callFunction({
      name: 'getEmptyClassroom',
      data: {
        cookie: cookies,
        sid: sid,
        date: that.data.date,
        period: periodList[that.data.index]
      },
      success: function (res) {
        if (res.result.stats == "ok") {
          that.setData({
            classrooms: res.result.data,
            loadModal: false
          })
        } else { //查询错误，返回空值
          that.setData({
            loadModal: false,
          })
        }
      },
      fail: function (error) { //网络请求错误
        console.log(error)
        that.setData({
          loadModal: false,
          classrooms: null,
          networkErr: true,
        })
      }
    })
  },

  /**
   * 生命周期函数--页面加载时自动执行
   */
  onLoad: function (options) {

    this.setData({
      date: this.getNowTime()
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
  },
})