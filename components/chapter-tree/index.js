// components/chapter-tree/index.js
Component({
  properties: {
    treeData: { // 导航树数据
      type: Object,
      value: {}
    },
    currentPath: { // 当前选中的章节路径
      type: Array,
      value: []
    }
  },
  
  data: {
    expandedNodes: {} // 存储节点展开状态
  },
  
  methods: {
    // 节点点击处理
    handleNodeClick(e) {
      const node = e.currentTarget.dataset.node;
      
      // 如果有子节点，则展开/折叠
      if (node.children && node.children.length > 0) {
        this.toggleNodeExpand(node);
      } else {
        // 叶子节点，触发章节选择事件
        this.triggerEvent('nodeclick', { chapterId: node.id });
      }
    },
    
    // 切换节点展开状态
    toggleNodeExpand(node) {
      const expanded = !this.isNodeExpanded(node);
      this.setData({
        [`expandedNodes[${node.id}]`]: expanded
      });
    },
    
    // 检查节点是否展开
    isNodeExpanded(node) {
      return !!this.data.expandedNodes[node.id];
    },
    
    // 检查节点是否被选中
    isNodeSelected(node) {
      return this.data.currentPath.includes(node.id);
    }
  }
});