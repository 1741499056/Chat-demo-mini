Page({
  // 跳转到词语查询页面
  navigateToWord() {
    wx.navigateTo({
      url: '/pages/word/word'
    })
  },

  // 跳转到断句训练页面
  navigateToSentenceSegmentation() {
    wx.navigateTo({
      url: '/pages/sentencesegmentation/sentencesegmentation'
    })
  },
  
  // 返回首页
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    })
  },
  
  // 新增功能页面分享功能（好友分享）
  onShareAppMessage() {
    return {
      title: '文学工具集 | 词语查询与断句训练',
      path: '/pages/AI/AI', // 分享后跳转到首页
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 新增功能页面朋友圈分享功能
  onShareTimeline() {
    return {
      title: 'ai学习工具',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
})