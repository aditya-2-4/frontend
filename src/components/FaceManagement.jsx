import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, XCircle, Camera } from 'lucide-react';
import { API_URL } from '../config';

export default function FaceManagement({ token }) {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [faceEncodingId, setFaceEncodingId] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetchFaces();
  }, [token]);

  const fetchFaces = async () => {
    try {
      let list = [];
      try {
        const res = await fetch(`${API_URL}/api/faces`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : (data.people || []);
        }
      } catch (e) {}

      // Merge with /api/faces/list to ensure portal-enrolled faces are displayed
      try {
        const listRes = await fetch(`${API_URL}/api/faces/list?api_key=secure_esp32_device_shared_api_key_2026`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const enrolledPeople = listData.people || [];
          const existingNames = new Set(list.map(f => f.name));

          enrolledPeople.forEach(p => {
            if (p && p.name && !existingNames.has(p.name)) {
              list.push({
                id: p.name,
                name: p.name,
                employee_id: 'ENROLLED',
                department: 'Face Portal',
                face_encoding_id: `${(p.images || []).length} Samples`,
                status: 'Active',
                registered_at: new Date().toISOString()
              });
            }
          });
        }
      } catch (e) {}

      setFaces(list);
    } catch (err) {
      console.error('Error fetching faces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/faces/register`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, employee_id: employeeId, department, face_encoding_id: faceEncodingId })
      });
      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setEmployeeId('');
        setDepartment('');
        setFaceEncodingId('');
        fetchFaces();
      } else {
        alert('Failed to register face. Employee ID must be unique.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this face? This will remove access immediately.')) return;
    try {
      const res = await fetch(`${API_URL}/api/faces/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchFaces();
    } catch (err) {
      console.error('Error deleting face:', err);
    }
  };

  const filteredFaces = faces.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.employee_id && f.employee_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 h-full flex flex-col bg-[#050a06] text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Face Management</h1>
          <p className="text-gray-400">Register and manage authorized personnel faces.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus size={20} />
          <span>Register New Face</span>
        </button>
      </div>

      <div className="bg-[#121a14] rounded-xl border border-gray-800 shadow-xl flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0a100d]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or employee ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading faces...</div>
          ) : filteredFaces.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
              <Camera size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300 mb-2">No faces found</h3>
              <p className="text-gray-500 max-w-md">Register your first face to enable ESP32 biometric recognition.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a241c] text-gray-400 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Emp ID</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">ESP32 ID</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredFaces.map((face) => (
                  <tr key={face.id} className="hover:bg-[#1a241c]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{face.name}</div>
                      <div className="text-xs text-gray-500">Registered {new Date(face.registered_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{face.employee_id || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">{face.department || '-'}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400">{face.face_encoding_id || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        face.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {face.status === 'Active' ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                        {face.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button className="text-gray-400 hover:text-white transition-colors p-1" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(face.name || face.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121a14] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-800 bg-[#0a100d] flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="text-emerald-500" size={24} />
                Register New Face
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. EMP-1024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">ESP32 Face ID (1-N)</label>
                  <input 
                    type="number" 
                    value={faceEncodingId}
                    onChange={e => setFaceEncodingId(e.target.value)}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="Optional: Maps to ESP32 internal ID"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={registering}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-bold disabled:opacity-50"
                >
                  {registering ? 'Registering...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
