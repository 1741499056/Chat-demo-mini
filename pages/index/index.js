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
      ContentSearch: { path: '/pages/ContentSearch/ContentSearch', type: 'page' },
      aichat:{path:'/pages/AIchat-konwledge/AIchat-konwledge',type:'page'},
      currentGrade: "全年级"
    }
  },

  //  页面每次显示时判断年级
  onShow() {
    // 先检查全局登录状态
    const isLoggedIn = app.globalData.isLoggedIn || false;
    this.setData({ isLoggedIn });

    // 若已登录，读取注册时保存的年级信息
    if (isLoggedIn) {
      this.getRegisteredGrade();
    } else {
      // 未登录：强制显示“全年级”
      this.setData({ currentGrade: "全年级" });
    }
  },

  // 3. 读取注册时的年级信息（全局+本地存储双重校验，防止数据丢失）
  getRegisteredGrade() {
    // 方式1：从全局读取（注册页登录/注册成功后已存入）
    const globalGradeName = app.globalData.userGradeName;
    const globalGradeId = app.globalData.userGradeId;

    // 方式2：从本地存储读取（全局数据丢失时兜底，注册页已存userInfo）
    const localUserInfo = wx.getStorageSync('userInfo') || {};
    const localGradeName = localUserInfo.gradeName;

    // 判断逻辑：有注册时的年级信息（且不是模拟登录），才显示注册年级
    if ((globalGradeId && globalGradeName) || localGradeName) {
      // 优先用全局数据，全局没有则用本地数据
      const targetGrade = globalGradeName || localGradeName;
      this.setData({ currentGrade: targetGrade });
    } else {
      // 无注册年级（如微信/QQ模拟登录无年级）：显示“全年级”
      this.setData({ currentGrade: "全年级" });
    }
  },

    // 4. 点击年级区域跳转（暂时不做修改界面，保留跳转逻辑即可）
    navigateToGradeSelect() {
      if (this.data.isLoggedIn) {
        wx.navigateTo({
          // 跳转地址可先占位，后续做修改页时替换
          url: '/pages/index_gradeselect/index_gradeselect?currentGrade=' + this.data.currentGrade
        });
      } else {
        // 未登录：提示登录（或直接跳转登录页，和原有登录逻辑一致）
        wx.showToast({
          title: '请先登录后修改年级',
          icon: 'none'
        });
        app.globalData.targetRoute = { path: '/pages/index_gradeselect/index_gradeselect', type: 'page' };
        wx.navigateTo({ url: '/pages/login/login?source=index&forceLogin=true' });
      }
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