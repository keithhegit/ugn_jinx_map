第一部分：交互逻辑重构 (UX) —— 从“弹窗”到“战术面板”
现代 RPG 手游地图的标准交互是**非模态（Non-modal）**设计。

1. 布局变革：底部抽屉 / 侧边悬浮
痛点：现在的弹窗在中心，遮挡了地图视野，且右上角的“X”在移动端很难点。

移动端方案 (Bottom Sheet)：点击 Marker 后，从屏幕底部向上滑出一个半高面板（约占屏幕 40%）。这是最符合拇指操作习惯的设计。

桌面端方案 (Side Panel)：从屏幕左侧或右侧滑出悬浮卡片。保留地图中心视野。

2. 运镜体验：自动对焦 (Camera Pan)
痛点：点击 Marker 后，地图不动，弹窗直接盖在上面。

优化：点击 Marker 时，不要只显示面板，要调用地图的 flyTo 或 panTo 方法。

关键点：由于面板会遮挡屏幕一部分（底部或侧边），你需要计算偏移量 (Offset)，将 Marker 移动到可视区域的中心，而不是屏幕的物理中心。

3. 隐形操作
点击空白关闭：取消显眼的“关闭”按钮。点击地图任意空白处，或者向下滑动面板，即视为关闭。

第二部分：视觉风格升级 (UI) —— 打造“HUD 终端”
结合你的“锈区”、“信号检测”文案，UI 应该走 “工业科幻” (Industrial Sci-Fi) 风格。

去黑底：抛弃纯黑背景。使用深色毛玻璃 (Glassmorphism)，让地图纹理隐约透出来。

切角造型：不要用圆角矩形，使用45度切角 (Chamfered Corners)，模拟军用设备的硬朗感。

数据化排版：坐标使用 等宽字体 (Monospace)，标题加粗，加入装饰性的线条和警告标识。

第三部分：代码实现 (HTML/CSS/JS)
你可以直接参考这个结构来修改你的前端组件。这套代码实现了桌面端侧边悬浮 + 移动端底部抽屉的响应式布局。

1. HTML 结构
HTML

<div class="tactical-panel" id="poiPanel">
    <div class="panel-deco"></div>

    <div class="panel-header">
        <div class="icon-box">
            <span class="icon">☢️</span> 
        </div>
        <div class="header-content">
            <div class="status-tag">
                <span class="blink-dot"></span> SIGNAL_DETECTED
            </div>
            <h2 class="location-title">锈区：沉寂都市</h2>
            <div class="meta-coords">ID: RUINS_04 // X:276.4 Y:559.6</div>
        </div>
    </div>

    <div class="panel-body">
        <div class="text-scroll">
            <p>曾经繁华的都市，现在是摇摇欲坠的钢铁丛林。Jinx 在这里的一具坠毁战机残骸中找到了制造“话匣子”的关键军用黑匣子。</p>
        </div>
    </div>

    <div class="panel-footer">
        <button class="btn-cancel" onclick="closePanel()">关闭</button>
        <button class="btn-primary" onclick="enterZone()">
            <span class="btn-text">接入区域</span>
            <span class="btn-deco">>>></span>
        </button>
    </div>
</div>
2. CSS 样式 (现代手游风)
CSS

:root {
    --bg-glass: rgba(18, 22, 28, 0.85); /* 深色半透明 */
    --accent-color: #ff9d00; /* 废土琥珀色，可换成青色 #00e5ff */
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --panel-width: 380px;
}

