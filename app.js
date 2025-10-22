// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-2gosjb1o2ccd896a', // 你的云开发环境ID
        traceUser: true, // 可选，记录用户访问
      });
      console.log('云开发初始化完成');
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }

    // 你原有的其他启动逻辑保持不变
    // 每次启动小程序时重置登录状态
    this.globalData.token = '';
    this.globalData.isLoggedIn = false;
    this.globalData.targetRoute = null;
    
    // 清除存储的用户信息
    wx.removeStorageSync('userInfo');
    
    // 初始化OSS配置
    this.globalData.ossConfig = {
      baseUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com',
      bookPath: 'books'
    };
    
    // 设置API基础域名
    this.globalData.apiBaseUrl = 'https://zhixunshiyun.yezhiqiu.cn';

    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  
  // 获取OSS图片路径
  getOSSImagePath(filename) {
    const { baseUrl, bookPath } = this.globalData.ossConfig;
    const encodedFilename = encodeURIComponent(filename);
    return `${baseUrl}/${bookPath}/${encodedFilename}`;
  },

  // 全局方法：自动为请求添加token 同时添加基础域名
  authRequest(params) {
    const token = this.globalData.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'token': token
    };
    
    // 自动添加基础域名
    const fullUrl = `${this.globalData.apiBaseUrl}${params.url.startsWith('/') ? '' : '/'}${params.url}`;
    
    params.url = fullUrl;
    params.header = {...headers, ...(params.header || {})};
    
    return new Promise((resolve, reject) => {
      wx.request({
        ...params,
        success: (res) => res.statusCode === 200 ? resolve(res) : reject(res),
        fail: reject
      });
    });
  },
  
  // 设置登录状态并跳转
  setLoginStatus(token) {
    this.globalData.isLoggedIn = true;
    this.globalData.token = token;
    
    // 持久化存储
    wx.setStorageSync('userInfo', { token });
  
    // 登录成功后跳转逻辑
    if (this.globalData.targetRoute) {
      const route = this.globalData.targetRoute;
      this.globalData.targetRoute = null;
      
      console.log('[跳转] 目标页面:', route.path, '类型:', route.type);
      
      // 根据页面类型选择跳转方式
      if (route.type === 'tabBar') {
        wx.switchTab({ url: route.path });
      } else {
        wx.navigateTo({ url: route.path });
      }
    } else {
      console.log('[跳转] 无目标页面，返回首页');
      wx.switchTab({ url: '/pages/index/index' });
    }
  },
  
  // 退出登录
  logout() {
    this.globalData.token = '';
    this.globalData.isLoggedIn = false;
    this.globalData.targetRoute = null;
    
    // 清除存储的用户信息
    wx.removeStorageSync('userInfo');
    
    // 返回首页
    wx.switchTab({ url: '/pages/index/index' });
  },
    
  globalData: {
    token: '',
    isLoggedIn: false,
    targetRoute: null,   // 存储{ path, type }对象
    apiBaseUrl: 'https://zhixunshiyun.yezhiqiu.cn/api', // 全局API基础域名
    ossConfig: null // 会在onLaunch中初始化
  },

  // 全局默认分享配置
  onShareAppMessage() {
    return {
      title: '灵藏万卷鸣金石,柩启重霄漱玉蟾',
      path: '/pages/DailyPoem/DailyPoem',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 全局朋友圈分享默认配置
  onShareTimeline() {
    return {
      title: '开启诗意生活',
      query: '',
      imageUrl: '/images/global_timeline.jpg'
    }
  }
});