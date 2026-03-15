const app = getApp();

Component({
  properties: {
    isLoggedIn: {
      type: Boolean,
      value: false
    },
    currentGrade: {
      type: String,
      value: ''
    },
    currentGradeId: {
      type: Number,
      value: null
    }
  },

  data: {
    poetryType: 'ancient',
    ancientSearchKeyword: "",
    ancientSearchResults: [],
    ancientTotalCount: 0,
    ancientTotalPages: 1,
    ancientCurrentPage: 1,
    ancientLoading: false,
    ancientGotoPage: "",
    ancientHasSearched: false,
    booksList: [],
    booksLoading: false,
    booksError: null,
    currentDotIndex: 0,
    carouselTimer: null,
    poemSearchKeyword: "",
    poemSearchResults: [],
    poemTotalCount: 0,
    poemTotalPages: 1,
    poemCurrentPage: 1,
    poemLoading: false,
    poemGotoPage: "",
    poemHasSearched: false,
    poemLastSearch: {
      keyword: "",
      page: 1
    },
    poemPageSize: 10,
    poemError: null,
    showSetGradeTip: false
  },

  lifetimes: {
    attached() {
      this.initPage();
    },
    detached() {
      this.cleanup();
    }
  },

  methods: {
    initPage() {
      this.getSystemInfo();
      this.setData({ 
        ancientLoading: true,
        poemLoading: true 
      });
      this.loadAncientListData(0, 10);
      this.fetchBooksData();
      this.checkGradeStatus();
    },

    onPageShow() {
      this.checkGradeStatus();
      if (this.data.poetryType === 'ancient' && this.data.booksList.length === 0) {
        this.fetchBooksData();
      }
    },

    cleanup() {
      if (this.data.carouselTimer) {
        clearInterval(this.data.carouselTimer);
      }
    },

    switchPoetryType(e) {
      const type = e.currentTarget.dataset.type;
      this.setData({ poetryType: type });
      
      if (type === 'ancient' && this.data.booksList.length === 0) {
        this.fetchBooksData();
      }
      
      if (type === 'poem') {
        this.checkGradeStatus();
      }
    },

    checkGradeStatus() {
      const { isLoggedIn, currentGrade } = this.data;
      const showTip = !isLoggedIn || (isLoggedIn && !currentGrade);
      
      this.setData({ 
        showSetGradeTip: showTip 
      });
      
      if (!showTip && this.data.poetryType === 'poem' && this.data.poemSearchResults.length === 0) {
        this.setData({ 
          poemLoading: true,
          poemCurrentPage: 1,
          poemError: null
        });
        this.loadPoems(1);
      }
    },

    getSystemInfo() {
      let systemInfo;
      if (wx.getSystemInfoSync) { 
        systemInfo = wx.getSystemInfoSync();
      } else {
        systemInfo = { statusBarHeight: 20, windowWidth: 375 };
      }
    },

    // ========== 古籍相关方法 ==========

    fetchBooksData() {
      this.setData({
        booksLoading: true,
        booksError: null
      });

      app.authRequest({
        url: '/getbooks',
        method: 'GET',
        data:{
          initial:'全部'
        }
      }).then(res => {
        let bookList = [];
        if (res.statusCode === 200) {
          if (res.data?.code === 1 && Array.isArray(res.data.data)) {
            bookList = res.data.data;
          } else if (Array.isArray(res.data)) {
            bookList = res.data;
          }
        } else {
          console.error('获取书籍数据失败:', res);
          this.setData({ booksError: '网络请求失败' });
        }

        if (bookList.length > 0) {
          const formattedBooks = bookList.map((item, index) => {
            const filename = `${item.title || 'default'}.jpg`;
            const safeImage = app.getOSSImagePath ? app.getOSSImagePath(filename) : 
                                  `https://newlan.oss-cn-shanghai.aliyuncs.com/books/${filename}`;
            
            return {
              id: item.id || `book-${index}-${Date.now()}`,
              title: item.title || '无标题',
              author: item.author || '未知作者',
              chapterFirstId: item.chapterFirstId || '',
              safeImage: safeImage,
              localFallback: `/Guwen/books/${filename}`,
              imageError: false
            };
          });

          this.setData({ 
            booksList: formattedBooks,
            booksLoading: false 
          }, () => {
            this.startCarousel();
          });
        } else {
          this.setData({ 
            booksList: [],
            booksLoading: false,
            booksError: bookList.length === 0 && res.statusCode === 200 ? '暂无书籍数据' : '网络请求失败'
          });
        }
      }).catch(err => {
        this.setData({ 
          booksError: '网络请求失败',
          booksLoading: false
        });
      });
    },

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

    nextSlide() {
      const { currentDotIndex, booksList } = this.data;
      let nextIndex = currentDotIndex + 1;
      if (nextIndex >= booksList.length) nextIndex = 0;
      this.setCurrentSlide(nextIndex);
    },

    setCurrentSlide(index) {
      const booksCount = this.data.booksList.length;
      if (index < 0 || index >= booksCount) return;
      
      const query = wx.createSelectorQuery().in(this);
      query.select('#booksCarousel').boundingClientRect(rect => {
        const cardWidth = 220;
        const scrollDistance = index * cardWidth;

        wx.createSelectorQuery().in(this)
          .select('#booksCarousel')
          .scrollOffset()
          .exec(res => {
            wx.createSelectorQuery().in(this)
              .select('#booksCarousel')
              .scrollTo({
                left: scrollDistance,
                duration: 500
              });
          });
      }).exec();
      
      this.setData({ currentDotIndex: index });
    },

    onCarouselScroll(e) {
      const { scrollLeft } = e.detail;
      const cardWidth = 220;
      const currentIndex = Math.round(scrollLeft / cardWidth);
      const maxIndex = this.data.booksList.length - 1;
      const finalIndex = Math.min(Math.max(currentIndex, 0), maxIndex);

      if (finalIndex !== this.data.currentDotIndex) {
        this.setData({ currentDotIndex: finalIndex });
      }
    },

    handleBookImgError(e) {
      const { index } = e.currentTarget.dataset;
      if (!this.data.booksList[index]) return;
      this.setData({
        [`booksList[${index}].imageError`]: true
      });
    },

    loadAncientListData(startIndex, pageSize) {
      this.setData({ ancientLoading: true });

      app.authRequest({
        url: '/getArticleList',
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
              dynasty: item.dynasty || '不详',
              content: item.content || '暂无内容'
            };
          });
          
          const currentPage = Math.floor(startIndex / pageSize) + 1;
          const totalPages = Math.ceil(totalCount / pageSize) || 1;
          
          this.setData({
            ancientSearchResults: validatedRows,
            ancientTotalCount: totalCount,
            ancientTotalPages: totalPages,
            ancientCurrentPage: currentPage,
            ancientHasSearched: false,
            ancientLoading: false
          });
        } else {
          this.handleAncientError(res.data?.msg || '服务器错误');
        }
      }).catch(err => {
        this.handleAncientError('网络请求失败');
      });
    },

    searchAncientData(keyword) {
      this.setData({ ancientLoading: true });

      app.authRequest({
        url: '/searchArticles',
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
              dynasty: item.dynasty || '不详',
              content: item.content || '暂无内容'
            };
          });
          
          const totalCount = validatedResults.length;
          const pageSize = 10;
          const startIndex = (this.data.ancientCurrentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const currentPageResults = validatedResults.slice(startIndex, endIndex);
          const totalPages = Math.ceil(totalCount / pageSize) || 1;
          
          this.setData({
            ancientSearchResults: currentPageResults,
            ancientTotalCount: totalCount,
            ancientTotalPages: totalPages,
            ancientHasSearched: true,
            ancientLoading: false
          });
        } else {
          this.handleAncientError(res.data?.msg || '服务器错误');
        }
      }).catch(err => {
        this.handleAncientError('网络请求失败');
      });
    },

    onAncientInput(e) {
      this.setData({ ancientSearchKeyword: e.detail.value });
    },

    doAncientSearch() {
      const keyword = this.data.ancientSearchKeyword.trim();
      this.setData({
        ancientCurrentPage: 1,
        ancientHasSearched: keyword.length > 0,
        ancientLoading: true,
        ancientGotoPage: ""
      });
      
      if (keyword) {
        this.searchAncientData(keyword);
      } else {
        this.loadAncientListData(0, 10);
      }
    },

    onAncientGotoInput(e) {
      this.setData({ ancientGotoPage: e.detail.value });
    },

    goToAncientPrevPage() {
      if (this.data.ancientCurrentPage <= 1) return;
      const prevPage = this.data.ancientCurrentPage - 1;
      this.setData({ 
        ancientCurrentPage: prevPage,
        ancientLoading: true
      });
      
      if (this.data.ancientHasSearched) {
        this.searchAncientData(this.data.ancientSearchKeyword);
      } else {
        this.loadAncientListData((prevPage - 1) * 10, 10);
      }
    },

    goToAncientNextPage() {
      if (this.data.ancientCurrentPage >= this.data.ancientTotalPages) return;
      const nextPage = this.data.ancientCurrentPage + 1;
      this.setData({ 
        ancientCurrentPage: nextPage,
        ancientLoading: true
      });
      
      if (this.data.ancientHasSearched) {
        this.searchAncientData(this.data.ancientSearchKeyword);
      } else {
        this.loadAncientListData((nextPage - 1) * 10, 10);
      }
    },

    goToAncientSpecifiedPage() {
      const page = parseInt(this.data.ancientGotoPage);
      if (isNaN(page) || page < 1 || page > this.data.ancientTotalPages) {
        wx.showToast({ 
          title: `请输入1-${this.data.ancientTotalPages}之间的页码`, 
          icon: 'none',
          duration: 2000
        });
        return;
      }
      this.setData({ 
        ancientCurrentPage: page,
        ancientLoading: true,
        ancientGotoPage: ""
      });
      
      if (this.data.ancientHasSearched) {
        this.searchAncientData(this.data.ancientSearchKeyword);
      } else {
        this.loadAncientListData((page - 1) * 10, 10);
      }
    },

    navigateToBookDetail(e) {
      const book = e.currentTarget.dataset.book;
      if (book?.id && book?.chapterFirstId) {
        wx.navigateTo({
          url: `/pages/ArticleDetail/ArticleDetail?bookId=${book.id}&firstChapterId=${book.chapterFirstId}`
        });
      } else {
        wx.showToast({ title: '书籍信息异常', icon: 'error' });
      }
    },
    
    navigateToDetail(e) {
      let item = null;
      try {
        if (e.currentTarget.dataset.item) {
          item = e.currentTarget.dataset.item;
        }
        if (!item && e.currentTarget.dataset.id) {
          const id = e.currentTarget.dataset.id;
          item = this.data.ancientSearchResults.find(i => i.id == id);
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
    
    navigateToAllBooks() {
      wx.navigateTo({
        url: '/pages/allbooks/allbooks',
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
    
    handleAncientError(msg) {
      console.error('页面错误:', msg);
      wx.showToast({ 
        title: msg, 
        icon: 'none',
        duration: 3000
      });
      this.setData({ ancientLoading: false });
    },

    // ========== 古诗相关方法 ==========

    onPoemInput(e) {
      this.setData({ poemSearchKeyword: e.detail.value });
    },

    doPoemSearch() {
      if (this.data.showSetGradeTip) return;
      const keyword = this.data.poemSearchKeyword.trim();
      const { poemLastSearch } = this.data;
      
      if (!keyword) {
        this.setData({
          poemHasSearched: false,
          poemLoading: true,
          poemCurrentPage: 1,
          poemGotoPage: "",
          poemError: null
        });
        this.loadPoems(1); 
        return;
      }
      
      const isSameSearch = keyword === poemLastSearch.keyword && 
                           this.data.poemCurrentPage === poemLastSearch.page;
      
      if (!isSameSearch) {
        this.setData({
          poemCurrentPage: 1,
          poemHasSearched: true,
          poemLoading: true,
          poemGotoPage: "",
          poemError: null,
          poemLastSearch: {
            keyword: keyword,
            page: 1
          }
        });
        this.searchPoems(keyword, 1);
      }
    },

    onPoemGotoInput(e) {
      this.setData({ poemGotoPage: e.detail.value });
    },

    goToPoemPage(page) {
      if (this.data.showSetGradeTip) return;
      if (page < 1 || page > this.data.poemTotalPages) return;
      
      this.setData({ 
        poemCurrentPage: page,
        poemLoading: true,
        poemGotoPage: "",
        poemError: null,
        poemLastSearch: {
          ...this.data.poemLastSearch,
          page: page
        }
      });
      
      const keyword = this.data.poemSearchKeyword.trim();
      if (keyword) {
        this.searchPoems(keyword, page);
      } else {
        this.loadPoems(page);
      }
    },

    goToPoemPrevPage() {
      if (this.data.poemCurrentPage <= 1) return;
      this.goToPoemPage(this.data.poemCurrentPage - 1);
    },

    goToPoemNextPage() {
      if (this.data.poemCurrentPage >= this.data.poemTotalPages) return;
      this.goToPoemPage(this.data.poemCurrentPage + 1);
    },

    goToPoemSpecifiedPage() {
      let page = parseInt(this.data.poemGotoPage);
      if (isNaN(page)) {
        wx.showToast({ title: '请输入有效页码', icon: 'none' });
        return;
      }
      this.goToPoemPage(page);
    },

    loadPoems(page) {
      const params = {
        page: page.toString(),
        pageSize: this.data.poemPageSize.toString(),
        name: "",
        gradeId: this.data.currentGradeId || ""
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      wx.showLoading({ title: '加载中...', mask: true });
      
      app.authRequest({
        url: `/poemsByGrade?${queryString}`,
        method: 'GET'
      }).then(res => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data.code === 1) {
          this.processPoemData(res.data.data);
        } else {
          this.handlePoemError(res.data?.msg || '服务器错误');
        }
      }).catch(() => {
        wx.hideLoading();
        this.handlePoemError('网络请求失败，请检查网络后重试');
      });
    },

    searchPoems(keyword, page) {
      const params = {
        page: page.toString(),
        pageSize: this.data.poemPageSize.toString(),
        name: keyword,
        gradeId: this.data.currentGradeId || ""
      };
      
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      wx.showLoading({ title: '搜索中...', mask: true });
      
      app.authRequest({
        url: `/poemsByGrade?${queryString}`,
        method: 'GET'
      }).then(res => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          if (res.data.code === 1) {
            this.processPoemData(res.data.data, true);
          } else {
            this.handlePoemError(res.data.msg || '搜索失败');
          }
        } else {
          this.handlePoemError(`请求错误: ${res.statusCode}`);
        }
      }).catch(() => {
        wx.hideLoading();
        this.handlePoemError('搜索请求失败，请检查网络后重试');
      });
    },

    processPoemData(data, isSearch = false) {
      if (!data || !data.rows) {
        this.setData({
          poemSearchResults: [],
          poemTotalCount: 0,
          poemTotalPages: 1,
          poemLoading: false,
          poemError: null
        });
        return;
      }

      const poems = data.rows.map(item => {
        const cleanText = (text) => {
          if (!text) return '';
          return text
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&[a-z]+;/g, '')
            .replace(/\s+/g, ' ')
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
          content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        };
      });

      const totalPages = Math.ceil((data.total || 0) / this.data.poemPageSize);
      
      this.setData({
        poemSearchResults: poems,
        poemTotalCount: data.total || 0,
        poemTotalPages: totalPages > 0 ? totalPages : 1,
        poemLoading: false,
        poemHasSearched: isSearch,
        poemError: null
      });
    },

    handlePoemError(msg) {
      console.error('古诗页面错误:', msg);
      this.setData({ 
        poemLoading: false,
        poemError: msg
      });
      wx.showToast({ 
        title: msg, 
        icon: 'none',
        duration: 3000
      });
    },

    retryPoemRequest() {
      if (this.data.showSetGradeTip) return;
      const keyword = this.data.poemSearchKeyword.trim();
      if (keyword) {
        this.searchPoems(keyword, this.data.poemCurrentPage);
      } else {
        this.loadPoems(this.data.poemCurrentPage);
      }
    },

    navigateToPoemDetail(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) {
        wx.showToast({ title: '数据获取失败', icon: 'none' });
        return;
      }
      wx.navigateTo({
        url: `/pages/poem/poemdetail?id=${id}`
      });
    }
  }
});