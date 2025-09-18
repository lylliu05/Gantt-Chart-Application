// 对话框功能
const dialogContainer = document.querySelector('.dialog-container');
const dialogClose = document.querySelector('.dialog-close');

// 显示对话框的函数（示例，实际使用时需要绑定到具体事件）
function showDialog() {
    dialogContainer.style.display = 'flex';
}

// 隐藏对话框
dialogClose.addEventListener('click', () => {
    dialogContainer.style.display = 'none';
});

// 点击对话框外部关闭
dialogContainer.addEventListener('click', (e) => {
    if (e.target === dialogContainer) {
        dialogContainer.style.display = 'none';
    }
});

// 移动端导航菜单功能
const hamburger = document.querySelector('.hamburger');
const navList = document.querySelector('.nav-list');

hamburger.addEventListener('click', () => {
    const isHidden = navList.style.display === 'none' || navList.style.display === '';
    navList.style.display = isHidden ? 'flex' : 'none';
});

// 窗口大小变化时调整导航显示
window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
        navList.style.display = 'flex';
    } else {
        navList.style.display = 'none';
    }
});

// 初始化：根据屏幕尺寸设置导航显示
if (window.innerWidth <= 767) {
    navList.style.display = 'none';
}</fitten_content>
