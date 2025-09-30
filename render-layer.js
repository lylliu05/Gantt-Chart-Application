/**
 * 甘特图渲染层管理类
 * 实现分层渲染以提升性能
 */

class RenderLayer {
    constructor(canvas, name) {
        this.name = name;
        this.canvas = canvas;
        this.buffer = document.createElement('canvas');
        this.isDirty = true;
        this.ctx = this.buffer.getContext('2d', { alpha: true });
    }

    setSize(width, height) {
        this.buffer.width = width;
        this.buffer.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    }

    markDirty() {
        this.isDirty = true;
    }

    render() {
        if (!this.isDirty) return;
        
        const mainCtx = this.canvas.getContext('2d');
        mainCtx.drawImage(this.buffer, 0, 0);
        this.isDirty = false;
    }
}

class LayerManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.layers = new Map();
        
        // 创建基础层
        this.createLayer('background');  // 背景网格
        this.createLayer('tasks');       // 任务条
        this.createLayer('progress');    // 进度条
        this.createLayer('text');        // 文本标签
    }

    createLayer(name) {
        const layer = new RenderLayer(this.canvas, name);
        this.layers.set(name, layer);
        return layer;
    }

    getLayer(name) {
        return this.layers.get(name);
    }

    resizeAll(width, height) {
        this.layers.forEach(layer => layer.setSize(width, height));
    }

    renderAll() {
        // 清除主画布
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 按顺序渲染各层
        this.layers.forEach(layer => layer.render());
    }

    markAllDirty() {
        this.layers.forEach(layer => layer.markDirty());
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RenderLayer, LayerManager };
}