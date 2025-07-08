/**
 * 导入助手模块 - 处理甘特图数据导入
 */
class ImportHelper {
    constructor(ganttInstance) {
        this.gantt = ganttInstance;
    }

    /**
     * 处理导入数据
     */
    async processImport(jsonData) {
        try {
            // 创建预览对话框
            const previewDialog = this.createPreviewDialog(jsonData);
            
            // 显示对话框
            document.body.appendChild(previewDialog);
            this.gantt.overlay.style.display = 'block';
            this.gantt.overlay.setAttribute('aria-hidden', 'false');

            // 等待用户选择
            return new Promise((resolve) => {
                // 获取按钮引用
                const confirmBtn = previewDialog.querySelector('#confirmImport');
                const cancelBtn = previewDialog.querySelector('#cancelImport');
                
                // 清理函数
                const cleanup = () => {
                    try {
                        if (previewDialog.parentNode === document.body) {
                            document.body.removeChild(previewDialog);
                        }
                        this.gantt.overlay.style.display = 'none';
                        this.gantt.overlay.setAttribute('aria-hidden', 'true');
                        confirmBtn.removeEventListener('click', handleConfirm);
                        cancelBtn.removeEventListener('click', handleCancel);
                    } catch (e) {
                        console.error('清理错误:', e);
                    }
                };

                // 处理确认导入
                const handleConfirm = async () => {
                    try {
                    const importMode = previewDialog.querySelector('input[name="importMode"]:checked').value;
                    const { newTasks } = this.validateAndProcessTasks(jsonData.tasks);
                    
                    // 确保有任务可以导入
                    if (newTasks.length === 0) {
                        throw new Error('没有有效的任务可以导入');
                    }
                    
                    // 根据导入模式处理
                    if (importMode === 'replace') {
                        this.gantt.tasks = newTasks;
                    } else {
                        // 合并模式 - 保留现有任务，只添加不重复的任务
                        const existingIds = new Set(this.gantt.tasks.map(t => t.id));
                        const tasksToAdd = newTasks.filter(task => !existingIds.has(task.id));
                        this.gantt.tasks = [...this.gantt.tasks, ...tasksToAdd];
                    }
                    
                    // 保存并重新渲染
                    await this.gantt.saveTasks();
                    this.gantt.resizeCanvas();
                    this.gantt.render(true);
                    
                    // 显示成功消息
                    const message = importMode === 'replace' 
                        ? `成功导入 ${newTasks.length} 个任务` 
                        : `成功添加 ${tasksToAdd.length} 个新任务`;
                    this.gantt.showToast(message, 'success');
                    
                    // 关闭对话框
                    cleanup();
                        
                        resolve(true);
                    } catch (error) {
                        cleanup();
                        this.gantt.showToast(`导入失败: ${error.message}`, 'error');
                        resolve(false);
                    }
                };

                // 处理取消导入
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                // 绑定事件监听器
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
            });
        } catch (error) {
            console.error('导入错误:', error);
            this.gantt.showToast(`导入失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 创建预览对话框
     */
    createPreviewDialog(jsonData) {
        // 格式化日期函数
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '无效日期';
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 验证并准备预览数据
        const previewTasks = jsonData.tasks.slice(0, 5).map(task => {
            const isValidTask = task.name && typeof task.name === 'string' && 
                              task.startDate && task.endDate;
            return {
                name: isValidTask ? task.name : '无效任务',
                startDate: isValidTask ? formatDate(task.startDate) : '无效日期',
                endDate: isValidTask ? formatDate(task.endDate) : '无效日期'
            };
        });

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.setAttribute('aria-hidden', 'false');
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>导入预览</h3>
                <div class="import-preview">
                    <p>发现 ${jsonData.tasks.length} 个任务</p>
                    <div class="task-list">
                        ${previewTasks.map(task => `
                            <div class="task-item">
                                <span class="task-name">${task.name}</span>
                                <span class="task-dates">${task.startDate} - ${task.endDate}</span>
                            </div>
                        `).join('')}
                        ${jsonData.tasks.length > 5 ? `<p>...还有 ${jsonData.tasks.length - 5} 个任务</p>` : ''}
                    </div>
                    <div class="import-options">
                        <label>
                            <input type="radio" name="importMode" value="replace" checked> 覆盖现有任务
                        </label>
                        <label>
                            <input type="radio" name="importMode" value="merge"> 合并到现有任务
                        </label>
                    </div>
                    <div class="dialog-buttons">
                        <button id="confirmImport" class="btn primary">确认导入</button>
                        <button id="cancelImport" class="btn">取消</button>
                    </div>
                </div>
            </div>
        `;

        return dialog;
    }

    /**
     * 验证和处理任务数据
     */
    validateAndProcessTasks(tasks) {
        console.log('开始验证和处理任务数据...');
        const newTasks = [];
        const seenIds = new Set();  // 用于检测重复ID
        
        for (const [index, task] of tasks.entries()) {
            try {
                console.log(`验证任务 ${index + 1}/${tasks.length}:`, task);
                
                // 验证任务字段
                if (!task.name || typeof task.name !== 'string') {
                    console.warn(`跳过任务 ${index + 1}: 名称格式不正确`);
                    continue;
                }

                // 验证日期
                const startDate = new Date(task.startDate);
                const endDate = new Date(task.endDate);
                if (isNaN(startDate.getTime())) {
                    console.warn(`跳过任务 ${index + 1}: 无效的开始日期`);
                    continue;
                }
                if (isNaN(endDate.getTime())) {
                    console.warn(`跳过任务 ${index + 1}: 无效的结束日期`);
                    continue;
                }
                if (startDate > endDate) {
                    console.warn(`跳过任务 ${index + 1}: 开始日期晚于结束日期`);
                    continue;
                }

                // 处理任务ID - 确保唯一性
                let taskId = task.id && typeof task.id === 'string' ? task.id : 
                            `imported-${Date.now()}-${index}`;
                
                if (seenIds.has(taskId)) {
                    taskId = `imported-${Date.now()}-${index}-dup`;
                }
                seenIds.add(taskId);

                // 验证进度
                let progress = task.progress || 0;
                if (typeof progress !== 'number' || progress < 0 || progress > 100) {
                    progress = 0;
                }

                const processedTask = {
                    id: taskId,
                    name: task.name,
                    startDate,
                    endDate,
                    duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
                    progress
                };
                
                console.log(`任务 ${index + 1} 处理完成:`, processedTask);
                newTasks.push(processedTask);
            } catch (error) {
                console.error(`处理任务 ${index + 1} 时出错:`, error);
            }
        }

        console.log('新任务数量:', newTasks.length);
        console.log('任务验证和处理完成');

        return { 
            newTasks, 
            uniqueNewTasks: newTasks  // 现在所有任务都已确保唯一性
        };
    }

    /**
     * 恢复视图状态
     */
    restoreViewState(jsonData) {
        // 恢复当前日期
        if (jsonData.currentDate) {
            const currentDate = new Date(jsonData.currentDate);
            if (!isNaN(currentDate.getTime())) {
                this.gantt.currentDate = currentDate;
            }
        }
        
        // 恢复视图模式
        if (jsonData.viewMode && (jsonData.viewMode === 'week' || jsonData.viewMode === 'month')) {
            this.gantt.viewMode = jsonData.viewMode;
            if (this.gantt.viewMode === 'week') {
                this.gantt.weekViewBtn.classList.add('active');
                this.gantt.monthViewBtn.classList.remove('active');
            } else {
                this.gantt.monthViewBtn.classList.add('active');
                this.gantt.weekViewBtn.classList.remove('active');
            }
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImportHelper;
}
