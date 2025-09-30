// 初始化任务列表
async function initTaskList() {
    try {
        const tasks = await DBUtils.getAllTasks();
        renderTaskList(tasks);

        // 初始化添加任务按钮事件
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                addNewTask();
            });
        }
    } catch (error) {
        console.error('初始化任务列表失败:', error);
        showToast('加载任务列表失败，请刷新页面重试！', 'error');
    }
}

// 渲染任务列表
function renderTaskList(tasks) {
    const taskListBody = document.getElementById('taskListBody');
    taskListBody.innerHTML = '';

    tasks.forEach((task, index) => {
        const row = document.createElement('tr');
        row.setAttribute('role', 'row');
        row.style.animation = `fadeIn 0.3s ease-out ${index * 0.1}s both`;
        
        row.innerHTML = `
            <td role="gridcell">
                <span class="task-name">${task.name}</span>
            </td>
            <td role="gridcell">
                <span class="task-dates">${formatDate(task.startDate)}</span>
            </td>
            <td role="gridcell">
                <span class="task-dates">${formatDate(task.endDate)}</span>
            </td>
            <td role="gridcell">
                <div class="progress-container" title="${task.progress}% 完成">
                    <div class="progress-bar" style="width: ${task.progress}%"></div>
                    <span class="progress-text">${task.progress}%</span>
                </div>
            </td>
            <td role="gridcell" class="task-actions">
                <button class="edit-btn" onclick="editTask(this)" data-task-id="${task.id}" title="编辑任务">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteTask(${task.id})" title="删除任务">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        taskListBody.appendChild(row);
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 添加新任务
async function addNewTask() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');
    row.style.animation = 'slideDown 0.3s ease-out';
    row.innerHTML = `
        <td role="gridcell">
            <input type="text" class="edit-task-name" placeholder="输入任务名称" autofocus>
        </td>
        <td role="gridcell">
            <input type="date" class="edit-start-date" value="${today}">
        </td>
        <td role="gridcell">
            <input type="date" class="edit-end-date" value="${nextWeek}">
        </td>
        <td role="gridcell">
            <input type="number" class="edit-progress" value="0" min="0" max="100">
        </td>
        <td role="gridcell" class="task-actions">
            <button class="save-btn" onclick="saveNewTask(this)" title="保存">
                <i class="fas fa-save"></i>
            </button>
            <button class="cancel-btn" onclick="cancelNewTask(this)" title="取消">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    
    const taskListBody = document.getElementById('taskListBody');
    taskListBody.insertBefore(row, taskListBody.firstChild);
}

// 保存新任务
async function saveNewTask(button) {
    const row = button.closest('tr');
    const cells = row.cells;

    const newTask = {
        name: cells[0].querySelector('.edit-task-name').value,
        startDate: cells[1].querySelector('.edit-start-date').value,
        endDate: cells[2].querySelector('.edit-end-date').value,
        progress: parseInt(cells[3].querySelector('.edit-progress').value) || 0
    };

    // 验证数据
    if (!newTask.name || !newTask.startDate || !newTask.endDate) {
        showToast('请填写所有必填字段！', 'error');
        return;
    }

    if (newTask.progress < 0 || newTask.progress > 100) {
        showToast('进度必须在0-100之间！', 'error');
        return;
    }

    try {
        // 添加到数据库
        await DBUtils.addTask(newTask);
        
        // 重新加载任务列表
        const tasks = await DBUtils.getAllTasks();
        renderTaskList(tasks);
        
        showToast('任务添加成功！', 'success');
    } catch (error) {
        console.error('保存任务失败:', error);
        showToast('保存任务失败，请重试！', 'error');
    }
}

// 取消新任务
function cancelNewTask(button) {
    const row = button.closest('tr');
    row.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => row.remove(), 300);
}

// 编辑任务
function editTask(button) {
    const row = button.closest('tr');
    const taskId = button.getAttribute('data-task-id');
    const cells = row.cells;

    // 保存原始内容
    const originalContent = {
        name: cells[0].querySelector('.task-name').textContent,
        startDate: cells[1].querySelector('.task-dates').textContent,
        endDate: cells[2].querySelector('.task-dates').textContent,
        progress: parseInt(cells[3].querySelector('.progress-text').textContent)
    };

    // 将单元格转换为可编辑状态
    cells[0].innerHTML = `<input type="text" class="edit-task-name" value="${originalContent.name}" autofocus>`;
    cells[1].innerHTML = `<input type="date" class="edit-start-date" value="${formatDateForInput(originalContent.startDate)}">`;
    cells[2].innerHTML = `<input type="date" class="edit-end-date" value="${formatDateForInput(originalContent.endDate)}">`;
    cells[3].innerHTML = `
        <input type="number" class="edit-progress" value="${originalContent.progress}" min="0" max="100">
    `;

    // 更改按钮
    const actionsCell = cells[4];
    actionsCell.innerHTML = `
        <button class="save-btn" onclick="saveTask(this, ${taskId})" title="保存">
            <i class="fas fa-save"></i>
        </button>
        <button class="cancel-btn" onclick="cancelEdit(this, ${JSON.stringify(originalContent)})" title="取消">
            <i class="fas fa-times"></i>
        </button>
    `;

    // 添加编辑状态类
    row.classList.add('editing');
}

// 格式化日期为input[type="date"]格式
function formatDateForInput(dateString) {
    const parts = dateString.split('/');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

// 保存任务
async function saveTask(button, taskId) {
    const row = button.closest('tr');
    const cells = row.cells;

    const updatedTask = {
        id: taskId,
        name: cells[0].querySelector('.edit-task-name').value,
        startDate: cells[1].querySelector('.edit-start-date').value,
        endDate: cells[2].querySelector('.edit-end-date').value,
        progress: parseInt(cells[3].querySelector('.edit-progress').value) || 0
    };

    // 验证数据
    if (!updatedTask.name || !updatedTask.startDate || !updatedTask.endDate) {
        showToast('请填写所有必填字段！', 'error');
        return;
    }

    if (updatedTask.progress < 0 || updatedTask.progress > 100) {
        showToast('进度必须在0-100之间！', 'error');
        return;
    }

    try {
        // 更新数据库
        const db = await openDB();
        await db.put('tasks', updatedTask);

        // 更新显示
        cells[0].innerHTML = `<span class="task-name">${updatedTask.name}</span>`;
        cells[1].innerHTML = `<span class="task-dates">${formatDate(updatedTask.startDate)}</span>`;
        cells[2].innerHTML = `<span class="task-dates">${formatDate(updatedTask.endDate)}</span>`;
        cells[3].innerHTML = `
            <div class="progress-container" title="${updatedTask.progress}% 完成">
                <div class="progress-bar" style="width: ${updatedTask.progress}%"></div>
                <span class="progress-text">${updatedTask.progress}%</span>
            </div>
        `;
        cells[4].innerHTML = `
            <button class="edit-btn" onclick="editTask(this)" data-task-id="${taskId}" title="编辑任务">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteTask(${taskId})" title="删除任务">
                <i class="fas fa-trash"></i>
            </button>
        `;

        // 移除编辑状态类
        row.classList.remove('editing');
        showToast('任务更新成功！', 'success');
    } catch (error) {
        console.error('保存任务失败:', error);
        showToast('保存任务失败，请重试！', 'error');
    }
}

// 取消编辑
function cancelEdit(button, originalContent) {
    const row = button.closest('tr');
    const cells = row.cells;
    const taskId = button.getAttribute('data-task-id');

    cells[0].innerHTML = `<span class="task-name">${originalContent.name}</span>`;
    cells[1].innerHTML = `<span class="task-dates">${originalContent.startDate}</span>`;
    cells[2].innerHTML = `<span class="task-dates">${originalContent.endDate}</span>`;
    cells[3].innerHTML = `
        <div class="progress-container" title="${originalContent.progress}% 完成">
            <div class="progress-bar" style="width: ${originalContent.progress}%"></div>
            <span class="progress-text">${originalContent.progress}%</span>
        </div>
    `;
    cells[4].innerHTML = `
        <button class="edit-btn" onclick="editTask(this)" data-task-id="${taskId}" title="编辑任务">
            <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn" onclick="deleteTask(${taskId})" title="删除任务">
            <i class="fas fa-trash"></i>
        </button>
    `;

    // 移除编辑状态类
    row.classList.remove('editing');
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }

    try {
        const db = await openDB();
        await db.delete('tasks', taskId);

        // 重新加载任务列表
        const tasks = await db.getAll('tasks');
        renderTaskList(tasks);
        
        showToast('任务删除成功！', 'success');
    } catch (error) {
        console.error('删除任务失败:', error);
        showToast('删除任务失败，请重试！', 'error');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 触发动画
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 页面加载完成后初始化任务列表
document.addEventListener('DOMContentLoaded', initTaskList);