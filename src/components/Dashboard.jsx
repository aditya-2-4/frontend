import React, { useState } from 'react';
import { 
  Shield, ShieldOff, Battery, Wifi, Clock, AlertTriangle, CheckCircle, 
  ArrowRight, Radio, BellRing, Smartphone, Play, CreditCard, UserCheck
} from 'lucide-react';
import { API_URL } from '../config';


export default function Dashboard({ unlockStatus, deviceStatus, recentEvents, alerts, latestRfid, token, fetchDeviceStatus, online }) {
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

  const latestOwnerEvent = recentEvents?.find(e => 
    e.detection_type === 'Recognized Owner' || 
    e.detection_type === 'Face Recognized' || 
    e.is_recognized === 1 ||
    (e.person_name && e.person_name !== 'Visitor' && e.person_name !== 'Unknown')
  );

  return (
    <div className="space-y-8">
      {/* Top FarmGuard Security Dashboard Header Banner Card with Large Arm/Disarm Button */}
      <div className="bg-security-900 border border-security-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black text-lg shadow-md font-mono shrink-0">
              FG
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                FarmGuard Security Dashboard
              </h2>
              <p className="text-xs text-security-400 font-medium hidden sm:block">
                Real-time livestock security monitoring & intrusion control panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wider flex items-center gap-2 border ${
              online 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : 'bg-red-950/80 border-red-500/50 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`}></span>
              {online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="border-t border-security-800 pt-4">
          <div className="bg-security-950/90 border border-security-800 p-3 sm:p-4 rounded-xl shadow-inner">
            <button
              onClick={handleArmToggle}
              disabled={toggleLoading || !online}
              className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl ${
                !online
                  ? 'bg-security-800 text-security-500 cursor-not-allowed border border-security-700'
                  : toggleLoading
                  ? 'bg-emerald-700 text-white cursor-wait opacity-80 animate-pulse border border-emerald-500'
                  : deviceStatus?.is_armed === 1
                  ? 'bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] cursor-pointer border border-emerald-400/40'
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)] cursor-pointer border border-red-400/40'
              }`}
            >
              {!online ? (
                <>
                  <ShieldOff className="w-6 h-6" />
                  <span>DEVICE OFFLINE</span>
                </>
              ) : toggleLoading ? (
                <>
                  <Shield className="w-6 h-6 animate-spin" />
                  <span>UPDATING SYSTEM STATE...</span>
                </>
              ) : deviceStatus?.is_armed === 1 ? (
                <>
                  <Shield className="w-6 h-6 fill-white/20" />
                  <span>🛡 SYSTEM ARMED (CLICK TO DISARM)</span>
                </>
              ) : (
                <>
                  <ShieldOff className="w-6 h-6" />
                  <span>🛡 SYSTEM DISARMED (CLICK TO ARM)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
              {!online ? 'Device Offline' : toggleLoading ? 'Updating...' : (deviceStatus?.is_armed === 1 ? 'Disarm System' : 'Arm System')}
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

        {/* Last Heartbeat Status Card - Exact match to design */}
        <div className="bg-security-900 border border-security-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-security-400">LAST HEARTBEAT</span>
            <Clock className={`w-6 h-6 ${online ? 'text-farm-400' : 'text-red-500'}`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1 truncate">
              {!online 
                ? 'Never' 
                : (deviceStatus?.last_heartbeat 
                    ? new Date(deviceStatus.last_heartbeat).toLocaleTimeString() 
                    : (deviceStatus?.lastHeartbeat ? new Date(deviceStatus.lastHeartbeat).toLocaleTimeString() : 'Active'))}
            </h3>
            <p className="text-xs text-security-400 mb-3">
              {!online ? 'Heartbeat disabled (Disarmed/Offline)' : 'ESP32 Heartbeat active (10s interval)'}
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-farm-400 animate-pulse' : 'bg-red-500'}`}></span>
              <span className={`text-xs font-bold ${online ? 'text-farm-400' : 'text-red-500'}`}>
                {online ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Live Active Access Scan Cards Container (ONLY VISIBLE WHEN DEVICE IS ONLINE) */}
      {online && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Face Recognition Unlock Status Timer */}
          {((unlockStatus?.face?.granted && unlockStatus?.face?.expiresAt && new Date(unlockStatus.face.expiresAt).getTime() > Date.now()) || (latestOwnerEvent && (Date.now() - new Date(latestOwnerEvent.timestamp).getTime() <= 600000))) && (
            <div className={\ border rounded-xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300}>
              <div className="flex items-center justify-between mb-3">
                <span className={	ext-xs font-semibold uppercase tracking-wider \}>Latest Face Recognized</span>
                <UserCheck className={w-5 h-5 \} />
              </div>
              <div>
                <div className={p-4 rounded-xl border flex flex-col gap-1.5 \}>
                  <div className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                    <span className={w-2.5 h-2.5 rounded-full \}></span>
                    <span>{unlockStatus?.face?.granted || latestOwnerEvent?.is_recognized !== 0 ? 'PERMISSION GRANTED' : 'UNRECOGNIZED ENTITY'}</span>
                  </div>
                  <div className="text-base font-extrabold text-white truncate">
                    {unlockStatus?.face?.granted ? (unlockStatus.face.name || "Authorized User") : (latestOwnerEvent?.person_name || 'Owner')}
                  </div>
                  <div className="text-xs font-mono text-gray-400 flex items-center justify-between">
                    <span>Active Face Unlock (10m)</span>
                    {unlockStatus?.face?.expiresAt && (
                      <span className="text-[10px] text-emerald-400">Expires: {new Date(unlockStatus.face.expiresAt).toLocaleTimeString()}</span>
                    )}
                    {!unlockStatus?.face?.expiresAt && latestOwnerEvent?.timestamp && (
                      <span className="text-[10px] text-security-500">{new Date(latestOwnerEvent.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 2. RFID Unlock Status Timer */}
          {((unlockStatus?.rfid?.granted && unlockStatus?.rfid?.expiresAt && new Date(unlockStatus.rfid.expiresAt).getTime() > Date.now()) || (latestRfid && (Date.now() - new Date(latestRfid.timestamp).getTime() <= 600000))) && (
            <div className={\ border rounded-xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300}>
              <div className="flex items-center justify-between mb-3">
                <span className={	ext-xs font-semibold uppercase tracking-wider \}>Latest RFID Scan</span>
                <CreditCard className={w-5 h-5 \} />
              </div>
              <div>
                <div className={p-4 rounded-xl border flex flex-col gap-1.5 \}>
                  <div className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-2">
                    <span className={w-2.5 h-2.5 rounded-full \}></span>
                    <span>{unlockStatus?.rfid?.granted || latestRfid?.match ? 'PERMISSION GRANTED' : 'ACCESS DENIED'}</span>
                  </div>
                  <div className="text-base font-extrabold text-white truncate">
                    {unlockStatus?.rfid?.granted ? (unlockStatus.rfid.name || "Authorized User") : (latestRfid?.name || (latestRfid?.match ? 'Owner' : 'Unknown Card'))}
                  </div>
                  <div className="text-xs font-mono text-gray-400 flex items-center justify-between">
                    <span>Active RFID Unlock (10m)</span>
                    {unlockStatus?.rfid?.expiresAt && (
                      <span className="text-[10px] text-emerald-400">Expires: {new Date(unlockStatus.rfid.expiresAt).toLocaleTimeString()}</span>
                    )}
                    {!unlockStatus?.rfid?.expiresAt && latestRfid?.timestamp && (
                      <span className="text-[10px] text-security-500">{new Date(latestRfid.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


