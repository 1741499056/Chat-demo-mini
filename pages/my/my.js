// my.js
const app = getApp();
// 引入执行器
import { runPlanner } from '../../utils/agent/executor.js'; 

Component({
  properties: {
    userInfo: { type: Object, value: { nickname: '未登录', username: '' } },
    isLoggedIn: { type: Boolean, value: false },
    currentGrade: { type: String, value: '' },
    currentGradeId: { type: Number, value: null },
    gradeList: { type: Array, value: [] }
  },

  data: {
    searchKeyword: "", 
    isSearching: false, 
    agentStatusText: "" // 🌟 新增：用于存放 Agent 当前执行的动作文案
  },

  methods: {
    onInput: function(e) {
      this.setData({ searchKeyword: e.detail.value });
    },

    doSearch: function() {
      const keyword = this.data.searchKeyword.trim();
      if (!keyword) {
        wx.showToast({ title: '请输入古诗名', icon: 'none' });
        return;
      }
      this.autoSearchAndJump(keyword);
    },

    //Agent ---
    autoSearchAndJump: async function(poemName) {
      if (this.data.isSearching) return;
      
      // 🌟 开启自定义遮罩，初始化文案
      this.setData({ 
        isSearching: true,
        agentStatusText: 'Agent接管中...' 
      });

      const originalGradeId = app.globalData.userGradeId || wx.getStorageSync('userInfo')?.gradeId;
      if (!originalGradeId) {
        wx.showToast({ title: '请先登录并设置年级', icon: 'none' });
        this.setData({ isSearching: false, agentStatusText: '' });
        return;
      }

      // 注意：这里删除了原有的 wx.showLoading

      try {
        /**
         * 模拟大模型返回的 JSON Plan
         */
        const mockPlan = [
          {
            action: 'SET_GRADE',
            params: { gradeId: 18 },
            comment: '🔐 正在开启全库访问权限...' 
          },
          {
            action: 'QUERY_DATA',
            params: {
              url: `/poemsByGrade?page=1&pageSize=1&name=${encodeURIComponent(poemName)}`,
              method: 'GET'
            },
            outputKey: 'searchRes',
            comment: `🔍 正在库中搜寻《${poemName}》...` // 动态显示书名
          },
          {
            action: 'SET_GRADE',
            params: { gradeId: '{{originalGradeId}}' },
            comment: '♻️ 正在恢复您的年级设置...'
          },
          {
            action: 'NAVIGATE',
            params: {
              url: `/pages/poem/poemdetail?id={{searchRes.data.rows.0.id}}`
            },
            comment: '🚀 正在为您直达详情页...'
          }
        ];

        // 🌟 将任务丢给执行器跑，传入回调函数实时更新 agentStatusText
        const finalContext = await runPlanner(mockPlan, (comment) => {
          this.setData({ agentStatusText: comment });
        });

        const foundId = finalContext?.searchRes?.data?.rows?.[0]?.id;
        if (foundId) {
          this.setData({ searchKeyword: "" }); // 搜到了，清空输入框
        } else {
          wx.showToast({ title: `全库未找到"${poemName}"`, icon: 'none' });
        }

      } catch (error) {
        console.error('Agent 测试链路异常:', error);
        wx.showToast({ title: 'Agent调度崩溃', icon: 'none' });
      } finally {
        // 🌟 无论成功失败，重置搜索状态和文案，关闭遮罩
        this.setData({ 
          isSearching: false,
          agentStatusText: '' 
        });
      }
    },

    goToGradeSelect() {
      if (!this.data.isLoggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      const currentPageUrl = '/pages/index_v1/index_v1';
      wx.navigateTo({
        url: `/pages/index_gradeselect/index_gradeselect?redirectUrl=${encodeURIComponent(currentPageUrl)}`
      });
    },

    goToLogin() {
      wx.setStorageSync('indexV1CurrentTab', 2);
      app.globalData.targetRoute = null;
      wx.navigateTo({
        url: `/pages/login/login?forceLogin=true&redirect=${encodeURIComponent('/pages/index_v1/index_v1')}`
      });
    },

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

    aboutUs() { wx.navigateTo({ url: '/pages/about/about' }); },
    userAgreement() { wx.navigateTo({ url: '/pages/agreement/agreement' }); },
    feedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },
    privacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },

    logout() {
      if (!this.data.isLoggedIn) return;
      wx.showModal({
        title: '退出确认',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            app.globalData.token = '';
            app.globalData.isLoggedIn = false;
            this.setData({
              userInfo: { nickname: '未登录', username: '' },
              isLoggedIn: false,
              currentGrade: '',
              currentGradeId: null
            });
            this.triggerEvent('logoutSuccess');
            wx.showToast({ title: '已退出登录', icon: 'success' });
          }
        }
      });
    },

    goTodaka: function() {
      wx.navigateTo({ url: '/pages/check_in/check_in' });
    }
  }  
});