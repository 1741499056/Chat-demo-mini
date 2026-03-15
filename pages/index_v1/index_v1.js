const app = getApp();

Page({
  data: {
    tabs: ['AI助手', '诗文库', '我的'],
    currentTab: 0,
    isPC: false,
    statusBarHeight: 0,
    navBarHeight: 160,
    totalNavBarHeightRpx: 160,
    
    // 个人中心数据
    userInfo: {
      nickname: '未登录',
      username: ''
    },
    isLoggedIn: false,
    currentGrade: '',
    currentGradeId: null,
    gradeList: []
  },

  onLoad() {
    const savedTab = wx.getStorageSync('indexV1CurrentTab') || 0;
    
    // 获取系统信息动态计算导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const isPC = systemInfo.platform === 'windows' || systemInfo.platform === 'mac';
    const statusBarHeight = isPC ? 0 : systemInfo.statusBarHeight;
    const totalNavBarHeightRpx = (statusBarHeight * 2) + 160;
    
    this.setData({ 
      currentTab: savedTab,
      isPC,
      statusBarHeight,
      totalNavBarHeightRpx
    });

    this.checkLoginStatus();
    this.loadGradeData();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadGradeData();
    
    // 通知各组件页面切换
    if (this.data.currentTab === 0) {
      this.selectComponent('#AI_assistant')?.onPageShow?.();
    } else if (this.data.currentTab === 1) {
      this.selectComponent('#poetry_library')?.onPageShow?.();
    } else if (this.data.currentTab === 2) {
      this.selectComponent('#my')?.onPageShow?.();
    }
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    wx.setStorageSync('indexV1CurrentTab', index);
    
    // 通知各组件页面切换
    if (index === 0) {
      this.selectComponent('#AI_assistant')?.onPageShow?.();
    } else if (index === 1) {
      this.selectComponent('#poetry_library')?.onPageShow?.();
    } else if (index === 2) {
      this.selectComponent('#my')?.onPageShow?.();
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const storedInfo = wx.getStorageSync('userInfo') || {};
    const globalState = app.globalData;

    if ((globalState.isLoggedIn || (storedInfo && storedInfo.token)) && storedInfo) {
      let displayName = '用户';
      if (storedInfo.username) displayName = storedInfo.username;
      else if (storedInfo.phone) displayName = storedInfo.phone;
      else if (globalState.userPhone) displayName = globalState.userPhone;

      this.setData({
        userInfo: { nickname: displayName, username: displayName },
        isLoggedIn: true,
        currentGrade: storedInfo.gradeName || globalState.userGradeName || '',
        currentGradeId: storedInfo.gradeId || globalState.userGradeId || null
      });
    } else {
      this.setData({
        userInfo: { nickname: '未登录', username: '' },
        isLoggedIn: false,
        currentGrade: '',
        currentGradeId: null
      });
    }
  },

  // 加载年级数据
  loadGradeData() {
    const isLoggedIn = this.data.isLoggedIn;
    this.setData({ isLoggedIn });
    
    if (!isLoggedIn) {
      this.setData({ 
        currentGrade: "",
        currentGradeId: null
      });
    } else {
      const globalGrade = app.globalData.userGradeName;
      const storedGrade = wx.getStorageSync('userInfo')?.gradeName;
      let newGrade = "";
      
      if (globalGrade) {
        newGrade = globalGrade;
      } else if (storedGrade) {
        newGrade = storedGrade;
      } else {
        this.fetchUserGrade();
        return;
      }
      
      this.setData({ currentGrade: newGrade });
    }
  },

  // 从服务器获取用户年级
  fetchUserGrade() {
    app.authRequest({
      url: '/users/info',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 1 && res.data.data) {
          const gradeName = res.data.data.gradeName;
          
          this.setData({ currentGrade: gradeName });
          
          app.globalData.userGradeName = gradeName;
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.gradeName = gradeName;
          wx.setStorageSync('userInfo', userInfo);
        }
      },
      fail: (error) => {
        console.error('获取用户年级失败:', error);
      }
    });
  },

  // 处理退出登录成功事件
  onLogoutSuccess() {
    // 更新父组件的登录状态
    this.setData({
      userInfo: { nickname: '未登录', username: '' },
      isLoggedIn: false,
      currentGrade: '',
      currentGradeId: null
    });
    
    // 通知诗文库组件更新状态
    const poetryLibrary = this.selectComponent('#poetry_library');
    if (poetryLibrary) {
      poetryLibrary.setData({
        isLoggedIn: false,
        currentGrade: '',
        currentGradeId: null
      });
    }
  }
});