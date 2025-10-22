// 在顶部获取全局 app 实例
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
    hasSearched: false
  },
  
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },

  onLoad: function() {
    this.setData({ loading: true });
    this.loadListData(0, 10);
    
    // 临时解决方案：添加回退点击处理
    this.fallbackData = null;
    this.fallbackTimeout = null;
  },

  onInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch() {
    const keyword = this.data.searchKeyword.trim();
    this.setData({
      currentPage: 1,
      hasSearched: keyword.length > 0,
      loading: true,
      gotoPage: ""
    });
    
    if (keyword) {
      this.searchData(keyword);
    } else {
      this.loadListData(0, 10);
    }
  },

  onGotoInput(e) {
    this.setData({ gotoPage: e.detail.value });
  },

  goToPrevPage() {
    if (this.data.currentPage <= 1) return;
    const prevPage = this.data.currentPage - 1;
    this.setData({ 
      currentPage: prevPage,
      loading: true
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((prevPage - 1) * 10, 10);
    }
  },

  goToNextPage() {
    if (this.data.currentPage >= this.data.totalPages) return;
    const nextPage = this.data.currentPage + 1;
    this.setData({ 
      currentPage: nextPage,
      loading: true
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((nextPage - 1) * 10, 10);
    }
  },

  goToSpecifiedPage() {
    const page = parseInt(this.data.gotoPage);
    if (isNaN(page) || page < 1 || page > this.data.totalPages) {
      wx.showToast({ 
        title: `请输入1-${this.data.totalPages}之间的页码`, 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    this.setData({ 
      currentPage: page,
      loading: true,
      gotoPage: ""
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((page - 1) * 10, 10);
    }
  },

  // 基础列表加载 - 使用统一请求方法
  loadListData(startIndex, pageSize) {
    const endIndex = startIndex + pageSize;
    
    // 使用 app.authRequest 替代 wx.request
    app.authRequest({
      url: '/api/getArticleList',
      method: 'GET',
      data: {
        startIndex: startIndex,
        endIndex: endIndex
      }
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        const data = res.data.data || {};
        const totalCount = data.total || 0;
        const rows = data.rows || [];
        
        // 增强数据校验
        const validatedRows = rows.map(item => {
          return {
            ...item,
            id: item.id || item.articleId || Date.now() + Math.floor(Math.random() * 1000),
            title: item.title || '无标题',
            author: item.author || '未知',
            dynasty: item.dynasty || '未知朝代',
            content: item.content || '暂无内容'
          };
        });
        
        const currentPage = Math.floor(startIndex / pageSize) + 1;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        
        this.setData({
          searchResults: validatedRows,
          totalCount: totalCount,
          totalPages: totalPages,
          currentPage: currentPage,
          loading: false,
          hasSearched: false
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },

  // 搜索功能 - 使用统一请求方法
  searchData(keyword) {
    // 使用 app.authRequest 替代 wx.request
    app.authRequest({
      url: '/api/searchArticles',
      method: 'GET',
      data: { title: keyword }
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        const data = res.data.data || {};
        const allResults = data.rows || [];
        
        // 增强数据校验
        const validatedResults = allResults.map(item => {
          return {
            ...item,
            id: item.id || item.articleId || Date.now() + Math.floor(Math.random() * 1000),
            title: item.title || '无标题',
            author: item.author || '未知',
            dynasty: item.dynasty || '未知朝代',
            content: item.content || '暂无内容'
          };
        });
        
        const totalCount = validatedResults.length;
        const pageSize = 10;
        const startIndex = (this.data.currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const currentPageResults = validatedResults.slice(startIndex, endIndex);
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        
        this.setData({
          searchResults: currentPageResults,
          totalCount: totalCount,
          totalPages: totalPages,
          loading: false,
          hasSearched: true
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },
  
  // 全新的导航详情方法 - 保持不变
  navigateToDetail(e) {
    console.log('触发事件:', e);
    
    // 方案1：从data-item获取
    let item = null;
    
    try {
      if (e.currentTarget.dataset.item) {
        item = e.currentTarget.dataset.item;
        console.log('从data-item获取:', item);
      }
      
      // 方案2：从ID索引获取（回退方案）
      if (!item && e.currentTarget.dataset.id) {
        const id = e.currentTarget.dataset.id;
        item = this.data.searchResults.find(i => i.id == id);
        console.log('从ID索引获取:', item);
      }
      
      // 方案3：从事件目标文本内容获取（最后手段）
      if (!item && this.fallbackData) {
        console.log('使用回退数据:', this.fallbackData);
        item = this.fallbackData;
      }
      
      // 最终校验
      if (!item) {
        throw new Error('无法获取项目数据');
      }
    } catch (error) {
      console.error('数据获取错误:', error);
      wx.showToast({
        title: '数据异常，请尝试重新加载',
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    // 确保ID有效
    const id = parseInt(item.id, 10) || Math.floor(Math.random() * 1000);
    
    console.log('最终使用的数据:', item);
    console.log('跳转ID:', id);
    
    // 保存当前项目供下次使用
    this.fallbackData = item;
    
    // 清除之前的定时器
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
    }
    
    // 设置10秒后清除回退数据
    this.fallbackTimeout = setTimeout(() => {
      this.fallbackData = null;
    }, 10000);
    
    // 执行跳转
    wx.navigateTo({
      url: `/pages/ArticleDetail/ArticleDetail?id=${id}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '打开详情失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 增强错误处理 - 保持不变
  handleError(msg) {
    console.error('页面错误:', msg);
    wx.showToast({ 
      title: msg, 
      icon: 'none',
      duration: 3000
    });
    this.setData({ loading: false });
  },
  
  // 组件卸载时清理 - 保持不变
  onUnload() {
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackData = null;
    }
  },
  
  // 新增搜索页面分享功能（好友分享）- 保持不变
  onShareAppMessage() {
    // 如果有搜索关键词，分享搜索内容
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `搜索「${this.data.searchKeyword}」找到${this.data.totalCount}篇文章`,
        path: `/pages/logs/logs?keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    // 默认分享整个文章库
    return {
      title: '经典文章大全 | 品味千年文化',
      path: '/pages/logs/logs',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 新增搜索页面朋友圈分享功能 - 保持不变
  onShareTimeline() {
    // 如果有搜索关键词，分享搜索内容
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `文章搜索：${this.data.searchKeyword}`,
        query: `keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    // 默认分享整个文章库
    return {
      title: '文章宝库·千年经典',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});