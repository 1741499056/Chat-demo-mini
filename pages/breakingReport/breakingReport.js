const app = getApp();

// 复制 history.js 中的数据字典和辅助函数
const ALL_SKILL_TYPES = [
    { id: 1, name: "虚词定位法" },
    { id: 2, name: "对话标志法" },
    { id: 3, name: "主谓宾分析法" },
    { id: 4, name: "对称结构法" },
    { id: 5, name: "固定句式法" },
    { id: 6, name: "叹词定位法" },
    { id: 7, name: "时间词定位法" },
    { id: 8, name: "而字辨析法" },
    { id: 9, name: "专有名词保护法" },
];

function getSkillNameById(id) {
    const skill = ALL_SKILL_TYPES.find(s => s.id === id);
    return skill ? skill.name : '未知题型';
}

function getDifficultyName(difficultyValue) {
    if (typeof difficultyValue === 'string') {
        if (difficultyValue.includes('初')) return '初级';
        if (difficultyValue.includes('中')) return '中级';
        if (difficultyValue.includes('高')) return '高级';
        return difficultyValue;
    }
    if (difficultyValue == 1) return '初级';
    if (difficultyValue == 2) return '中级';
    if (difficultyValue == 3) return '高级';
    return '未知难度';
}

Page({
    data: {
        isLoading: true,
        loadError: false,
        errorMsg: '',

        // 统计数据
        totalCount: 0,
        overallAccuracy: "0%",

        //  题型错误率
        techniqueErrorRate: [],
        
    },

    onLoad(options) {
        this.loadAndAnalyzeData();
    },

    /**
     * 重新加载数据
     */
    retryLoad() {
        this.setData({ isLoading: true, loadError: false });
        this.loadAndAnalyzeData();
    },

    /**
     * 加载并分析数据
     */
    loadAndAnalyzeData() {
        app.authRequest({
            url: '/sentence-breaking/getuseranswers',
            method: 'GET',
        })
        .then(res => {
            if (res.statusCode === 200 && res.data?.code === 1 && res.data.data) {
                this.processAnalytics(res.data.data);
            } else {
                throw new Error(res.data?.msg || '获取用户记录失败');
            }
        })
        .catch(err => {
            console.error('报告页加载数据失败:', err);
            this.setData({
                isLoading: false,
                loadError: true,
                errorMsg: err.message || '加载数据失败，请重试'
            });
        });
    },

    /**
     * 核心分析逻辑
     * @param {Array} rawList - /getuseranswers 接口返回的原始数据
     */
    processAnalytics(rawList) {
        if (!rawList || rawList.length === 0) {
            this.setData({
                isLoading: false,
                totalCount: 0, // 确保显示“暂无数据”
            });
            return;
        }

        let totalCount = rawList.length;
        let correctCount = 0;

        // 聚合器
        const techniqueStats = {}; // { "虚词定位法": { total: 0, errors: 0 } }
       

        // 初始化所有已知的题型和难度，确保它们即使错误率为0也会显示
        ALL_SKILL_TYPES.forEach(skill => {
            techniqueStats[skill.name] = { total: 0, errors: 0 };
        });



        // 1. 遍历原始数据，填充聚合器
        rawList.forEach(item => {
            const isCorrect = item.isCorrect === 1;
            if (isCorrect) {
                correctCount++;
            }

            const skillName = getSkillNameById(item.techniqueId);
           

            // 累加题型统计
            if (!techniqueStats[skillName]) techniqueStats[skillName] = { total: 0, errors: 0 };
            techniqueStats[skillName].total++;
            if (!isCorrect) techniqueStats[skillName].errors++;

            
        });

        // 2. 计算最终结果
        // 辅助函数，用于计算并返回带百分比的样式字符串
        const calculateStats = (statsMap) => {
             return Object.keys(statsMap)
                .map(name => {
                    const stats = statsMap[name];
                    const errorRate = stats.total > 0 ? (stats.errors / stats.total) : 0;
                    const errorRatePercent = Math.round(errorRate * 100);
                    return {
                        name: name,
                        errorRate: errorRate,
                        errorRatePercent: errorRatePercent,
                        label: `${stats.errors} / ${stats.total} 题`,
                        // 计算完整的样式字符串
                        barStyle: `width: ${errorRatePercent}%`,
                    };
                });
        };

        // 0. 总体正确率
        const overallAccuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

        // 1. 题型错误率
        const techniqueErrorRate = calculateStats(techniqueStats)
            .filter(item => item.name !== '未知题型') // 过滤掉未知题型
            .sort((a, b) => b.errorRate - a.errorRate); // 按错误率降序
        // 3. 设置数据
        this.setData({
            isLoading: false,
            totalCount: totalCount,
            overallAccuracy: `${overallAccuracy}%`,
            techniqueErrorRate: techniqueErrorRate,
            
        });
    },
    // --- 【新增】跳转到练习页面 ---
    gotoSegmentationPage() {
      // 使用 navigateBack 返回上一级页面的上一级页面 (即 Practice -> History -> Report)
      wx.navigateBack({
          delta: 3 // 返回上两级页面，跳过 History 页面
      });
  }
});