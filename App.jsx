import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const controlsRef = useRef(null);
  const isMobile = viewport.w < 768;

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

  const panToMarker = useCallback(
    (markerInfo) => {
      if (!controlsRef.current || !markerInfo?.coordinates) return;
      const { setTransform, state } = controlsRef.current;
      if (!setTransform || !state) return;

      const { scale, positionX, positionY } = state;
      const markerX = markerInfo.coordinates.x;
      const markerY = markerInfo.coordinates.y;

      const panelWidth = isMobile ? 0 : 360;
      const panelHeight = isMobile ? Math.min(viewport.h * 0.42, 360) : 0;

      const targetX = isMobile ? viewport.w / 2 : panelWidth + (viewport.w - panelWidth) / 2;
      const targetY = isMobile ? (viewport.h - panelHeight) / 2 : viewport.h / 2;

      const currentX = markerX * scale + positionX;
      const currentY = markerY * scale + positionY;

      const deltaX = targetX - currentX;
      const deltaY = targetY - currentY;

      setTransform(positionX + deltaX, positionY + deltaY, scale, 200);
    },
    [isMobile, viewport.w, viewport.h]
  );

  const handleMapClick = (event) => {
    // Azgaar 有的导出为 <g id="markerX">，有的导出为 <svg id="markerX">
    const markerElement = event.target.closest('[id^="marker"]');

    if (markerElement) {
      const markerInfo = resolveMarkerInfo(markerElement);
      if (markerInfo) {
        console.log("setSelectedMarker", markerInfo);
        setSelectedMarker(markerInfo);
        panToMarker(markerInfo);
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
          {({ setTransform, state }) => {
            controlsRef.current = { setTransform, state };
            return (
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
            );
          }}
        </TransformWrapper>
      </div>

      {/* 装饰性网格背景 (当SVG未加载时) */}
      {loading && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>}

      {/* 战术情报面板：桌面侧栏 / 移动底抽屉 */}
      <div
        className={clsx(
          "fixed z-40 transition-all duration-300 ease-out pointer-events-none",
          isMobile
            ? "left-2 right-2 bottom-2 max-h-[50vh] translate-y-full opacity-0"
            : "top-20 left-4 w-[360px] max-h-[calc(100%-96px)] -translate-x-4 opacity-0",
          selectedMarker && "translate-y-0 translate-x-0 opacity-100 pointer-events-auto"
        )}
        style={{
          clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
        }}
      >
        <div className="h-full bg-black/75 backdrop-blur border border-green-500/40 shadow-[0_12px_30px_rgba(0,0,0,0.45)] rounded-md overflow-hidden">
          {!selectedMarker && (
            <div className="p-4 text-sm text-gray-400">点击任意信号标记以查看情报。</div>
          )}
          {selectedMarker && (
            <div className="flex flex-col h-full">
              <div className="bg-green-900/15 px-4 py-3 border-b border-green-500/30 flex items-center justify-between">
                <div className="font-bold text-green-400 flex items-center gap-2 tracking-widest">
                  <Radio size={16} /> SIGNAL_DETECTED
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="hover:text-white text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                  aria-label="关闭信号栏"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3 text-sm overflow-y-auto">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">IDENTIFIER</label>
                  <div className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                    <span aria-hidden="true" className="text-xl">
                      {selectedMarker.icon}
                    </span>
                    <span>{selectedMarker.name}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 uppercase tracking-wide">
                  <span className="px-2 py-1 border border-green-500/40 rounded bg-green-900/15">
                    {selectedMarker.type}
                  </span>
                  {selectedMarker.coordinates && (
                    <span className="px-2 py-1 border border-gray-700 rounded bg-gray-900/40">
                      {`x:${selectedMarker.coordinates.x} y:${selectedMarker.coordinates.y}`}
                    </span>
                  )}
                </div>

                <div className="bg-gray-900/70 p-3 rounded border border-gray-800 leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {selectedMarker.note}
                </div>
              </div>

              {(() => {
                const targetLink =
                  (selectedMarker.type === "Danger" || selectedMarker.icon === "👁️")
                    ? "https://watabou.github.io/cave-generator/"
                    : selectedMarker.type === "Sanctuary"
                      ? "https://aitown.uggamer.com/"
                      : selectedMarker.dungeonUrl ||
                        selectedMarker.npcEmbed ||
                        null;
                return (
                  <div className="px-4 pb-4 pt-2 flex gap-2">
                    <button
                      className="flex-1 bg-green-700/30 hover:bg-green-700/50 text-green-100 border border-green-600/60 py-2 text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded disabled:opacity-40"
                      aria-label="进入目标"
                      onClick={() => {
                        if (targetLink) window.open(targetLink, "_blank", "noreferrer");
                      }}
                      disabled={!targetLink}
                    >
                      进入
                    </button>
                    <button
                      className="flex-1 bg-gray-700/40 hover:bg-gray-700/60 text-gray-100 border border-gray-600/60 py-2 text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                      aria-label="关闭"
                      onClick={() => setSelectedMarker(null)}
                    >
                      关闭
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;