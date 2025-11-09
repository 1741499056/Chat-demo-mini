const app = getApp();

// 全局缓存：存储所有题型下已加载的题目详情 (仅用于 Manual 题)
let questionDetailsMap = {};

// 全部题型列表 (用于筛选器和 Manual 题详情预加载)
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

// 优化后的题型显示列表 (固定值)
const INITIAL_SKILL_TYPES_DISPLAY = ['全部', ...ALL_SKILL_TYPES.map(s => s.name)];

// 难度映射辅助函数
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
        filterDiff: '全部',     // 当前选中的难度
        filterRes: '全部',      // 当前选中的结果
        filterSkill: '全部',    // 当前选中的题型
        
        // 筛选数据源
        diffArr: ['全部', '初级', '中级', '高级'],
        resArr: ['全部', '正确', '错误'],
        skillArr: INITIAL_SKILL_TYPES_DISPLAY, // 使用固定列表
        
        filteredList: [], 
    },

    onLoad() {
        this.setData({ isLoading: true });
        this.fetchAllQuestionDetails()
            .then(() => this.fetchUserAnswers())
            .catch(error => {
                console.error('初始化加载失败:', error);
                this.showError('初始化加载失败，请重试或检查网络。');
            });
    },
    
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


    // 【核心方法】获取 Manual 题详情
    fetchAllQuestionDetails() {
        const detailPromises = ALL_SKILL_TYPES.map(skill => {
            return app.authRequest({
                url: '/api/sentence-breaking/skills-questions',
                method: 'GET',
                data: { id: skill.id }
            })
            .then(res => {
                if (res.statusCode === 200 && res.data?.code === 1 && res.data.data) {
                    const exercises = res.data.data.exerciseQuestionsList || [];
                    exercises.forEach(q => {
                        questionDetailsMap[q.id] = {
                            content: q.content,
                            answer: q.answer,
                            analysis: q.analysis,
                            difficulty: getDifficultyName(q.difficulty), 
                            skillId: skill.id,
                        };
                    });
                } else {
                    console.warn(`获取题型ID ${skill.id} 失败:`, res.data?.msg || '服务器错误');
                }
            })
            .catch(err => {
                console.error(`请求题型ID ${skill.id} 失败:`, err);
            });
        });

        return Promise.all(detailPromises)
            .then(() => {
                console.log('所有 Manual 题型题目详情聚合完成。总题目数:', Object.keys(questionDetailsMap).length);
            });
    },

    // 【核心方法】获取用户答题记录并与题目详情合并 (处理 AI 和 Manual)
    fetchUserAnswers() {
        return app.authRequest({
            url: '/api/sentence-breaking/getuseranswers',
            method: 'GET',
        })
        .then(res => {
            if (res.statusCode === 200 && res.data?.code === 1 && res.data.data) {
                
                const rawList = res.data.data;
                const processedList = rawList.map(item => {

                    let content, answer, analysis, difficulty, skillId, skillName;

                    if (item.questionType === 'ai') {
                        // 策略 1: 如果是 AI 题库 (详情直接在 item 中)
                        content = item.content || 'AI题目内容缺失';
                        answer = item.answer || 'AI正确答案缺失';
                        analysis = item.analysis || 'AI解析缺失';
                        
                        difficulty = getDifficultyName(item.difficulty || item.difficultyLevel || '未知'); 
                        
                        // **关键修正：优先使用 skillId 映射到本地 9 种题型**
                        skillId = item.skillId || null; 
                        if (skillId) {
                            skillName = this.getSkillNameById(skillId); 
                        } else if (item.skillName) {
                            // 如果没有 skillId，退而求其次检查 skillName 是否是已知题型之一
                            skillName = ALL_SKILL_TYPES.find(s => s.name === item.skillName)?.name || '未知题型';
                        } else {
                            skillName = '未知题型'; 
                        }
                        
                    } else {
                        // 策略 2: 如果是 manual（本地）题库，从预加载的 map 中查找
                        const detail = questionDetailsMap[item.questionId] || {
                            content: `题目ID:${item.questionId} 详情缺失`,
                            answer: '正确答案缺失',
                            analysis: '解析缺失：请确保所有题型下的题目详情已加载',
                            difficulty: '未知难度',
                            skillId: null,
                            skillName: '未知题型',
                        };
                        content = detail.content;
                        answer = detail.answer;
                        analysis = detail.analysis;
                        difficulty = detail.difficulty;
                        skillId = detail.skillId;
                        skillName = this.getSkillNameById(detail.skillId); 
                    }
                    
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
                    skillArr: INITIAL_SKILL_TYPES_DISPLAY, // 使用固定列表
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
        
    // 辅助方法：将 questionType 转化为更友好的名称
    getQuestionTypeName(type) {
        if (type === 'manual') return '普通题库';
        if (type === 'ai') return 'AI题库';
        return type;
    },

    // 辅助方法：将 skillId 转化为题型名称
    getSkillNameById(id) {
        const skill = ALL_SKILL_TYPES.find(s => s.id === id);
        return skill ? skill.name : '未知';
    },

    // --- 核心筛选函数 ---
    getFilteredList(list, diff, res, skill) {
        if (!list) return [];
        
        // 1. 难度筛选
        const filteredByDiff = diff === '全部'
            ? list
            : list.filter(item => item.difficulty === diff); 
            
        // 2. 结果筛选
        const filteredByRes = res === '全部'
            ? filteredByDiff
            : filteredByDiff.filter(item => {
                if (res === '正确') return item.isCorrectBool === true;
                if (res === '错误') return item.isCorrectBool === false;
                return true; 
            });

        // 3. 题型筛选 (仅根据本地定义的 9 种题型或 '全部' 进行筛选)
        const finalFilteredList = skill === '全部'
            ? filteredByRes
            : filteredByRes.filter(item => item.skillName === skill);
            
        return finalFilteredList;
    },
    
    // 通用筛选更新函数
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

    // 筛选点击事件
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

    // --- 错误处理和重试 ---

    showError(message) {
        this.setData({
            isLoading: false,
            loadError: true,
            errorMsg: message
        });
    },

    retryLoad() {
        this.setData({ loadError: false, isLoading: true });
        this.fetchAllQuestionDetails()
            .then(() => this.fetchUserAnswers())
            .catch(error => this.showError('重试失败: ' + error.message));
    },

    goBack() {
        wx.navigateBack();
    }
});