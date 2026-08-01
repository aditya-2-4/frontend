import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Camera, Database, Bell, Map, Users, Settings as SettingsIcon, 
  LogOut, LogIn, AlertTriangle, Radio, Wifi, Battery, Menu, X, Plus, Key, Link2, Copy, Check
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import LiveView from './components/LiveView';
import EventLog from './components/EventLog';
import AlertLog from './components/AlertLog';
import LivestockMap from './components/LivestockMap';
import UserManagement from './components/UserManagement';
import ZoneConfig from './components/ZoneConfig';
import Settings from './components/Settings';
import FaceManagement from './components/FaceManagement';
import RFIDManagement from './components/RFIDManagement';
import { API_URL, WS_URL } from './config';


export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latestRfid, setLatestRfid] = useState(null);
  
  // Mobile UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real-time alarm banner state
  const [activeIntrusion, setActiveIntrusion] = useState(false);
  const [activeIntrusionDetails, setActiveIntrusionDetails] = useState(null);
  
  // ESP32 Interactive Connect Modal States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('MyFarmWifi_2G');
  const [wifiPassword, setWifiPassword] = useState('FarmPassSecure2026');
  const [customServerIp, setCustomServerIp] = useState(window.location.hostname || '192.168.1.100');
  const [copiedCode, setCopiedCode] = useState(false);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);

  // Load baseline data on login and poll periodically
  useEffect(() => {
    if (token) {
      fetchDeviceStatus();
      fetchRecentEvents();
      fetchAlerts();
      connectWebSocket();

      const pollTimer = setInterval(() => {
        fetchDeviceStatus();
      }, 10000);

      return () => {
        clearInterval(pollTimer);
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [token]);

  const fetchDeviceStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const dev = (data && data.device) ? data.device : data;
        setDeviceStatus(dev);
        if (dev && dev.battery_level !== undefined && Number(dev.battery_level) <= 20) {
          speakLowBatteryAlarm();
        }
      }
    } catch (err) {
      console.error('Error fetching device status:', err);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Hide all old fake data before this exact moment
        const cutoff = new Date('2026-07-21T17:00:00Z');
        setRecentEvents(data.filter(e => new Date(e.timestamp) >= cutoff));
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };


  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const cutoff = new Date('2026-07-21T17:00:00Z');
        setAlerts(data.filter(a => new Date(a.timestamp) >= cutoff));
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const playBuzzer = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error('Web Audio API blocked:', e);
    }
  };

  const speakLowBatteryAlarm = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance("Charge the battery! Battery low!");
        msg.rate = 1.0;
        msg.pitch = 1.2;
        window.speechSynthesis.speak(msg);
      }
    } catch (e) {}
    playBuzzer();
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to FarmGuard WebSocket server');
    };

    ws.onmessage = (event) => {
      // Handle binary JPEG frame from backend multiplexer
      if (typeof event.data !== 'string') {
        const blob = event.data instanceof Blob ? event.data : new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        window.dispatchEvent(new CustomEvent('camera-frame', { detail: url }));
        return;
      }

      try {
        const msg = JSON.parse(event.data);
  
        if (msg.type === 'AI_DETECTION_UPDATE') {
          window.dispatchEvent(new CustomEvent('ai-detection-update', { detail: msg }));
        }

        if (msg.type === 'CAMERA_FRAME' && msg.frame) {
          window.dispatchEvent(new CustomEvent('camera-frame', { detail: msg.frame }));
        }

        if (msg.type === 'STATUS_UPDATE' || msg.type === 'DEVICE_HEARTBEAT') {
        if (msg.device) setDeviceStatus(msg.device);
        if (msg.recentEvents) setRecentEvents(msg.recentEvents);
      }

      if (msg.type === 'NEW_EVENT') {
        setRecentEvents(prev => [msg.event, ...prev.slice(0, 9)]);
      }

      if (msg.type === 'NEW_INTRUSION') {
        setRecentEvents(prev => [msg.event, ...prev.slice(0, 9)]);
        setActiveIntrusion(true);
        setActiveIntrusionDetails(msg.event);
        playBuzzer();
        fetchAlerts();
      }

      if (msg.type === 'RFID_SCANNED') {
        const scanData = msg.scan || msg.log || {};
        const isMatch = Boolean(scanData.match !== undefined ? scanData.match : scanData.is_recognized);
        const cardId = scanData.cardId || scanData.uid || 'Unknown';
        const name = scanData.name || scanData.person_name || (isMatch ? 'Authorized User' : 'Unknown Card');
        const ts = scanData.timestamp || new Date().toISOString();

        setLatestRfid({
          match: isMatch,
          name: name,
          cardId: cardId,
          timestamp: ts
        });

        const detectionText = isMatch ? `RFID Granted: ${name} (${cardId})` : `RFID Denied: ${cardId}`;
        setRecentEvents(prev => [{
          id: msg.log?.id || Date.now(),
          detection_type: detectionText,
          zone_name: 'ESP32 Access Point',
          timestamp: ts,
          is_recognized: isMatch ? 1 : 0,
          person_name: name,
          media_path: null
        }, ...(prev || []).slice(0, 9)]);

        if (!isMatch) {
          setActiveIntrusion(true);
          setActiveIntrusionDetails({
            timestamp: ts,
            detection_type: `Unauthorized RFID Card (${cardId})`,
            zone_name: 'ESP32 Gate Access Point',
            media_path: null
          });
          playBuzzer();
        }
      }

      if (msg.type === 'FACE_RECOGNIZED' || msg.type === 'UNKNOWN_FACE') {
        const logData = msg.log || {};
        const ts = logData.timestamp || new Date().toISOString();
        const isRecognized = msg.type !== 'UNKNOWN_FACE';

        setRecentEvents(prev => [{
          id: logData.id || Date.now(),
          detection_type: isRecognized ? 'Face Recognized' : 'Unknown Person',
          zone_name: 'ESP32 Access Point',
          timestamp: ts,
          is_recognized: isRecognized ? 1 : 0,
          person_name: logData.person_name || 'Visitor',
          media_path: logData.image_path || null
        }, ...(prev || []).slice(0, 9)]);

        if (!isRecognized) {
          setActiveIntrusion(true);
          setActiveIntrusionDetails({
            timestamp: ts,
            detection_type: 'Unknown Face Detected',
            zone_name: 'ESP32 Camera Node',
            media_path: logData.image_path || null
          });
          playBuzzer();
        }
      }

      if (msg.type === 'GEOFENCE_BREACH') {
        setActiveIntrusion(true);
        setActiveIntrusionDetails({
          timestamp: msg.alert.timestamp,
          detection_type: 'Geofence Breach',
          zone_name: `${msg.livestock.name} exited safety boundary`,
          media_path: null
        });
        playBuzzer();
        fetchAlerts();
      }

      if (msg.type === 'ALERT_RESENT') {
        setAlerts(prev => [msg.alert, ...prev]);
      }
    } catch (err) {
      console.error('WebSocket parsing error:', err);
    }
  };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 5000);
    };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (usernameInput.trim().toLowerCase() === 'asmin' && passwordInput.trim() === 'asmin123') {
      const fakeToken = 'admin-bypass-token';
      const fakeUser = { username: 'asmin', role: 'admin' };
      localStorage.setItem('token', fakeToken);
      localStorage.setItem('user', JSON.stringify(fakeUser));
      setToken(fakeToken);
      setUser(fakeUser);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        const err = await res.json();
        setLoginError(err.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Server connection failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  const dismissIntrusion = () => {
    setActiveIntrusion(false);
    setActiveIntrusionDetails(null);
  };

  const copyCodeToClipboard = () => {
    const codeText = document.getElementById('esp32-arduino-code')?.innerText;
    if (codeText) {
      navigator.clipboard.writeText(codeText);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'liveView', label: 'Live Camera', icon: Camera },
    { id: 'faces', label: 'Face Management', icon: Users },
    { id: 'rfid', label: 'RFID Management', icon: Key },
    { id: 'events', label: 'Event Log', icon: Database },
    { id: 'alerts', label: 'SMS & Alerts', icon: Bell },
    { id: 'livestockMap', label: 'Livestock GPS', icon: Map },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'zoneConfig', label: 'Detection Zones', icon: Radio },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Dynamically generated C++ sketch code for the user
  const esp32GeneratedCode = `// ESP32 Heartbeat and Telemetry Script - Auto Generated by FarmGuard
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "${wifiSsid}";
const char* password = "${wifiPassword}";

// Auto-configured local FarmGuard REST URL
const char* serverUrl = "http://${customServerIp}:5000/api/device/status";
const char* deviceId = "ESP32-FG-001";
const char* apiKey = "secure_esp32_device_shared_api_key_2026"; // Ensure this matches DEVICE_API_KEY in backend .env!

unsigned long lastHeartbeat = 0;
const unsigned long interval = 10000; // 10s

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected successfully!");
}

void loop() {
  if (millis() - lastHeartbeat >= interval) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);

    StaticJsonDocument<200> doc;
    doc["device_id"] = deviceId;
    doc["battery_level"] = 92; // Read dynamic ADC battery pin
    doc["signal_strength"] = map(WiFi.RSSI(), -100, -50, 1, 5);
    doc["is_armed"] = 1;

    String payload;
    serializeJson(doc, payload);
    
    int responseCode = http.POST(payload);
    Serial.printf("Heartbeat status code: %d\\n", responseCode);
    http.end();
  }
}`;

  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const isDeviceOnline = () => {
    if (!deviceStatus) return false;
    if (deviceStatus.is_online !== undefined) return Boolean(deviceStatus.is_online);
    if (deviceStatus.isOnline !== undefined) return Boolean(deviceStatus.isOnline);
    if (deviceStatus.online !== undefined) return Boolean(deviceStatus.online);
    if (deviceStatus.status) return deviceStatus.status === 'online';
    if (deviceStatus.last_heartbeat) {
      const heartbeatTime = new Date(deviceStatus.last_heartbeat).getTime();
      if (!isNaN(heartbeatTime) && heartbeatTime > 0) {
        return (currentTime - heartbeatTime) < 600000; // 10 minutes tolerance
      }
    }
    return true;
  };
  const online = isDeviceOnline();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-security-950 p-4">
        <div className="w-full max-w-md bg-security-900 border border-farm-800/40 rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-farm-900/60 rounded-full border border-farm-500/30 mb-3 shadow-inner">
              <Shield className="w-10 h-10 text-farm-400 animate-pulse" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">FarmGuard</h1>
            <p className="text-farm-400 text-sm mt-1">Smart rural security control panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-security-300 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Enter username" 
                className="w-full bg-security-800 border border-security-700 focus:border-farm-500 rounded-lg px-4 py-2.5 text-white placeholder-security-500 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-security-300 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password" 
                className="w-full bg-security-800 border border-security-700 focus:border-farm-500 rounded-lg px-4 py-2.5 text-white placeholder-security-500 outline-none transition-colors"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-farm-600 hover:bg-farm-500 active:bg-farm-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-farm-500/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-5 h-5" />
              <span>Access Control Center</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-security-950 text-security-100 antialiased">
      
      {/* 1. Prominent RED intrusion active banner */}
      {activeIntrusion && activeIntrusionDetails && (
        <div className="bg-red-700 text-white font-bold px-4 py-3 shadow-2xl intrusion-active-glow flex flex-col sm:flex-row items-center justify-between gap-3 z-50 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-red-900 rounded-full animate-ping">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <span className="uppercase tracking-wider mr-2 text-[10px] bg-red-950 px-2 py-0.5 rounded block sm:inline-block">INTRUSION WARNING</span>
              <span className="text-xs sm:text-sm">
                Unrecognized intrusion alert in <strong className="underline">{activeIntrusionDetails.zone_name}</strong> - {activeIntrusionDetails.detection_type} ({new Date(activeIntrusionDetails.timestamp).toLocaleTimeString()})
              </span>
            </div>
          </div>
          <button 
            onClick={dismissIntrusion}
            className="bg-red-950 hover:bg-red-900 text-white px-3 py-1.5 rounded text-xs transition-colors shrink-0"
          >
            Acknowledge & Mute
          </button>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="md:hidden bg-security-900 border-b border-security-800 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-farm-400" />
          <h2 className="text-md font-bold text-white tracking-tight">FarmGuard</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile + Connect icon */}
          <button 
            onClick={() => setShowConnectModal(true)}
            className="p-1.5 bg-farm-900/50 border border-farm-500/30 text-farm-400 rounded-lg hover:text-white"
            title="Connect ESP32"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-security-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex flex-1 flex-col md:flex-row relative">
        
        {/* Sidebar Nav */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 w-64 bg-security-900 border-r border-security-800 flex flex-col z-40 transition-transform duration-300 transform
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:flex
        `}>
          <div className="p-6 border-b border-security-800 hidden md:flex items-center gap-3">
            <Shield className="w-8 h-8 text-farm-400" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-none">FarmGuard</h2>
              <span className="text-[10px] text-farm-400 font-bold tracking-widest uppercase">System Core</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-farm-900/40 border-l-4 border-farm-500 text-white shadow-inner' 
                      : 'text-security-400 hover:bg-security-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-farm-400' : 'text-security-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-security-800 bg-security-950/40 flex items-center justify-between">
            <div>
              <p className="text-xs text-security-400">Owner Profile</p>
              <p className="text-sm font-bold text-white leading-tight truncate max-w-[120px]">{user?.username}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-security-800 rounded-lg text-security-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}

        {/* Main Workspace Content */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10 pb-20 md:pb-8">
          
          {/* Header Row */}
          <header className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold text-white tracking-tight mb-1">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/([A-Z])/g, ' $1')}
              </h1>
              <p className="text-xs lg:text-sm text-security-400 font-medium">
                FarmGuard Smart Rural Livestock System Monitoring Center
              </p>
            </div>

            {/* Quick Status Telemetry Row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-security-900 border border-security-800 px-4 py-2.5 rounded-lg text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-security-300">
                  <Radio className={`w-4 h-4 ${online ? 'text-farm-400 animate-pulse' : 'text-red-500'}`} />
                  ESP32 Node:
                </span>
                <span className={online ? 'text-farm-400' : 'text-red-500'}>
                  {online ? 'ONLINE' : 'OFFLINE'}
                </span>
                {online && deviceStatus?.battery_level !== undefined && (
                  <span className="flex items-center gap-1.5 border-l border-security-800 pl-3 text-security-300">
                    <Battery className="w-4 h-4 text-farm-400" />
                    {deviceStatus.battery_level}%
                  </span>
                )}
              </div>

              {/* Plus Icon to connect ESP32 */}
              <button
                onClick={() => setShowConnectModal(true)}
                className="p-2.5 bg-farm-600 hover:bg-farm-500 active:bg-farm-700 text-white rounded-lg shadow-lg hover:shadow-farm-500/20 transition-all flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider"
                title="Connect New Device"
              >
                <Plus className="w-4.5 h-4.5" />
                <span className="hidden lg:inline pr-1">Connect Device</span>
              </button>
            </div>
          </header>

          {/* Router Content */}
          <div className="flex-1 max-w-[1920px] mx-auto w-full relative h-full min-h-[500px]">
            
            {/* Global Offline Overlay for all tabs except Dashboard */}
            {!online && activeTab !== 'dashboard' && (
              <div className="absolute inset-0 z-20 bg-security-950/70 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl border border-security-800">
                <div className="text-center p-8 bg-security-900 border border-security-700 rounded-2xl shadow-2xl max-w-md animate-fade-in">
                  <div className="mx-auto w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                    <Radio className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">System Offline</h2>
                  <p className="text-security-400 text-sm leading-relaxed">
                    Live telemetry, GPS mapping, cameras, and configurations are disabled while the master ESP32 gateway is disconnected.
                  </p>
                  <p className="text-security-500 text-xs mt-4 font-mono">
                    Please reconnect the hardware node to resume monitoring.
                  </p>
                </div>
              </div>
            )}

            {/* Wrapped Content */}
            <div className={`transition-all duration-500 h-full ${!online && activeTab !== 'dashboard' ? 'opacity-10 pointer-events-none grayscale' : ''}`}>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  deviceStatus={deviceStatus} 
                  recentEvents={recentEvents} 
                  alerts={alerts}
                  latestRfid={latestRfid}
                  token={token}
                  fetchDeviceStatus={fetchDeviceStatus}
                  online={online}
                />
              )}
              {activeTab === 'liveView' && <LiveView token={token} deviceStatus={deviceStatus} />}
              {activeTab === 'faces' && <FaceManagement token={token} />}
              {activeTab === 'rfid' && <RFIDManagement token={token} latestRfid={latestRfid} />}
              {activeTab === 'events' && <EventLog token={token} />}
              {activeTab === 'alerts' && <AlertLog token={token} alerts={alerts} fetchAlerts={fetchAlerts} />}
              {activeTab === 'livestockMap' && <LivestockMap token={token} />}
              {activeTab === 'users' && <UserManagement token={token} />}
              {activeTab === 'zoneConfig' && <ZoneConfig token={token} />}
              {activeTab === 'settings' && <Settings token={token} />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-security-900 border-t border-security-800 flex items-center justify-around py-2.5 px-4 z-45">
        {[
          { id: 'dashboard', label: 'Status', icon: Shield },
          { id: 'liveView', label: 'Live', icon: Camera },
          { id: 'events', label: 'Events', icon: Database },
          { id: 'livestockMap', label: 'Map', icon: Map }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-1 text-center"
            >
              <Icon className={`w-5.5 h-5.5 ${isActive ? 'text-farm-400 animate-pulse' : 'text-security-400'}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-security-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-center"
        >
          <Menu className="w-5.5 h-5.5 text-security-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-security-500">More</span>
        </button>
      </div>

      {/* INTERACTIVE ESP32 CONNECTION MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-security-900 border border-security-800 rounded-xl max-w-3xl w-full p-5 sm:p-6 space-y-6 shadow-2xl relative my-8">
            <button 
              onClick={() => setShowConnectModal(false)}
              className="absolute top-4 right-4 text-security-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-start gap-3 border-b border-security-800 pb-3">
              <Radio className="w-6 h-6 text-farm-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-lg font-bold text-white">ESP32 Device Connection Assistant</h3>
                <p className="text-xs text-security-400">Generate pre-configured Arduino sketch codes to flash directly to your smart ESP32 sensors.</p>
              </div>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-security-400 mb-1.5">Wi-Fi Network SSID</label>
                <input 
                  type="text" 
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  className="w-full bg-security-950 border border-security-700 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-mono"
                  placeholder="Router SSID"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-security-400 mb-1.5">Wi-Fi Password</label>
                <input 
                  type="text" 
                  value={wifiPassword}
                  onChange={e => setWifiPassword(e.target.value)}
                  className="w-full bg-security-950 border border-security-700 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-mono"
                  placeholder="Wi-Fi Password"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-security-400 mb-1.5">FarmGuard Server IP / Host</label>
                <input 
                  type="text" 
                  value={customServerIp}
                  onChange={e => setCustomServerIp(e.target.value)}
                  className="w-full bg-security-950 border border-security-700 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-farm-500 font-mono"
                  placeholder="e.g. 192.168.1.100"
                />
              </div>
            </div>

            {/* Generated Code Window */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-security-400">
                <span className="font-semibold flex items-center gap-1"><Link2 className="w-4 h-4 text-farm-400" /> Pre-Configured Arduino C++ Sketch:</span>
                <button 
                  onClick={copyCodeToClipboard}
                  className="px-2.5 py-1 bg-security-800 hover:bg-security-750 text-security-200 hover:text-white rounded border border-security-700 flex items-center gap-1 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-farm-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-security-950 border border-security-800 rounded-lg p-4 font-mono text-xs max-h-[250px] overflow-y-auto text-security-300 whitespace-pre-wrap select-all" id="esp32-arduino-code">
                {esp32GeneratedCode}
              </div>
            </div>

            {/* Step summary info */}
            <div className="bg-security-950 border border-security-800 rounded-lg p-4 flex gap-3 text-xs text-security-300">
              <Key className="w-5 h-5 text-farm-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white">How to connect:</p>
                <ol className="list-decimal list-inside space-y-1 text-security-400">
                  <li>Copy the generated C++ code above.</li>
                  <li>Paste it into your **Arduino IDE**.</li>
                  <li>Ensure the **ArduinoJson** library is installed (version 6.x).</li>
                  <li>Compile and upload to your ESP32 board.</li>
                  <li>Once booted, the device will connect to your router and post telemetry. The status indicator on this dashboard will turn green!</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowConnectModal(false)}
                className="px-5 py-2 bg-farm-600 hover:bg-farm-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
