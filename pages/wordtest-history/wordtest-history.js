const app = getApp();

Page({
  data: {
    historyList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true,
    deleting: false,
  },

  onLoad() {
    this.loadData();
  },

  /**
   * 加载历史数据
   * 路径已清理：'/api/ai/questions-history' -> '/ai/questions-history'
   */
  loadData() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    
    wx.showLoading({ title: '加载中' });
    
    app.authRequest({
      url: '/ai/questions-history', // 清理冗余 /api
      method: 'GET',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      // 无损保留原业务逻辑
      if (res.statusCode === 200 && res.data && res.data.code === 1) {
        const data = res.data.data;
        
        const rows = data.rows.map(item => ({
          ...item,
          formattedTime: this.formatTime(item.generatedAt)
        }));
        
        this.setData({
          historyList: this.data.page === 1 ? rows : [...this.data.historyList, ...rows],
          total: data.total,
          hasMore: this.data.historyList.length + rows.length < data.total
        });
      } else {
        this.handleError('加载失败：' + (res.data?.msg || '请求失败'));
      }
    }).catch(err => {
      this.handleError('加载失败：' + (err.errMsg || '未知错误'));
    }).finally(() => {
      this.setData({ loading: false });
      wx.hideLoading();
    });
  },

  /**
   * 删除记录
   * 路径已清理：'/api/ai/deleteQuestions' -> '/ai/deleteQuestions'
   */
  deleteRecord(e) {
    const sessionId = e.currentTarget.dataset.sessionid;
    
    if (this.data.deleting) {
      wx.showToast({ title: '正在删除，请稍候', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？此操作不可恢复',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          this.setData({ deleting: true });
          
          app.authRequest({
            url: `/ai/deleteQuestions?sessionId=${sessionId}`, // 清理冗余 /api
            method: 'DELETE',
          }).then(res => {
            console.log('删除接口响应:', res);
            
            if (res.statusCode === 200 && res.data && res.data.code === 1) {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              });
              
              const newHistoryList = this.data.historyList.filter(
                item => item.sessionId !== sessionId
              );
              
              const removedCount = this.data.historyList.length - newHistoryList.length;
              
              this.setData({
                historyList: newHistoryList,
                total: Math.max(0, this.data.total - removedCount)
              });
            } else {
              this.handleError('删除失败：' + (res.data?.msg || '接口错误'));
            }
          }).catch(err => {
            console.error('删除失败:', err);
            this.handleError('删除失败：' + (err.errMsg || '网络错误'));
          }).finally(() => {
            this.setData({ deleting: false });
          });
        }
      }
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.loadData();
      });
    }
  },

  // 查看题目详情 (注：此处为页面跳转，未做 app.authRequest 改动)
  viewQuestions(e) {
    const sessionId = e.currentTarget.dataset.sessionid;
    wx.navigateTo({
      url: `/api/pages/test-item/test-item?sessionId=${sessionId}`
    });
  },

  // 格式化时间函数
  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.slice(5, 16);
  },

  // 错误处理
  handleError(msg) {
    wx.showToast({
      title: msg,
      icon: 'none',
      duration: 3000
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      historyList: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadData(); // 内部有 finally 会处理 hideLoading，此处只需停止下拉动作
      wx.stopPullDownRefresh();
    });
  },

  // 上拉加载
  onReachBottom() {
    this.loadMore();
  }
});