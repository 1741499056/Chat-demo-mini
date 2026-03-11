const app = getApp();

Page({
  data: {
    // 页面状态
    isCompleted: false,
    consecutiveDays: 0,
    currentPoem: null,

    // 日历相关数据
    isCalendarExpanded: false,
    currentYear: 2026,
    currentMonth: 2,
    calendarDays: [],
    todayStr: '',
  },

  onLoad() {
    // 初始化日期
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = this.formatDate(now);

    this.setData({
      currentYear: year,
      currentMonth: month,
      todayStr: todayStr
    });
  },

  onShow() {
    const token = wx.getStorageSync('token');
    
    // 校验 Token 是否存在
    if (token) {
      this.getDailyPoem(token);
      this.getMonthlyStats(token);
    } else {
      console.warn('无Token，显示模拟数据');
      this.showSimulatedData();
    }
  },

  // 交互：切换日历折叠/展开
  toggleCalendar() {
    this.setData({
      isCalendarExpanded: !this.data.isCalendarExpanded
    });
  },

  // 接口1：获取今日古诗
  getDailyPoem(token) {
    const apiUrl = `${app.globalData.apiBaseUrl}/api/coze/check-in/daily-poem`;

    wx.request({
      url: apiUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'token': token
      },
      success: (res) => {
        if (res.data && res.data.code === 1) {
          const result = res.data.data;
          this.setData({
            currentPoem: {
              id: result.id,
              title: result.name,
              author: result.author,
              dynasty: result.dynasty,
              content: result.fullAncientContent
            }
          });
        }
      },
      fail: (err) => {
        console.error('获取古诗失败', err);
      }
    });
  },

  // --- 接口2：获取月度打卡统计 (日历数据) [已修复] ---
  getMonthlyStats(token) {
    // 【修正点1】直接从 data 中获取当前的年和月
    const year = this.data.currentYear;
    const month = this.data.currentMonth;

    // 【修正点2】API 是 Path 参数，必须直接拼接在 URL 中
    // 错误写法：.../calendar/{year}/{month}
    // 正确写法：.../calendar/${year}/${month} -> 最终变成 .../calendar/2026/2
    const apiUrl = `${app.globalData.apiBaseUrl}/api/coze/check-in/calendar/${year}/${month}`;
  
    console.log('正在请求日历接口:', apiUrl); // 调试日志，确认 URL 是否正确

    wx.request({
      url: apiUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'token': token
      },
      // 【修正点3】由于参数已经拼接到 URL 路径中，这里不需要再传 data
      success: (res) => {
        console.log('月度数据:', res.data);
        if (res.data && res.data.code === 1) {
          const data = res.data.data;
          
          this.setData({
            consecutiveDays: data.consecutiveDays || 0
          });

          // 渲染日历
          this.renderCalendar(data.checkedInDates || []);
        } else {
          // 业务逻辑失败（如 code!=1），渲染空日历
          this.renderCalendar([]);
        }
      },
      fail: (err) => {
        console.error('日历请求网络错误', err);
        // 网络失败模拟数据
        this.renderCalendar([
          { date: "2026-02-15" }, 
          { date: "2026-02-16" }
        ]);
        this.setData({ consecutiveDays: 5 });
      }
    });
  },

  // 核心逻辑：渲染日历网格
  renderCalendar(checkedList) {
    const { currentYear, currentMonth, todayStr } = this.data;
    const daysArr = [];

    // 1. 获取当月第一天是周几 (0-6, 0是周日)
    const firstDayObj = new Date(currentYear, currentMonth - 1, 1);
    const startWeekDay = firstDayObj.getDay();

    // 2. 获取当月总天数
    const lastDayObj = new Date(currentYear, currentMonth, 0);
    const totalDays = lastDayObj.getDate();

    // 3. 将 checkedList 转换为 Set，统一格式 YYYY-MM-DD
    // 注意：接口返回的 date 必须严格匹配 YYYY-MM-DD 格式
    const checkedSet = new Set(checkedList.map(item => item.date));

    // 4. 填充前面的空白格
    for (let i = 0; i < startWeekDay; i++) {
      daysArr.push({ isEmpty: true });
    }

    // 5. 填充当月日期
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = this.formatDate(new Date(currentYear, currentMonth - 1, i));
      
      daysArr.push({
        isEmpty: false,
        day: i,
        fullDate: dateStr,
        isSigned: checkedSet.has(dateStr),
        isToday: dateStr === todayStr
      });
    }

    this.setData({
      calendarDays: daysArr
    });
  },

  // 工具：日期转字符串 YYYY-MM-DD
  formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 模拟数据展示
  showSimulatedData() {
    this.setData({
      consecutiveDays: 12,
      currentYear: 2026,
      currentMonth: 2,
      currentPoem: {
        id: 'p_001',
        title: '静夜思 (模拟数据)',
        author: '李白',
        dynasty: '唐',
        content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'
      }
    });
    this.renderCalendar([
      { date: "2026-02-01" },
      { date: "2026-02-02" },
      { date: "2026-02-15" }
    ]);
  },

  onAlreadyKnown() {
    wx.showToast({ title: '太棒了！', icon: 'success' });
    this.setData({ isCompleted: true });
  },

  onRecite() {
    const poem = this.data.currentPoem;
    if (!poem) return;
    wx.navigateTo({
      url: `/pages/check_in_evaluate/check_in_evaluate?id=${poem.id}&title=${encodeURIComponent(poem.title)}`,
    });
  },
  
  onPullDownRefresh() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.getDailyPoem(token);
      this.getMonthlyStats(token);
    }
    wx.stopPullDownRefresh();
  }
});