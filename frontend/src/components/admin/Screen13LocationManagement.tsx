import React, { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { queueStore, AppState } from '../../services/store';
import { AuthGuard } from '../common/AuthGuard';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen13LocationManagementProps {
  appState: AppState;
}

const ScheduleEditor = ({ schedules, onChange }: { schedules: any[]; onChange: (s: any[]) => void }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (dayIndex: number) => {
    const existing = schedules.find(s => s.dayOfWeek === dayIndex + 1);
    if (existing) {
      onChange(schedules.filter(s => s.dayOfWeek !== dayIndex + 1));
    } else {
      onChange([...schedules, { dayOfWeek: dayIndex + 1, openTime: '09:00:00', closeTime: '17:00:00' }]);
    }
  };

  const updateTime = (dayIndex: number, field: 'openTime' | 'closeTime', val: string) => {
    if (val.length === 5) val = val + ':00'; // Append seconds for API
    onChange(schedules.map(s => s.dayOfWeek === dayIndex + 1 ? { ...s, [field]: val } : s));
  };

  return (
    <div className="space-y-2 border border-[#e6e5e0] p-3 rounded-md bg-[#fafaf7] mt-3">
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#73726c] mb-2 font-medium">Operating Schedule</div>
      {days.map((day, i) => {
        const s = schedules.find(sch => sch.dayOfWeek === i + 1);
        return (
          <div key={day} className="flex items-center justify-between text-xs py-1.5 border-b border-[#e6e5e0] last:border-0">
            <div className="flex items-center gap-3 w-28">
              <input 
                type="checkbox" 
                checked={!!s} 
                onChange={() => toggleDay(i)} 
                className="w-3.5 h-3.5 rounded border-[#cfcdc4] bg-white text-[#f54e00] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
              />
              <span className={s ? 'font-medium text-[#26251e]' : 'text-[#8c8b85]'}>{day}</span>
            </div>
            {s ? (
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={s.openTime.slice(0,5)} 
                  onChange={e => updateTime(i, 'openTime', e.target.value)} 
                  className="px-2 py-1 bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-xs focus:outline-none focus:border-[#26251e] font-mono" 
                />
                <span className="text-[#8c8b85] text-[10px] uppercase font-mono">to</span>
                <input 
                  type="time" 
                  value={s.closeTime.slice(0,5)} 
                  onChange={e => updateTime(i, 'closeTime', e.target.value)} 
                  className="px-2 py-1 bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-xs focus:outline-none focus:border-[#26251e] font-mono" 
                />
              </div>
            ) : (
              <span className="text-[#8c8b85] italic text-[11px] font-serif">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Screen13LocationManagement: React.FC<Screen13LocationManagementProps> = ({ appState }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocSubtitle, setNewLocSubtitle] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocTimezone, setNewLocTimezone] = useState('UTC');
  const [newLocEnforce, setNewLocEnforce] = useState(false);
  const [newLocSchedules, setNewLocSchedules] = useState<any[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLocId, setEditLocId] = useState('');
  const [editLocName, setEditLocName] = useState('');
  const [editLocSubtitle, setEditLocSubtitle] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocCity, setEditLocCity] = useState('');
  const [editLocTimezone, setEditLocTimezone] = useState('UTC');
  const [editLocEnforce, setEditLocEnforce] = useState(false);
  const [editLocSchedules, setEditLocSchedules] = useState<any[]>([]);

  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const locations = appState.locations.filter(l => l.orgId === currentOrg?.id);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    // Only fetch if authenticated
    if (appState.authStatus === 'AUTHENTICATED' || appState.authStatus === 'AUTH_READY') {
      fetchLocations();
    }
  }, [appState.authStatus]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!currentOrg?.id) return;
      const data = await adminApi.getLocations(currentOrg.id);
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
        isHq: false,
        timezone: newLocTimezone,
        enforceSchedule: newLocEnforce,
        schedules: newLocSchedules
      } as any);

      await fetchLocations();
      setNewLocName('');
      setNewLocSubtitle('');
      setNewLocAddress('');
      setNewLocCity('');
      setNewLocTimezone('UTC');
      setNewLocEnforce(false);
      setNewLocSchedules([]);
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
    setEditLocTimezone(loc.timezone || 'UTC');
    setEditLocEnforce(loc.enforceSchedule || false);
    setEditLocSchedules(loc.schedules || []);
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
        isHq: false,
        timezone: editLocTimezone,
        enforceSchedule: editLocEnforce,
        schedules: editLocSchedules
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
    <AuthGuard appState={appState}>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-[#f7f7f4] min-h-screen text-[#26251e] font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#e6e5e0]">
          <div>
            <div className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#f54e00] mb-1">
              {currentOrg?.name || 'Organization'} / Locations
            </div>
            <h1 className="text-2xl md:text-3xl font-normal font-display text-[#26251e] tracking-tight">
              Location Management
            </h1>
            <p className="text-xs text-[#73726c] mt-1">
              Configure branch settings, operating schedules, and local service availability.
            </p>
          </div>

          <Button
            id="add-location-btn"
            onClick={() => setShowAddModal(true)}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            <span>Add Location</span>
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-mono">
            {error}
          </div>
        )}

        {/* Locations List */}
        <div className="grid grid-cols-1 gap-4">
          {locations.map((loc) => {
            const isActive = loc.status === 'ACTIVE' || loc.status === 'Active';
            return (
              <Card
                key={loc.id}
                className="p-5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-[#cfcdc4] transition-colors"
              >
                {/* Info Section */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-[#fafaf7] flex items-center justify-center border border-[#e6e5e0] rounded-md shrink-0">
                    <Icon icon="lucide:map-pin" className="w-4 h-4 text-[#f54e00]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-medium text-[#26251e]">{loc.name}</h3>
                      <Badge variant={isActive ? 'mint' : 'outline'} className="text-[9px] font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-[#2e7d32]' : 'bg-[#8c8b85]'}`} />
                        {loc.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#73726c] mb-2">{loc.subtitle}</div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#8c8b85]">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="lucide:building-2" className="w-3.5 h-3.5" />
                        <span>{loc.address}, {loc.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon icon="lucide:clock" className="w-3.5 h-3.5" />
                        <span>{loc.timezone} {loc.enforceSchedule ? '(Enforced)' : '(Open)'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 border-l border-[#e6e5e0] pl-6 py-2 hidden md:flex">
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-[#8c8b85] uppercase mb-0.5">Services</div>
                    <div className="text-sm font-mono font-medium text-[#26251e]">{loc.activeServicesCount || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-[#8c8b85] uppercase mb-0.5">Staff</div>
                    <div className="text-sm font-mono font-medium text-[#26251e]">{loc.staffAssignedCount || 0}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-[#e6e5e0]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(loc)}
                    className="flex items-center gap-1.5"
                  >
                    <Icon icon="lucide:edit-3" className="w-3.5 h-3.5 text-[#73726c]" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleToggleStatus(loc.id, loc.status)}
                    className={isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      queueStore.selectLocation(loc.id);
                      queueStore.setScreen('SCREEN_14_SERVICE_QUEUE_CONFIG');
                    }}
                    className="flex items-center gap-1.5 ml-auto md:ml-0"
                  >
                    <span>Configure</span>
                    <Icon icon="lucide:chevron-right" className="w-3.5 h-3.5 text-[#f54e00]" />
                  </Button>
                </div>
              </Card>
            );
          })}
          
          {locations.length === 0 && !isLoading && (
            <Card className="text-center py-16">
              <Icon icon="lucide:map-pin" className="w-8 h-8 text-[#8c8b85] mx-auto mb-3" />
              <div className="text-sm font-medium text-[#26251e] mb-1">No locations found</div>
              <div className="text-xs text-[#73726c]">Add a new location to start managing queues.</div>
            </Card>
          )}
        </div>

        {/* Add Location Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <Card className="p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <h2 className="text-lg font-normal font-display text-[#26251e] mb-1 tracking-tight">Add New Location</h2>
              <p className="text-xs text-[#73726c] mb-6 border-b border-[#e6e5e0] pb-4">Create an operational branch location.</p>

              <form onSubmit={handleAddLocation} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Location Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Westside Branch"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Subtitle / Descriptor</label>
                  <Input
                    type="text"
                    placeholder="e.g. Financial Center"
                    value={newLocSubtitle}
                    onChange={(e) => setNewLocSubtitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Address</label>
                    <Input
                      type="text"
                      placeholder="e.g. 500 West Ave"
                      value={newLocAddress}
                      onChange={(e) => setNewLocAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">City</label>
                    <Input
                      type="text"
                      placeholder="e.g. Metro City"
                      value={newLocCity}
                      onChange={(e) => setNewLocCity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Timezone</label>
                  <select
                    value={newLocTimezone}
                    onChange={(e) => setNewLocTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#cfcdc4] rounded-md text-sm text-[#26251e] focus:outline-none focus:border-[#26251e]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/Denver">America/Denver</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="enforceSchedule"
                      checked={newLocEnforce}
                      onChange={(e) => setNewLocEnforce(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#cfcdc4] bg-white text-[#f54e00] focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <div className="text-xs font-medium text-[#26251e]">Enforce Operating Schedule</div>
                      <div className="text-[10px] text-[#73726c] mt-0.5">Blocks customers from joining queues when location is closed.</div>
                    </div>
                  </label>
                </div>

                {newLocEnforce && <ScheduleEditor schedules={newLocSchedules} onChange={setNewLocSchedules} />}
                
                <div className="flex gap-3 pt-6 border-t border-[#e6e5e0] mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Creating...' : 'Create Location'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Edit Location Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <Card className="p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <h2 className="text-lg font-normal font-display text-[#26251e] mb-1 tracking-tight">Edit Location</h2>
              <p className="text-xs text-[#73726c] mb-6 border-b border-[#e6e5e0] pb-4">Update location configuration and schedule.</p>

              <form onSubmit={handleUpdateLocation} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Location Name *</label>
                  <Input
                    type="text"
                    required
                    value={editLocName}
                    onChange={(e) => setEditLocName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Subtitle / Descriptor</label>
                  <Input
                    type="text"
                    value={editLocSubtitle}
                    onChange={(e) => setEditLocSubtitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Address</label>
                    <Input
                      type="text"
                      value={editLocAddress}
                      onChange={(e) => setEditLocAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">City</label>
                    <Input
                      type="text"
                      value={editLocCity}
                      onChange={(e) => setEditLocCity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#73726c] block mb-1.5">Timezone</label>
                  <select
                    value={editLocTimezone}
                    onChange={(e) => setEditLocTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#cfcdc4] rounded-md text-sm text-[#26251e] focus:outline-none focus:border-[#26251e]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/Denver">America/Denver</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="editEnforceSchedule"
                      checked={editLocEnforce}
                      onChange={(e) => setEditLocEnforce(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#cfcdc4] bg-white text-[#f54e00] focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <div className="text-xs font-medium text-[#26251e]">Enforce Operating Schedule</div>
                      <div className="text-[10px] text-[#73726c] mt-0.5">Blocks customers from joining queues when location is closed.</div>
                    </div>
                  </label>
                </div>

                {editLocEnforce && <ScheduleEditor schedules={editLocSchedules} onChange={setEditLocSchedules} />}

                <div className="flex gap-3 pt-6 border-t border-[#e6e5e0] mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};
