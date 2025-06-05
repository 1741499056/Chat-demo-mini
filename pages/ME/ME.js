Page({
  data: {
    activeTab: 'collection' // 当前选中的选项卡
  },

  // 切换选项卡
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  // 清理缓存
  clearCache: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清理缓存吗？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '清理中...',
          });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            });
          }, 1000);
        }
      }
    });
  },

  // 关于我们
  aboutUs: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // 用户协议
  userAgreement: function() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 意见反馈
  feedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  },

  // 隐私安全
  privacy: function() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
});