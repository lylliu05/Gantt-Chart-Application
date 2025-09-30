class GanttChart {
    constructor() {
        // 基本配置
        this.tasks = [];
        this.selectedTask = null;
        this.currentDate = new Date();
        this.viewMode = 'week';
        this.colWidth = 200;
        this.taskColors = ['#8e44ad', '#16a085', '#d35400', '#27ae60', '#c0392b', '#2980b9', '#f1c40f', '#7f8c8d'];
        this.version = '版本号错误'; // 默认版本号
        this.debug = false; // 调试模式开关
        this._renderPending = false; // 渲染状态标记
        this.layerManager = null; // 渲染层管理器
        
        // 响应式设置
        this.updateResponsiveSettings();
        
        // 初始化应用
        this.initApplication();
    }
    
    // 更新响应式设置
    updateResponsiveSettings() {
        this.rowHeight = window.innerWidth <= 767 ? 40 : 55;
        this.padding = window.innerWidth <= 767 ? 10 : 25;
    }
    
    // 应用初始化
    async initApplication() {
        // 创建通知容器
        this.createNotificationContainer();
        
        try {
            // 加载配置
            await this.loadConfig();
            this.updateVersionDisplay();
            
            // 初始化Canvas
            this.canvas = document.getElementById('ganttCanvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d', { alpha: true }); // 启用alpha通道支持分层
                this.layerManager = new LayerManager(this.canvas);
                this.taskStyles = new TaskStyles(this.ctx, this.rowHeight);
                
                this.initElements();
                this.setupEventListeners();
                this.updateDateRangeDisplay(); // 立即更新日期显示
                this.resizeCanvas();
                this.render();
                
                // 使用单一的resize事件监听器
                window.addEventListener('resize', this.debounce(() => {
                    this.updateResponsiveSettings();
                    this.resizeCanvas();
                    this.render();
                }, 200));
            }
            
            // 加载任务数据
            await this.loadTasks();
            
            // 显示应用加载成功通知
            this.showNotification('甘特图应用加载成功', 'success');
        } catch (error) {
            console.error('初始化应用程序时出错:', error);
            this.showNotification('应用加载失败，请刷新页面重试', 'error');
        }
    }
    
    /**
     * 创建通知容器
     */
    createNotificationContainer() {
        // 检查是否已存在通知容器
        if (document.getElementById('notification-container')) return;
        
        // 创建通知容器
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }
    
    /**
     * 显示通知消息
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (success, error, info)
     * @param {number} duration - 显示时长(毫秒)
     */
    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // 添加显示类以触发动画
        setTimeout(() => notification.classList.add('show'), 10);
        
        // 设置自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => {
                // 检查元素是否仍然是容器的子元素，防止重复移除
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            });
        }, duration);
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error('配置文件加载失败');
            const config = await response.json();
            if (config.version) this.version = config.version;
        } catch (error) {
            console.error('加载配置文件失败:', error);
        }
    }

    updateVersionDisplay() {
        const titleElement = document.querySelector('.header-pane h1');
        if (titleElement) {
            titleElement.textContent = `甘特图v${this.version}`;
        }
    }

    async importData(jsonData) {
        try {
            // 验证数据格式
            if (!jsonData || typeof jsonData !== 'object') {
                throw new Error('数据格式不正确');
            }

            // 验证任务数组
            if (!jsonData.tasks || !Array.isArray(jsonData.tasks)) {
                throw new Error('任务数据格式不正确');
            }

            // 限制最大任务数量
            const MAX_TASKS = 1000;
            if (jsonData.tasks.length > MAX_TASKS) {
                throw new Error(`任务数量超过最大限制(${MAX_TASKS})`);
            }

            // 使用ImportHelper处理导入
            const importHelper = new ImportHelper(this);
            return await importHelper.processImport(jsonData);
        } catch (error) {
            console.error('导入错误:', error);
            this.showToast(`导入失败: ${error.message}`, 'error');
            throw error;
        }
    }

    exportData() {
        const data = {
            tasks: this.tasks.map(task => ({
                name: task.name,
                startDate: task.startDate.toISOString(),
                endDate: task.endDate.toISOString(),
                progress: task.progress
            })),
            currentDate: this.currentDate.toISOString(),
            viewMode: this.viewMode
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `gantt-data-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    jumpToToday() {
        this.currentDate = new Date();
        
        if (this.viewMode === 'month') {
            this.currentDate.setDate(1);
        }
        
        this.updateDateRangeDisplay();
        this.resizeCanvas();
        this.render();
        
        this.todayBtn.classList.add('active');
        setTimeout(() => {
            this.todayBtn.classList.remove('active');
        }, 500);
    }

    initElements() {
        console.log('开始初始化DOM元素...');
        
        // 确保所有必需的元素都存在
        const requiredElements = [
            'addTask', 'weekView', 'monthView', 'prevWeek', 'nextWeek',
            'todayBtn', 'exportBtn', 'importBtn', 'importFile',
            'taskDialog', 'taskForm', 'cancelDialog', 'currentDateRange',
            'overlay', 'taskName', 'taskStartDate', 'taskEndDate'
        ];
        
        // 严格检查所有必需元素
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('缺少必需元素:', missingElements.join(', '));
            throw new Error(`缺少必需元素: ${missingElements.join(', ')}`);
        }

        // 初始化后再次验证关键元素
        const validateElement = (element, name) => {
            if (!element) {
                console.error(`元素初始化失败: ${name}`);
                throw new Error(`元素初始化失败: ${name}`);
            }
            return element;
        };
        
        // 初始化元素并验证
        this.addTaskBtn = validateElement(document.getElementById('addTask'), 'addTask');
        this.weekViewBtn = validateElement(document.getElementById('weekView'), 'weekView');
        this.monthViewBtn = validateElement(document.getElementById('monthView'), 'monthView');
        this.prevWeekBtn = validateElement(document.getElementById('prevWeek'), 'prevWeek');
        this.nextWeekBtn = validateElement(document.getElementById('nextWeek'), 'nextWeek');
        this.todayBtn = validateElement(document.getElementById('todayBtn'), 'todayBtn');
        this.exportBtn = validateElement(document.getElementById('exportBtn'), 'exportBtn');
        this.importBtn = validateElement(document.getElementById('importBtn'), 'importBtn');
        this.importFile = validateElement(document.getElementById('importFile'), 'importFile');
        this.taskDialog = validateElement(document.getElementById('taskDialog'), 'taskDialog');
        this.taskForm = validateElement(document.getElementById('taskForm'), 'taskForm');
        this.cancelDialogBtn = validateElement(document.getElementById('cancelDialog'), 'cancelDialog');
        this.currentDateRangeEl = validateElement(document.getElementById('currentDateRange'), 'currentDateRange');
        this.overlay = validateElement(document.getElementById('overlay'), 'overlay');
        this.taskNameInput = validateElement(document.getElementById('taskName'), 'taskName');
        this.taskStartDateInput = validateElement(document.getElementById('taskStartDate'), 'taskStartDate');
        this.taskEndDateInput = validateElement(document.getElementById('taskEndDate'), 'taskEndDate');

        // 安全设置style属性
        const safeSetStyle = (element, styles) => {
            if (element && element.style) {
                Object.assign(element.style, styles);
            } else {
                console.warn('尝试设置不存在的元素的style:', element);
            }
        };
        
        console.log('所有DOM元素初始化完成');
        
        const today = new Date().toISOString().split('T')[0];
        this.taskStartDateInput.value = today;
        this.taskEndDateInput.value = today;
        
        this.taskStartDateInput.addEventListener('change', this.updateEndDateMin.bind(this));
    }

    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    resizeCanvas() {
        if (!this.canvas || !this.layerManager) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const { startDate, endDate } = this.getCurrentViewDateRange();
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // 根据可用空间调整列宽
        const availableWidth = container.clientWidth - this.padding * 2;
        this.colWidth = Math.max(80, availableWidth / totalDays);
        
        // 计算画布尺寸
        const width = this.padding * 2 + totalDays * this.colWidth;
        const visibleTasks = this.getVisibleTasks();
        const height = Math.max(this.padding * 2 + visibleTasks.length * this.rowHeight, 300);
        
        // 设置主画布和所有渲染层的尺寸
        this.canvas.width = width;
        this.canvas.height = height;
        this.layerManager.resizeAll(width, height);
        this.layerManager.markAllDirty(); // 标记所有层需要重绘
    }

    getCurrentViewDateRange() {
        if (this.viewMode === 'week') {
            return DateUtils.getWeekRange(this.currentDate);
        } else {
            return DateUtils.getMonthRange(this.currentDate);
        }
    }

    getVisibleTasks() {
        const { startDate, endDate } = this.getCurrentViewDateRange();
        return this.tasks.filter(task => {
            try {
                const taskStart = DateUtils.parseDate(task.startDate);
                const taskEnd = DateUtils.parseDate(task.endDate);
                return taskStart <= endDate && taskEnd >= startDate;
            } catch (error) {
                console.warn('任务日期解析错误:', error);
                return false;
            }
        });
    }

    updateDateRangeDisplay() {
        const { startDate, endDate } = this.getCurrentViewDateRange();
        const format = this.viewMode === 'week' ? 'full' : 'month';
        
        try {
            // 确保日期对象有效
            if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
                !(endDate instanceof Date) || isNaN(endDate.getTime())) {
                throw new Error('无效的日期对象');
            }

            // 更新日期范围显示
            this.currentDateRangeEl.textContent = DateUtils.formatDateRange(startDate, endDate, format);

            // 更新视图按钮状态
            this.weekViewBtn.classList.toggle('active', this.viewMode === 'week');
            this.monthViewBtn.classList.toggle('active', this.viewMode === 'month');
        } catch (error) {
            console.error('日期范围格式化错误:', error);
            this.showToast('日期显示格式化失败', 'error');
        }
    }

    async loadTasks() {
        try {
            if (!this.db) {
                await this.initDB();
            }
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['tasks'], 'readonly');
                const store = transaction.objectStore('tasks');
                const request = store.getAll();
                
                request.onsuccess = (event) => {
                    console.log('从数据库加载的任务数据:', event.target.result);
                    
                    // 验证并处理加载的数据
                    this.tasks = event.target.result.map(task => {
                        // 确保所有必要字段都存在
                        if (!task.id || !task.name || !task.startDate || !task.endDate) {
                            console.warn('发现无效任务数据:', task);
                            return null;
                        }
                        
                        return {
                            id: task.id,
                            name: task.name,
                            startDate: new Date(task.startDate),
                            endDate: new Date(task.endDate),
                            progress: task.progress || 0
                        };
                    }).filter(task => task !== null); // 过滤掉无效数据
                    
                    console.log('处理后的任务数据:', this.tasks);
                    
                    // 只在canvas存在时执行重绘
                    if (this.canvas) {
                        this.resizeCanvas();
                        this.render(true); // 强制完全重绘
                    }
                    resolve();
                };
                
                request.onerror = (event) => {
                    console.error('加载任务失败:', event.target.error);
                    this.showToast('加载任务失败', 'error');
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('加载任务时发生错误:', error);
            this.showToast('加载任务时发生错误', 'error');
            throw error;
        }
    }

    render(fullRedraw = true) {
        if (!this.canvas || !this.ctx || !this.layerManager) return;
        
        try {
            // 使用requestAnimationFrame优化渲染
            if (this._renderPending) return;
            this._renderPending = true;
            
            requestAnimationFrame(() => {
                this._renderPending = false;
                
                if (fullRedraw) {
                    // 获取各个渲染层
                    const backgroundLayer = this.layerManager.getLayer('background');
                    const tasksLayer = this.layerManager.getLayer('tasks');
                    const progressLayer = this.layerManager.getLayer('progress');
                    const textLayer = this.layerManager.getLayer('text');
                    
                    // 清除并绘制背景层
                    backgroundLayer.clear();
                    const bgCtx = backgroundLayer.ctx;
                    bgCtx.fillStyle = '#f0f8ff';
                    bgCtx.fillRect(0, this.padding, this.canvas.width, this.canvas.height - this.padding);
                    
                    const { startDate, endDate } = this.getCurrentViewDateRange();
                    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    
                    // 减少不必要的日志输出
                    if (this.debug) {
                        console.log('开始渲染甘特图，任务数量:', this.tasks.length);
                        console.log('日期范围:', startDate, '到', endDate, '共', totalDays, '天');
                    }
                    
                    this.renderTimeScale(startDate, totalDays);
                    this.renderTasks(startDate, totalDays);
                }
                
                // 仅在调试模式下输出性能日志
                if (this.debug) {
                    console.log(`甘特图渲染完成，任务数: ${this.tasks.length}`);
                }
            });
        } catch (error) {
            console.error('渲染甘特图时发生错误:', error);
            this.showToast('渲染甘特图时发生错误', 'error');
        }
    }
    


    renderTimeScale(startDate, totalDays) {
        this.ctx.fillStyle = '#e8f4f8';
        this.ctx.fillRect(0, 0, this.canvas.width, this.padding);
        
        // 响应式字体大小
        const fontSize = window.innerWidth <= 767 ? 10 : 12;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 根据列宽调整显示密度
        const showDayName = this.colWidth >= 60;
        const showFullDate = this.colWidth >= 100;
        const showMonthLabel = this.colWidth >= 80;
        
        let currentMonth = -1;
        
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const x = this.padding + i * this.colWidth + this.colWidth / 2;
            
            // 绘制月份标签（月初第一天）
            if (showMonthLabel && date.getDate() === 1 && i > 0) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = `bold ${fontSize + 1}px Arial`;
                const monthName = date.toLocaleDateString('zh-CN', { month: 'long' });
                this.ctx.fillText(monthName, x, this.padding / 2 - 12);
                this.ctx.fillStyle = '#333';
                this.ctx.font = `${fontSize}px Arial`;
            }
            
            if (showFullDate) {
                // 宽列显示完整日期
                const dateStr = date.toLocaleDateString('zh-CN', { 
                    month: 'numeric', 
                    day: 'numeric' 
                });
                const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
                
                this.ctx.fillText(dayName, x, this.padding / 2 - 8);
                this.ctx.fillText(dateStr, x, this.padding / 2 + 8);
            } else if (showDayName) {
                // 中等列宽显示星期和日期
                const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
                const dayNum = date.getDate();
                
                this.ctx.fillText(dayName, x, this.padding / 2 - 8);
                this.ctx.fillText(dayNum.toString(), x, this.padding / 2 + 8);
            } else {
                // 窄列只显示日期
                const dayNum = date.getDate();
                this.ctx.fillText(dayNum.toString(), x, this.padding / 2);
            }
            
            // 绘制垂直分隔线
            if (i < totalDays - 1) {
                this.ctx.strokeStyle = '#ddd';
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.moveTo(this.padding + (i + 1) * this.colWidth, 0);
                this.ctx.lineTo(this.padding + (i + 1) * this.colWidth, this.padding);
                this.ctx.stroke();
            }
            
            // 周末特殊标记
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                this.ctx.fillStyle = 'rgba(255, 200, 200, 0.3)';
                this.ctx.fillRect(this.padding + i * this.colWidth, 0, this.colWidth, this.padding);
            }
        }
    }

    renderTasks(startDate, totalDays) {
        // 获取可见任务并批量处理
        const visibleTasks = this.getVisibleTasks();
        
        // 预先计算常用值
        const msPerDay = 1000 * 60 * 60 * 24;
        const startTime = startDate.getTime();
        
        // 批量绘制任务背景
        this.batchRenderTaskBackgrounds(visibleTasks, startTime, msPerDay, totalDays);
        
        // 批量绘制任务进度和文本
        for (let i = 0; i < visibleTasks.length; i++) {
            this.renderSingleTask(visibleTasks[i], i, startDate, totalDays, startTime, msPerDay);
        }
    }
    
    // 批量绘制任务背景以减少状态切换
    batchRenderTaskBackgrounds(tasks, startTime, msPerDay, totalDays) {
        // 按颜色分组任务以减少状态切换
        const tasksByColor = {};
        
        tasks.forEach((task, index) => {
            const colorIndex = index % this.taskColors.length;
            const color = this.taskColors[colorIndex];
            
            if (!tasksByColor[color]) {
                tasksByColor[color] = [];
            }
            
            const taskStartDay = Math.floor((task.startDate.getTime() - startTime) / msPerDay);
            const taskEndDay = Math.floor((task.endDate.getTime() - startTime) / msPerDay);
            
            const x = this.padding + Math.max(0, taskStartDay) * this.colWidth;
            const y = this.padding + index * this.rowHeight;
            const width = (Math.min(taskEndDay, totalDays - 1) - Math.max(0, taskStartDay) + 1) * this.colWidth;
            
            tasksByColor[color].push({ x, y, width });
        });
        
        // 按颜色批量绘制背景
        Object.entries(tasksByColor).forEach(([color, taskPositions]) => {
            this.ctx.fillStyle = color;
            
            taskPositions.forEach(({ x, y, width }) => {
                this.taskStyles.drawStyledBackground(x, y, width, color);
            });
        });
    }

    renderSingleTask(task, index, startDate, totalDays, startTime, msPerDay) {
        // 使用预计算的值加速计算
        const taskStartDay = Math.floor((task.startDate.getTime() - startTime) / msPerDay);
        const taskEndDay = Math.floor((task.endDate.getTime() - startTime) / msPerDay);
        
        const x = this.padding + Math.max(0, taskStartDay) * this.colWidth;
        const y = this.padding + index * this.rowHeight;
        const width = (Math.min(taskEndDay, totalDays - 1) - Math.max(0, taskStartDay) + 1) * this.colWidth;
        
        const colorIndex = index % this.taskColors.length;
        const color = this.taskColors[colorIndex];
        
        // 绘制任务进度
        this.taskStyles.drawStyledProgress(x, y, width, color, task.progress || 0);
        
        // 绘制任务文本 - 使用缓存的字体设置
        if (!this._fontCache) {
            const fontSize = window.innerWidth <= 767 ? 10 : 12;
            this._fontCache = `${fontSize}px Arial`;
        }
        this.ctx.font = this._fontCache;
        this.drawTaskText(x, y, width, task.name, task.progress || 0);
        
        // 绘制选中状态
        if (task.selected) {
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            
            // 创建圆角矩形路径
            const height = this.rowHeight - 5;
            const radius = 6;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x - 2 + radius, y - 2);
            this.ctx.lineTo(x + width + 2 - radius, y - 2);
            this.ctx.quadraticCurveTo(x + width + 2, y - 2, x + width + 2, y - 2 + radius);
            this.ctx.lineTo(x + width + 2, y + height + 2 - radius);
            this.ctx.quadraticCurveTo(x + width + 2, y + height + 2, x + width + 2 - radius, y + height + 2);
            this.ctx.lineTo(x - 2 + radius, y + height + 2);
            this.ctx.quadraticCurveTo(x - 2, y + height + 2, x - 2, y + height + 2 - radius);
            this.ctx.lineTo(x - 2, y - 2 + radius);
            this.ctx.quadraticCurveTo(x - 2, y - 2, x - 2 + radius, y - 2);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    drawTaskBackground(x, y, width, color) {
        this.ctx.fillStyle = this.hexToRgba(color, 0.2);
        this.ctx.fillRect(x, y, width, this.rowHeight - 5);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, this.rowHeight - 5);
    }

    drawTaskProgress(x, y, width, color, progress) {
        if (progress > 0) {
            const progressWidth = width * (progress / 100);
            this.ctx.fillStyle = this.hexToRgba(color, 0.5);
            this.ctx.fillRect(x, y, progressWidth, this.rowHeight - 5);
        }
    }

    drawTaskText(x, y, width, name, progress) {
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        const text = this.getTruncatedText(name, width - 10);
        this.ctx.fillText(text, x + 5, y + (this.rowHeight - 5) / 2);
        
        if (progress > 0) {
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${progress}%`, x + width - 5, y + (this.rowHeight - 5) / 2);
        }
    }

    getTruncatedText(text, maxWidth) {
        this.ctx.font = '12px Arial';
        let truncated = text;
        
        if (this.ctx.measureText(text).width > maxWidth) {
            truncated = text.substring(0, text.length - 3) + '...';
            while (truncated.length > 3 && this.ctx.measureText(truncated).width > maxWidth) {
                truncated = truncated.substring(0, truncated.length - 4) + '...';
            }
        }
        
        return truncated;
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    addTask(name, startDate, endDate) {
        console.log('开始添加任务:', {name, startDate, endDate});
        
        try {
            // 验证输入
            if (!name || !startDate || !endDate) {
                throw new Error('任务名称、开始日期和结束日期不能为空');
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('无效的日期格式');
            }
            
            if (end < start) {
                throw new Error('结束日期不能早于开始日期');
            }
            
            const task = {
                id: Date.now().toString(),
                name,
                startDate: start,
                endDate: end,
                duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
                progress: 0
            };
            
            console.log('创建的任务对象:', task);
            
            this.tasks.push(task);
            console.log('当前任务列表:', this.tasks);
            
            // 保存并重新渲染
            this.saveTasks().then(() => {
                console.log('任务保存成功');
                this.resizeCanvas();
                this.render(true); // 强制完全重绘
                this.showToast(`任务"${name}"添加成功`, 'success');
            }).catch(error => {
                console.error('保存任务失败:', error);
                this.showToast('保存任务失败', 'error');
            });
            
        } catch (error) {
            console.error('添加任务时出错:', error);
            this.showToast(`添加任务失败: ${error.message}`, 'error');
            throw error;
        }
    }

    updateEndDateMin() {
        this.taskEndDateInput.min = this.taskStartDateInput.value;
        if (this.taskEndDateInput.value < this.taskStartDateInput.value) {
            this.taskEndDateInput.value = this.taskStartDateInput.value;
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GanttChartDB', 1);
            
            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('tasks')) {
                    db.createObjectStore('tasks', { keyPath: 'id' });
                }
            };
        });
    }

    async saveTasks() {
        console.log('开始保存任务数据...');
        console.log('当前任务数量:', this.tasks.length);
        console.log('任务ID列表:', this.tasks.map(task => task.id));
        
        if (!this.db) {
            console.log('数据库未初始化，正在初始化...');
            await this.initDB();
        }

        // 更新本地存储
        const tasksForStorage = this.tasks.map(task => ({
            id: task.id,
            name: task.name,
            startDate: task.startDate.getTime(),
            endDate: task.endDate.getTime(),
            progress: task.progress
        }));
        localStorage.setItem('ganttTasks', JSON.stringify(tasksForStorage));
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            
            console.log('开始清除现有数据...');
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                console.log('数据清除成功，开始保存新数据...');
                
                // 批量保存所有任务
                const savePromises = this.tasks.map(task => {
                    return new Promise((resolve, reject) => {
                        const taskData = {
                            id: task.id,
                            name: task.name,
                            startDate: task.startDate.getTime(),
                            endDate: task.endDate.getTime(),
                            progress: task.progress
                        };
                        
                        const request = store.put(taskData);
                        
                        request.onsuccess = () => {
                            console.log('任务保存成功:', task.id);
                            resolve();
                        };
                        request.onerror = (event) => {
                            console.error('保存任务失败:', event.target.error);
                            reject(event.target.error);
                        };
                    });
                });
                
                Promise.all(savePromises)
                    .then(() => {
                        console.log('所有任务已成功保存到数据库');
                        resolve();
                    })
                    .catch(error => {
                        console.error('保存任务时发生错误:', error);
                        reject(error);
                    });
            };
            
            clearRequest.onerror = (event) => {
                console.error('清除数据失败:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log('事务完成: 所有任务已成功保存');
            };
            
            transaction.onerror = (event) => {
                console.error('事务失败:', event.target.error);
            };
        });

    }

    handleDeleteTask() {
        if (!this.selectedTask) {
            this.showToast('请先选择要删除的任务', 'error');
            return;
        }

        console.log('准备删除任务:', this.selectedTask);
        console.log('当前任务数量:', this.tasks.length);

        const index = this.tasks.findIndex(t => t.id === this.selectedTask.id);
        if (index !== -1) {
            this.tasks.splice(index, 1);
            // 完全重置所有相关状态
            this.tasks.forEach(t => t.selected = false);
            this.selectedTask = null;
            this.saveTasks();
            this.render();
            this.showToast('任务已删除', 'success');
            
            console.log('任务已删除，剩余任务数量:', this.tasks.length);
        }
    }

    setupEventListeners() {
        // 使用事件委托减少事件监听器数量
        const controlsPane = document.querySelector('.controls-pane');
        if (controlsPane) {
            controlsPane.addEventListener('click', this.debounce((event) => {
                try {
                    const target = event.target.closest('button');
                    if (!target) return;
                    
                    const id = target.id;
                    if (id === 'addTask') {
                        this.taskDialog.setAttribute('aria-hidden', 'false');
                        this.overlay.setAttribute('aria-hidden', 'false');
                        this.overlay.style.display = 'block';
                        this.taskNameInput.focus();
                    } else if (id === 'weekView') {
                        this.viewMode = 'week';
                        // 如果当前在月视图，切换到周视图时需要调整日期
                        if (this.monthViewBtn.classList.contains('active')) {
                            const weekRange = DateUtils.getWeekRange(this.currentDate);
                            this.currentDate = new Date(weekRange.startDate);
                        }
                        this.weekViewBtn.classList.add('active');
                        this.monthViewBtn.classList.remove('active');
                        // 更新ARIA属性
                        this.weekViewBtn.setAttribute('aria-checked', 'true');
                        this.monthViewBtn.setAttribute('aria-checked', 'false');
                        // 更新日期范围显示
                        this.updateDateRangeDisplay();
                        if (this.canvas) {
                            this.resizeCanvas();
                            this.render();
                        }
                    } else if (id === 'monthView') {
                        this.viewMode = 'month';
                        // 如果当前在周视图，切换到月视图时需要调整日期
                        if (this.weekViewBtn.classList.contains('active')) {
                            const monthRange = DateUtils.getMonthRange(this.currentDate);
                            this.currentDate = new Date(monthRange.startDate);
                        }
                        this.monthViewBtn.classList.add('active');
                        this.weekViewBtn.classList.remove('active');
                        // 更新ARIA属性
                        this.monthViewBtn.setAttribute('aria-checked', 'true');
                        this.weekViewBtn.setAttribute('aria-checked', 'false');
                        // 更新日期范围显示
                        this.updateDateRangeDisplay();
                        if (this.canvas) {
                            this.resizeCanvas();
                            this.render();
                        }
                    } else if (id === 'prevWeek') {
                        if (this.viewMode === 'week') {
                            this.currentDate.setDate(this.currentDate.getDate() - 7);
                        } else {
                            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                        }
                        
                        this.updateDateRangeDisplay();
                        if (this.canvas) {
                            this.resizeCanvas();
                            this.render();
                        }
                    } else if (id === 'nextWeek') {
                        if (this.viewMode === 'week') {
                            this.currentDate.setDate(this.currentDate.getDate() + 7);
                        } else {
                            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                        }
                        
                        this.updateDateRangeDisplay();
                        if (this.canvas) {
                            this.resizeCanvas();
                            this.render();
                        }
                    } else if (id === 'todayBtn') {
                        this.jumpToToday();
                    } else if (id === 'exportBtn') {
                        this.exportData();
                    } else if (id === 'importBtn') {
                        this.importFile.click();
                    }
                } catch (error) {
                    console.error('控制面板操作执行错误:', error);
                    this.showNotification('操作执行失败，请稍后重试', 'error');
                }
            }, 50));
        }
        
        // 导入文件变更事件
        this.importFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    this.importData(jsonData);
                } catch (error) {
                    this.showToast('导入失败: 文件格式不正确', 'error');
                    console.error('导入错误:', error);
                }
            };
            reader.readAsText(file);
            this.importFile.value = ''; // 重置文件输入
        });
        
        // 添加日期验证 - 确保开始日期不能晚于结束日期
        this.taskStartDateInput.addEventListener('change', () => {
            // 更新结束日期的最小值为开始日期
            this.taskEndDateInput.min = this.taskStartDateInput.value;
            
            // 如果当前结束日期早于开始日期，则自动更新结束日期为开始日期
            if (this.taskEndDateInput.value && new Date(this.taskEndDateInput.value) < new Date(this.taskStartDateInput.value)) {
                this.taskEndDateInput.value = this.taskStartDateInput.value;
            }
        });
        
        // 表单事件
        this.taskForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const name = this.taskNameInput.value.trim();
            const startDate = this.taskStartDateInput.value;
            const endDate = this.taskEndDateInput.value;
            
            if (!name) {
                this.showToast('请输入任务名称', 'error');
                return;
            }
            
            // 验证日期
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime())) {
                this.showNotification('开始日期格式无效', 'error');
                 return;
            }
            
            if (isNaN(end.getTime())) {
                 this.showNotification('结束日期格式无效', 'error');
                 return;
             }
             
             if (end < start) {
                 this.showNotification('结束日期不能早于开始日期', 'error');
                 return;
             }
            
            this.addTask(name, startDate, endDate);
            
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.setAttribute('aria-hidden', 'true');
            this.taskForm.reset();
            
            const today = new Date().toISOString().split('T')[0];
            this.taskStartDateInput.value = today;
            this.taskEndDateInput.value = today;
            
            // 显示成功通知
            this.showNotification('任务添加成功', 'success');
        });
        
        this.cancelDialogBtn.addEventListener('click', () => {
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.setAttribute('aria-hidden', 'true');
        });

        this.overlay.addEventListener('click', () => {
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.setAttribute('aria-hidden', 'true');
            this.overlay.style.display = 'none';
            this.taskForm.reset();
        });
        
        // Canvas点击事件 - 使用节流函数防止频繁触发
        if (this.canvas) {
            this.canvas.addEventListener('click', this.debounce((event) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                this.handleCanvasClick(x, y, event);
            }, 100));
        }
        
        // 添加键盘事件监听
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.taskDialog.setAttribute('aria-hidden', 'true');
                this.overlay.setAttribute('aria-hidden', 'true');
                this.overlay.style.display = 'none';
            }
        });
    }

    handleCanvasClick(x, y, event) {
        const { startDate } = this.getCurrentViewDateRange();
        const visibleTasks = this.getVisibleTasks();
        // 使用传入的event参数而不是window.event
        
        for (let i = 0; i < visibleTasks.length; i++) {
            const task = visibleTasks[i];
            const taskStartDay = Math.floor((task.startDate - startDate) / (1000 * 60 * 60 * 24));
            const taskEndDay = Math.floor((task.endDate - startDate) / (1000 * 60 * 60 * 24));
            
            const taskX = this.padding + Math.max(0, taskStartDay) * this.colWidth;
            const taskY = this.padding + i * this.rowHeight;
            const taskWidth = (Math.min(taskEndDay, 6) - Math.max(0, taskStartDay) + 1) * this.colWidth;
            
            if (x >= taskX && x <= taskX + taskWidth && 
                y >= taskY && y <= taskY + this.rowHeight) {
                
                // 检查是否按下了Ctrl或Command键
                const isMultiSelect = event && (event.ctrlKey || event.metaKey);
                
                if (isMultiSelect) {
                    // 多选模式 - 切换选中状态
                    task.selected = !task.selected;
                } else {
                    // 单选模式 - 清除所有选中状态，然后选中当前任务
                    this.tasks.forEach(t => t.selected = false);
                    task.selected = true;
                    
                    // 如果没有按下Shift键，同时编辑任务
                    if (!(event && event.shiftKey)) {
                        this.editTask(task);
                        return;
                    }
                }
                
                // 重新渲染以显示选中状态
                this.render();
                return;
            }
        }
        
        // 点击空白处 - 清除所有选中状态
        if (!event.ctrlKey && !event.metaKey) {
            this.tasks.forEach(t => t.selected = false);
            this.render();
        }
    }

    editTask(task) {
        this.taskNameInput.value = task.name;
        this.taskStartDateInput.value = task.startDate.toISOString().split('T')[0];
        this.taskEndDateInput.value = task.endDate.toISOString().split('T')[0];
        
        this.taskDialog.setAttribute('aria-hidden', 'false');
        this.overlay.setAttribute('aria-hidden', 'false');
        this.taskNameInput.focus();
        
        // 临时保存原始任务ID
        let originalTaskId = task.id;

        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn delete-btn';
        deleteBtn.textContent = '删除任务';
        
        // 确保表单操作区域存在
        let formActions = this.taskForm.querySelector('.form-actions');
        if (!formActions) {
            formActions = document.createElement('div');
            formActions.className = 'form-actions';
            this.taskForm.appendChild(formActions);
        }

        // 确保表单操作区域和提交按钮都存在
        if (!formActions || !this.taskForm.contains(formActions)) {
            console.error('表单操作区域不存在或已从DOM中移除');
            return;
        }

        // 获取提交按钮作为参考节点
        const submitBtn = this.taskForm.querySelector('button[type="submit"]');
        
        try {
            // 插入删除按钮
            if (submitBtn && formActions.contains(submitBtn)) {
                formActions.insertBefore(deleteBtn, submitBtn);
            } else if (formActions) {
                formActions.appendChild(deleteBtn);
            } else {
                console.error('无法插入删除按钮：表单操作区域无效');
            }
        } catch (error) {
            console.error('插入删除按钮失败:', error);
            this.showToast('操作失败，请重试', 'error');
        }
        
            // 绑定删除事件
            deleteBtn.addEventListener('click', () => {
                const index = this.tasks.findIndex(t => t.id === originalTaskId);
                if (index !== -1) {
                    this.tasks.splice(index, 1);
                    this.saveTasks();
                    this.render();
                    this.showToast('任务已删除', 'success');
                }
                
                // 完全重置表单状态
                this.taskForm.reset();
                this.taskNameInput.value = '';
                this.taskStartDateInput.value = new Date().toISOString().split('T')[0];
                this.taskEndDateInput.value = new Date().toISOString().split('T')[0];
                
                // 关闭对话框
                this.taskDialog.setAttribute('aria-hidden', 'true');
                this.overlay.setAttribute('aria-hidden', 'true');
                
                // 移除删除按钮
                if (deleteBtn && deleteBtn.parentNode) {
                    deleteBtn.parentNode.removeChild(deleteBtn);
                }
                
                // 清理临时保存的任务ID
                originalTaskId = null;
            });

            // 确保在表单提交或取消时也移除删除按钮
            const originalSubmitHandler = this.taskForm._submitHandler;
            const originalCancelHandler = this.cancelDialogBtn.onclick;
            
            this.taskForm._submitHandler = (event) => {
                if (deleteBtn && deleteBtn.parentNode) {
                    deleteBtn.parentNode.removeChild(deleteBtn);
                }
                originalSubmitHandler && originalSubmitHandler(event);
            };
            
            this.cancelDialogBtn.onclick = (event) => {
                if (deleteBtn && deleteBtn.parentNode) {
                    deleteBtn.parentNode.removeChild(deleteBtn);
                }
                originalCancelHandler && originalCancelHandler(event);
            };
        
        // 修改表单提交处理逻辑
        const submitHandler = (event) => {
            event.preventDefault();
            
            const name = this.taskNameInput.value.trim();
            const startDate = this.taskStartDateInput.value;
            const endDate = this.taskEndDateInput.value;
            
            if (!name) {
                this.showToast('请输入任务名称', 'error');
                return;
            }
            
            // 更新任务
            const taskIndex = this.tasks.findIndex(t => t.id === originalTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = {
                    id: originalTaskId,
                    name,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    duration: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1,
                    progress: this.tasks[taskIndex].progress
                };
                
                this.saveTasks();
                this.resizeCanvas();
                this.render();
            }
            
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.style.display = 'none';
            this.taskForm.reset();
            
            // 恢复原始事件监听器
            this.taskForm.removeEventListener('submit', submitHandler);
            this.taskForm.addEventListener('submit', this.taskForm._originalSubmitHandler);
        };
        
        // 保存原始事件监听器
        this.taskForm._originalSubmitHandler = this.taskForm.onsubmit;
        
        // 移除原始事件监听器并添加新的
        this.taskForm.removeEventListener('submit', this.taskForm._originalSubmitHandler);
        this.taskForm.addEventListener('submit', submitHandler);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }


}

