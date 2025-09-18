# 甘特图应用(Gantt Chart Application)

![alt text](image.png)

一个基于Web的甘特图应用，帮助用户可视化和管理项目任务时间线。

## 项目结构

### 文件说明
| 文件名 | 作用 |
|--------|------|
| index.html | 应用入口页面，加载所有资源文件 |
| script.js | 主逻辑文件，包含甘特图核心功能 |
| style.css | 主样式文件，定义应用整体样式和设计系统 |
| import-helper.js | 导入功能模块，处理数据导入逻辑 |
| import-styles.css | 导入相关样式文件 |
| task-styles.js | 任务列表相关样式逻辑 |

### 样式架构
- **style.css**: 包含全局样式和设计系统定义
  - 定义CSS变量(颜色、间距、圆角等)
  - 提供基础组件样式(按钮、表格、表单等)
  - 遵循统一的设计规范
- **import-styles.css**: 仅包含导入功能相关样式
- **task-styles.js**: 处理任务列表的动态样式逻辑

## 样式指南

### CSS变量使用
所有样式应使用预定义的CSS变量，确保设计一致性:
```css
/* 使用示例 */
.element {
  color: var(--secondary);
  background-color: var(--bg-light);
  border-radius: var(--radius);
}
```

### 设计规范
1. **颜色**: 使用预定义的颜色变量(--primary, --secondary等)
2. **间距**: 统一使用8px为基准单位
3. **圆角**: 使用--radius(12px)或--radius-sm(8px)
4. **过渡效果**: 使用--transition变量统一动画效果
5. **阴影**: 使用--shadow变量统一阴影效果

### 最佳实践
- 避免内联样式，使用CSS类
- 组件样式应独立且可复用
- 响应式设计优先考虑移动端
- 使用BEM命名规范或类似方法保持样式可维护性

### 依赖关系
- `index.html` 依赖 `script.js` 和 `style.css`
- `script.js` 依赖 `import-helper.js` 处理导入功能
- 样式文件相互独立，分别应用于不同模块

## 功能特点

- 可视化任务时间线
- 支持周视图和月视图切换
- 任务添加、编辑和删除
- 任务进度跟踪
- 数据导入导出(JSON格式)
- 本地数据存储(IndexedDB)

## 安装指南

### 前置要求
- 现代浏览器(Chrome/Firefox/Edge最新版)
- Node.js(可选，用于开发)

### 快速开始
1. 克隆仓库:
   ```bash
   git clone https://github.com/lylliu05/Gantt-Chart-Application.git
   ```
2. 访问 https://resplendent-malabi-381327.netlify.app/

## 使用说明

### 基本操作
- 点击"添加任务"按钮创建新任务
- 点击任务条可编辑任务
- 使用左右箭头按钮导航时间线
- 点击"今天"按钮返回当前日期

### 数据导入导出
1. 点击"导出"按钮下载当前数据(JSON格式)
2. 点击"导入"按钮选择JSON文件导入数据

支持两种导入模式:
- **替换模式**: 完全替换现有任务
- **合并模式**: 保留现有任务，仅更新匹配ID的任务

## 贡献指南

欢迎贡献代码!请遵循以下步骤:

1. Fork项目
2. 创建特性分支(`git checkout -b feature/AmazingFeature`)
3. 提交更改(`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支(`git push origin feature/AmazingFeature`)
5. 发起Pull Request

## 许可证

[MIT](https://choosealicense.com/licenses/mit/)

## 联系方式

如有问题或建议，请联系: 1369785290@qq.com
