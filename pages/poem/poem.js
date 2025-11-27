// 在顶部添加全局 app 引用
const app = getApp();

Page({
  data: {
    searchKeyword: "",
    searchResults: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    loading: false,
    gotoPage: "",
    hasSearched: false,
    lastSearchKeyword: "",
    lastSearchPage: 1,
    pageSize: 10,
    currentGrade: "", // 当前年级名称
    isLoggedIn: false 
  },

  onLoad: function() {
    this.setData({ loading: true });
    this.loadGradeData(); // 加载年级数据
    this.loadPoems(1); // 默认加载古诗列表
  },
  
  onShow: function() {
    // 每次页面显示时重新加载年级数据，并检测年级变化
    this.loadGradeData();
  },

  loadGradeData() {
    // 检查登录状态
    const isLoggedIn = app.globalData.isLoggedIn || wx.getStorageSync('token');
    this.setData({ isLoggedIn });
    
    if (!isLoggedIn) {
      this.setData({ currentGrade: "" });
      return;
    }
    
    // 保存旧的年级用于比较
    const oldGrade = this.data.currentGrade;
    
    // 从全局数据或本地存储获取当前年级
    const globalGrade = app.globalData.userGradeName;
    const storedGrade = wx.getStorageSync('userInfo')?.gradeName;
    let newGrade = "";
    
    if (globalGrade) {
      newGrade = globalGrade;
    } else if (storedGrade) {
      newGrade = storedGrade;
    } else {
      // 如果都没有，尝试从服务器获取
      this.fetchUserGrade();
      return;
    }
    
    // 设置新的年级
    this.setData({
      currentGrade: newGrade
    });
    
    // 如果年级发生变化，重新加载诗词数据
    if (oldGrade !== newGrade && newGrade) {
      console.log('检测到年级变化，重新加载诗词数据', { oldGrade, newGrade });
      this.setData({ 
        currentPage: 1,
        loading: true 
      });
      this.loadPoems(1);
    }
  },

  // 从服务器获取用户年级
  fetchUserGrade() {
    const token = wx.getStorageSync('token') || app.globalData.token;
    if (!token) return;
    
    wx.request({
      url: 'https://zhixunshiyun.yezhiqiu.cn/api/users/info',
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const gradeName = res.data.data.gradeName;
          const oldGrade = this.data.currentGrade;
          
          this.setData({ currentGrade: gradeName });
          
          // 保存到全局数据和本地存储
          app.globalData.userGradeName = gradeName;
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.gradeName = gradeName;
          wx.setStorageSync('userInfo', userInfo);
          
          // 关键：如果年级发生变化，重新加载诗词数据
          if (oldGrade !== gradeName && gradeName) {
            console.log('从服务器获取到新年级，重新加载诗词数据', { oldGrade, newGrade: gradeName });
            this.setData({ 
              currentPage: 1,
              loading: true 
            });
            this.loadPoems(1);
          }
        }
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
      }
    });
  },

  onInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch() {
    const keyword = this.data.searchKeyword.trim();
    
    // 如果关键词为空，加载全部列表
    if (!keyword) {
      this.setData({
        hasSearched: false,
        loading: true,
        currentPage: 1,
        gotoPage: ""
      });
      this.loadPoems(1);
      return;
    }
    
    // 检查是否与上次搜索相同
    const isSameSearch = keyword === this.data.lastSearchKeyword && 
                         this.data.currentPage === this.data.lastSearchPage;
    
    if (!isSameSearch) {
      this.setData({
        currentPage: 1,
        hasSearched: true,
        loading: true,
        gotoPage: "",
        lastSearchKeyword: keyword,
        lastSearchPage: 1
      });
      
      this.searchPoems(keyword, 1);
    }
  },

  onGotoInput(e) {
    this.setData({ gotoPage: e.detail.value });
  },

  goToPrevPage() {
    if (this.data.currentPage <= 1) return;
    const prevPage = this.data.currentPage - 1;
    this.goToPage(prevPage);
  },

  goToNextPage() {
    if (this.data.currentPage >= this.data.totalPages) return;
    const nextPage = this.data.currentPage + 1;
    this.goToPage(nextPage);
  },

  goToSpecifiedPage() {
    let page = parseInt(this.data.gotoPage);
    if (isNaN(page)) {
      wx.showToast({ title: '请输入有效页码', icon: 'none' });
      return;
    }
    
    // 修正超出范围的页码
    if (page < 1) page = 1;
    if (page > this.data.totalPages) page = this.data.totalPages;
    
    this.goToPage(page);
  },
  
  goToPage(page) {
    this.setData({ 
      currentPage: page,
      loading: true,
      gotoPage: "",
      lastSearchPage: page
    });
    
    this.loadDataForPage(page);
  },

  // 统一数据加载方法
  loadDataForPage(page) {
    const { searchKeyword } = this.data;
    const keyword = searchKeyword.trim();
    
    if (keyword) {
      // 关键词搜索模式
      this.searchPoems(keyword, page);
    } else {
      // 默认模式（全部古诗）
      this.loadPoems(page);
    }
  },

  // 加载古诗列表 - 使用 /poemsByGrade 接口
  loadPoems(page) {
    const params = {
      page: page.toString(),
      pageSize: this.data.pageSize.toString(),
      name: "" // 空字符串表示获取全部诗词
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.showLoading({ title: '加载中...', mask: true });
    
    app.authRequest({
      url: `/api/poemsByGrade?${queryString}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.code === 1) {
        this.processPoemData(res.data.data);
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(() => {
      wx.hideLoading();
      this.handleError('网络请求失败');
    });
  },

  // 搜索古诗 - 使用 /poemsByGrade 接口
  searchPoems(keyword, page) {
    const params = {
      page: page.toString(),
      pageSize: this.data.pageSize.toString(),
      name: keyword
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.showLoading({ title: '搜索中...', mask: true });
    
    app.authRequest({
      url: `/api/poemsByGrade?${queryString}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200) {
        if (res.data.code === 1) {
          this.processPoemData(res.data.data, true);
        } else {
          this.handleError(res.data.msg || '搜索失败');
        }
      } else {
        this.handleError(`请求错误: ${res.statusCode}`);
      }
    }).catch(() => {
      wx.hideLoading();
      this.handleError('搜索请求失败');
    });
  },

  // 统一处理数据
  processPoemData(data, isSearch = false) {
    // 确保数据存在
    if (!data || !data.rows) {
      this.setData({
        searchResults: [],
        totalCount: 0,
        totalPages: 1,
        loading: false
      });
      return;
    }

    const poems = data.rows.map(item => {
      const cleanText = (text) => {
        if (!text) return '';
        return text
          .replace(/<[^>]+>/g, '')         // 去除HTML标签
          .replace(/&nbsp;/g, ' ')         // 替换HTML实体
          .replace(/&[a-z]+;/g, '')        // 移除其他HTML实体
          .replace(/\s+/g, ' ')            // 压缩空白字符
          .trim();
      };
      
      const content = 
        cleanText(item.fullAncientContent) || 
        cleanText(item.fullModernContent) || 
        '暂无内容';
      
      return {
        id: item.id,
        title: cleanText(item.name) || '无标题',
        author: cleanText(item.author) || '未知',
        dynasty: cleanText(item.dynasty) || '不详',
        content: content.substring(0, 100) + (content.length > 100 ? '...' : '') // 限制内容长度
      };
    });

    // 计算总页数
    const totalPages = Math.ceil((data.total || 0) / this.data.pageSize);
    
    this.setData({
      searchResults: poems,
      totalCount: data.total || 0,
      totalPages: totalPages > 0 ? totalPages : 1,
      loading: false,
      hasSearched: isSearch
    });
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: "",
      hasSearched: false,
      currentPage: 1
    });
    this.loadPoems(1);
  },

  // 导航到详情页
  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      wx.showToast({ title: '数据获取失败', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/poem/poemdetail?id=${id}`
    });
  },

  handleError(msg) {
    console.error('页面错误:', msg);
    wx.showToast({ title: msg, icon: 'none' });
    this.setData({ loading: false });
  },
  
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index_v1/index_v1'
    });
  },
  
  // 分享功能
  onShareAppMessage() {
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `搜索「${this.data.searchKeyword}」找到${this.data.totalCount}首诗词`,
        path: `/pages/poem/poem?keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    return {
      title: '经典诗词大全 | 品味千年文化',
      path: '/pages/poem/poem',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  onShareTimeline() {
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `诗词搜索：${this.data.searchKeyword}`,
        query: `keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    return {
      title: '诗词宝库·千年经典',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});