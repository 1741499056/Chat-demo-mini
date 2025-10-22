Page({
  data: {
    isCollapsed: false,
    directoryTitle: '',       // 从接口获取
    categoryList: [],         // 从接口获取
    currentStrategy: {}       // 当前选中的计策
  },

  onLoad: function() {
    this.loadDirectoryData();
  },

  // 从接口加载目录数据
  loadDirectoryData: function() {
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: 'https://your-api-domain.com/api/thirty-six-strategies',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success) {
          // 初始化展开状态
          const data = res.data.data.map(item => ({
            ...item,
            expanded: false
          }));
          
          this.setData({
            directoryTitle: res.data.title || '三十六计',
            categoryList: data
          });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 加载具体计策内容
  loadStrategyContent: function(strategyId) {
    wx.request({
      // url: `https://your-api-domain.com/api/strategy-detail?id=${strategyId}`,
      success: (res) => {
        if (res.data && res.data.success) {
          this.setData({
            currentStrategy: res.data.data
          });
        }
      }
    });
  },

  // 切换目录展开/收缩
  toggleDirectory: function() {
    this.setData({
      isCollapsed: !this.data.isCollapsed
    });
  },

  // 切换分类展开/收缩
  toggleCategory: function(e) {
    const index = e.currentTarget.dataset.index;
    const key = `categoryList[${index}].expanded`;
    this.setData({
      [key]: !this.data.categoryList[index].expanded
    });
  },

  // 选择具体计策
  selectStrategy: function(e) {
    const categoryIndex = e.currentTarget.dataset.category;
    const itemIndex = e.currentTarget.dataset.index;
    const selected = this.data.categoryList[categoryIndex].subItems[itemIndex];
    
    this.setData({
      currentStrategy: { title: selected.title } // 先显示标题
    });
    
    // 从接口加载详细内容
    this.loadStrategyContent(selected.id);
  }
});