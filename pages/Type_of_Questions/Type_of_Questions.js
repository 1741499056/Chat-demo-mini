// 添加全局 app 引用
const app = getApp();

Page({
  data: {
    isLoading: false,
    loadError: false,
    errorMsg: '',
  },

  // 登录检查方法
  checkLogin() {
    // 未登录处理
    if (!app.globalData.token) {
      this.setData({
        isLoading: false,
        loadError: true,
        errorMsg: '请先登录'
      }); 
    
      // 设置登录成功后要返回的页面
      app.globalData.targetRoute = {
        path: '/pages/sentencesegmentation/sentencesegmentation',
        type: 'page'
      };
    
      wx.navigateTo({
        url: '/pages/login/login',
      });
      return false; // 未登录返回false
    }
    return true; // 已登录返回true
  },

  // 跳转到 高考 课外 文言文 真题页面
  navigateToWord() {
    if (!this.checkLogin()) return; // 先检查登录
    wx.navigateTo({
      url: '/pages/gaokaoList/gaokaoList'
    });
  },

  // 跳转到 高考 课外 古诗文鉴赏 页面
  navigateToPoetryAppreciationList() {
    if (!this.checkLogin()) return; // 先检查登录
    wx.navigateTo({
      url: '/pages/PoetryAppreciationList/PoetryAppreciationList'
    });
  },

  // 跳转到 初高中 课内文章 真题页面
  navigateToSentenceSegmentation() {
    if (!this.checkLogin()) return; // 先检查登录
    wx.navigateTo({
      url: '/pages/tbQuestion/tbQuestion'
    });
  },

  // 跳转到 初高中 古诗情景默写 页面
  navigateToPoemDictationList() {
    if (!this.checkLogin()) return; // 先检查登录
    wx.navigateTo({
      url: '/pages/PoemDictationList/PoemDictationList'
    });
  },
  
  // 返回首页
  navigateToIndex() {
    // 首页可根据需求决定是否需要登录检查
    wx.navigateTo({
      url: '/pages/index_v1/index_v1'
    });
  }
});