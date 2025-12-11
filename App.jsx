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
      className="w-screen h-screen flex flex-col relative font-mono text-gray-200 bg-[#0b1020] overflow-hidden"
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
      <div className="flex-1 relative overflow-hidden">
        <TransformWrapper
          initialScale={1.1}
          minScale={0.6}
          maxScale={6}
          centerZoomedOut={false}
          limitToBounds={false}
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

      {/* 信息弹窗：固定定位 + 半透明遮罩，确保可见；使用 portal 到 body */}
      {selectedMarker &&
        createPortal(
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
            <div className="pointer-events-auto absolute right-3 top-16 sm:top-20 w-[min(440px,calc(100%-1.5rem))] sm:w-[420px] bg-black/92 border border-green-500/50 shadow-[0_0_24px_rgba(34,197,94,0.35)] backdrop-blur-lg rounded-md overflow-hidden animate-in fade-in duration-150">
              <div className="bg-green-900/20 p-3 border-b border-green-500/30 flex justify-between items-center">
                <h3 className="font-bold text-green-400 flex items-center gap-2">
                  <Radio size={16} /> SIGNAL_DETECTED
                </h3>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="hover:text-white text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                  aria-label="关闭信号弹窗"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm max-h-[calc(100vh-120px)] overflow-y-auto">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">IDENTIFIER</label>
                  <div className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                    <span aria-hidden="true">{selectedMarker.icon}</span>
                    <span>{selectedMarker.name}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 uppercase tracking-wide">
                  <span className="px-2 py-1 border border-green-500/40 rounded bg-green-900/10">{selectedMarker.type}</span>
                  {selectedMarker.coordinates && (
                    <span className="px-2 py-1 border border-gray-700 rounded bg-gray-900/40">
                      {`x:${selectedMarker.coordinates.x} y:${selectedMarker.coordinates.y}`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-900/70 p-2 rounded border border-gray-800">
                    <label className="text-[10px] text-gray-500 block">RADIATION</label>
                    <div className="text-yellow-500 font-mono">{selectedMarker.radiation}</div>
                  </div>
                  <div className="bg-gray-900/70 p-2 rounded border border-gray-800">
                    <label className="text-[10px] text-gray-500 block">STATUS</label>
                    <div
                      className={clsx('font-mono', {
                        'text-green-500': selectedMarker.status === 'ACTIVE',
                        'text-red-500': selectedMarker.status !== 'ACTIVE'
                      })}
                    >
                      {selectedMarker.status}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/70 p-3 rounded border border-gray-800 leading-relaxed text-gray-200">
                  {selectedMarker.note}
                </div>

                {(selectedMarker.dungeonUrl || selectedMarker.npcEmbed) && (
                  <div className="space-y-3">
                    {selectedMarker.dungeonUrl && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 block">DUNGEON MAP</label>
                        <iframe
                          src={selectedMarker.dungeonUrl}
                          width="100%"
                          height="240"
                          title="Dungeon map"
                          className="border border-gray-800 rounded bg-black"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {selectedMarker.npcEmbed && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 block">NPC / THREAT FEED</label>
                        <iframe
                          src={selectedMarker.npcEmbed}
                          width="100%"
                          height="300"
                          title="NPC intel"
                          className="border border-gray-800 rounded bg-black"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="w-full bg-green-700/30 hover:bg-green-700/50 text-green-100 border border-green-600/60 py-2 text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                  aria-label="建立信号连接"
                >
                  Establish Connection
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 装饰性网格背景 (当SVG未加载时) */}
      {loading && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>}

      {/* 调试：当前选中标记提示 */}
      {selectedMarker && (
        <div className="fixed left-3 top-16 sm:top-20 z-50 px-2 py-1 text-xs text-black bg-green-300 rounded shadow">
          Selected: {selectedMarker.id}
        </div>
      )}
    </div>
  );
};

export default App;