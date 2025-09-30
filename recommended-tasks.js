class TaskRecommender {
    constructor() {
        this.initializeElements();
        this.initializeEventListeners();
        this.loadTasks();
    }

    initializeElements() {
        // 获取筛选器元素
        this.timeRangeSelect = document.getElementById('timeRange');
        this.prioritySelect = document.getElementById('priority');
        this.refreshButton = document.getElementById('refreshRecommendations');
        
        // 获取容器元素
        this.tasksContainer = document.getElementById('recommendedTasksContainer');
        
        // 获取统计数字元素
        this.todayTasksCount = document.getElementById('todayTasksCount');
        this.upcomingTasksCount = document.getElementById('upcomingTasksCount');
        this.completedTasksCount = document.getElementById('completedTasksCount');
    }

    initializeEventListeners() {
        // 添加筛选器变化事件监听
        this.timeRangeSelect.addEventListener('change', () => this.updateRecommendations());
        this.prioritySelect.addEventListener('change', () => this.updateRecommendations());
        this.refreshButton.addEventListener('click', () => this.loadTasks());
    }

    async loadTasks() {
        try {
            const tasks = await DBUtils.getAllTasks();
            this.tasks = tasks;
            this.updateRecommendations();
            this.updateStatistics();
            this.showToast('任务数据已更新');
        } catch (error) {
            console.error('加载任务时出错:', error);
            this.showToast('加载任务时出错', 'error');
        }
    }

    updateRecommendations() {
        const timeRange = this.timeRangeSelect.value;
        const priority = this.prioritySelect.value;
        
        // 获取推荐任务
        const recommendedTasks = this.getRecommendedTasks(timeRange, priority);
        
        // 清空容器
        this.tasksContainer.innerHTML = '';
        
        if (recommendedTasks.length === 0) {
            this.tasksContainer.innerHTML = '<p class="no-tasks">当前没有符合条件的推荐任务</p>';
            return;
        }

        // 渲染推荐任务
        recommendedTasks.forEach(task => {
            const taskCard = this.createTaskCard(task);
            this.tasksContainer.appendChild(taskCard);
        });
    }

    getRecommendedTasks(timeRange, priority) {
        if (!this.tasks) return [];

        const now = new Date();
        const filteredTasks = this.tasks.filter(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);

            // 时间范围筛选
            let isInTimeRange = false;
            switch (timeRange) {
                case 'today':
                    isInTimeRange = this.isToday(startDate) || this.isToday(endDate);
                    break;
                case 'tomorrow':
                    isInTimeRange = this.isTomorrow(startDate) || this.isTomorrow(endDate);
                    break;
                case 'week':
                    isInTimeRange = this.isThisWeek(startDate) || this.isThisWeek(endDate);
                    break;
                case 'month':
                    isInTimeRange = this.isThisMonth(startDate) || this.isThisMonth(endDate);
                    break;
            }

            // 优先级筛选
            const priorityMatch = priority === 'all' || this.getTaskPriority(task) === priority;

            return isInTimeRange && priorityMatch;
        });

        // 按优先级和日期排序
        return filteredTasks.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityA = priorityOrder[this.getTaskPriority(a)];
            const priorityB = priorityOrder[this.getTaskPriority(b)];

            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }

            return new Date(a.startDate) - new Date(b.startDate);
        });
    }

    getTaskPriority(task) {
        const now = new Date();
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        const totalDuration = endDate - startDate;
        const remainingTime = endDate - now;

        // 如果任务已经开始
        if (now > startDate) {
            // 如果剩余时间少于总时间的 25%，认为是高优先级
            if (remainingTime < totalDuration * 0.25) {
                return 'high';
            }
            // 如果剩余时间少于总时间的 50%，认为是中优先级
            if (remainingTime < totalDuration * 0.5) {
                return 'medium';
            }
            return 'low';
        }

        // 如果任务还未开始
        const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilStart <= 2) {
            return 'high';
        }
        if (daysUntilStart <= 7) {
            return 'medium';
        }
        return 'low';
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        
        const priority = this.getTaskPriority(task);
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        card.innerHTML = `
            <h3>${task.name}</h3>
            <div class="task-info">
                <div class="task-date">
                    <i class="fas fa-calendar"></i>
                    ${this.formatDate(startDate)} - ${this.formatDate(endDate)}
                </div>
                <span class="task-priority priority-${priority}">
                    ${this.getPriorityText(priority)}
                </span>
            </div>
        `;
        
        return card;
    }

    updateStatistics() {
        if (!this.tasks) return;

        const now = new Date();
        
        // 统计今日任务
        const todayTasks = this.tasks.filter(task => {
            const startDate = new Date(task.startDate);
            const endDate = new Date(task.endDate);
            return this.isToday(startDate) || this.isToday(endDate);
        });

        // 统计即将到期任务（3天内）
        const upcomingTasks = this.tasks.filter(task => {
            const endDate = new Date(task.endDate);
            const daysUntilDue = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            return daysUntilDue > 0 && daysUntilDue <= 3;
        });

        // 统计已完成任务
        const completedTasks = this.tasks.filter(task => {
            const endDate = new Date(task.endDate);
            return endDate < now;
        });

        // 更新统计数字
        this.todayTasksCount.textContent = todayTasks.length;
        this.upcomingTasksCount.textContent = upcomingTasks.length;
        this.completedTasksCount.textContent = completedTasks.length;
    }

    // 辅助方法
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.getDate() === tomorrow.getDate() &&
               date.getMonth() === tomorrow.getMonth() &&
               date.getFullYear() === tomorrow.getFullYear();
    }

    isThisWeek(date) {
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return date >= weekStart && date <= weekEnd;
    }

    isThisMonth(date) {
        const now = new Date();
        return date.getMonth() === now.getMonth() &&
               date.getFullYear() === now.getFullYear();
    }

    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    getPriorityText(priority) {
        const priorityTexts = {
            high: '高优先级',
            medium: '中优先级',
            low: '低优先级'
        };
        return priorityTexts[priority] || '未知优先级';
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// 当页面加载完成时初始化推荐系统
document.addEventListener('DOMContentLoaded', () => {
    new TaskRecommender();
});