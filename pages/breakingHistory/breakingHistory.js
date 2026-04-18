const app = getApp();

// 1. ALL_SKILL_TYPES 现在是唯一的“数据字典”，用于将 techniqueId 映射为名称
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

// 2. 筛选器列表
const INITIAL_SKILL_TYPES_DISPLAY = ['全部', ...ALL_SKILL_TYPES.map(s => s.name)];

// 3. 辅助函数：难度映射
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

// 4. 辅助函数：时间格式化
function formatTime(isoString) {
    if (!isoString) return '未知时间';
    const dateStr = isoString.replace('T', ' ').split('.')[0];
    return dateStr;
}

Page({
    data: {
        historyList: [],
        isLoading: true,
        loadError: false,
        errorMsg: '',
        filterDiff: '全部',
        filterRes: '全部',
        filterSkill: '全部',
        
        diffArr: ['全部', '初级', '中级', '高级'],
        resArr: ['全部', '正确', '错误'],
        skillArr: INITIAL_SKILL_TYPES_DISPLAY, // 使用固定列表
        
        filteredList: [], 
    },

    // 5. onLoad【已优化】
    // 移除了 fetchAllQuestionDetails，只调用 fetchUserAnswers
    onLoad() {
        this.setData({ isLoading: true });
        this.fetchUserAnswers()
            .catch(error => {
                console.error('初始化加载失败:', error);
                this.showError('初始化加载失败，请重试或检查网络。');
            });
    },
    
    // 6. 辅助函数：断句格式化
    getTextFromBreaks(content, breaksStr) {
        if (!content || !breaksStr) return content;
        
        let breaks;
        try {
            breaks = JSON.parse(breaksStr).map(b => parseInt(b));
        } catch (e) {
            if(typeof breaksStr === 'string' && breaksStr.includes('/')) {
                 return breaksStr; 
            }
            console.error('解析 userAnswer 失败:', e);
            return `${content} [断句位置解析失败]`;
        }
        
        if (!breaks || breaks.length === 0) return content;
        
        const normalizedBreaks = [...new Set(breaks)].sort((a, b) => a - b);
        let result = '';

        for (let i = 0; i < content.length; i++) {
            result += content[i];
            if (normalizedBreaks.includes(i)) { 
                result += '/';
            }
        }
        return result;
    },

    // 7. 【已移除】
    // fetchAllQuestionDetails() 和全局 questionDetailsMap 已被完全移除

    // 8. 【核心优化】fetchUserAnswers
    // 移除了对 questionDetailsMap 的依赖和 ai/manual 的区分逻辑
    fetchUserAnswers() {
        return app.authRequest({
            url: '/sentence-breaking/getuseranswers',
            method: 'GET',
        })
        .then(res => {
            if (res.statusCode === 200 && res.data?.code === 1 && res.data.data) {
                
                const rawList = res.data.data;
                const processedList = rawList.map(item => {

                    // 统一从 item 获取所有数据
                    const content = item.content || '题目内容缺失';
                    const answer = item.answer || '正确答案缺失';
                    const analysis = item.analysis || '解析缺失';
                    
                    // 统一使用 techniqueId 获取题型
                    const skillId = item.techniqueId || null;
                    const skillName = this.getSkillNameById(skillId);
                    
                    // 统一获取难度
                    const difficulty = getDifficultyName(item.difficulty || '未知'); 

                    return {
                        ...item, // 保留 id, questionId, userId, userAnswer, isCorrect, createdAt
                        
                        // 统一赋值
                        formattedTime: formatTime(item.createdAt),
                        content,
                        answer,
                        analysis,
                        difficulty,
                        skillId,
                        skillName,
                        
                        userAnswerText: this.getTextFromBreaks(content, item.userAnswer), 
                        isCorrectBool: item.isCorrect === 1,
                        questionTypeDisplay: this.getQuestionTypeName(item.questionType),
                    };
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                
                this.setData({
                    historyList: processedList,
                    isLoading: false,
                    filteredList: this.getFilteredList(processedList, '全部', '全部', '全部'), 
                    skillArr: INITIAL_SKILL_TYPES_DISPLAY,
                });
            } else {
                throw new Error(res.data?.msg || '获取用户记录失败');
            }
        })
        .catch(err => {
            console.error('获取用户答题记录失败:', err);
            this.showError('获取用户答题记录失败，请检查网络或后端服务。');
        });
    },
        
    // 9. 辅助函数
    getQuestionTypeName(type) {
        if (type === 'manual') return '本地题库';
        if (type === 'ai') return 'AI题库';
        return type;
    },

    getSkillNameById(id) {
        const skill = ALL_SKILL_TYPES.find(s => s.id === id);
        return skill ? skill.name : '未知题型';
    },

    // 10. 筛选逻辑
    getFilteredList(list, diff, res, skill) {
        if (!list) return [];
        
        const filteredByDiff = diff === '全部'
            ? list
            : list.filter(item => item.difficulty === diff); 
            
        const filteredByRes = res === '全部'
            ? filteredByDiff
            : filteredByDiff.filter(item => {
                if (res === '正确') return item.isCorrectBool === true;
                if (res === '错误') return item.isCorrectBool === false;
                return true; 
            });

        const finalFilteredList = skill === '全部'
            ? filteredByRes
            : filteredByRes.filter(item => item.skillName === skill);
            
        return finalFilteredList;
    },
    
    updateFilter(key, value) {
        const dataToUpdate = { [key]: value };
        this.setData(dataToUpdate, () => {
            const { historyList, filterDiff, filterRes, filterSkill } = this.data;
            const newFilteredList = this.getFilteredList(historyList, filterDiff, filterRes, filterSkill);
            this.setData({
                filteredList: newFilteredList
            });
        });
    },

    onDiffTap(e) {
        const val = e.currentTarget.dataset.val;
        this.updateFilter('filterDiff', val);
    },
    onResTap(e) {
        const val = e.currentTarget.dataset.val;
        this.updateFilter('filterRes', val);
    },
    onSkillTap(e) {
        const val = e.currentTarget.dataset.val;
        this.updateFilter('filterSkill', val);
    },

    // 11. 错误处理
    showError(message) {
        this.setData({
            isLoading: false,
            loadError: true,
            errorMsg: message
        });
    },

    retryLoad() {
        this.setData({ loadError: false, isLoading: true });
        this.fetchUserAnswers()
            .catch(error => this.showError('重试失败: ' + error.message));
    },

    goBack() {
        wx.navigateBack();
    },
    // --- 【新增】跳转到报告页面 ---
    gotoReportPage() {
      wx.navigateTo({
          url: '/pages/breakingReport/breakingReport',
      });
  }    
});