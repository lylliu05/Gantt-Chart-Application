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
        const radius = 6;
        
        // 创建圆角矩形路径
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        // 添加阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetY = 2;
        
        // 填充背景
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, this.hexToRgba(color, 0.15));
        gradient.addColorStop(1, this.hexToRgba(color, 0.25));
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 绘制边框
        this.ctx.shadowColor = 'transparent';
        this.ctx.strokeStyle = this.hexToRgba(color, 0.7);
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
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
        const radius = 6;
        
        // 创建圆角矩形路径
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + progressWidth - radius, y);
        this.ctx.quadraticCurveTo(x + progressWidth, y, x + progressWidth, y + radius);
        this.ctx.lineTo(x + progressWidth, y + height - radius);
        this.ctx.quadraticCurveTo(x + progressWidth, y + height, x + progressWidth - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        // 填充进度条
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, this.hexToRgba(color, 0.5));
        gradient.addColorStop(1, this.hexToRgba(color, 0.7));
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
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
