const app = getApp();
Component({
  properties: {
    // 从父组件传递的属性
    userInfo: {
      type: Object,
      value: {
        nickname: '未登录',
        username: ''
      }
    },
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
    },
    gradeList: {
      type: Array,
      value: []
    }
  },

  data: {
    // 组件内部数据
  },

  methods: {
    // 页面显示时的处理
    onPageShow() {
      // 可以在这里添加页面显示时的逻辑
    },

    // 跳转到年级选择页
    goToGradeSelect() {
      if (!this.data.isLoggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const currentPageUrl = '/pages/index_v1/index_v1';
      wx.navigateTo({
        url: `/pages/index_gradeselect/index_gradeselect?redirectUrl=
        {encodeURIComponent(currentPageUrl)}`
      });
    },

    // 去登录
    goToLogin() {
      wx.setStorageSync('indexV1CurrentTab', 2); // 保存当前tab为我的页面
      app.globalData.targetRoute = null;
      wx.navigateTo({
        url: `/pages/login/login?forceLogin=true&redirect=${encodeURIComponent('/pages/index_v1/index_v1')}`
      });
    },

    // 清理缓存
    clearCache() {
      wx.showModal({
        title: '提示',
        content: '确定要清理缓存吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '清理中...' });
            setTimeout(() => {
              wx.hideLoading();
              wx.showToast({ title: '清理完成', icon: 'success' });
            }, 1000);
          }
        }
      });
    },

    // 关于我们
    aboutUs() {
      wx.navigateTo({ url: '/pages/about/about' });
    },

    // 用户协议
    userAgreement() {
      wx.navigateTo({ url: '/pages/agreement/agreement' });
    },

    // 意见反馈
    feedback() {
      wx.navigateTo({ url: '/pages/feedback/feedback' });
    },

    // 隐私安全
    privacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' });
    },

    // 退出登录
    logout() {
      if (!this.data.isLoggedIn) return;

      wx.showModal({
        title: '退出确认',
        content: '确定要退出登录吗？',
        complete: (res) => {
          if (res.confirm) {
            // 清理本地存储
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            
            // 清理全局数据
            app.globalData.token = '';
            app.globalData.isLoggedIn = false;
            app.globalData.userPhone = '';
            app.globalData.userGradeId = null;
            app.globalData.userGradeName = null;
            
            // 更新组件数据
            this.setData({
              userInfo: { nickname: '未登录', username: '' },
              isLoggedIn: false,
              currentGrade: '',
              currentGradeId: null
            });
            
            // 通知父组件数据变化
            this.triggerEvent('logoutSuccess');
            
            wx.showToast({ title: '已退出登录', icon: 'success' });
          }
        }
      });
    },
       //临时测试打卡跳转
       goTodaka:function()
       {
         wx.navigateTo({
           url: '/pages/check_in/check_in',
         })
       }

  }
   
});

