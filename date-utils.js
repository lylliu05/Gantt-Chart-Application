/**
 * 日期工具类
 * 处理甘特图中的日期相关操作
 */
class DateUtils {
    /**
     * 解析日期字符串或时间戳
     * @param {string|number|Date} date - 要解析的日期
     * @returns {Date} 解析后的日期对象
     */
    static parseDate(date) {
        if (date instanceof Date) return new Date(date);
        if (typeof date === 'number') return new Date(date);
        if (typeof date === 'string') {
            // 处理多种日期格式
            const formats = [
                // ISO格式
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
                // 日期格式 YYYY-MM-DD
                /^\d{4}-\d{2}-\d{2}$/,
                // 中文格式 YYYY年MM月DD日
                /^(\d{4})年(\d{1,2})月(\d{1,2})日$/
            ];

            for (const format of formats) {
                if (format.test(date)) {
                    if (format === formats[2]) {
                        // 处理中文格式
                        const matches = date.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
                        return new Date(matches[1], matches[2] - 1, matches[3]);
                    }
                    return new Date(date);
                }
            }
        }
        throw new Error('无效的日期格式');
    }

    /**
     * 格式化日期范围
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @param {string} format - 输出格式 ('full' | 'short' | 'month')
     * @returns {string} 格式化后的日期范围字符串
     */
    static formatDateRange(startDate, endDate, format = 'full') {
        if (format === 'month') {
            // 月视图显示格式：YYYY年MM月
            return startDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long'
            });
        }

        const options = {
            year: 'numeric',
            month: format === 'short' ? 'numeric' : 'long',
            day: 'numeric'
        };

        const start = startDate.toLocaleDateString('zh-CN', options);
        const end = endDate.toLocaleDateString('zh-CN', options);

        // 如果是同年，第二个日期不显示年份
        if (startDate.getFullYear() === endDate.getFullYear()) {
            const endOptions = { ...options, year: undefined };
            return `${start} - ${endDate.toLocaleDateString('zh-CN', endOptions)}`;
        }

        return `${start} - ${end}`;
    }

    /**
     * 获取指定日期所在周的起止日期
     * @param {Date} date - 日期
     * @returns {{startDate: Date, endDate: Date}} 周的起止日期
     */
    static getWeekRange(date) {
        const startDate = new Date(date);
        startDate.setDate(date.getDate() - (date.getDay() || 7) + 1);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        return { startDate, endDate };
    }

    /**
     * 获取指定日期所在月的起止日期
     * @param {Date} date - 日期
     * @returns {{startDate: Date, endDate: Date}} 月的起止日期
     */
    static getMonthRange(date) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return { startDate, endDate };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateUtils;
}