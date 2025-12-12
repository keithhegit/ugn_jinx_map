import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import SVG from 'react-inlinesvg';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Radio, X, Terminal } from 'lucide-react';
import clsx from 'clsx';
import markers from './markers.json';

const App = () => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1280, h: typeof window !== 'undefined' ? window.innerHeight : 720 });
  const primaryMapSrc = import.meta.env.VITE_MAP_SRC || "https://pub-c98d5902eedf42f6a9765dfad981fd88.r2.dev/map/nomeiland_jinx.svg";
  const fallbackMapSrc = "/map.svg";
  const [mapUrl, setMapUrl] = useState(primaryMapSrc);
  const centerPoint = useMemo(() => ({ x: 456.5, y: 531.2 }), []);

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <TransformWrapper
          initialScale={1.1}
          minScale={0.6}
          maxScale={6}
          centerZoomedOut={false}
          limitToBounds={true}
          initialPositionX={viewport.w / 2 - centerPoint.x}
          initialPositionY={viewport.h / 2 - centerPoint.y}
          wheel={{ step: 0.12 }}
          pinch={{ step: 0.12 }}
          doubleClick={{ mode: "zoomIn", step: 0.3 }}
          panning={{ velocityDisabled: true, excluded: ["iframe", "button"] }}
        >
          {() => (
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <div
                className="w-full h-full flex items-center justify-center cursor-crosshair outline-none touch-none select-none"
                style={{ touchAction: "none" }}
                aria-label="废土地图视图"
                onClickCapture={handleMapClick}
                onTouchEndCapture={handleMapClick}
              >
                <SVG
                  src={mapUrl}
                  className="w-full h-full transition-opacity duration-700 select-none"
                  style={{ opacity: loading ? 0 : 1 }}
                  onLoad={() => setLoading(false)}
                  onError={(error) => {
                    console.error("Map Load Error:", error);
                    if (mapUrl !== fallbackMapSrc) {
                      setMapUrl(fallbackMapSrc);
                      return;
                    }
                    setLoading(false);
                  }}
                  // 预处理 SVG: 给 Marker 加颜色或者类名 (可选)
                  preProcessor={(code) => code.replace(/fill="#000000"/g, 'fill="#333333"')}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center text-green-500 animate-pulse">
                    LOADING TERRAIN DATA...
                  </div>
                )}
              </div>
            </TransformComponent>
          )}
        </TransformWrapper>
      </div>

      {/* 装饰性网格背景 (当SVG未加载时) */}
      {loading && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>}

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
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              // 点击遮罩关闭 (可选，如果用户想保留这个习惯)
              if (e.target === e.currentTarget) setSelectedMarker(null);
            }}
          >
            {/* Game UI Container */}
            <div className="w-[min(480px,calc(100%-2rem))] bg-[#0f131a] border border-white/10 shadow-2xl rounded-lg overflow-hidden relative font-sans animate-in fade-in zoom-in-95 duration-200">
              
              {/* Top Decorative Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent opacity-50"></div>

              {/* Content Padding */}
              <div className="p-6">
                
                {/* Header Section */}
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-500 text-xs font-bold tracking-[0.15em] uppercase">
                      <Radio size={14} className="animate-pulse" />
                      SIGNAL_DETECTED
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase pl-0.5">
                      IDENTIFIER
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
                    aria-label="关闭"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Main Info */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
                    <span className="text-2xl filter drop-shadow-lg">{selectedMarker.icon}</span>
                    <span className="tracking-wide">{selectedMarker.name}</span>
                  </h2>
                  
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                    <span className="text-green-400/80 font-semibold">{selectedMarker.type}</span>
                    {selectedMarker.coordinates && (
                      <span className="opacity-60">
                        x:{selectedMarker.coordinates.x} y:{selectedMarker.coordinates.y}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description Box */}
                <div className="bg-black/30 border border-white/5 rounded p-3 mb-6 text-sm text-gray-300 leading-relaxed shadow-inner">
                  {selectedMarker.note}
                </div>

                {/* Action Buttons */}
                {(() => {
                  const targetLink =
                    selectedMarker.dungeonUrl ||
                    selectedMarker.npcEmbed ||
                    (selectedMarker.type === "Sanctuary" ? "https://aitown.uggamer.com/" : null);
                  
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (targetLink) window.open(targetLink, "_blank", "noreferrer");
                        }}
                        disabled={!targetLink}
                        className={clsx(
                          "py-2.5 px-4 rounded text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2",
                          targetLink 
                            ? "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.3)] hover:shadow-[0_0_20px_rgba(22,163,74,0.5)]" 
                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                        )}
                      >
                        进入
                      </button>
                      
                      <button
                        onClick={() => setSelectedMarker(null)}
                        className="py-2.5 px-4 rounded text-xs font-bold tracking-widest uppercase transition-all duration-200 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/10"
                      >
                        关闭
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default App;