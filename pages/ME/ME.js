// pages/ME/ME.js
const app = getApp();

Page({
  data: {
    activeTab: 'collection',
    userInfo: {
      nickname: '未登录',
      username: ''
    },
    isLoggedIn: false,
    // 年级相关数据
    currentGrade: '', // 当前年级名称
    currentGradeId: null, // 当前年级ID
    gradeList: [], // 年级列表
    showGradeModal: false, // 是否显示年级选择弹窗
    selectedGrade: null // 临时选中的年级
  },

  onLoad() {
    // 页面加载时检查登录状态
    this.checkLoginStatus();
    // 加载年级数据
    this.loadGradeData();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadGradeData();
  },

  // 加载年级数据
  loadGradeData() {
    // 从全局数据或本地存储获取当前年级
    const storedUserInfo = wx.getStorageSync('userInfo');
    
    if (storedUserInfo && storedUserInfo.gradeId && storedUserInfo.gradeName) {
      // 直接从用户信息中获取年级信息
      this.setData({
        currentGrade: storedUserInfo.gradeName,
        currentGradeId: storedUserInfo.gradeId
      });
      
      // 同步到全局数据
      app.globalData.userGradeId = storedUserInfo.gradeId;
      app.globalData.userGradeName = storedUserInfo.gradeName;
    } else if (app.globalData.userGradeId && app.globalData.userGradeName) {
      // 如果全局数据中有年级信息，使用全局数据
      this.setData({
        currentGrade: app.globalData.userGradeName,
        currentGradeId: app.globalData.userGradeId
      });
    }
    
    // 获取年级列表
    this.getGradeList();
  },

  // 获取年级列表
  getGradeList() {
    const apiUrl = `${app.globalData.apiBaseUrl}/api/getGradeList`;
    
    wx.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 1) {
          // 过滤掉id为0的"全部"选项
          const gradeList = res.data.data.filter(item => item.id !== 0);
          this.setData({
            gradeList: gradeList
          });
        } else {
          wx.showToast({
            title: '获取年级列表失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 显示年级选择弹窗
  showGradePicker() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    this.setData({
      showGradeModal: true,
      selectedGrade: this.data.currentGradeId ? {
        id: this.data.currentGradeId,
        name: this.data.currentGrade
      } : null
    });
  },

  // 隐藏年级选择弹窗
  hideGradePicker() {
    this.setData({
      showGradeModal: false
    });
  },

  // 选择年级
  selectGrade(e) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({
      selectedGrade: grade
    });
  },

  // 确认设置年级
  confirmGrade() {
    if (!this.data.selectedGrade) {
      wx.showToast({
        title: '请选择年级',
        icon: 'none'
      });
      return;
    }

    this.setGrade(this.data.selectedGrade);
  },

  // 设置年级到服务器
  setGrade(grade) {
    const token = wx.getStorageSync('token') || app.globalData.token;
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '设置中...',
    });
    
    const apiUrl = `${app.globalData.apiBaseUrl}/api/users/grade`;
    
    wx.request({
      url: apiUrl,
      method: 'PUT',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      data: {
        gradeId: grade.id
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.code === 1) {
          // 设置成功，更新本地数据
          this.setData({
            currentGrade: grade.name,
            currentGradeId: grade.id,
            showGradeModal: false
          });
          
          // 更新本地存储的用户信息
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.gradeId = grade.id;
          userInfo.gradeName = grade.name;
          wx.setStorageSync('userInfo', userInfo);
          
          // 保存到全局数据
          app.globalData.userGradeId = grade.id;
          app.globalData.userGradeName = grade.name;
          
          wx.showToast({
            title: '设置成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data?.msg || '设置失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 检查登录状态并更新用户信息
  checkLoginStatus() {
    const storedInfo = wx.getStorageSync('userInfo');
    const globalState = app.globalData;
    
    if ((globalState.isLoggedIn || (storedInfo && storedInfo.token)) && storedInfo) {
      let displayName = '用户';
      
      if (storedInfo.username) {
        displayName = storedInfo.username;
      } else if (storedInfo.phone) {
        displayName = storedInfo.phone;
      } else if (app.globalData.userPhone) {
        displayName = app.globalData.userPhone;
      }
      
      this.setData({
        userInfo: {
          nickname: displayName,
          username: displayName
        },
        isLoggedIn: true,
        // 直接从用户信息中获取年级
        currentGrade: storedInfo.gradeName || app.globalData.userGradeName || '',
        currentGradeId: storedInfo.gradeId || app.globalData.userGradeId || null
      });
    } else {
      this.setData({
        userInfo: {
          nickname: '未登录',
          username: ''
        },
        isLoggedIn: false,
        currentGrade: '',
        currentGradeId: null
      });
    }
  },

  // 去登录
  goToLogin() {
    app.globalData.targetRoute = {
      path: '/pages/ME/ME',
      type: 'tabBar'
    };
    
    wx.navigateTo({
      url: '/pages/login/login?forceLogin=true'
    });
  },

  // 清理缓存
  clearCache: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清理缓存吗？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '清理中...',
          });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({
              title: '清理完成',
              icon: 'success'
            });
          }, 1000);
        }
      }
    });
  },

  // 关于我们
  aboutUs: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // 用户协议
  userAgreement: function() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 意见反馈(导航)
  feedback: function() {
    wx.navigateTo({
      // url: '/pages/index/index'
    });
  },

  // 隐私安全
  privacy: function() {
    wx.navigateTo({
      // url: '/pages/sentencesegmentation/sentencesegmentation'
    });
  },
  
  // 退出登录
  logout: function() {
    if (!this.data.isLoggedIn) return;
    
    wx.showModal({
      title: '退出确认',
      content: '确定要退出登录吗？',
      complete: (res) => {
        if (res.confirm) {
          // 清除本地用户信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          // 重置全局登录状态
          app.globalData.token = '';
          app.globalData.isLoggedIn = false;
          app.globalData.targetRoute = null;
          app.globalData.userGradeId = null;
          app.globalData.userGradeName = null;
          
          // 更新页面状态
          this.setData({
            userInfo: {
              nickname: '未登录',
              username: ''
            },
            isLoggedIn: false,
            currentGrade: '',
            currentGradeId: null
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});