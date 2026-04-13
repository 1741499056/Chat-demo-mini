const app = getApp();

Page({
  data: {
    gaokaoQuestions: [], 
    totalCount: 0, 
    totalPages: 0,
    currentPage: 1,
    pageSize: 6,
    
    isLoading: false,
    loadError: false,
    errorMsg: '',
  },

  onLoad() {
    this.fetchQuestions();
  },

  fetchQuestions() {
    const { currentPage, pageSize } = this.data;

    this.setData({
      isLoading: true,
      loadError: false,
      errorMsg: '',
      gaokaoQuestions: [],
    });

    if (!app.globalData.token) {
      this.setData({ isLoading: false, loadError: true, errorMsg: '请先登录' });
      app.globalData.targetRoute = { path: '/pages/PoetryAppreciationList/PoetryAppreciationList', type: 'page' };
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    // 更新接口地址与参数
    app.authRequest({
      url: '/api/questions/exam/materials', // 新接口地址
      method: 'GET',
      data: {
        page: currentPage,   
        pageSize: pageSize,
        grade: 1 // 固定传 1
      }
    }).then(res => {
      if (res.statusCode === 200) {
        if (res.data && String(res.data.code) === '1') {
          const total = res.data.data.total || 0;
          const rows = res.data.data.rows || [];
          const totalPages = Math.ceil(total / this.data.pageSize);

          this.setData({
            gaokaoQuestions: rows, 
            totalCount: total,
            totalPages: totalPages
          });
        } else {
          this.setData({
            loadError: true,
            errorMsg: res.data?.msg || '获取数据失败'
          });
        }
      } else if (res.statusCode === 401) {
        this.handleUnauthorized();
      } else {
        this.setData({
          loadError: true,
          errorMsg: `请求失败，状态码：${res.statusCode}`
        });
      }
    }).catch(err => {
      this.setData({
        loadError: true,
        errorMsg: '网络请求失败: ' + (err?.errMsg || '未知错误')
      });
    }).finally(() => {
      this.setData({ isLoading: false });
    });
  },

  handleUnauthorized() {
    this.setData({ loadError: true, errorMsg: '登录信息已过期' });
    wx.removeStorageSync('userInfo');
    app.globalData.targetRoute = { path: '/pages/gaokaoList/gaokaoList', type: 'page' };
    wx.navigateTo({ url: '/pages/login/login' });
  },

  retryFetch() {
    this.fetchQuestions();
  },

  goToQuestionDetail(e) {
    // 适配新字段 id
    const { id, title } = e.currentTarget.dataset;
    if (id) {
      wx.navigateTo({
        // 路径更新为新的详情页路径，参数名统一为 id
        url: `/pages/PoetryAppreciationQuestions/PoetryAppreciationQuestions?id=${id}&title=${encodeURIComponent(title)}`
    });
    } else {
        wx.showToast({ title: '题目ID缺失', icon: 'error' });
    }
  },
  
  changePage(newPage) {
    const page = parseInt(newPage);
    if (page >= 1 && page <= this.data.totalPages) {
      this.setData({ currentPage: page }, () => {
        this.fetchQuestions();
      });
    }
  },

  prevPage() {
    if (this.data.currentPage > 1) this.changePage(this.data.currentPage - 1);
  },

  nextPage() {
    if (this.data.currentPage < this.data.totalPages) this.changePage(this.data.currentPage + 1);
  }
});