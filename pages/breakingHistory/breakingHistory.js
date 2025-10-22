Page({
  data: {
    historyList: []
  },
  onLoad() {
    this.fetchBreakingHistory();
  },
  fetchBreakingHistory() {
    wx.request({
      url: 'https://zhixunshiyun.yezhiqiu.cn:8848/sentence-breaking/answer',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 1) {
          this.setData({
            historyList: res.data.data
          });
        } else {
          wx.showToast({
            title: '获取历史记录失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
  showDetail(event) {
    const id = event.currentTarget.dataset.id;
    // 这里可以添加逻辑来展示详细信息，例如跳转到详情页
    wx.showToast({
      title: `查看ID为 ${id} 的详细信息`,
      icon: 'none'
    });
  }
});