Page({
  data: {
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
    currentTab: 0,
    tabs: [
      { name: '首页', url: '/pages/home/home' },
      { name: '古文搜索', url: '/pages/search/classic' },
      { name: '古诗搜索', url: '/pages/search/poem' },
      { name: '内容搜索', url: '/pages/search/content' },
      { name: '解析', url: '/pages/analysis/index' },
      { name: '可视化', url: '/pages/visualization/index' }
    ]
  },

  onLoad() {
    this.setData({ statusBarHeight: wx.getSystemInfoSync().statusBarHeight });
  },

  switchTab(e) {
    const { url } = e.currentTarget.dataset;
    const index = e.currentTarget.dataset.index;
    
    this.setData({ currentTab: index });
    
    wx.navigateTo({
      url: url,
      success: () => {
        console.log(`跳转到${this.data.tabs[index].name}页面`);
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '页面开发中', icon: 'none' });
      }
    });
  }
})