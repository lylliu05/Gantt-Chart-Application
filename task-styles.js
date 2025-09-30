/**
 * 任务列表样式增强模块
 * 提供更美观的任务列表渲染效果
 */

class TaskStyles {
    constructor(ctx, rowHeight) {
        this.ctx = ctx;
        this.rowHeight = rowHeight;
    }

    /**
     * 绘制带样式的任务背景
     * @param {number} x - 起始x坐标
     * @param {number} y - 起始y坐标
     * @param {number} width - 宽度
     * @param {string} color - 基础颜色(十六进制)
     */
    drawStyledBackground(x, y, width, color) {
        const height = this.rowHeight - 5;
        
        // 填充背景
        this.ctx.fillStyle = this.hexToRgba(color, 0.25);
        this.ctx.fillRect(x, y, width, height);
    }

    /**
     * 绘制带样式的进度条
     * @param {number} x - 起始x坐标
     * @param {number} y - 起始y坐标
     * @param {number} width - 总宽度
     * @param {string} color - 基础颜色(十六进制)
     * @param {number} progress - 进度百分比(0-100)
     */
    drawStyledProgress(x, y, width, color, progress) {
        if (progress <= 0) return;
        
        const progressWidth = width * (progress / 100);
        const height = this.rowHeight - 5;
        
        // 填充进度条
        this.ctx.fillStyle = this.hexToRgba(color, 0.7);
        this.ctx.fillRect(x, y, progressWidth, height);
    }

    /**
     * 十六进制颜色转RGBA
     * @param {string} hex - 十六进制颜色
     * @param {number} alpha - 透明度
     * @returns {string} RGBA颜色字符串
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskStyles;
}
