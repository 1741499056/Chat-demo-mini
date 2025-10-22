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
    pageSize: 12,
    
    // 朝代筛选相关
    dynastyList: [],           // 朝代列表
    selectedDynastyId: null,   // 当前选中的朝代ID
    dynastyIndex: 0            // 朝代选择器的当前索引
  },

  onLoad: function() {
    this.setData({ loading: true });
    this.loadDynastyList();    // 加载朝代列表
  },

  // 获取朝代列表 - 使用统一请求方法
  loadDynastyList() {
    app.authRequest({
      url: '/api/search/dynastiesCount',
      method: 'GET'
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        // 添加"全部"选项
        const dynastyList = [
          { dynastyId: null, dynasty: '全部', count: 0 },
          ...res.data.data
        ];
        
        this.setData({
          dynastyList: dynastyList,
          selectedDynastyId: null,
          dynastyIndex: 0
        }, () => {
          // 朝代列表加载完成后，立即加载全部内容
          this.loadAllContent(1);
        });
      } else {
        this.handleError('朝代列表加载失败');
      }
    }).catch(() => {
      this.handleError('朝代列表请求失败');
    });
  },

  onKeywordInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch() {
    const keyword = this.data.searchKeyword.trim();
    
    // 如果关键词为空，加载朝代列表
    if (!keyword) {
      this.setData({
        hasSearched: false,
        loading: true,
        currentPage: 1,
        gotoPage: ""
      });
      this.loadDataForPage(1);
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
      
      this.searchContent(keyword, 1);
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
    const { selectedDynastyId, searchKeyword, pageSize } = this.data;
    const keyword = searchKeyword.trim();
    
    if (keyword) {
      // 关键词搜索模式
      this.searchContent(keyword, page);
    } else if (selectedDynastyId !== null) {
      // 朝代筛选模式
      this.loadContentByDynasty(selectedDynastyId, page);
    } else {
      // 默认模式（全部内容）
      this.loadAllContent(page);
    }
  },

  // 加载全部内容 - 使用统一请求方法
  loadAllContent(page) {
    const params = {
      page: page.toString(),
      pageSize: this.data.pageSize.toString(),
      keyword: "" // 空关键词获取全部内容
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.showLoading({ title: '加载中...', mask: true });
    
    app.authRequest({
      url: `/api/search/keyword?${queryString}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.code === 1) {
        this.processContentData(res.data.data);
      } else {
        this.handleError(res.data?.msg || '内容加载失败');
      }
    }).catch(() => {
      wx.hideLoading();
      this.handleError('内容请求失败');
    });
  },

  // 搜索内容 - 使用统一请求方法
  searchContent(keyword, page) {
    const { selectedDynastyId } = this.data;
    
    // 构建查询参数
    const params = {
      keyword: keyword,
      page: page.toString(),
      pageSize: this.data.pageSize.toString()
    };
    
    // 如果选择了朝代，添加朝代ID参数
    if (selectedDynastyId !== null) {
      params.dynastyId = selectedDynastyId;
    }
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.showLoading({ title: '搜索中...', mask: true });
    
    app.authRequest({
      url: `/api/search/keyword?${queryString}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200) {
        if (res.data.code === 1) {
          this.processContentData(res.data.data, true);
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

  // 按朝代获取内容 - 使用统一请求方法
  loadContentByDynasty(dynastyId, page) {
    const params = {
      dynastyId: dynastyId,
      page: page.toString(),
      pageSize: this.data.pageSize.toString(),
      keyword: "" // 空关键词获取该朝代全部内容
    };
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.showLoading({ title: '加载中...', mask: true });
    
    app.authRequest({
      url: `/api/search/keyword?${queryString}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.code === 1) {
        this.processContentData(res.data.data);
      } else {
        this.handleError(res.data?.msg || '朝代内容加载失败');
      }
    }).catch(() => {
      wx.hideLoading();
      this.handleError('朝代内容请求失败');
    });
  },

  // 统一处理数据
  processContentData(data, isSearch = false) {
    const cleanText = (text) => {
      return text ? 
        text
          .replace(/<[^>]+>/g, '')         // 去除HTML标签
          .replace(/&nbsp;/g, ' ')         // 替换HTML实体
          .replace(/&[a-z]+;/g, '')        // 移除其他HTML实体
          .replace(/\s+/g, ' ')            // 压缩空白字符
          .trim() : '';
    };
    
    const contents = (data.rows || []).map(item => {
      return {
        id: item.id,
        name: cleanText(item.name) || '无标题',
        author: cleanText(item.author) || '未知',
        dynasty: cleanText(item.dynasty) || '不详',
        fullAncientContent: cleanText(item.fullAncientContent) || '暂无内容'
      };
    });

    // 计算总页数
    const totalPages = Math.ceil(data.total / this.data.pageSize);
    
    this.setData({
      searchResults: contents,
      totalCount: data.total,
      totalPages: totalPages > 0 ? totalPages : 1,
      loading: false,
      hasSearched: isSearch
    });
  },

  // 朝代选择变更处理
  onDynastyChange(e) {
    const index = e.detail.value;
    const selectedItem = this.data.dynastyList[index];
    
    this.setData({
      dynastyIndex: index,
      selectedDynastyId: selectedItem.dynastyId,
      currentPage: 1      // 重置到第一页
    });
    
    // 触发数据加载
    this.loadDataForPage(1);
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

  // 返回首页
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },

  handleError(msg) {
    console.error('页面错误:', msg);
    wx.showToast({ title: msg, icon: 'none' });
    this.setData({ loading: false });
  },
  
  // 分享给好友
  onShareAppMessage() {
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `搜索「${this.data.searchKeyword}」找到${this.data.totalCount}首诗词`,
        path: `/pages/ContentSearch/ContentSearch?keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: '/images/search_share.jpg'
      }
    }
    
    return {
      title: '字词寻章 · 内容一览',
      path: '/pages/ContentSearch/ContentSearch',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 分享到朋友圈
  onShareTimeline() {
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `内容搜索：${this.data.searchKeyword}`,
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