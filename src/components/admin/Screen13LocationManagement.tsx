import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Building2, 
  Users, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  ChevronRight, 
  ArrowLeft,
  Clock,
  Check
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { queueStore, AppState } from '../../services/store';

interface Screen13LocationManagementProps {
  appState: AppState;
}

export const Screen13LocationManagement: React.FC<Screen13LocationManagementProps> = ({ appState }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocSubtitle, setNewLocSubtitle] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLocId, setEditLocId] = useState('');
  const [editLocName, setEditLocName] = useState('');
  const [editLocSubtitle, setEditLocSubtitle] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocCity, setEditLocCity] = useState('');


  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const locations = appState.locations.filter(l => l.orgId === currentOrg.id);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.getLocations();
      queueStore.setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (locId: string, currentStatus: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const newStatus = currentStatus === 'ACTIVE' || currentStatus === 'Active' ? 'INACTIVE' : 'ACTIVE';
      await adminApi.updateLocationStatus(locId, newStatus);
      await fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to update location status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName) return;

    try {
      setIsLoading(true);
      setError(null);
      await adminApi.createLocation({
        orgId: currentOrg.id,
        name: newLocName,
        subtitle: newLocSubtitle || 'Branch Location',
        address: newLocAddress || '100 Metro Blvd',
        city: newLocCity || 'Metro City',
        operatingHours: '09:00 AM - 05:00 PM',
        isHq: false
      } as any);
      
      await fetchLocations();
      setNewLocName('');
      setNewLocSubtitle('');
      setNewLocAddress('');
      setNewLocCity('');
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (loc: any) => {
    setEditLocId(loc.id);
    setEditLocName(loc.name);
    setEditLocSubtitle(loc.subtitle || '');
    setEditLocAddress(loc.address || '');
    setEditLocCity(loc.city || '');
    setShowEditModal(true);
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLocName || !editLocId) return;

    try {
      setIsLoading(true);
      setError(null);
      await adminApi.updateLocation(editLocId, {
        name: editLocName,
        subtitle: editLocSubtitle,
        address: editLocAddress,
        city: editLocCity,
        operatingHours: '09:00 AM - 05:00 PM',
        isHq: false
      } as any);
      
      await fetchLocations();
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update location');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            {currentOrg.name} (Org) &gt; Locations
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Location Configuration
          </h1>
          <p className="text-xs text-slate-500">
            Manage physical branches, assigned desk capacities, and operational status.
          </p>
        </div>

        <button
          id="add-location-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00ACC1]/25 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Location</span>
        </button>
      </div>

      {/* Locations List */}
      {error && <div className="text-red-500 font-bold p-3 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {locations.map((loc) => {
          const isActive = loc.status === 'ACTIVE' || loc.status === 'Active';
          return (
            <div
              key={loc.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-[#00ACC1] transition-all"
            >
              <div>
                {/* Title & Status Pill */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center font-bold text-sm border border-slate-200">
                      <MapPin className="w-5 h-5 text-[#00ACC1]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{loc.name}</h3>
                      <p className="text-xs text-slate-500">{loc.subtitle}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {loc.status}
                  </span>
                </div>

                {/* Address & Hours */}
                <div className="text-xs text-slate-600 mb-4 space-y-1">
                  <div>{loc.address}</div>
                  <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{loc.operatingHours}</span>
                  </div>
                </div>

                {/* Capacity & Staff Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-3.5 rounded-2xl border border-slate-200 mb-4">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Active Services</div>
                    <div className="text-sm font-bold text-[#0F172A]">{loc.activeServicesCount} services</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Staff Assigned</div>
                    <div className="text-sm font-bold text-[#0F172A]">{loc.staffAssignedCount} operators</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(loc)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-[#F1F5F9] rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => handleToggleStatus(loc.id, loc.status)}
                    className={`px-3 py-1.5 text-xs font-bold ${isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'} rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50`}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    queueStore.selectLocation(loc.id);
                    queueStore.setScreen('SCREEN_14_SERVICE_QUEUE_CONFIG');
                  }}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Manage Services</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#00ACC1]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <h2 className="text-lg font-black text-[#0F172A] mb-1">Add New Location Branch</h2>
            <p className="text-xs text-slate-500 mb-4">Create an operational location to host service queues.</p>

            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Location Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Westside Branch" 
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Subtitle / Descriptor</label>
                <input 
                  type="text" 
                  placeholder="e.g. Financial Center" 
                  value={newLocSubtitle}
                  onChange={(e) => setNewLocSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 500 West Ave" 
                    value={newLocAddress}
                    onChange={(e) => setNewLocAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">City</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Metro City" 
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <h2 className="text-lg font-black text-[#0F172A] mb-1">Edit Location</h2>
            <p className="text-xs text-slate-500 mb-4">Update location details.</p>

            <form onSubmit={handleUpdateLocation} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Location Name</label>
                <input 
                  type="text" 
                  required
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Subtitle / Descriptor</label>
                <input 
                  type="text" 
                  value={editLocSubtitle}
                  onChange={(e) => setEditLocSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Address</label>
                  <input 
                    type="text" 
                    value={editLocAddress}
                    onChange={(e) => setEditLocAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">City</label>
                  <input 
                    type="text" 
                    value={editLocCity}
                    onChange={(e) => setEditLocCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
