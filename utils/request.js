// utils/request.js 基础请求封装
const request = (path, method, data) => {  // 参数名改为path更明确
  return new Promise((resolve, reject) => {
    wx.request({
      url: `http://121.40.171.211:8090${path}`, // 确保路径拼接正确
      method,
      data,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject({
            status: res.statusCode,
            data: res.data
          })
        }
      },
      fail: (err) => {
        reject({
          status: -1,
          errMsg: err.errMsg
        })
      }
    })
  })
}
// 获取全部列表
// 修改后的 getArticleList 方法
export const getArticleList = (params) => {
  return request('/getArticleList', 'GET', params)
    .then(res => {
      if (res.code === 200) {  // 根据实际API调整状态码判断
        return res.data;
      }
      throw new Error(res.message || 'API返回数据异常');
    })
    .catch(err => {
      console.error('[API] 请求失败:', err);
      return {
        success: false,
        error: err.status === 404 ? '接口不存在' : 
               err.status === -1 ? '网络连接失败' : '系统错误'
      };
    });
}

// 获取文章详情 + 导航栏
export const getArticleDetail = (id) => {
  return request('/getArticleDetail', 'GET', { id })
    .then(res => {
      if (res.code) {
        return res.data
      } else {
        return {
          success: false,
          error: '后端报错'
        }
      }
    })
    .catch(err => {
      console.error('获取失败:', err)
      return {
        success: false,
        error: '系统错误'
      }
    })
}

// 搜索文章标题
export const searchArticle = (title) => {
  return request('/searchArticles', 'GET', { title })
    .then(res => {
      if (res.code) {
        return res.data
      } else {
        return {
          success: false,
          error: '后端报错'
        }
      }
    })
    .catch(err => {
      console.error('获取失败:', err)
      return {
        success: false,
        error: '系统错误'
      }
    })
}

// 获取年级列表
export const getGradeList = () => {
  return request('/getGradeList', 'GET')
    .then(res => {
      if (res.code) {
        return res.data
      } else {
        return {
          success: false,
          error: '后端报错'
        }
      }
    })
    .catch(err => {
      console.error('获取失败:', err)
      return {
        success: false,
        error: '系统错误'
      }
    })
}

// 根据年级获取文章列表(如果id为0的情况)
export const getArticleListByGrade = (PoemPageQuery) => {
  return request('/poems', 'GET', {
    page: PoemPageQuery.page,
    pageSize: PoemPageQuery.pageSize,
    gradeId: PoemPageQuery.gradeId,
    name: PoemPageQuery.name
  }).then(res => {
    if (res.code) {
      return res.data
    } else {
      return {
        success: false,
        error: '后端报错'
      }
    }
  }).catch(err => {
    console.error('获取失败:', err)
    return {
      success: false,
      error: '系统错误'
    }
  })
}

// 获取文章列表(如果id不为0的情况)
export const getArticleListById = (PoemPageQueryGrade) => {
  return request('/poemsByGrade', 'GET', {
    page: PoemPageQueryGrade.page,
    pageSize: PoemPageQueryGrade.pageSize,
    gradeId: PoemPageQueryGrade.gradeId,
    name: PoemPageQueryGrade.name
  }).then(res => {
    if (res.code) {
      return res.data
    } else {
      return {
        success: false,
        error: '后端报错'
      }
    }
  }).catch(err => {
    console.error('获取失败:', err)
    return {
      success: false,
      error: '系统错误'
    }
  })
}

// 获取古诗详情
export const getPoemDetail = (id) => {
  return request(`/poem/${id}`, 'GET')
    .then(res => {
      if (res.code) {
        return res.data
      } else {
        return {
          success: false,
          error: '后端报错'
        }
      }
    })
    .catch(err => {
      console.error('获取失败:', err)
      return {
        success: false,
        error: '系统错误'
      }
    })
}

// 获取相关联的古诗名字
export const getRelatedPoems = (ids) => {
  return request('/poemsName', 'GET', {
    ids: ids.join(',')
  }).then(res => {
    if (res.code) {
      return res.data
    } else {
      return {
        success: false,
        error: '后端报错'
      }
    }
  }).catch(err => {
    console.error('获取失败:', err)
    return {
      success: false,
      error: '系统错误'
    }
  })
}

// 获取朝代列表
export const getDynastyList = () => {
  return request('/dynasties', 'GET')
    .then(res => {
      if (res.code) {
        return res.data
      } else {
        return {
          success: false,
          error: '后端报错'
        }
      }
    })
    .catch(err => {
      console.error('获取失败:', err)
      return {
        success: false,
        error: '系统错误'
      }
    })
}