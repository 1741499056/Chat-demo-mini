// pages/index/index.js
const app = getApp();

Page({
  data: {
    // 页面路径映射表 - 增加页面类型标记
    routes: {
      Books: { path: '/pages/guwen/guwen', type: 'tabBar' },
      bookssearch: { path: '/pages/logs/logs', type: 'tabBar' },
      poem: { path: '/pages/poem/poem', type: 'tabBar' },
      word: { path: '/pages/AI/AI', type: 'tabBar' },
      aiword: { path: '/pages/word/word', type: 'page' },
      sentence: { path: '/pages/sentencesegmentation/sentencesegmentation', type: 'page' },
      aisentence: { path: '/pages/sentencetest/sentencetest', type: 'page' },
      // 新增：内容查询路由
      ContentSearch: { path: '/pages/ContentSearch/ContentSearch', type: 'page' }
    }
  },

  onShow() {
    // 页面显示时检查全局登录状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn || false
    });
  },

  navigateTo(e) {
    const targetKey = e.currentTarget.dataset.url;
    const route = this.data.routes[targetKey];
    
    if (!route) {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
      return;
    }
    
    // 特殊处理：断句练习
    if (targetKey === 'aisentence') {
      this.handleSentencePractice();
      return;
    }
    
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      // 已登录，直接跳转到目标页面
      this.directNavigate(route);
    } else {
      // 未登录，存储目标路由信息并强制跳转到登录页面
      app.globalData.targetRoute = route;
      
      wx.navigateTo({
        url: '/pages/login/login?source=index&forceLogin=true'
      });
    }
  },
  
  // 处理断句练习
  handleSentencePractice() {
    // 显示提示
    wx.showModal({
      title: '学习建议',
      content: '建议先学习断句知识再做练习',
      confirmText: '去学习',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认后跳转到断句知识页面
          const sentenceRoute = this.data.routes.sentence;
          
          // 检查是否已登录
          if (app.globalData.isLoggedIn) {
            // 已登录，直接跳转
            this.directNavigate(sentenceRoute);
          } else {
            // 未登录，存储目标路由信息并强制跳转到登录页面
            app.globalData.targetRoute = sentenceRoute;
            
            wx.navigateTo({
              url: '/pages/login/login?source=index&forceLogin=true'
            });
          }
        }
      }
    });
  },
  
  // 直接导航到目标页面
  directNavigate(route) {
    if (route.type === 'tabBar') {
      // 对于tabBar页面使用switchTab
      wx.switchTab({
        url: route.path
      });
    } else {
      // 对于普通页面使用navigateTo
      wx.navigateTo({
        url: route.path
      });
    }
  },
  
  // 新增首页分享功能（好友分享）
  onShareAppMessage() {
    return {
      title: '灵柩诗鉴功能一览',
      path: '/pages/index/index',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 新增首页朋友圈分享功能
  onShareTimeline() {
    return {
      title: '灵柩诗鉴所有功能尽在掌握',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});