/* 基础面板样式 */
.tactical-panel {
    position: fixed;
    z-index: 1000;
    background: var(--bg-glass);
    
    /* 核心：毛玻璃效果 */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    color: var(--text-primary);
    padding: 24px;
    
    /* 默认隐藏动画 */
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ============ 桌面端布局 (侧边悬浮) ============ */
@media (min-width: 768px) {
    .tactical-panel {
        top: 24px;
        left: 24px; /* 改为左侧悬浮，符合阅读习惯 */
        width: var(--panel-width);
        bottom: auto;
        
        /* 造型：切角 */
        clip-path: polygon(
            0 0, 
            100% 0, 
            100% calc(100% - 20px), 
            calc(100% - 20px) 100%, 
            0 100%
        );
        border-left: 3px solid var(--accent-color); /* 左侧强调色条 */
        
        /* 进场动画：从左侧滑入 */
        transform: translateX(-120%);
    }
    
    .tactical-panel.active {
        transform: translateX(0);
    }
}

/* ============ 移动端布局 (底部抽屉) ============ */
@media (max-width: 767px) {
    .tactical-panel {
        bottom: 0;
        left: 0;
        width: 100%;
        border-radius: 16px 16px 0 0;
        border-top: 1px solid var(--accent-color);
        
        /* 进场动画：从底部滑入 */
        transform: translateY(100%);
        padding-bottom: 40px; /* 适配 iPhone 底部条 */
    }
    
    .tactical-panel.active {
        transform: translateY(0);
    }
    
    /* 移动端顶部拖拽条 */
    .panel-deco {
        width: 40px;
        height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        margin: -10px auto 20px auto;
    }
}

/* ============ 内部元素样式 ============ */
.panel-header {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
}

.icon-box {
    width: 48px;
    height: 48px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--accent-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.status-tag {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: var(--accent-color);
    letter-spacing: 1px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
}

.blink-dot {
    width: 6px;
    height: 6px;
    background: var(--accent-color);
    border-radius: 50%;
    margin-right: 6px;
    box-shadow: 0 0 8px var(--accent-color);
    animation: blink 1.5s infinite;
}

.location-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    text-transform: uppercase;
}

.meta-coords {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}

.panel-body {
    font-size: 14px;
    line-height: 1.6;
    color: #cbd5e1;
    margin-bottom: 24px;
    border-left: 2px solid rgba(255,255,255,0.1); /* 引用线装饰 */
    padding-left: 12px;
}

/* 按钮组 */
.panel-footer {
    display: flex;
    gap: 12px;
}

.btn-cancel {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: var(--text-secondary);
    padding: 12px 20px;
    cursor: pointer;
    font-weight: bold;
}

.btn-primary {
    flex: 1;
    background: var(--accent-color); /* 纯色背景 */
    color: #000; /* 黑色文字对比度最高 */
    border: none;
    padding: 12px 20px;
    font-weight: 800;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    /* 按钮切角 */
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
    transition: filter 0.2s;
}

.btn-primary:active {
    filter: brightness(0.8);
    transform: scale(0.98);
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}
3. JavaScript 交互逻辑 (Leaflet 示例)
这里有一个关键的 UX 优化：点击 Marker 时的偏移计算。

JavaScript

// 假设你使用的是 Leaflet 地图
function onMarkerClick(marker) {
    const panel = document.getElementById('poiPanel');
    
    // 1. 显示面板
    panel.classList.add('active');

    // 2. 智能运镜 (关键步骤！)
    // 如果不移动地图，面板可能会挡住 Marker。
    // 我们需要将地图中心向“反方向”移动，让 Marker 露在面板旁边。
    
    const mapCenter = marker.getLatLng();
    const mapZoom = map.getZoom();

    // 屏幕像素偏移量：
    // 桌面端：面板在左侧，所以我们要把地图中心向左移，让 Marker 看起来在右边
    // 移动端：面板在底部，所以我们要把地图中心向下移，让 Marker 看起来在上面
    let offsetX = 0;
    let offsetY = 0;

    if (window.innerWidth >= 768) {
        offsetX = -200; // 向左偏 200px (让出左侧面板空间)
    } else {
        offsetY = -150; // 向下偏 150px (让出底部抽屉空间)
    }

    // 将经纬度转换为容器像素点 -> 加上偏移 -> 转回经纬度
    const point = map.project(mapCenter, mapZoom).add([offsetX, offsetY]);
    const targetLatLng = map.unproject(point, mapZoom);

    // 平滑飞行
    map.flyTo(targetLatLng, mapZoom, {
        animate: true,
        duration: 0.8 // 0.8秒的电影感运镜
    });
}

// 3. 点击地图空白处关闭
map.on('click', function(e) {
    // 确保点击的不是 Marker 本身
    document.getElementById('poiPanel').classList.remove('active');
});
总结
这套方案将原本的“网页弹窗”变成了**“战术终端接入”**的体验。

视觉上：毛玻璃、切角、单色高对比度按钮，完全契合你的末世/废土主题。

操作上：不仅解决了移动端难点的问题，还通过 flyTo 增加了互动的流畅感，让用户觉得是在操作一台精密的仪器，而不是浏览一个网页。