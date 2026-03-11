// pages/ancient/ancient.js（保留主体路径，整合样式页面逻辑）
const app = getApp();

Page({
  data: {
    // 整合样式页面与主体数据字段
    statusBarHeight: 0,        // 样式页面：状态栏高度
    searchKeyword: "",         // 共用：搜索关键词
    searchResults: [],         // 共用：文章列表
    totalCount: 0,             // 共用：总条数
    totalPages: 1,            // 共用：总页数
    currentPage: 1,            // 共用：当前页
    loading: false,            // 样式页面：加载状态（替换主体loadingArticles）
    gotoPage: "",              // 共用：跳转页码
    hasSearched: false,        // 共用：是否搜索状态
    booksList: [],            // 样式页面：书籍列表（替换主体ancientTexts）
    booksLoading: false,       // 样式页面：书籍加载状态
    booksError: null,          // 主体：书籍错误信息（保留文案逻辑）
    currentDotIndex: 0,        // 样式页面：书籍轮播当前索引
    carouselTimer: null        // 样式页面：书籍轮播定时器
  },

  onLoad: function() {
    // 整合样式页面与主体初始化逻辑
    this.getSystemInfo();          // 新增：获取系统信息（含状态栏高度）
    this.setData({ loading: true });// 统一加载状态
    this.loadListData(0, 10);       // 主体：加载文章列表
    this.fetchBooksData();          // 样式页面：加载书籍列表（替换主体fetchAncientTexts）
  },

  // 新增：获取系统信息（整合样式页面状态栏逻辑+主体窗口宽度逻辑）
  getSystemInfo: function() {
    let systemInfo;
    if (wx.getWindowInfo) {
      systemInfo = wx.getWindowInfo();
    } else if (wx.getSystemInfoSync) {
      systemInfo = wx.getSystemInfoSync();
    } else {
      systemInfo = { statusBarHeight: 20, windowWidth: 375 }; // 备用
    }

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      windowWidth: systemInfo.windowWidth // 保留主体窗口宽度字段（备用）
    });
  },

  // 样式页面：加载书籍列表（替换主体fetchAncientTexts，保留主体接口逻辑）
  fetchBooksData() {
    this.setData({
      booksLoading: true,
      booksError: null // 重置错误信息（主体逻辑）
    });

    app.authRequest({
      url: '/api/getbooks', // 主体：接口地址不变
      method: 'GET'
    }).then(res => {
      let bookList = [];
      
      // 保留主体数据格式判断逻辑
      if (res.statusCode === 200) {
        if (res.data?.code === 1 && Array.isArray(res.data.data)) {
          bookList = res.data.data;
        } else if (Array.isArray(res.data)) {
          bookList = res.data;
        }
      } else {
        console.error('获取书籍数据失败，响应状态异常:', res);
        this.setData({ booksError: '网络请求失败: 响应状态异常' });
      }

      if (bookList.length > 0) {
        // 保留主体书籍数据格式化逻辑，适配样式页面booksList字段
        const formattedBooks = bookList.map((item, index) => {
          const filename = `${item.title || 'default'}.jpg`;
          const safeImage = app.getOSSImagePath ? app.getOSSImagePath(filename) : 
                           `https://newlan.oss-cn-shanghai.aliyuncs.com/books/${filename}`;
          
          return {
            id: item.id || `book-${index}-${Date.now()}`, // 主体：ID生成逻辑
            title: item.title || '无标题',
            author: item.author || '未知作者', // 新增：适配样式页面作者显示
            chapterFirstId: item.chapterFirstId || '',
            safeImage: safeImage,
            localFallback: `/Guwen/books/${filename}`, // 主体：本地备用图
            imageError: false
          };
        });

        this.setData({ 
          booksList: formattedBooks,
          booksLoading: false 
        }, () => {
          this.startCarousel(); // 样式页面：启动书籍轮播
        });
      } else {
        // 保留主体空数据文案逻辑
        this.setData({ 
          booksList: [],
          booksLoading: false,
          booksError: bookList.length === 0 && res.statusCode === 200 ? '暂无书籍数据' : '网络请求失败'
        });
      }
    }).catch(err => {
      // 保留主体错误处理逻辑
      this.setData({ 
        booksError: '网络请求失败: ' + (err?.errMsg || '未知错误'),
        booksLoading: false
      });
    });
  },

  // 样式页面：启动书籍轮播
  startCarousel() {
    if (this.data.carouselTimer) {
      clearInterval(this.data.carouselTimer);
    }

    const booksCount = this.data.booksList.length;
    if (booksCount <= 1) return; 
    const interval = 5000;
    const carouselTimer = setInterval(() => {
      this.nextSlide();
    }, interval);

    this.setData({ carouselTimer });
  },

  // 样式页面：轮播下一张
  nextSlide() {
    const { currentDotIndex, booksList } = this.data;
    let nextIndex = currentDotIndex + 1;
    if (nextIndex >= booksList.length) nextIndex = 0;
    this.setCurrentSlide(nextIndex);
  },

  setCurrentSlide(index) {
    const booksCount = this.data.booksList.length;
    if (index < 0 || index >= booksCount) return;
    
    const cardWidth = 220; 
    const scrollDistance = index * cardWidth;
  
    // 1. 通过 selectComponent 获取 <scroll-view> 组件实例
    const carousel = this.selectComponent('#booksCarousel');
    if (carousel) {
      // 2. 调用组件实例的 scrollTo 方法实现滚动
      carousel.scrollTo({
        left: scrollDistance,
        duration: 500
      });
    }
  
    this.setData({ currentDotIndex: index });
  },

  // 样式页面：轮播滚动监听
  onCarouselScroll(e) {
    const { scrollLeft } = e.detail;
    const cardWidth = 220; // 适配样式页面book-card宽度
    const currentIndex = Math.round(scrollLeft / cardWidth);
    const maxIndex = this.data.booksList.length - 1;
    const finalIndex = Math.min(Math.max(currentIndex, 0), maxIndex);

    if (finalIndex !== this.data.currentDotIndex) {
      this.setData({ currentDotIndex: finalIndex });
    }
  },

  // 样式页面：书籍图片错误处理（替换主体handleBookImageError）
  handleBookImgError(e) {
    const { index } = e.currentTarget.dataset;
    if (!this.data.booksList[index]) return;

    this.setData({
      [`booksList[${index}].imageError`]: true
    });
  },

  // 共用：加载文章列表（保留主体逻辑，适配loading状态）
  loadListData: function(startIndex, pageSize) {
    this.setData({ loading: true }); // 统一为loading状态

    app.authRequest({
      url: '/api/getArticleList', // 主体：接口地址不变
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
        
        // 保留主体文章数据格式化逻辑
        const validatedRows = rows.map((item, index) => {
          return {
            ...item,
            id: item.id || item.articleId || `article-${index}-${Date.now()}`,
            title: item.title || '无标题',
            author: item.author || '未知',
            dynasty: item.dynasty || '不详',
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
          loading: false // 统一加载状态
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },

  // 共用：搜索文章（保留主体逻辑，适配loading状态）
  searchData: function(keyword) {
    this.setData({ loading: true }); // 统一为loading状态

    app.authRequest({
      url: '/api/searchArticles', // 主体：接口地址不变
      method: 'GET',
      data: { title: keyword }
    }).then(res => {
      if (res.statusCode === 200 && res.data.code === 1) {
        const data = res.data.data || {};
        const allResults = data.rows || [];
        
        // 保留主体搜索数据格式化逻辑
        const validatedResults = allResults.map((item, index) => {
          return {
            ...item,
            id: item.id || item.articleId || `search-${index}-${Date.now()}`,
            title: item.title || '无标题',
            author: item.author || '未知',
            dynasty: item.dynasty || '不详',
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
          loading: false // 统一加载状态
        });
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      this.handleError('网络请求失败');
    });
  },

  // 共用：搜索输入监听（无修改）
  onInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 共用：执行搜索（保留主体逻辑，适配loading状态）
  doSearch: function() {
    const keyword = this.data.searchKeyword.trim();
    this.setData({
      currentPage: 1,
      hasSearched: keyword.length > 0,
      loading: true, // 统一加载状态
      gotoPage: ""
    });
    
    if (keyword) {
      this.searchData(keyword);
    } else {
      this.loadListData(0, 10);
    }
  },

  // 共用：跳转页码输入监听（无修改）
  onGotoInput: function(e) {
    this.setData({ gotoPage: e.detail.value });
  },

  // 共用：上一页（保留主体逻辑，适配loading状态）
  goToPrevPage: function() {
    if (this.data.currentPage <= 1) return;
    const prevPage = this.data.currentPage - 1;
    this.setData({ 
      currentPage: prevPage,
      loading: true // 统一加载状态
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((prevPage - 1) * 10, 10);
    }
  },

  // 共用：下一页（保留主体逻辑，适配loading状态）
  goToNextPage: function() {
    if (this.data.currentPage >= this.data.totalPages) return;
    const nextPage = this.data.currentPage + 1;
    this.setData({ 
      currentPage: nextPage,
      loading: true // 统一加载状态
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((nextPage - 1) * 10, 10);
    }
  },

  // 共用：跳转指定页（保留主体逻辑，适配loading状态）
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
      loading: true, // 统一加载状态
      gotoPage: ""
    });
    
    if (this.data.hasSearched) {
      this.searchData(this.data.searchKeyword);
    } else {
      this.loadListData((page - 1) * 10, 10);
    }
  },

  // 共用：跳转书籍详情（保留主体逻辑，适配booksList字段）
  navigateToBookDetail: function(e) {
    const book = e.currentTarget.dataset.book;
    if (book?.id && book?.chapterFirstId) {
      wx.navigateTo({
        url: `/pages/ArticleDetail/ArticleDetail?bookId=${book.id}&firstChapterId=${book.chapterFirstId}`
      });
    } else {
      wx.showToast({ title: '书籍信息异常', icon: 'error' });
    }
  },
  
  // 共用：跳转文章详情（样式页面方法名，保留主体逻辑）
  navigateToDetail: function(e) {
    let item = null;
    
    try {
      // 保留主体数据获取逻辑
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
  
  // 共用：跳转首页（无修改）
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index_v1/index_v1'
    });
  },

  // 共用：跳转全部书籍（主体方法，整合样式页面navigateToBooks逻辑）
  navigateToAllBooks: function() {
    wx.navigateTo({
      url: '/pages/allbooks/allbooks', // 主体：原路径不变
      fail: (err) => {
        console.error('跳转群籍藏识页面失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 共用：错误处理（保留主体逻辑，适配loading状态）
  handleError: function(msg) {
    console.error('页面错误:', msg);
    wx.showToast({ 
      title: msg, 
      icon: 'none',
      duration: 3000
    });
    this.setData({ loading: false }); // 统一加载状态
  },
  
  // 样式页面：页面卸载清除轮播定时器
  onUnload() {
    if (this.data.carouselTimer) {
      clearInterval(this.data.carouselTimer);
    }
  },
  
  // 共用：分享好友（保留主体逻辑，适配booksList字段）
  onShareAppMessage() {
    const coverBook = this.data.booksList.length > 0 
      ? this.data.booksList[0] 
      : null;
    
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `搜索「${this.data.searchKeyword}」找到${this.data.totalCount}篇文章`,
        path: `/pages/ancient/ancient?keyword=${encodeURIComponent(this.data.searchKeyword)}`, // 主体：路径不变
        imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    return {
      title: '古典文学典籍 | 国学精华收藏', // 主体：原标题
      path: '/pages/ancient/ancient', // 主体：路径不变
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 共用：分享朋友圈（保留主体逻辑，适配booksList字段）
  onShareTimeline() {
    const coverBook = this.data.booksList.length > 0 
      ? this.data.booksList[0] 
      : null;
    
    if (this.data.hasSearched && this.data.searchKeyword) {
      return {
        title: `文章搜索：${this.data.searchKeyword}`,
        query: `keyword=${encodeURIComponent(this.data.searchKeyword)}`,
        imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      }
    }
    
    return {
      title: '古典典籍精粹', // 主体：原标题
      query: '',
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});