// 数据库操作工具类
class DBUtils {
    static dbName = 'ganttChartDB';
    static dbVersion = 1;
    static storeName = 'tasks';

    static async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('数据库打开失败');
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    static async getAllTasks() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('获取任务失败');
                reject(request.error);
            };
        });
    }

    static async addTask(task) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(task);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('添加任务失败');
                reject(request.error);
            };
        });
    }

    static async updateTask(task) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(task);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('更新任务失败');
                reject(request.error);
            };
        });
    }

    static async deleteTask(taskId) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(taskId);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                console.error('删除任务失败');
                reject(request.error);
            };
        });
    }
}

// 导出数据库工具类
window.DBUtils = DBUtils;