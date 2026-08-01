import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { API_URL } from '../config';

export default function RFIDManagement({ token, latestRfid }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [uid, setUid] = useState('');
  const [userName, setUserName] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [token]);

  const fetchCards = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rfid`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error('Error fetching RFID cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    const cleanUid = String(uid).replace(/[:\s-]/g, '').toUpperCase();

    try {
      const res = await fetch(`${API_URL}/api/rfid/register`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid: cleanUid, user_name: userName })
      });
      if (res.ok) {
        setShowAddModal(false);
        setUid('');
        setUserName('');
        fetchCards();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to register RFID card.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while registering RFID card.');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this RFID card?')) return;
    try {
      const res = await fetch(`${API_URL}/api/rfid/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchCards();
    } catch (err) {
      console.error('Error deleting RFID card:', err);
    }
  };

  const filteredCards = cards.filter(c => 
    c.uid.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.user_name && c.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 h-full flex flex-col bg-[#050a06] text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">RFID Management</h1>
          <p className="text-gray-400">Register and manage RFID cards for access control.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus size={20} />
          <span>Register New Card</span>
        </button>
      </div>

      {latestRfid && latestRfid.cardId && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-900/60 text-emerald-400 rounded-full">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Scanned Hardware Card Detected</div>
              <div className="text-lg font-bold text-white font-mono">
                Card ID: <span className="text-emerald-300">{latestRfid.cardId}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setUid(latestRfid.cardId);
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={16} /> Register {latestRfid.cardId} Now
          </button>
        </div>
      )}

      <div className="bg-[#121a14] rounded-xl border border-gray-800 shadow-xl flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0a100d]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by UID or Assigned User..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading RFID cards...</div>
          ) : filteredCards.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
              <CreditCard size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300 mb-2">No RFID cards found</h3>
              <p className="text-gray-500 max-w-md">Register an RFID tag to grant physical access.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a241c] text-gray-400 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Card UID</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Registered Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-[#1a241c]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-emerald-400">{card.uid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{card.user_name || 'Unassigned'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        card.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {card.status === 'Active' ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                        {card.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(card.registered_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button className="text-gray-400 hover:text-white transition-colors p-1" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(card.id)}
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
                <CreditCard className="text-emerald-500" size={24} />
                Register RFID Card
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Card UID *</label>
                  <input 
                    type="text" 
                    required
                    value={uid}
                    onChange={e => setUid(e.target.value.toUpperCase())}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. A1:B2:C3:D4"
                  />
                  <p className="text-xs text-gray-500 mt-1">Scan the card to auto-fill or enter manually.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Assign to User</label>
                  <input 
                    type="text" 
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full bg-[#1a241c] border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. John Doe (Optional)"
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
                  {registering ? 'Registering...' : 'Save RFID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