document.addEventListener('DOMContentLoaded', () => {
    // 检测当前页面是否是task-list.html
    const isTaskListPage = document.querySelector('.task-list-container') !== null;
    
    if (!isTaskListPage) {
        try {
            // 确保所有必需元素都存在
            const canvas = document.getElementById('ganttCanvas');
            const dialog = document.getElementById('taskDialog');
            
            if (!canvas) {
                throw new Error('找不到甘特图画布元素');
            }
            if (!dialog) {
                throw new Error('找不到任务对话框元素');
            }
            
            // 初始化甘特图
            const gantt = new GanttChart();
            
            // 监听对话框属性变化
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'aria-hidden') {
                        if (dialog.getAttribute('aria-hidden') === 'true') {
                            dialog.style.display = 'none';
                        } else {
                            dialog.style.display = 'block';
                        }
                    }
                });
            });
            
            observer.observe(dialog, { attributes: true });
            
        } catch (error) {
            console.error('初始化失败:', error);
            // 显示错误信息给用户
            const errorContainer = document.createElement('div');
            errorContainer.style.color = 'red';
            errorContainer.style.padding = '20px';
            errorContainer.style.textAlign = 'center';
            errorContainer.innerHTML = `
                <h3>应用初始化失败</h3>
                <p>${error.message}</p>
                <p>请刷新页面或检查控制台获取更多信息</p>
            `;
            document.body.appendChild(errorContainer);
        }
    }
});
