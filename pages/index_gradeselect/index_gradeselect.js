const app = getApp();

Page({
  data: {
    selected: '', // 当前选中的年级名称
    redirectUrl: '',
    gradeList: [] // 新增：页面本地存储年级列表（用于回显校验）
  },

  onLoad(options) {
    // 1. 保存重定向地址
    if (options.redirectUrl) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirectUrl)
      });
    }

    // 2. 主动获取年级列表（关键：不再依赖注册页的全局数据）
    this.getGradeList();

    // 3. 回显已选中的年级（若有）
    if (app.globalData.userGradeName) {
      this.setData({
        selected: app.globalData.userGradeName
      });
    }
  },

  // 新增：主动获取后端年级列表，初始化全局和页面数据
  getGradeList() {
    const apiUrl = `${app.globalData.apiBaseUrl}/api/getGradeList`;
    wx.showLoading({ title: '加载年级列表...' });

    wx.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.code === 1 && Array.isArray(res.data.data)) {
          const gradeList = res.data.data;
          // 存储到页面数据和全局变量（供后续匹配ID使用）
          this.setData({ gradeList });
          app.globalData.gradeList = gradeList;
          console.log('年级列表加载成功:', gradeList);
        } else {
          wx.showToast({
            title: res.data?.msg || '加载年级失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('获取年级列表失败:', error);
        wx.showToast({ title: '网络错误，无法加载年级', icon: 'none' });
      }
    });
  },

  // 选择年级：确保选中的名称与后端name完全匹配
  selectGrade(e) {
    const gradeName = e.currentTarget.dataset.grade;
    // 校验：排除"全部"和"全年级"（后端特殊项，不允许选择）
    const isInvalid = ['全部', '全年级'].includes(gradeName);
    if (isInvalid) {
      wx.showToast({ title: '请选择具体年级', icon: 'none' });
      return;
    }
    this.setData({ selected: gradeName });
  },

  // 暂不设置：清空全局年级信息
  skipSet() {
    app.globalData.userGradeName = null;
    app.globalData.userGradeId = null;
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.gradeName = null;
    userInfo.gradeId = null;
    wx.setStorageSync('userInfo', userInfo);
    this.redirectToTarget();
  },

  // 保存年级：核心逻辑修正
  saveGrade() {
    const selectedGradeName = this.data.selected;
    if (!selectedGradeName) {
      wx.showToast({ title: '请先选择年级', icon: 'none' });
      return;
    }

    // 1. 从全局年级列表中匹配对应的ID（基于后端返回的data结构）
    const gradeList = app.globalData.gradeList || [];
    // 精确匹配name（后端返回的name与前端选择的名称必须完全一致）
    const selectedGrade = gradeList.find(item => item.name === selectedGradeName);

    // 2. 校验：确保找到有效年级ID，且排除特殊项（0和18）
    if (!selectedGrade || [0, 18].includes(selectedGrade.id)) {
      wx.showToast({ title: '选择的年级无效，请重新选择', icon: 'none' });
      return;
    }
    const selectedGradeId = selectedGrade.id; // 此时ID一定是有效数字（1-17）

    // 3. 更新全局变量和本地存储
    app.globalData.userGradeName = selectedGradeName;
    app.globalData.userGradeId = selectedGradeId;
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.gradeName = selectedGradeName;
    userInfo.gradeId = selectedGradeId;
    wx.setStorageSync('userInfo', userInfo);

    // 4. 调用后端接口更新用户年级
    this.setUserGrade(selectedGradeId);
  },

  // 调用后端接口更新年级（确保参数正确）
  setUserGrade(gradeId) {
    const apiUrl = `${app.globalData.apiBaseUrl}/api/users/grade`;
    const token = app.globalData.token || wx.getStorageSync('userInfo')?.token;

    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.hideLoading();
      return;
    }

    wx.showLoading({ title: '保存中...' });
    wx.request({
      url: apiUrl,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'token': token
      },
      data: { gradeId: gradeId }, // 传递数字类型的ID（与后端匹配）
      success: (res) => {
        if (res.data && res.data.code === 1) {
          wx.showToast({ title: '年级保存成功' });
        } else {
          wx.showToast({
            title: res.data?.msg || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.error('保存年级失败:', error);
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
        this.redirectToTarget();
      }
    });
  },

  // 跳转到目标页面
  redirectToTarget() {
    if (this.data.redirectUrl) {
      wx.redirectTo({ url: this.data.redirectUrl });
    } else {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  }
});