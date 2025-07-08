class GanttChart {
    constructor() {
        this.canvas = document.getElementById('ganttCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tasks = [];
        this.currentDate = new Date();
        this.viewMode = 'week';
        this.colWidth = 100;
        this.rowHeight = 45;
        this.padding = 25;
        this.taskColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
        
        this.initElements();
        this.setupEventListeners();
        this.loadTasks();
        this.resizeCanvas();
        this.render();
        
        window.addEventListener('resize', this.debounce(() => {
            this.resizeCanvas();
            this.render();
        }, 200));
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
        
        requiredElements.forEach(id => {
            if (!document.getElementById(id)) {
                console.error(`找不到元素: #${id}`);
                throw new Error(`Required element #${id} not found`);
            }
        });
        
        this.addTaskBtn = document.getElementById('addTask');
        this.weekViewBtn = document.getElementById('weekView');
        this.monthViewBtn = document.getElementById('monthView');
        this.prevWeekBtn = document.getElementById('prevWeek');
        this.nextWeekBtn = document.getElementById('nextWeek');
        this.todayBtn = document.getElementById('todayBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');
        this.taskDialog = document.getElementById('taskDialog');
        this.taskForm = document.getElementById('taskForm');
        this.cancelDialogBtn = document.getElementById('cancelDialog');
        this.currentDateRangeEl = document.getElementById('currentDateRange');
        this.overlay = document.getElementById('overlay');
        this.taskNameInput = document.getElementById('taskName');
        this.taskStartDateInput = document.getElementById('taskStartDate');
        this.taskEndDateInput = document.getElementById('taskEndDate');
        
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
        const { startDate, endDate } = this.getCurrentViewDateRange();
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const containerWidth = this.canvas.parentElement.clientWidth;
        const requiredWidth = this.padding * 2 + totalDays * this.colWidth;
        
        this.canvas.width = Math.max(requiredWidth, containerWidth);
        
        const visibleTasks = this.getVisibleTasks();
        const canvasHeight = this.padding * 2 + visibleTasks.length * this.rowHeight;
        this.canvas.height = Math.max(canvasHeight, 300);
        
        if (requiredWidth > containerWidth) {
            this.colWidth = Math.max(80, (containerWidth - this.padding * 2) / totalDays);
            this.canvas.width = this.padding * 2 + totalDays * this.colWidth;
        }
    }

    getCurrentViewDateRange() {
        let startDate, endDate;
        if (this.viewMode === 'week') {
            startDate = new Date(this.currentDate);
            startDate.setDate(startDate.getDate() - (startDate.getDay() || 7) + 1);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
        } else {
            startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        }
        return { startDate, endDate };
    }

    getVisibleTasks() {
        return this.tasks.filter(task => {
            return task.startDate <= this.getCurrentViewDateRange().endDate && 
                   task.endDate >= this.getCurrentViewDateRange().startDate;
        });
    }

    updateDateRangeDisplay() {
        const { startDate, endDate } = this.getCurrentViewDateRange();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        
        if (this.viewMode === 'week') {
            this.currentDateRangeEl.textContent = 
                `${startDate.toLocaleDateString('zh-CN', options)} - ${endDate.toLocaleDateString('zh-CN', options)}`;
        } else {
            this.currentDateRangeEl.textContent = 
                `${startDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}`;
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
                    
                    // 强制重新渲染
                    this.resizeCanvas();
                    this.render(true); // 强制完全重绘
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
        try {
            console.log('开始渲染甘特图，任务数量:', this.tasks.length);
            
            if (fullRedraw) {
                console.log('执行完全重绘');
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                const { startDate, endDate } = this.getCurrentViewDateRange();
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                
                console.log('日期范围:', startDate, '到', endDate, '共', totalDays, '天');
                
                this.renderTimeScale(startDate, totalDays);
                this.renderTasks(startDate, totalDays);
            }
            
            console.log('渲染完成');
        } catch (error) {
            console.error('渲染甘特图时发生错误:', error);
            this.showToast('渲染甘特图时发生错误', 'error');
        }
    }

    renderTimeScale(startDate, totalDays) {
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.padding);
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const x = this.padding + i * this.colWidth + this.colWidth / 2;
            const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
            const dayNum = date.getDate();
            
            this.ctx.fillText(dayName, x, this.padding / 2 - 8);
            this.ctx.fillText(dayNum.toString(), x, this.padding / 2 + 8);
        }
    }

    renderTasks(startDate, totalDays) {
        const visibleTasks = this.getVisibleTasks();
        
        for (let i = 0; i < visibleTasks.length; i++) {
            this.renderSingleTask(visibleTasks[i], i, startDate, totalDays);
        }
    }

    renderSingleTask(task, index, startDate, totalDays) {
        const taskStartDay = Math.floor((task.startDate - startDate) / (1000 * 60 * 60 * 24));
        const taskEndDay = Math.floor((task.endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const x = this.padding + Math.max(0, taskStartDay) * this.colWidth;
        const y = this.padding + index * this.rowHeight;
        const width = (Math.min(taskEndDay, totalDays - 1) - Math.max(0, taskStartDay) + 1) * this.colWidth;
        
        const colorIndex = index % this.taskColors.length;
        const color = this.taskColors[colorIndex];
        
        this.drawTaskBackground(x, y, width, color);
        this.drawTaskProgress(x, y, width, color, task.progress || 0);
        this.drawTaskText(x, y, width, task.name, task.progress || 0);
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

    setupEventListeners() {
        this.addTaskBtn.addEventListener('click', () => {
            this.taskDialog.setAttribute('aria-hidden', 'false');
            this.overlay.style.display = 'block';
            this.taskNameInput.focus();
        });
        
        this.weekViewBtn.addEventListener('click', () => {
            this.viewMode = 'week';
            this.weekViewBtn.classList.add('active');
            this.monthViewBtn.classList.remove('active');
            this.resizeCanvas();
            this.render();
        });
        
        this.monthViewBtn.addEventListener('click', () => {
            this.viewMode = 'month';
            this.monthViewBtn.classList.add('active');
            this.weekViewBtn.classList.remove('active');
            this.resizeCanvas();
            this.render();
        });
        
        this.prevWeekBtn.addEventListener('click', () => {
            if (this.viewMode === 'week') {
                this.currentDate.setDate(this.currentDate.getDate() - 7);
            } else {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            }
            
            this.updateDateRangeDisplay();
            this.resizeCanvas();
            this.render();
        });
        
        this.nextWeekBtn.addEventListener('click', () => {
            if (this.viewMode === 'week') {
                this.currentDate.setDate(this.currentDate.getDate() + 7);
            } else {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            }
            
            this.updateDateRangeDisplay();
            this.resizeCanvas();
            this.render();
        });
        
        this.todayBtn.addEventListener('click', this.jumpToToday.bind(this));
        
        this.exportBtn.addEventListener('click', this.exportData.bind(this));
        
        this.importBtn.addEventListener('click', () => {
            this.importFile.click();
        });
        
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
        
        this.taskForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const name = this.taskNameInput.value.trim();
            const startDate = this.taskStartDateInput.value;
            const endDate = this.taskEndDateInput.value;
            
            if (!name) {
                this.showToast('请输入任务名称', 'error');
                return;
            }
            
            this.addTask(name, startDate, endDate);
            
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.style.display = 'none';
            this.taskForm.reset();
            
            const today = new Date().toISOString().split('T')[0];
            this.taskStartDateInput.value = today;
            this.taskEndDateInput.value = today;
        });
        
        this.cancelDialogBtn.addEventListener('click', () => {
            this.taskDialog.setAttribute('aria-hidden', 'true');
            this.overlay.style.display = 'none';
            this.taskForm.reset();
        });
        
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            this.handleCanvasClick(x, y);
        });
    }

    handleCanvasClick(x, y) {
        const { startDate } = this.getCurrentViewDateRange();
        const visibleTasks = this.getVisibleTasks();
        
        for (let i = 0; i < visibleTasks.length; i++) {
            const task = visibleTasks[i];
            const taskStartDay = Math.floor((task.startDate - startDate) / (1000 * 60 * 60 * 24));
            const taskEndDay = Math.floor((task.endDate - startDate) / (1000 * 60 * 60 * 24));
            
            const taskX = this.padding + Math.max(0, taskStartDay) * this.colWidth;
            const taskY = this.padding + i * this.rowHeight;
            const taskWidth = (Math.min(taskEndDay, 6) - Math.max(0, taskStartDay) + 1) * this.colWidth;
            
            if (x >= taskX && x <= taskX + taskWidth && 
                y >= taskY && y <= taskY + this.rowHeight) {
                this.editTask(task);
                return;
            }
        }
    }

    editTask(task) {
        this.taskNameInput.value = task.name;
        this.taskStartDateInput.value = task.startDate.toISOString().split('T')[0];
        this.taskEndDateInput.value = task.endDate.toISOString().split('T')[0];
        
        this.taskDialog.setAttribute('aria-hidden', 'false');
        this.overlay.style.display = 'block';
        this.taskNameInput.focus();
        
        // 临时保存原始任务ID
        const originalTaskId = task.id;
        
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
    const gantt = new GanttChart();
    
    // 监听对话框属性变化
    const dialog = document.getElementById('taskDialog');
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
});
