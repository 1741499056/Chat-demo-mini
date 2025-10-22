const app = getApp();

Page({
  data: {
    title: "灵枢诗鉴\n有趣的古诗分享平台",
    activeType: 'phone',
    canLogin: true,
    phone: '',
    password: '',
    code: '',
    countdown: 0,
    canGetCode: false,
    forceLogin: false,
    registering: false,
    // 年级相关数据
    gradeList: [], // 年级列表
    selectedGradeId: null, // 选中的年级ID
    gradeName: '请选择年级', // 显示的年级名称
    gradeIndex: -1, // picker选中的索引
    redirectUrl: null // 添加重定向URL存储
  },

  onLoad(options) {
    // 获取强制登录参数
    if (options.forceLogin === 'true') {
      this.setData({
        forceLogin: true
      });
    }
    
    // 保存重定向URL
    if (options.redirect) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirect)
      });
    }
    
    // 获取年级列表
    this.getGradeList();
  },
  
  // 获取年级列表 - 直接使用接口数据
  getGradeList() {
    const apiUrl = `${app.globalData.apiBaseUrl}/api/getGradeList`;
    
    wx.showLoading({
      title: '加载中...',
    });
    
    wx.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        console.log('年级列表响应:', res);
        
        if (res.data && res.data.code === 1) {
          // 直接使用接口返回的数据，不进行过滤
          const gradeList = res.data.data || [];
          this.setData({
            gradeList: gradeList
          });
          console.log('获取年级列表成功:', gradeList);
        } else {
          const errorMsg = res.data?.msg || '获取年级列表失败';
          console.error('获取年级列表失败:', errorMsg);
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('获取年级列表网络错误:', error);
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
      }
    });
  },

  // 选择年级
  onGradeChange(e) {
    const index = parseInt(e.detail.value);
    const gradeList = this.data.gradeList;
    
    if (index >= 0 && index < gradeList.length) {
      const selectedGrade = gradeList[index];
      this.setData({
        gradeIndex: index,
        selectedGradeId: selectedGrade.id,
        gradeName: selectedGrade.name
      });
      console.log('选中年级:', selectedGrade);
    }
  },

  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      activeType: type
    });
    this.checkLoginStatus();
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
    this.setData({
      phone: e.detail.value
    });
    this.checkLoginStatus();
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

  // 登录请求方法
  loginRequest() {
    // 添加加载状态
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    const startTime = Date.now();
    console.log(`登录请求开始: ${new Date().toLocaleTimeString()}`);
    
    // 使用全局配置的域名
    const apiUrl = `${app.globalData.apiBaseUrl}/api/users/login`;
    
    wx.request({
      url: apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        username: this.data.phone,
        password: this.data.password
      },
      timeout: 10000,
      success: (res) => {
        if (typeof res !== 'object' || res === null) {
          console.error('登录请求返回无效响应', res);
          return this.showLoginError('服务器返回了空响应');
        }
        
        console.log('完整登录响应:', res);
        const responseData = res.data || {};
        
        console.log(`响应状态码: ${res.statusCode}`);
        console.log('响应数据:', responseData);
        
        if (responseData.code === 1 && responseData.data) {
          // 存储用户信息 - 根据图片中的新数据格式更新
          const userInfo = { 
            username: this.data.phone,
            phone: this.data.phone,
            token: responseData.data.token,
            id: responseData.data.id,
            gradeId: responseData.data.gradeId,        // 新增字段
            gradeName: responseData.data.gradeName    // 新增字段
          };
          
          console.log('存储的用户信息:', userInfo);
          
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('token', responseData.data.token);
          
          // 设置全局登录状态
          app.globalData.isLoggedIn = true;
          app.globalData.token = responseData.data.token;
          app.globalData.userPhone = this.data.phone;
          app.globalData.userGradeId = responseData.data.gradeId;      // 新增
          app.globalData.userGradeName = responseData.data.gradeName;  // 新增
          
          // 设置登录状态
          console.log('调用setLoginStatus');
          app.setLoginStatus(responseData.data.token);
          
          wx.showToast({
            title: '登录成功',
            icon:'success'
          });
          
          // 登录成功后重定向
          this.redirectAfterLogin();
        } else {
          const errorMsg = responseData.message || '账号或密码错误';
          console.error('登录失败:', errorMsg);
          this.showLoginError(errorMsg);
        }
      },
      fail: (error) => {
        const endTime = Date.now();
        console.error(`登录请求失败（耗时${endTime - startTime}ms）:`, error);
        this.showLoginError('网络连接失败');
      },
      complete: () => {
        wx.hideLoading();
        const endTime = Date.now();
        console.log(`登录请求完成（耗时${endTime - startTime}ms）`);
      }
    });
  },
  
  // 显示登录错误
  showLoginError(message) {
    console.error('登录错误:', message);
    wx.showModal({
      title: '登录失败',
      content: message,
      showCancel: false,
      confirmText: '重试'
    });
  },

  // 注册请求
  register() {
    if (this.data.registering) return;

    // 表单验证
    if (!this.validateUsername(this.data.phone)) {
      return this.showRegisterError('请输入正确的用户名');
    }

    if (this.data.password.length < 6) {
      return this.showRegisterError('密码长度至少6位');
    }

    // 验证是否选择了年级
    if (!this.data.selectedGradeId) {
      return this.showRegisterError('请选择年级');
    }

    // 验证不能选择"全部"年级
    if (this.data.selectedGradeId === 0) {
      return this.showRegisterError('请选择具体的年级，不能选择"全部"');
    }

    this.setData({ registering: true });
    wx.showLoading({
      title: '注册中...',
      mask: true
    });

    // 使用全局配置的域名
    const apiUrl = `${app.globalData.apiBaseUrl}/api/users/register`;

    wx.request({
      url: apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        username: this.data.phone,
        password: this.data.password,
        gradeId: this.data.selectedGradeId
      },
      timeout: 10000,
      success: (res) => {
        if (!res || typeof res !== 'object') {
          console.error('注册请求返回无效响应', res);
          return this.showRegisterError('服务器返回了空响应');
        }

        const responseData = res.data || { code: -1, message: '服务器返回的数据格式不正确' };
        console.log('完整注册响应:', responseData);

        if (responseData.code === 1) {
          console.log('注册成功（code === 1），消息:', responseData.msg);

          // 注册成功后自动设置年级
          this.setUserGrade(this.data.selectedGradeId, () => {
            wx.showToast({
              title: responseData.msg || '注册成功',
              icon: 'success'
            });

            setTimeout(() => {
              this.setData({ registering: false });
              
              // 注册成功后重定向
              this.redirectAfterLogin();
            }, 1500);
          });

        } else {
          const errorMsg = responseData.message || '注册失败';
          console.error('注册失败:', errorMsg);
          this.showRegisterError(errorMsg);
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('注册请求失败:', error);
        this.showRegisterError('网络连接失败');
      },
      complete: () => {
        this.setData({ registering: false });
        wx.hideLoading();
      }
    });
  },

  // 设置用户年级 - 根据图片中的接口信息修正URL
  setUserGrade(gradeId, callback) {
    
    const apiUrl = `${app.globalData.apiBaseUrl}/api/users/grade`;
    const token = app.globalData.token || wx.getStorageSync('userInfo')?.token;
    
    if (!token) {
      console.warn('未找到token，跳过设置年级');
      callback && callback();
      return;
    }

    wx.request({
      url: apiUrl,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'token': token
      },
      data: {
        gradeId: gradeId
      },
      success: (res) => {
        if (res.data && res.data.code === 1) {
          console.log('年级设置成功');
          // 更新本地存储的用户信息
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.gradeId = gradeId;
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.userGradeId = gradeId;
        } else {
          console.warn('年级设置接口返回异常:', res.data);
        }
      },
      fail: (error) => {
        console.error('设置年级网络错误:', error);
      },
      complete: () => {
        callback && callback();
      }
    });
  },
  
  // 显示注册错误
  showRegisterError(message) {
    console.error('注册错误:', message);
    wx.showModal({
      title: '注册失败',
      content: message,
      showCancel: false,
      confirmText: '重试'
    });
  },

  // 微信登录
  loginWithWechat() {
    wx.showLoading({
      title: '微信登录中...',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      
      const wechatUserInfo = { 
        username: '微信用户',
        phone: '模拟手机号',
        token: 'wechat_token_' + Date.now(),
        id: 'wechat_user_' + Math.random().toString(36).substring(2, 8)
      };
      
      wx.setStorageSync('userInfo', wechatUserInfo);
      wx.setStorageSync('token', 'wechat_token_' + Date.now());
      
      const app = getApp();
      app.globalData.isLoggedIn = true;
      app.globalData.token = 'wechat_token_' + Date.now();
      app.globalData.userPhone = '模拟手机号';
      
      app.setLoginStatus('wechat_token_' + Date.now());
      
      wx.showToast({
        title: '微信登录成功',
        icon:'success'
      });
      
      // 微信登录成功后重定向
      this.redirectAfterLogin();
    }, 1500);
  },

  // QQ登录
  loginWithQQ() {
    wx.showLoading({
      title: 'QQ登录中...',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      
      const qqUserInfo = { 
        username: 'QQ用户',
        phone: '模拟手机号',
        token: 'qq_token_' + Date.now(),
        id: 'qq_user_' + Math.random().toString(36).substring(2, 8)
      };
      
      wx.setStorageSync('userInfo', qqUserInfo);
      wx.setStorageSync('token', 'qq_token_' + Date.now());
      
      const app = getApp();
      app.globalData.isLoggedIn = true;
      app.globalData.token = 'qq_token_' + Date.now();
      app.globalData.userPhone = '模拟手机号';
      
      app.setLoginStatus('qq_token_' + Date.now());
      
      wx.showToast({
        title: 'QQ登录成功',
        icon:'success'
      });
      
      // QQ登录成功后重定向
      this.redirectAfterLogin();
    }, 1500);
  },

  // 忘记密码
  navigateToForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password'
    });
  },

  // 隐私政策
  navigateToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 验证用户名
  validateUsername(username) {
    const reg = /^[a-zA-Z0-9]{3,}$/;
    return reg.test(username);
  },

  // 验证手机号
  validatePhone(phone) {
    const reg = /^1[3-9]\d{9}$/;
    return reg.test(phone);
  },

  // 检查登录按钮状态
  checkLoginStatus() {
    if (this.data.activeType === 'phone') {
      this.setData({
        canLogin: this.validatePhone(this.data.phone) && 
                  this.data.password.length >= 3
      });
    } else {
      this.setData({
        canLogin: this.validatePhone(this.data.phone) && 
                  this.data.code.length === 6
      });
    }
  },

  // 获取每日一诗
  getDailyPoem() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 获取断句知识点
  getsentence() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },
  
  // 登录成功后重定向
  redirectAfterLogin: function() {
    if (this.data.redirectUrl) {
      // 使用重定向URL跳转
      wx.redirectTo({
        url: this.data.redirectUrl
      });
    } else {
      // 没有重定向URL则跳转到背诵页面
      wx.redirectTo({
        url: '/pages/index/index'
      });
    }
  }
});