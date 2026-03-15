const app = getApp();

// 1. ALL_SKILL_TYPES 数据字典
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
        skillArr: INITIAL_SKILL_TYPES_DISPLAY,
        
        filteredList: [], 
    },

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
            console.error('解析 userAnswer 失败:', e);
            return `${content} [断句位置解析失败]`;
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

    // 8. 核心重构：fetchUserAnswers
    fetchUserAnswers() {
        // 路径已重构：移除了多余的 /api 前缀
        return app.authRequest({
            url: '/sentence-breaking/getuseranswers',
            method: 'GET',
        })
        .then(res => {
            if (res.statusCode === 200 && res.data?.code === 1 && res.data.data) {
                
                const rawList = res.data.data;
                const processedList = rawList.map(item => {
                    const content = item.content || '题目内容缺失';
                    const answer = item.answer || '正确答案缺失';
                    const analysis = item.analysis || '解析缺失';
                    
                    const skillId = item.techniqueId || null;
                    const skillName = this.getSkillNameById(skillId);
                    const difficulty = getDifficultyName(item.difficulty || '未知'); 

                    return {
                        ...item,
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

    onDiffTap(e) { this.updateFilter('filterDiff', e.currentTarget.dataset.val); },
    onResTap(e) { this.updateFilter('filterRes', e.currentTarget.dataset.val); },
    onSkillTap(e) { this.updateFilter('filterSkill', e.currentTarget.dataset.val); },

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

    goBack() { wx.navigateBack(); },
    
    gotoReportPage() {
        wx.navigateTo({
            url: '/pages/breakingReport/breakingReport',
        });
    }
});