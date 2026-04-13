const app = getApp();

Page({
  data: {
    poemList: [],
    currentPage: 1,
    pageSize: 8, // 对应图片中的 pageSize 参数
    totalCount: 0,
    totalPages: 0,
    keyword: '', // 对应图片中的 keyword 参数
    isLoading: false,
    loadError: false
  },

  onLoad() {
    this.fetchPoemList();
  },

  // 获取古诗列表
  fetchPoemList() {
    this.setData({ isLoading: true, loadError: false });

    app.authRequest({
      url: '/api/questions/recitation/poems',
      method: 'GET',
      data: {
        page: this.data.currentPage,
        pageSize: this.data.pageSize,
        keyword: this.data.keyword
      }
    }).then(res => {
      if (res.data && String(res.data.code) === '1') {
        const { rows, total } = res.data.data;
        this.setData({
          poemList: rows || [],
          totalCount: total,
          totalPages: Math.ceil(total / this.data.pageSize)
        });
      } else {
        this.setData({ loadError: true });
      }
    }).catch(() => {
      this.setData({ loadError: true });
    }).finally(() => {
      this.setData({ isLoading: false });
    });
  },

  // 搜索输入触发
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 点击搜索按钮
  doSearch() {
    this.setData({ currentPage: 1 }, () => {
      this.fetchPoemList();
    });
  },

  // 跳转到详情页
  goToDictation(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/PoemDictation/PoemDictation?poemId=${id}&title=${encodeURIComponent(name)}`
    });
  },

  // 分页逻辑
  prevPage() {
    if (this.data.currentPage > 1) {
      this.setData({ currentPage: this.data.currentPage - 1 }, () => this.fetchPoemList());
    }
  },

  nextPage() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({ currentPage: this.data.currentPage + 1 }, () => this.fetchPoemList());
    }
  }
});