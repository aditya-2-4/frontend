import React, { useState } from 'react';
import { 
  Shield, ShieldOff, Battery, Wifi, Clock, AlertTriangle, CheckCircle, 
  ArrowRight, Radio, BellRing, Smartphone, Play, CreditCard
} from 'lucide-react';
import { API_URL } from '../config';


export default function Dashboard({ deviceStatus, recentEvents, alerts, latestRfid, token, fetchDeviceStatus, online }) {
  const [toggleLoading, setToggleLoading] = useState(false);

  const handleArmToggle = async () => {
    if (toggleLoading || !deviceStatus) return;
    setToggleLoading(true);
    try {
      const nextState = deviceStatus.is_armed === 1 ? false : true;
      const res = await fetch(`${API_URL}/api/device/arm-toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_armed: nextState })
      });
      if (res.ok) {
        await fetchDeviceStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggleLoading(false);
    }
  };

  const getBatteryColor = (level) => {
    if (level > 50) return 'text-farm-400';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500 animate-pulse';
  };

  const formatTime = (ts) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Overview Status Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Arm State Card */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-security-400">System State</span>
            {online && deviceStatus?.is_armed === 1 ? (
              <Shield className="w-6 h-6 text-farm-400" />
            ) : (
              <ShieldOff className="w-6 h-6 text-security-500" />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {online && deviceStatus?.is_armed === 1 ? 'Armed' : 'Disarmed'}
            </h3>
            <button
              onClick={handleArmToggle}
              disabled={toggleLoading || !online}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
                !online 
                  ? 'bg-security-800 text-security-500 cursor-not-allowed border border-security-800'
                  : deviceStatus?.is_armed === 1 
                  ? 'bg-farm-600 hover:bg-farm-500 active:bg-farm-700 text-white' 
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white'
              }`}
            >
              {!online ? 'Device Offline' : toggleLoading ? 'Updating...' : (deviceStatus?.is_armed === 1 ? 'Device Armed' : 'Device Disarmed')}
            </button>
          </div>
        </div>

        {/* Battery Level Card */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-security-400">Battery Status</span>
            <Battery className={`w-6 h-6 ${online ? getBatteryColor(deviceStatus?.battery_level || 0) : 'text-security-600'}`} />
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white mb-1">
              {online && deviceStatus?.battery_level !== undefined ? `${deviceStatus.battery_level}%` : 'N/A'}
            </h3>
            <div className="w-full bg-security-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  !online ? 'bg-security-700' : (deviceStatus?.battery_level || 0) <= 20 ? 'bg-red-500 animate-pulse' : 'bg-farm-500'
                }`}
                style={{ width: `${online ? (deviceStatus?.battery_level || 0) : 0}%` }}
              ></div>
            </div>
            <p className={`text-[10px] mt-2 font-medium ${online && (deviceStatus?.battery_level || 0) <= 20 ? 'text-red-400 font-extrabold animate-pulse' : 'text-security-400'}`}>
              {online ? ((deviceStatus?.battery_level || 0) <= 20 ? '⚠️ CHARGE THE BATTERY (Discharged)' : '14.8V Battery System (Active)') : 'Device disconnected'}
            </p>
          </div>
        </div>

        {/* Connection Quality Card */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-security-400">Signal Status</span>
            <Wifi className={`w-6 h-6 ${online ? 'text-farm-400' : 'text-security-600'}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {online && deviceStatus?.signal_strength ? `${deviceStatus.signal_strength} / 5 Bars` : 'No Signal'}
            </h3>
            <div className="flex gap-1 items-end h-4 mt-2">
              {[1, 2, 3, 4, 5].map(bar => (
                <div 
                  key={bar} 
                  className={`w-1.5 rounded-t transition-all ${
                    online && bar <= (deviceStatus?.signal_strength || 0)
                      ? 'bg-farm-400' 
                      : 'bg-security-800'
                  }`}
                  style={{ height: `${bar * 20}%` }}
                ></div>
              ))}
            </div>
            <p className="text-[10px] text-security-400 mt-2 font-medium">
              {online ? 'GSM SIM online (AT&T Farmnet)' : 'Offline'}
            </p>
          </div>
        </div>

        {/* RFID Scanner Status Card — Rendered whenever an RFID scan exists */}
        {latestRfid && latestRfid.cardId && (
          <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-security-400">Latest RFID Scan</span>
              <CreditCard className={`w-5 h-5 ${latestRfid.match ? 'text-farm-400' : 'text-red-500'}`} />
            </div>
            <div>
              <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                latestRfid.match ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}>
                <div className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${latestRfid.match ? 'bg-emerald-400' : 'bg-red-400'} animate-ping`}></span>
                  <span>{latestRfid.match ? '✅ PERMISSION GRANTED' : '❌ ACCESS DENIED'}</span>
                </div>
                <div className="text-base font-extrabold text-white truncate">
                  {latestRfid.name || (latestRfid.match ? 'Authorized User' : 'Unknown Card')}
                </div>
                <div className="text-xs font-mono text-gray-400">
                  Card ID: <span className="font-bold text-white">{latestRfid.cardId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Strict Offline/Disarmed Masking for Data Panels */}
      <div className="relative">
        {(!online || deviceStatus?.is_armed !== 1) && (
          <div className="absolute inset-0 z-10 bg-security-950/70 backdrop-blur-[6px] rounded-2xl flex flex-col items-center justify-center border border-security-800">
            <div className="bg-security-900 border border-security-700 p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              {!online ? (
                <>
                  <Radio className="w-10 h-10 text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Telemetry Offline</h3>
                  <p className="text-xs text-security-400">All data widgets, charts, and activity logs are strictly disabled until the ESP32 gateway reconnects.</p>
                </>
              ) : (
                <>
                  <ShieldOff className="w-10 h-10 text-yellow-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">System Disarmed</h3>
                  <p className="text-xs text-security-400">Live data tracking and telemetry are hidden while the system is disarmed.</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className={`transition-all ${(!online || deviceStatus?.is_armed !== 1) ? 'opacity-30 pointer-events-none select-none filter grayscale' : ''}`}>
          {/* Grid of recent Event Logs & Alerts logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Security Activity Panel */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-security-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-farm-400" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-xs text-farm-400 font-semibold">Live updates</span>
          </div>

          <div className="space-y-4">
            {recentEvents.slice(0, 4).map(event => (
              <div 
                key={event.id}
                className={`p-4 rounded-lg flex items-center justify-between border ${
                  event.detection_type === 'Human Detected' && event.is_recognized === 0
                    ? 'bg-red-950/20 border-red-500/30'
                    : 'bg-security-950/60 border-security-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${
                    event.detection_type === 'Human Detected' && event.is_recognized === 0
                      ? 'bg-red-900/40 text-red-400'
                      : event.detection_type === 'Recognized Owner'
                      ? 'bg-farm-900/40 text-farm-400'
                      : 'bg-security-800 text-security-400'
                  }`}>
                    {event.detection_type === 'Human Detected' && event.is_recognized === 0 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{event.detection_type}</p>
                    <p className="text-xs text-security-400 mt-0.5">Zone: {event.zone_name} • {formatTime(event.timestamp)}</p>
                  </div>
                </div>

                {event.media_path && (
                  <div className="w-12 h-12 bg-security-900 border border-security-800 rounded overflow-hidden relative shrink-0">
                    <img 
                      src={`${API_URL}${event.media_path}`} 
                      alt="event thumbnail" 

                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-[9px] font-bold text-white">
                      VIEW
                    </div>
                  </div>
                )}
              </div>
            ))}
            {recentEvents.length === 0 && (
              <div className="text-center py-10 text-security-500 text-sm">No recent events logged.</div>
            )}
          </div>
        </div>

        {/* Recent SMS Alerts Sent Panel */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-security-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-farm-400" />
              <span>Dispatched SMS & Push Alerts</span>
            </h3>
            <span className="text-xs text-security-400">Logs database</span>
          </div>

          <div className="space-y-4">
            {alerts.slice(0, 4).map(alert => (
              <div 
                key={alert.id}
                className="p-4 bg-security-950/60 border border-security-850 rounded-lg flex items-start justify-between"
              >
                <div className="flex gap-3">
                  <div className="p-2.5 bg-security-800 text-security-400 rounded-full">
                    {alert.type === 'SMS' ? (
                      <Smartphone className="w-5 h-5 text-farm-400" />
                    ) : (
                      <BellRing className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-security-400 uppercase bg-security-800 px-2 py-0.5 rounded mr-2">
                      {alert.type}
                    </span>
                    <span className="text-xs text-security-400">{formatTime(alert.timestamp)}</span>
                    <p className="text-sm font-semibold text-security-200 mt-2">{alert.message}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  alert.status === 'Delivered' 
                    ? 'bg-farm-900/60 text-farm-300 border border-farm-800/40' 
                    : 'bg-yellow-950/40 text-yellow-300 border border-yellow-800/30'
                }`}>
                  {alert.status}
                </span>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-10 text-security-500 text-sm">No alerts sent recently.</div>
            )}
          </div>
        </div>

          </div>
        </div>
      </div>
    </div>
  );
}
