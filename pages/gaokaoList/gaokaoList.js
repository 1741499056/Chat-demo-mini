// 添加全局 app 引用
const app = getApp();

Page({
  data: {
    gaokaoQuestions: [], 
    // 总题目数/总页数
    totalCount: 0, 
    totalPages: 0,
    // 分页状态
    currentPage: 1, // 当前页码，默认从 1 开始
    pageSize: 6,    // 每页大小，固定为 6
    
    // 状态管理
    isLoading: false,
    loadError: false,
    errorMsg: '',
  },

  onLoad() {
    this.fetchQuestions();
  },

  // ----------------------------------------------------
  // I. 数据获取与处理
  // ----------------------------------------------------

  // 使用统一请求方法获取高考真题列表
  fetchQuestions() {
    const { currentPage, pageSize } = this.data;

    this.setData({
      isLoading: true,
      loadError: false,
      errorMsg: '',
      // 重置列表
      gaokaoQuestions: [],
    });

    // 检查是否已登录 (沿用同事逻辑)
    if (!app.globalData.token) {
      this.setData({
        isLoading: false,
        loadError: true,
        errorMsg: '请先登录'
      });
      
      // 设置登录成功后要返回的页面
      app.globalData.targetRoute = {
        path: '/pages/gaokaoList/gaokaoList',
        type: 'page'
      };
      
      wx.navigateTo({
        url: '/api/pages/login/login',
      });
      return;
    }

    // 使用统一请求方法
    app.authRequest({
      url: '/api/questions/choice_text', // 您的接口地址
      method: 'GET',
      data: {
        page: currentPage,   
        pageSize: pageSize
      }
    }).then(res => {
      //console.log('API Request Success, Full Response:', res);
      if (res.statusCode === 200) {
        if (res.data && String(res.data.code) === '1') {
          const total = res.data.data.total || 0;
          const rows = res.data.data.rows || [];
          
          // 计算总页数
          const totalPages = Math.ceil(total / this.data.pageSize);

          this.setData({
            gaokaoQuestions: rows, // 直接使用 rows 作为题目列表
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
      console.error('API Request Failed (Network/Client Error), Full Error:', err);
      if (err.statusCode === 401) {
        this.handleUnauthorized();
      } else {
        this.setData({
          loadError: true,
          errorMsg: '网络请求失败: ' + (err?.errMsg || '未知错误')
        });
      }
      
    }).finally(() => {
      this.setData({ isLoading: false });
    });
  },

  // ----------------------------------------------------
  // II. 页面操作
  // ----------------------------------------------------

  // 处理未授权情况 (沿用同事逻辑)
  handleUnauthorized() {
    this.setData({
      loadError: true,
      errorMsg: '登录信息已过期，请重新登录'
    });
    wx.removeStorageSync('userInfo');
    
    // 设置登录成功后要返回的页面
    app.globalData.targetRoute = {
      path: '/pages/gaokaoList/gaokaoList',
      type: 'page'
    };
    
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 重试获取数据 (沿用同事逻辑)
  retryFetch() {
    this.fetchQuestions();
  },

  // 题目点击事件 (更新：实现跳转功能)
  goToQuestionDetail(e) {
    // 从 data- 属性中获取 textId 和 title
    const { textid, title } = e.currentTarget.dataset;
    
    // 检查 textId 是否存在
    if (textid) {
        // 使用 wx.navigateTo 跳转到详情页，并传递 textId 参数
        wx.navigateTo({
            url: `/pages/gaokaoQuestions/gaokaoQuestions?textId=${textid}&title=${encodeURIComponent(title)}`
        });
    } else {
        wx.showToast({
            title: '题目ID缺失',
            icon: 'error',
            duration: 2000
        });
    }
  },
  
  // ----------------------------------------------------
  // III. 分页导航
  // ----------------------------------------------------

  // 切换页码
  changePage(newPage) {
    // 确保 newPage 是数字
    const page = parseInt(newPage);
    if (page >= 1 && page <= this.data.totalPages) {
      this.setData({ 
        currentPage: page 
      }, () => {
        this.fetchQuestions();
      });
    }
  },

  // 上一页
  prevPage() {
    const { currentPage } = this.data;
    if (currentPage > 1) {
      this.changePage(currentPage - 1);
    }
  },

  // 下一页
  nextPage() {
    const { currentPage, totalPages } = this.data;
    if (currentPage < totalPages) {
      this.changePage(currentPage + 1);
    }
  }

 
});