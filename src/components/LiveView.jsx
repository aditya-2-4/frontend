import React, { useState, useEffect, useRef } from 'react';
import { Camera, Maximize, Settings, ShieldAlert, Sliders, Play, Check, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

import { API_URL } from '../config';

export default function LiveView({ token, deviceStatus }) {
  const [streamUrl, setStreamUrl] = useState(deviceStatus?.stream_url || localStorage.getItem('mjpeg_stream_url') || 'http://10.129.157.170/cam-lo.jpg');
  const [savedUrl, setSavedUrl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [blobUrl, setBlobUrl] = useState('');
  
  // Reconnect logic
  const [retryCount, setRetryCount] = useState(0);

  const extractIp = (url) => {
    try {
      const match = url.match(/:\/\/([^\/:]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  const [ipInput, setIpInput] = useState(() => extractIp(streamUrl));

  useEffect(() => {
    // Attempt to connect to stream when URL changes or retry occurs
    setStreamError(false);
    setIsStreaming(true); // Optimistic UI
    
    // Listen for WebSocket proxied frames from App.jsx
    const handleFrame = (e) => {
      if (imgRef.current) {
        if (imgRef.current.dataset.blobUrl) {
          URL.revokeObjectURL(imgRef.current.dataset.blobUrl);
        }
        imgRef.current.src = e.detail;
        imgRef.current.dataset.blobUrl = e.detail;
      }
      if (!isStreaming) {
        setIsStreaming(true);
        setStreamError(false);
      }
    };

    window.addEventListener('camera-frame', handleFrame);

    return () => {
      window.removeEventListener('camera-frame', handleFrame);
    };
  }, [streamUrl, retryCount]);



  const handleStreamError = () => {
    setIsStreaming(false);
    setStreamError(true);
  };

  const handleStreamLoad = () => {
    setIsStreaming(true);
    setStreamError(false);
  };

  const handleReconnect = () => {
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (deviceStatus?.stream_url && deviceStatus.stream_url !== streamUrl) {
      setStreamUrl(deviceStatus.stream_url);
    }
  }, [deviceStatus?.stream_url]);

  const handleSaveUrl = async () => {
    let input = ipInput.trim();
    let newUrl = '';
    
    // Automatically extract the IP and build the stream URL
    // If it's a full URL (like ngrok/localtunnel), just use it
    if (input.startsWith('http://') || input.startsWith('https://')) {
      newUrl = input.endsWith('/stream') ? input : `${input}/stream`;
    } else {
      let ip = input;
      ip = ip.split(':')[0].split('/')[0];
      newUrl = `http://${ip}:81/stream`;
    }
    
    setStreamUrl(newUrl);
    localStorage.setItem('mjpeg_stream_url', newUrl);
    
    try {
      await fetch(`${API_URL}/api/device/stream-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stream_url: newUrl })
      });
    } catch (err) {
      console.error('Failed to sync stream URL to backend:', err);
    }

    setSavedUrl(true);
    setRetryCount(prev => prev + 1); // Trigger reconnection
    setTimeout(() => setSavedUrl(false), 2000);
  };

  const handleCaptureSnapshot = () => {
    if (!isStreaming || streamError || !imgRef.current) return;
    
    try {
      // Draw current image onto a temporary canvas to get a base64 snapshot
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth || 800;
      canvas.height = imgRef.current.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    } catch (err) {
      console.error('Snapshot failed (CORS Error):', err);
      alert('Snapshot feature is unavailable due to browser security restrictions on the camera stream.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* CCTV Screen Box */}
      <div 
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden border border-[#1a241c] shadow-2xl aspect-video w-full flex items-center justify-center"
      >
        {!isStreaming && streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a06] z-0">
            <Camera className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-300">Camera Disconnected</h3>
            <p className="text-gray-500 mt-2 mb-6">Unable to load stream from {streamUrl}</p>
            <button 
              onClick={handleReconnect}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 font-semibold transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> Reconnect Stream
            </button>
          </div>
        )}

        {/* Stream Initializing / Connecting Loader */}
        {!streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a06] z-0">
            <Camera className="w-12 h-12 text-emerald-500 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Connecting Camera Stream...</h4>
            <p className="text-xs text-gray-500 mt-1 font-mono">{extractIp(streamUrl)}</p>
          </div>
        )}

        <img 
          ref={imgRef}
          src=""
          onError={handleStreamError}
          onLoad={handleStreamLoad}
          alt=""
          className="w-full h-full object-contain relative z-1"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-in-out',
            display: streamError ? 'none' : 'block'
          }}
        />

        {/* Live stream details overlays */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <div className="bg-[#050a06]/80 text-emerald-400 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-[#1a241c] backdrop-blur font-bold">
            {zoomLevel.toFixed(1)}X ZOOM
          </div>
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-[#050a06]/80 hover:bg-[#121a14] text-gray-300 rounded-lg backdrop-blur border border-[#1a241c] transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 bg-[#050a06]/80 hover:bg-[#121a14] text-gray-300 rounded-lg backdrop-blur border border-[#1a241c] transition-colors"
            title="Stream Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <div className="bg-[#050a06]/80 px-3 py-1.5 rounded-lg border border-[#1a241c] backdrop-blur flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${streamError ? 'bg-red-500' : 'bg-emerald-500 animate-ping'}`}></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {streamError ? 'OFFLINE' : `LIVE (${extractIp(streamUrl)})`}
            </span>
          </div>
        </div>

        {/* HUD Overlay */}
        {!streamError && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="font-mono text-emerald-400 text-xs text-shadow">
              <div>ESP32-CAM MAIN GATE</div>
              <div>{new Date().toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-5 bg-[#121a14] border border-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${streamError ? 'bg-red-500' : 'bg-emerald-500 animate-ping'}`}></span>
          <span className="text-sm font-bold text-white uppercase tracking-wider">ESP32 Camera Controls</span>
        </div>

        {/* Zoom Slider and snap buttons */}
        <div className="flex items-center gap-6 flex-1 sm:flex-initial">
          <div className="flex items-center gap-2.5 bg-[#050a06] px-4 py-2 rounded-lg border border-gray-800 w-full sm:w-auto">
            <ZoomOut className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" onClick={() => setZoomLevel(prev => Math.max(1.0, prev - 0.5))} />
            <input 
              type="range" 
              min="1.0" 
              max="4.0" 
              step="0.1" 
              value={zoomLevel} 
              onChange={e => setZoomLevel(parseFloat(e.target.value))}
              className="accent-emerald-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer w-24 sm:w-32"
            />
            <ZoomIn className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" onClick={() => setZoomLevel(prev => Math.min(4.0, prev + 0.5))} />
          </div>

          <button 
            onClick={handleCaptureSnapshot}
            disabled={streamError}
            className={`px-4 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shrink-0 ${
              streamError 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Stream Config Modal Panel */}
      {showConfig && (
        <div className="bg-[#121a14] border border-gray-800 p-6 rounded-xl space-y-4 shadow-lg">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>ESP32 Stream Configuration</span>
          </h3>
          <p className="text-xs text-gray-400">
            Set the MJPEG stream URL of your ESP32-CAM.
          </p>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={ipInput}
              onChange={e => setIpInput(e.target.value)}
              className="flex-1 bg-[#050a06] border border-gray-700 focus:border-emerald-500 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 outline-none"
              placeholder="Paste IP address here (e.g. 192.168.4.1)"
            />
            <button 
              onClick={handleSaveUrl}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {savedUrl ? <Check className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
              <span>{savedUrl ? 'Saved!' : 'Connect'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Preview Modal */}
      {capturedImage && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121a14] border border-gray-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Camera className="text-emerald-400"/> Captured Snapshot</h3>
              <button 
                onClick={() => setCapturedImage(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="border border-gray-800 rounded-lg overflow-hidden bg-black aspect-video relative">
              <img src={capturedImage} alt="Captured Snapshot" className="w-full h-full object-contain" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setCapturedImage(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold text-xs uppercase"
              >
                Cancel
              </button>
              <a 
                href={capturedImage} 
                download={`Snapshot-${Date.now()}.jpg`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs uppercase tracking-wider text-center flex items-center"
              >
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
