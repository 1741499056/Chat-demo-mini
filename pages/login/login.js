Page({
  data: {
    title: "灵枢诗鉴\nAI赋能的古诗文学习平台",
    activeType: 'phone', // 默认手机号登录
    canLogin:true,
    phone: '',
    password: '',
    code: '',
    countdown: 0,
    canGetCode: false,
    canLogin: false
  },
  login:function(){
    wx.switchTab({
      url: '/pages/index/indedx',
    });
  },
  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      activeType: type
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone: phone,
      canGetCode: this.validatePhone(phone)
    });
    this.checkLoginStatus();
  },

  // 用户名输入
  onUsernameInput(e) {
    const phone = e.detail.value;
    this.setData({
      phone: phone,
      canGetCode: this.data.phone.lenth >= 3
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
    this.checkLoginStatus();
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
    this.checkLoginStatus();
  },

  // 获取验证码
  getVerificationCode() {
    if (!this.validatePhone(this.data.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 开始倒计时
    this.setData({
      countdown: 60,
      canGetCode: false
    });

    const timer = setInterval(() => {
      if (this.data.countdown <= 0) {
        clearInterval(timer);
        this.setData({
          countdown: 0,
          canGetCode: true
        });
      } else {
        this.setData({
          countdown: this.data.countdown - 1
        });
      }
    }, 1000);

    // 模拟发送验证码
    console.log('发送验证码到:', this.data.phone);
    wx.showToast({
      title: '验证码已发送',
      icon: 'none'
    });
  },

  getDailyPoem() {
      wx.request({
        url: 'http://121.40.171.211:8090/poem/daily',
        method: 'GET',
        success: (res) => {
          console.log(res.data);
        }
      })

  },

  // 登录
  login() {
    wx.request({
      url: 'http://121.40.171.211:8090/users/login',
      method: 'POST',
      data: {
        username: this.data.phone, // 修改为username参数
        password: this.data.password  // 固定使用password参数
      },
      success: (res) => {
        console.log(res.data);
        if (res.data.code === 1) {
          wx.setStorageSync('userInfo', { 
            username: this.data.phone // 存储用户名而非手机号
          });
          // wx.switchTab({ url: '/pages/index/index' });
          wx.switchTab({
            url: '/pages/index/index'
          });
          // loginWithWechat();
        }
        wx.showToast({ title: res.data.message, icon: 'none' });
      }
    });
  },

  // 注册
  register() {
    wx.request({
      url: 'http://121.40.171.211:8090/users/register',
      method: 'POST',
      data: {
        username: this.data.phone,
        password: this.data.password
      },
      success: (res) => {
        console.log(res.data)
      }
    })
  },

  // 微信登录 - 修改为直接跳转到首页
  loginWithWechat() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // QQ登录 - 修改为直接跳转到首页
  loginWithQQ() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 忘记密码
  navigateToForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password'
    });
  },

  // 注册账号
  navigateToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 隐私政策
  navigateToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 验证手机号
  validatePhone(phone) {
    const reg = /^1[3-9]\d{9}$/;
    return reg.test(phone);
  },

  // 检查登录按钮状态
  checkLoginStatus() {
    if (this.data.activeType === 'phone') {
      // 手机号密码登录
      this.setData({
        // canLogin: this.validatePhone(this.data.phone) && this.data.password.length >= 3
      });
    } else {
      // 验证码登录
      this.setData({
        canLogin: this.validatePhone(this.data.phone) && this.data.code.length === 6
      });
    }
  }
});