const app = getApp();

export const AtomicActions = {

    //1. 路由跳转
   
  async navigateTo({ url }) {
    return new Promise((resolve) => {
      // 检查页面栈深度，防止超过 10 层报错
      const pages = getCurrentPages();
      const action = pages.length >= 10 ? wx.redirectTo : wx.navigateTo;
      
      action({
        url,
        success: () => {
          // 稍微延迟，等待页面初始化，防止后续连续 action 跑得太快
          setTimeout(() => resolve({ success: true }), 300); 
        },
        fail: (err) => {
          console.error("跳转失败", err);
          // 明确返回失败状态
          resolve({ success: false, error: err });
        }
      });
    });
  },

  /**
   * 2. 更新/修改年级
   */
  async updateGrade({ gradeId }) {
    console.log("🚀 开始提权请求，目标 gradeId:", gradeId); // 确认函数进来了
    try {
      const res = await app.authRequest({
        url: '/users/grade',
        method: 'PUT',
        data: { gradeId }
      });
      
      console.log("📡 后端原始返回:", res.data);

      if (res.data.code === 1) {
        app.globalData.userGradeId = gradeId;

        if (res.data.data && res.data.data.token) {
          console.log("🔑 拿到新权限 Token:", res.data.data.token);
          wx.setStorageSync('token', res.data.data.token);
          app.globalData.token = res.data.data.token;
        }
        return { success: true, data: gradeId };
      }
      return { success: false, error: '后端返回 Code 错误' };
    } catch (e) {
      console.error("❌ 请求崩了:", e);
      return { success: false, error: e };
    }
  },

  /**
   * 3. 通用数据查询
   */
  async fetchData({ url, method = 'GET', data = {} }) {
    try {
      const res = await app.authRequest({ url, method, data });
      return { success: true, data: res.data }; 
    } catch (e) {
      return { success: false, error: e };
    }
  },

  /**
   * 4. 交互反馈
   */
  async showToast({ title, icon = 'none', duration = 1500 }) {
    return new Promise((resolve) => {
      wx.showToast({ title, icon, duration });
      // 等待提示框展示完毕再执行下一步
      setTimeout(() => resolve({ success: true }), duration);
    });
  },
};