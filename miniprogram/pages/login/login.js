Page({

  /**
   * 页面初始数据，
   * ShowErr「boolean」 是否显示网络错误提示
   * initialSaveStatus 「boolean」 是否保存密码
   */
  data: {
    showErr: false,
    initialSaveStatus: false
  },

  /**
   * 生命周期函数 - 页面加载时自动执行
   */
  onLoad: function () {
    wx.hideHomeButton()
    /**
     * 1. 获取验证码
     * GET 请求 https://www.alevel.com.cn/captcha/ 页面，将图片通过base64临时储存并传入前端
     */
    let that = this
    wx.request({
      url: 'https://www.alevel.com.cn/captcha/',
      responseType: 'arraybuffer', //！Important
      success(res) {
        const base64 = wx.arrayBufferToBase64(res.data);
        that.setData({
          cookies: res.cookies, //登陆页使用临时cookie
          imageSrc: "data:image/png;base64," + base64,
          tempImg: base64,
        })
        wx.cloud.callFunction({
          name: 'maintainLoginState',
          data: {
            img: that.data.tempImg
          },
          success: function (res) {
            console.log(res.result.captcha)
            that.setData({
              "getCaptcha": res.result.captcha,
              "tempCaptcha": res.result.captcha
            })
          }
        })
      }
    })



    /**
     * 2. 填入微信Storage内信息（sid及密码（如有））
     */
    const res = wx.getStorageInfoSync()
    if (res.keys.indexOf('sid') != -1) { //检测是否有保存的SID
      var sid = wx.getStorageSync('sid')
      this.setData({
        getSid: sid,
        initialSid: sid
      })
    }
    if (res.keys.indexOf('password') != -1) { //检测是否有保存的密码
      var password = wx.getStorageSync('password')
      this.setData({
        getPassword: password,
        initialPassword: password,
        initialSaveStatus: true, //若有保存密码，则默认继续保存密码
        savePassword: true
      })
    }


  },

  /**
   * 用户点击Login按钮后处理登陆
   * （以下所有网络请求均需要验证码步骤得到的临时cookie）
   */
  loginFunc: function () {
    /**
     * 0. 显示加载浮层
     */
    this.setData({
      loadModal: true
    })
    let that = this

    /**
     * 1. 使用用户输入的sid
     * POST请求https://www.alevel.com.cn/user/encryption/页面
     * 获取加密盐及Nosence，若返回错误则提示用户id不存在
     */
    wx.request({
      header: {
        'if-modified-since': "0",
        'content-type': "application/x-www-form-urlencoded",
        'accept': "*/*",
        'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": that.data.cookies[0]
      },
      method: "POST",
      data: {
        "psid": that.data.getSid
      },
      url: 'https://www.alevel.com.cn/user/encryption/',
      success(res) {
        that.setData({
          cookies: res.cookies, //维护Cookie
          nosence: res.data.nosence, //储存Nosence
          salt: res.data.salt //密码盐
        })

        if (res.data.status == "False") { //未找到SID
          that.setData({
            errMsg: "Error - SID Not found\n",
            loadModal: false
          })
          return //终止登陆操作
        }

        /**
         * 2. 本地加密用户密码
         * 加密后字符串为「盐+MD5（盐+密码）」
         */
        var utilMd5 = require('../../utils/md5.js')
        var password = res.data.salt + utilMd5.hexMD5(res.data.salt + that.data.getPassword).toUpperCase()

        /**
         * 3. 登陆
         * 由于微信不支持截断302且转发不带cookie，这里使用了云函数（node）
         * 将cookie，sid，nosence，加密后密码和验证码传入loginInterrace云函数
         * 处理云函数返回并跳转页面
         */
        wx.cloud.callFunction({
          name: 'loginInterface',
          data: {
            cookie: res.cookies[0],
            sid: that.data.getSid,
            nosence: res.data.nosence,
            password: password,
            captcha: that.data.getCaptcha,
          },
          success: function (res) {
            if (res.result.stats == "ok") { //登陆成功

              if (that.data.savePassword) { //用户选择了保存密码
                wx.setStorageSync('password', that.data.getPassword) //注意存入的是明文
              } else { //用户未选择保存密码
                try {
                  wx.removeStorageSync('password') //删除可能存在的密码，若用户未储存会报错所以使用了try
                } catch (e) {} //注意node8这里不能删掉传参
              }

              var tempCookies = res.result.c["set-cookie"].join(" ") //方便后续使用把返回的数组拼接成字符串

              //存入storage
              wx.setStorageSync('sid', that.data.getSid.toLowerCase()) //!important 一定要换成小写不然部分接口会有问题
              wx.setStorageSync('cookies', tempCookies)

              //跳转到首页
              wx.redirectTo({
                url: '/pages/index/index'
              })
            } else {
              that.setData({ //登陆失败
                loadModal: false,
                errMsg: "Error - " + res.result.errMsg + "\n",
              })
            }
          },
          fail: function (error) { //网络请求失败
            console.log(error)
            that.setData({
              errMsg: "Error - Connection Failed\n",
              loadModal: false
            })
          }
        })
        /** 
         * 下面为预留代码，若微信开放302截断可跳过云函数
        wx.request({
          header: {
            'if-modified-since': "0",
            'content-type': "application/x-www-form-urlencoded",
            'accept-language': "zh-CN,zh;q=0.9,en;q=0.8",
            "Cookie": res.cookies[0],
            "Cache-Control": "no-cache"
          },
          method: "POST",
          data: {
            "psid": that.data.getSid,
            "nosence": res.data.nosence,
            "passwd": password,
            "authnum": that.data.getCaptcha,
            "post": "登 录/Login"
          },
          url: 'https://www.alevel.com.cn/login/',
          success(res) {
            if(res.statusCode == 302) {
              console.log("登陆成功，写入全局cookie中")
              that.setData({
                cookies: res.cookies,
              })
              return 0
            }
          }
        })*/
      }
    })

    /**
     * 4. 刷新验证码
     */
    wx.request({
      url: 'https://www.alevel.com.cn/captcha/',
      responseType: 'arraybuffer',
      success(res) {
        console.log(res.data)
        const base64 = wx.arrayBufferToBase64(res.data);
        that.setData({
          cookies: res.cookies,
          imageSrc: "data:image/png;base64," + base64,
          tempImg: base64,
        })
        wx.cloud.callFunction({
          name: 'maintainLoginState',
          data: {
            img: that.data.tempImg
          },
          success: function (res) {
            console.log(res.result.captcha)
            that.setData({
              "getCaptcha": res.result.captcha,
              "tempCaptcha": res.result.captcha
            })
          }
        })
      }
    })



  },


  /**
   * 保存密码Switch监听
   * e 「object」
   */
  savePassword: function (e) {
    console.log(e)
    this.setData({
      savePassword: e.detail.value
    })
  },

  /**
   * Captcha输入监听
   * e 「object」
   */
  getCaptcha: function (e) {
    this.setData({
      getCaptcha: e.detail.value
    })
  },

  /**
   * Sid输入监听
   * e 「object」
   */
  getSid: function (e) {
    this.setData({
      getSid: e.detail.value
    })
  },

  /**
   * Password输入监听
   * e 「object」
   */
  getPassword: function (e) {
    this.setData({
      getPassword: e.detail.value
    })
  },

})