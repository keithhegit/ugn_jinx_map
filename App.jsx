import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Radio, X, Terminal, Crosshair, Activity } from 'lucide-react';
import clsx from 'clsx';
import markers from './markers.json';

const App = () => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [viewport, setViewport] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1280, h: typeof window !== 'undefined' ? window.innerHeight : 720 });
  const primaryMapSrc = import.meta.env.VITE_MAP_SRC || "https://pub-c98d5902eedf42f6a9765dfad981fd88.r2.dev/map/nomeiland_jinx.svg";
  const fallbackMapSrc = "/map.svg";
  const [mapCode, setMapCode] = useState(null);
  const centerPoint = useMemo(() => ({ x: 456.5, y: 531.2 }), []);
  const mapDimensions = { w: 1193, h: 1107 }; // Fixed map dimensions from SVG

  useEffect(() => {
    const fetchMap = async () => {
        try {
            setLoading(true);
            setLoadProgress(5);
            
            // Try primary, then fallback
            let response;
            try {
                response = await fetch(primaryMapSrc);
                if (!response.ok) throw new Error("Primary map fetch failed");
            } catch (e) {
                console.warn("Falling back to local map", e);
                response = await fetch(fallbackMapSrc);
            }

            if (!response.ok) throw new Error("Map load failed");

            const contentLength = response.headers.get('content-length');
            const total = parseInt(contentLength, 10);
            let loaded = 0;

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let result = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                loaded += value.byteLength;
                result += decoder.decode(value, { stream: true });
                
                if (total) {
                    setLoadProgress(Math.min(Math.round((loaded / total) * 100), 99));
                } else {
                    // Fake progress if no content-length
                    setLoadProgress((prev) => Math.min(prev + 10, 90));
                }
            }
            
            // Flush decoder
            result += decoder.decode();
            setMapCode(result);
            setLoadProgress(100);
            
            // Small delay to smooth transition
            setTimeout(() => setLoading(false), 500);

        } catch (error) {
            console.error("Map Load Error:", error);
            setLoading(false); // Should show error state ideally
        }
    };

    fetchMap();
  }, []);

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate optimal initial scale to cover the screen
  const initialScale = useMemo(() => {
      if (viewport.w < 768) {
          // Mobile: Calculate scale to cover height
          // SVG renders at width=100% (viewport.w). 
          // SVG height = viewport.w / (mapW/mapH)
          // Target height = viewport.h
          // Scale = viewport.h / SVG height
          const mapAspect = mapDimensions.w / mapDimensions.h;
          const renderedHeight = viewport.w / mapAspect;
          const scaleToCover = viewport.h / renderedHeight;
          return Math.max(scaleToCover * 1.2, 2.5); // Ensure at least 2.5x or cover + 20%
      }
      return 1.1; // Desktop default
  }, [viewport.w, viewport.h]);

  const parseMarkerNumericId = (markerId) => {
    const matched = markerId.match(/\d+/);
    if (!matched) return null;
    return Number(matched[0]);
  };

  const resolveMarkerInfo = (markerGroup) => {
    if (!markerGroup) return null;
    const markerId = markerGroup.id;
    const titleElement = markerGroup.querySelector('title');
    const titleText = titleElement ? titleElement.textContent : null;
    const numericId = parseMarkerNumericId(markerId);
    const matched = numericId ? markers.find((marker) => marker.i === numericId) : null;

    const radiationValue = `${Math.floor(Math.random() * 500)} mSv`;
    const statusValue = Math.random() > 0.5 ? 'ACTIVE' : 'OFFLINE';

    return {
      id: markerId,
      name: matched?.name || titleText || `未知信号源 [${markerId}]`,
      icon: matched?.icon || '📍',
      type: matched?.type || 'Unknown',
      note: matched?.note || '未找到该信号的额外情报。',
      radiation: matched?.radiation || radiationValue,
      status: matched?.status || statusValue,
      coordinates: matched ? { x: matched.x, y: matched.y } : null,
      dungeonUrl: matched?.dungeonUrl || null,
      npcEmbed: matched?.npcEmbed || null,
    };
  };

  const handleMapClick = (event) => {
    // Azgaar 有的导出为 <g id="markerX">，有的导出为 <svg id="markerX">
    const markerElement = event.target.closest('[id^="marker"]');

    if (markerElement) {
      const markerInfo = resolveMarkerInfo(markerElement);
      if (markerInfo) {
        console.log("setSelectedMarker", markerInfo);
        setSelectedMarker(markerInfo);
        return;
      }
    }

    setSelectedMarker(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSelectedMarker(null);
    }
  };

  return (
    <div
      className="w-screen min-h-screen h-screen flex flex-col relative font-mono text-gray-200 bg-[#0b1020] overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Echo map interface"
    >
      {/* HUD: 精简顶部栏（去掉提示文案与按钮） */}
      <header className="absolute top-0 left-0 w-full z-10 bg-black/70 backdrop-blur-sm border-b border-gray-800 p-2 flex items-center gap-2 pointer-events-none">
        <Terminal className="text-green-500 w-4 h-4 pointer-events-auto" />
        <span className="text-green-500 font-bold tracking-widest text-sm pointer-events-auto">ECHO_LINK_V1.1</span>
      </header>

      {/* 地图区域 */}
      <div className="flex-1 h-full relative overflow-hidden">
        {/* 只在 mapCode 存在时渲染 TransformWrapper，避免初始 scale 计算错误 */}
        {mapCode && (
        <TransformWrapper
          initialScale={initialScale}
          minScale={0.2}
          maxScale={6}
          centerZoomedOut={false}
          limitToBounds={false}
          initialPositionX={(viewport.w - mapDimensions.w * initialScale) / 2 - (centerPoint.x - mapDimensions.w / 2) * initialScale}
          initialPositionY={(viewport.h - mapDimensions.h * initialScale) / 2 - (centerPoint.y - mapDimensions.h / 2) * initialScale}
          wheel={{ step: 0.12 }}
          pinch={{ step: 0.12 }}
          doubleClick={{ disabled: true }}
          panning={{ velocityDisabled: true, excluded: ["iframe", "button"] }}
        >
          {() => (
            <TransformComponent 
              wrapperClass="!w-full !h-full" 
              contentClass="!w-full !h-full"
              wrapperStyle={{ touchAction: "none" }} // Ensure touch actions are handled by the library
              contentStyle={{ willChange: "transform", touchAction: "none" }} 
            >
              <div
                className="w-full h-full flex items-center justify-center cursor-crosshair outline-none touch-none select-none"
                style={{ touchAction: "none" }}
                aria-label="废土地图视图"
                onClickCapture={handleMapClick}
                onTouchEndCapture={handleMapClick}
              >
                <SVG
                  src={mapCode}
                  className="w-full h-full transition-opacity duration-700 select-none"
                  style={{ opacity: loading ? 0 : 1 }}
                  // Removed onLoad/onError here as we handle fetching manually now
                  // 预处理 SVG: 强制添加 viewBox 并移除/重置 width 和 height，确保 SVG 能自适应容器大小
                  preProcessor={(code) => {
                    let newCode = code.replace(/fill="#000000"/g, 'fill="#333333"');
                    
                    // 正则匹配 <svg ... > 开头标签，捕获属性部分
                    const svgTagMatch = newCode.match(/<svg([^>]*)>/);
                    if (!svgTagMatch) return newCode;

                    const oldSvgTag = svgTagMatch[0];
                    const attributes = svgTagMatch[1];

                    // 1. 提取原始宽高和 viewBox
                    const widthMatch = attributes.match(/width=["']([^"']+)["']/);
                    const heightMatch = attributes.match(/height=["']([^"']+)["']/);
                    const viewBoxMatch = attributes.match(/viewBox=["']([^"']+)["']/);

                    let width = widthMatch ? parseFloat(widthMatch[1]) : null;
                    let height = heightMatch ? parseFloat(heightMatch[1]) : null;

                    // 2. 如果没有 viewBox，则根据宽高生成 viewBox
                    let newAttributes = attributes;
                    if (!viewBoxMatch && width && height && !isNaN(width) && !isNaN(height)) {
                        newAttributes += ` viewBox="0 0 ${width} ${height}"`;
                    }

                    // 3. 强制移除或重写 width/height 为 100%
                    // 先移除旧的 width/height
                    newAttributes = newAttributes.replace(/\s*width=["'][^"']*["']/g, '');
                    newAttributes = newAttributes.replace(/\s*height=["'][^"']*["']/g, '');
                    
                    // 添加新的 width/height
                    newAttributes += ' width="100%" height="100%"';

                    // 4. 确保 preserveAspectRatio 设置为 xMidYMid meet (默认)，防止变形
                    if (!newAttributes.includes('preserveAspectRatio')) {
                        newAttributes += ' preserveAspectRatio="xMidYMid meet"';
                    }

                    // 构造新的 SVG 标签
                    const newSvgTag = `<svg ${newAttributes}>`;
                    
                    // 替换旧的 SVG 标签
                    return newCode.replace(oldSvgTag, newSvgTag);
                  }}
                />
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b1020] z-50">
                    <div className="text-green-500 animate-pulse font-bold tracking-widest mb-4">
                      INITIALIZING TERRAIN DATA...
                    </div>
                    {/* Loading Bar */}
                    <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div 
                        className="h-full bg-green-500 transition-all duration-200 ease-out"
                        style={{ width: `${loadProgress}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-green-500/70 font-mono">
                      {loadProgress}%
                    </div>
                  </div>
                )}
              </div>
            </TransformComponent>
          )}
        </TransformWrapper>
        )}
      </div>

      {/* 装饰性网格背景 (当SVG未加载时) */}
      {loading && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-40"></div>}

      {/* 调试徽标，确认选中状态 */}
      {selectedMarker && (
        <div className="fixed left-3 top-16 sm:top-20 z-[9999] px-2 py-1 text-xs text-black bg-green-300 rounded shadow">
          Selected: {selectedMarker.id}
        </div>
      )}

      {/* 全屏遮罩弹窗（Portal，避免被遮挡） */}
      {selectedMarker &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.8)", // Darker backdrop for focus
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedMarker(null);
            }}
          >
            {/* Card Container - Vertical Layout based on Reference */}
            <div className="w-[min(380px,calc(100%-2rem))] bg-[#1a1f2e] border border-gray-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-in zoom-in-95 duration-300 will-change-transform">
              
              {/* 1. Close Button (Top Right, Red) */}
              <button
                onClick={() => setSelectedMarker(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/30 hover:bg-red-500/20 text-red-500 rounded-full transition-all duration-200 backdrop-blur-sm"
                aria-label="Close"
              >
                <X size={24} strokeWidth={3} />
              </button>

              {/* 2. Hero Section (Visual Placeholder) */}
              <div className="h-32 sm:h-48 bg-gradient-to-b from-[#0f131a] to-[#1a1f2e] flex items-center justify-center relative overflow-hidden shrink-0">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-transparent to-transparent"></div>
                
                {/* Large Icon Display */}
                <div className="text-6xl sm:text-8xl filter drop-shadow-[0_0_20px_rgba(34,197,94,0.4)] transform hover:scale-110 transition-transform duration-500 cursor-default select-none">
                  {selectedMarker.icon}
                </div>
                
                {/* Type Badge (Overlay) */}
                <div className="absolute bottom-3 left-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-green-400 uppercase tracking-widest shadow-lg">
                  {selectedMarker.type}
                </div>
              </div>

              {/* 3. Content Section (Middle) */}
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                
                {/* Name & Coordinates (Blue Box Area) */}
                <div>
                  <h2 className="text-2xl font-black text-white leading-tight tracking-wide shadow-black drop-shadow-md">
                    {selectedMarker.name}
                  </h2>
                  {selectedMarker.coordinates && (
                    <div className="flex items-center gap-2 mt-2 text-blue-400 font-mono text-sm font-bold bg-blue-500/10 w-fit px-2 py-1 rounded border border-blue-500/20">
                      <Crosshair size={14} />
                      <span>X:{selectedMarker.coordinates.x}</span>
                      <span className="text-blue-600/50">|</span>
                      <span>Y:{selectedMarker.coordinates.y}</span>
                    </div>
                  )}
                </div>

                {/* Note (Red Box Area) */}
                <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/30 shadow-inner">
                  <div className="flex items-center gap-2 text-[10px] text-red-400 uppercase tracking-wider mb-2 font-bold">
                     <Terminal size={12} />
                     Intel Report
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed font-sans text-justify">
                    {selectedMarker.note}
                  </p>
                </div>

                {/* Status Tags */}
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                   <span className="px-3 py-1 bg-gray-800/50 rounded-lg text-xs text-gray-400 border border-gray-700/50 flex items-center gap-1">
                      <Activity size={12} className={selectedMarker.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'} />
                      {selectedMarker.status}
                   </span>
                   <span className="px-3 py-1 bg-gray-800/50 rounded-lg text-xs text-gray-400 border border-gray-700/50 flex items-center gap-1">
                      <Radio size={12} />
                      {selectedMarker.radiation}
                   </span>
                </div>
              </div>

              {/* 4. Footer Buttons (Bottom) */}
              {(() => {
                const targetLink =
                  selectedMarker.dungeonUrl ||
                  selectedMarker.npcEmbed ||
                  (selectedMarker.type === "Sanctuary" ? "https://aitown.uggamer.com/" : null);
                
                return (
                  <div className="p-6 pt-0 mt-2 grid grid-cols-2 gap-4 shrink-0">
                    <button
                      onClick={() => {
                        if (targetLink) window.open(targetLink, "_blank", "noreferrer");
                      }}
                      disabled={!targetLink}
                      className={clsx(
                        "py-3.5 px-4 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95",
                        targetLink 
                          ? "bg-[#e8d5b5] hover:bg-white text-[#3d342b] border-b-4 border-[#bca480]" // Beige style from reference
                          : "bg-gray-800 text-gray-600 border-b-4 border-gray-900 cursor-not-allowed"
                      )}
                    >
                      进入
                    </button>
                    
                    <button
                      onClick={() => setSelectedMarker(null)}
                      className="py-3.5 px-4 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-200 bg-[#2a303c] hover:bg-[#353b48] text-gray-300 border-b-4 border-[#1a1f2e] shadow-lg active:scale-95"
                    >
                      关闭
                    </button>
                  </div>
                );
              })()}

            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default App;