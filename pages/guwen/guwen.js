// pages/ancient/ancient.js
const app = getApp();

Page({
  data: {
    // 书籍列表数据
    ancientTexts: [],
    loadingBooks: false,
    booksError: null,
    currentBookIndex: 0,
    indicatorDots: [],
    windowWidth: 375, // 默认宽度，会在onLoad中更新
    
    // 文章列表数据
    searchKeyword: "",
    searchResults: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    gotoPage: "",
    hasSearched: false,
    loadingArticles: false
  },

  onLoad: function() {
    this.getWindowInfo();
    this.fetchAncientTexts();
    this.loadListData(0, 10);
  },

  // 获取窗口信息 - 使用新API替代已弃用的wx.getSystemInfoSync
  getWindowInfo: function() {
    if (wx.getWindowInfo) {
      // 新API
      const windowInfo = wx.getWindowInfo();
      this.setData({
        windowWidth: windowInfo.windowWidth
      });
    } else if (wx.getSystemInfoSync) {
      // 兼容旧API
      const systemInfo = wx.getSystemInfoSync();
      this.setData({
        windowWidth: systemInfo.windowWidth
      });
    } else {
      // 备用方案
      this.setData({ windowWidth: 375 });
    }
  },

  // 加载书籍列表
  fetchAncientTexts: function() {
    this.setData({ loadingBooks: true, booksError: null });
    
    app.authRequest({
      url: '/api/getbooks',
      method: 'GET'
    }).then(res => {
      let bookList = [];
      
      if (res.statusCode === 200) {
        if (res.data?.code === 1 && Array.isArray(res.data.data)) {
          bookList = res.data.data;
        } else if (Array.isArray(res.data)) {
          bookList = res.data;
        }
      }
      
      if (bookList.length > 0) {
        const ancientTexts = bookList.map((item, index) => {
          // 修复图片路径问题
          const filename = `${item.title || 'default'}.jpg`;
          const safeImage = app.getOSSImagePath ? app.getOSSImagePath(filename) : 
                           `https://newlan.oss-cn-shanghai.aliyuncs.com/books/${filename}`;
          
          return {
            id: item.id || `book-${index}-${Date.now()}`,
            title: item.title || '无标题',
            chapterFirstId: item.chapterFirstId || '',
            safeImage: safeImage,
            localFallback: `/Guwen/books/${filename}`,
            imageLoaded: false,
            imageError: false
          };
        });
        
        const indicatorDots = Array(ancientTexts.length).fill(false);
        indicatorDots[0] = true;
        
        this.setData({
          ancientTexts,
          indicatorDots,
          loadingBooks: false
        });
      } else {
        this.setData({ 
          booksError: `暂无书籍数据`,
          loadingBooks: false
        });
      }
    }).catch(err => {
      this.setData({ 
        booksError: '网络请求失败: ' + (err?.errMsg || '未知错误'),
        loadingBooks: false
      });
    });
  },

  // 加载文章列表
  loadListData: function(startIndex, pageSize) {
    this.setData({ loadingArticles: true });
    
    app.authRequest({
      url: '/api/getArticleList',
      method: 'GET',
      data: {
        startIndex: startIndex,
        endIndex: startIndex + pageSize
      }
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        const data = res.data.data || {};
        const totalCount = data.total || 0;
        const rows = data.rows || [];
        
        const validatedRows = rows.map((item, index) => {
          return {
            ...item,
            id: item.id || item.articleId || `article-${index}-${Date.now()}`,
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
          hasSearched: false,
          loadingArticles: false
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },

  // 搜索文章
  searchData: function(keyword) {
    this.setData({ loadingArticles: true });
    
    app.authRequest({
      url: '/api/searchArticles',
      method: 'GET',
      data: { title: keyword }
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        const data = res.data.data || {};
        const allResults = data.rows || [];
        
        const validatedResults = allResults.map((item, index) => {
          return {
            ...item,
            id: item.id || item.articleId || `search-${index}-${Date.now()}`,
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
          hasSearched: true,
          loadingArticles: false
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },

  // 图片加载处理方法
  handleBookImageLoad: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`ancientTexts[${index}].imageLoaded`]: true
    });
  },

  handleBookImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    const book = this.data.ancientTexts[index];
    
    this.setData({
      [`ancientTexts[${index}].imageError`]: true,
      [`ancientTexts[${index}].safeImage`]: book.localFallback
    });
  },

  // 搜索相关方法
  onInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch: function() {
    const keyword = this.data.searchKeyword.trim();
    this.setData({
      currentPage: 1,
      hasSearched: keyword.length > 0,
      gotoPage: ""
    });
    
    if (keyword) {
      this.searchData(keyword);
    } else {
      this.loadListData(0, 10);
    }
  },

  onGotoInput: function(e) {
    this.setData({ gotoPage: e.detail.value });
  },

  // 翻页方法
  goToPrevPage: function() {
    if (this.data.currentPage <= 1) return;
    const prevPage = this.data.currentPage - 1;
    this.setData({ 
      currentPage: prevPage
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((prevPage - 1) * 10, 10);
    }
  },

  goToNextPage: function() {
    if (this.data.currentPage >= this.data.totalPages) return;
    const nextPage = this.data.currentPage + 1;
    this.setData({ 
      currentPage: nextPage
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((nextPage - 1) * 10, 10);
    }
  },

  goToSpecifiedPage: function() {
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
      gotoPage: ""
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((page - 1) * 10, 10);
    }
  },

  // 导航方法
  navigateToBookDetail: function(e) {
    const book = this.data.ancientTexts[e.currentTarget.dataset.index];
    if (book?.id && book?.chapterFirstId) {
      wx.navigateTo({
        url: `/pages/ArticleDetail/ArticleDetail?bookId=${book.id}&firstChapterId=${book.chapterFirstId}`
      });
    } else {
      wx.showToast({ title: '书籍信息异常', icon: 'error' });
    }
  },
  
  navigateToArticleDetail: function(e) {
    let item = null;
    
    try {
      if (e.currentTarget.dataset.item) {
        item = e.currentTarget.dataset.item;
      }
      
      if (!item && e.currentTarget.dataset.id) {
        const id = e.currentTarget.dataset.id;
        item = this.data.searchResults.find(i => i.id == id);
      }
      
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
    
    const id = parseInt(item.id, 10) || Math.floor(Math.random() * 1000);
    
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
  
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },
    // 跳转到全部书籍页面
  navigateToAllBooks: function() {
    wx.navigateTo({
      url: '/pages/allbooks/allbooks' // 替换为您的实际页面路径
    });
  },
  
  // 轮播图切换事件
  onSwiperChange: function(e) {
    const current = e.detail.current;
    const indicatorDots = Array(this.data.ancientTexts.length).fill(false);
    indicatorDots[current] = true;
    
    this.setData({
      currentBookIndex: current,
      indicatorDots
    });
  },
  
  // 滚动到指定书籍
  scrollToBook: function(e) {
    const index = e.currentTarget.dataset.index;
    const indicatorDots = Array(this.data.ancientTexts.length).fill(false);
    indicatorDots[index] = true;
    
    this.setData({
      currentBookIndex: index,
      indicatorDots
    });
  },
  
  // 错误处理
  handleError: function(msg) {
    console.error('页面错误:', msg);
    wx.showToast({ 
      title: msg, 
      icon: 'none',
      duration: 3000
    });
    this.setData({ loadingArticles: false });
  },
  
  // 分享功能
  onShareAppMessage() {
    const coverBook = this.data.ancientTexts.length > 0 
      ? this.data.ancientTexts[0] 
      : null;
    
    return {
      title: '古典文学典籍 | 国学精华收藏',
      path: '/pages/guwen/guwen',
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  onShareTimeline() {
    const coverBook = this.data.ancientTexts.length > 0 
      ? this.data.ancientTexts[0] 
      : null;
    
    return {
      title: '古典典籍精粹',
      query: '',
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});