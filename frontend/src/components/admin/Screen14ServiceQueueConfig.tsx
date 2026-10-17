import React, { useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { queueStore, AppState } from '../../services/store';
import { PreparationRequirement, AnnouncementTemplate } from '../../types';
import { AuthGuard } from '../common/AuthGuard';
import { Icon } from '../common/Icon';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface Screen14ServiceQueueConfigProps {
  appState: AppState;
}

export const Screen14ServiceQueueConfig: React.FC<Screen14ServiceQueueConfigProps> = ({ appState }) => {
  const currentOrg = appState.tenants.find(t => t.id === appState.selectedOrgId) || appState.tenants[0];
  const currentLocation = appState.locations.find(l => l.id === appState.selectedLocationId) || appState.locations[0];

  const orgRules = appState.globalRules[currentOrg.id] || {
    autoPauseAtCapacity: true,
    capacityThresholdPercent: 90,
    maxWaitThresholdMins: 45,
  };

  const [autoPause, setAutoPause] = useState(orgRules.autoPauseAtCapacity);
  const [threshold, setThreshold] = useState(orgRules.capacityThresholdPercent);
  const [maxWait, setMaxWait] = useState(orgRules.maxWaitThresholdMins);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editServiceId, setEditServiceId] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editServiceIcon, setEditServiceIcon] = useState('FileText');
  const [editServiceFastTrack, setEditServiceFastTrack] = useState(false);
  const [editServicePrep, setEditServicePrep] = useState('');

  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);
  const [createServiceName, setCreateServiceName] = useState('');
  const [createServiceDesc, setCreateServiceDesc] = useState('');
  const [createServiceIcon, setCreateServiceIcon] = useState('FileText');
  const [createServiceFastTrack, setCreateServiceFastTrack] = useState(false);
  const [createServicePrep, setCreateServicePrep] = useState('');

  const [showCreateQueueModal, setShowCreateQueueModal] = useState(false);
  const [createQueueServiceId, setCreateQueueServiceId] = useState('');
  const [createQueueName, setCreateQueueName] = useState('');
  const [createQueuePrefix, setCreateQueuePrefix] = useState('');
  const [createQueueMaxCapacity, setCreateQueueMaxCapacity] = useState<number | ''>(50);
  const [createQueueAutoPause, setCreateQueueAutoPause] = useState(false);

  const [showEditQueueModal, setShowEditQueueModal] = useState(false);
  const [editQueueId, setEditQueueId] = useState('');
  const [editQueueName, setEditQueueName] = useState('');
  const [editQueuePrefix, setEditQueuePrefix] = useState('');
  const [editQueueMaxCapacity, setEditQueueMaxCapacity] = useState<number | ''>(50);
  const [editQueueAutoPause, setEditQueueAutoPause] = useState(false);

  // ── Preparation Requirements State ──
  const [prepReqs, setPrepReqs] = useState<Record<string, PreparationRequirement[]>>({});
  const [expandedPrepService, setExpandedPrepService] = useState<string | null>(null);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [editingPrepReq, setEditingPrepReq] = useState<PreparationRequirement | null>(null);
  const [prepServiceId, setPrepServiceId] = useState('');
  const [prepTitle, setPrepTitle] = useState('');
  const [prepDescription, setPrepDescription] = useState('');
  const [prepIsRequired, setPrepIsRequired] = useState(true);
  const [prepDisplayOrder, setPrepDisplayOrder] = useState(0);
  const [prepIsActive, setPrepIsActive] = useState(true);

  // ── Announcement Templates State ──
  const [announcementTemplates, setAnnouncementTemplates] = useState<AnnouncementTemplate[]>([]);
  const [showAnnTemplateModal, setShowAnnTemplateModal] = useState(false);
  const [editingAnnTemplate, setEditingAnnTemplate] = useState<AnnouncementTemplate | null>(null);
  const [annLangCode, setAnnLangCode] = useState('en');
  const [annEventType, setAnnEventType] = useState('CALL_NEXT');
  const [annTemplateText, setAnnTemplateText] = useState('');
  const [annIsDefault, setAnnIsDefault] = useState(false);

  React.useEffect(() => {
    if (appState.authStatus === 'AUTHENTICATED' || appState.authStatus === 'AUTH_READY') {
      fetchData();
    }
  }, [currentLocation.id, appState.authStatus]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [servicesData, queuesData, templatesData] = await Promise.all([
        adminApi.getServices(currentLocation.id),
        adminApi.getQueuesByLocation(currentLocation.id),
        adminApi.getAnnouncementTemplates()
      ]);
      queueStore.setServices(servicesData);
      queueStore.setQueues(queuesData);
      setAnnouncementTemplates(templatesData.filter((t: AnnouncementTemplate) => t.orgId === currentOrg.id));
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const services = appState.services.filter(s => s.orgId === currentOrg.id);

  const handleToggleService = async (serviceId: string, currentEnabled: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.updateServiceStatus(serviceId, !currentEnabled);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update service status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditServiceClick = (srv: any) => {
    setEditServiceId(srv.id);
    setEditServiceName(srv.name);
    setEditServiceDesc(srv.description || '');
    setEditServiceIcon(srv.icon || 'FileText');
    setEditServiceFastTrack(srv.isFastTrack || false);
    setEditServicePrep(srv.preparationGuidance || '');
    setShowEditServiceModal(true);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editServiceName || !editServiceId) return;

    try {
      setIsLoading(true);
      setError(null);
      await adminApi.updateService(editServiceId, {
        name: editServiceName,
        description: editServiceDesc,
        icon: editServiceIcon,
        isFastTrack: editServiceFastTrack,
        preparationGuidance: editServicePrep
      } as any);
      
      await fetchData();
      setShowEditServiceModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleQueue = async (q: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const newStatus = (q.status === 'Active' || q.status === 'ACTIVE') ? 'PAUSED' : 'ACTIVE';
      await adminApi.updateQueueStatus(q.id, newStatus);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update queue status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createServiceName) return;
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.createService({
        orgId: currentOrg.id,
        locationId: currentLocation.id,
        name: createServiceName,
        description: createServiceDesc,
        icon: createServiceIcon,
        isFastTrack: createServiceFastTrack,
        preparationGuidance: createServicePrep
      } as any);
      await fetchData();
      setShowCreateServiceModal(false);
      setCreateServiceName('');
      setCreateServiceDesc('');
      setCreateServicePrep('');
      setCreateServiceFastTrack(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createQueueName || !createQueuePrefix) return;
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.createQueue({
        orgId: currentOrg.id,
        locationId: currentLocation.id,
        serviceId: createQueueServiceId,
        name: createQueueName,
        tokenPrefix: createQueuePrefix.toUpperCase(),
        maxCapacity: createQueueMaxCapacity === '' ? 50 : createQueueMaxCapacity,
        autoPauseAtCapacity: createQueueAutoPause
      } as any);
      await fetchData();
      setShowCreateQueueModal(false);
      setCreateQueueName('');
      setCreateQueuePrefix('');
      setCreateQueueMaxCapacity('');
      setCreateQueueAutoPause(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQueueId) return;
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.updateQueueConfig(editQueueId, {
        tokenPrefix: editQueuePrefix.toUpperCase(),
        maxCapacity: editQueueMaxCapacity === '' ? 50 : editQueueMaxCapacity,
        autoPauseAtCapacity: editQueueAutoPause
      });
      await fetchData();
      setShowEditQueueModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSavedSuccess(false);
      
      const updatedOrg = await adminApi.updateOrganizationRules(currentOrg.id, {
        capacityThresholdPercent: threshold,
        maxWaitThresholdMins: maxWait
      });
      
      queueStore.updateGlobalRules(currentOrg.id, {
        autoPauseAtCapacity: autoPause,
        capacityThresholdPercent: updatedOrg.capacityThresholdPercent,
        maxWaitThresholdMins: updatedOrg.maxWaitThresholdMins
      });
      
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save global rules');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrepReqs = async (serviceId: string) => {
    try {
      const reqs = await adminApi.getPreparationRequirements(serviceId);
      setPrepReqs(prev => ({ ...prev, [serviceId]: reqs }));
    } catch (err) {
      console.error('[Screen14] Failed to fetch prep requirements:', err);
    }
  };

  const togglePrepSection = (serviceId: string) => {
    if (expandedPrepService === serviceId) {
      setExpandedPrepService(null);
    } else {
      setExpandedPrepService(serviceId);
      if (!prepReqs[serviceId]) {
        fetchPrepReqs(serviceId);
      }
    }
  };

  const openAddPrepModal = (serviceId: string) => {
    setEditingPrepReq(null);
    setPrepServiceId(serviceId);
    setPrepTitle('');
    setPrepDescription('');
    setPrepIsRequired(true);
    setPrepDisplayOrder((prepReqs[serviceId]?.length || 0) + 1);
    setPrepIsActive(true);
    setShowPrepModal(true);
  };

  const openEditPrepModal = (serviceId: string, req: PreparationRequirement) => {
    setEditingPrepReq(req);
    setPrepServiceId(serviceId);
    setPrepTitle(req.title);
    setPrepDescription(req.description || '');
    setPrepIsRequired(req.isRequired);
    setPrepDisplayOrder(req.displayOrder);
    setPrepIsActive(req.isActive);
    setShowPrepModal(true);
  };

  const handleSavePrepReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepTitle || !prepServiceId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = {
        title: prepTitle,
        description: prepDescription,
        isRequired: prepIsRequired,
        displayOrder: prepDisplayOrder,
        isActive: prepIsActive,
      };
      if (editingPrepReq) {
        await adminApi.updatePreparationRequirement(prepServiceId, editingPrepReq.id, data);
      } else {
        await adminApi.createPreparationRequirement(prepServiceId, data);
      }
      await fetchPrepReqs(prepServiceId);
      setShowPrepModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save preparation requirement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePrepReq = async (serviceId: string, reqId: string) => {
    if (!confirm('Delete this preparation requirement?')) return;
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.deletePreparationRequirement(serviceId, reqId);
      await fetchPrepReqs(serviceId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete preparation requirement');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddAnnTemplateModal = () => {
    setEditingAnnTemplate(null);
    setAnnLangCode('en');
    setAnnEventType('CALL_NEXT');
    setAnnTemplateText('');
    setAnnIsDefault(false);
    setShowAnnTemplateModal(true);
  };

  const openEditAnnTemplateModal = (template: AnnouncementTemplate) => {
    setEditingAnnTemplate(template);
    setAnnLangCode(template.languageCode);
    setAnnEventType(template.eventType);
    setAnnTemplateText(template.templateText);
    setAnnIsDefault(template.isDefault);
    setShowAnnTemplateModal(true);
  };

  const handleSaveAnnTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annLangCode || !annEventType || !annTemplateText) return;
    try {
      setIsLoading(true);
      setError(null);
      const payload = {
        orgId: currentOrg.id,
        languageCode: annLangCode,
        eventType: annEventType,
        templateText: annTemplateText,
        isDefault: annIsDefault
      };
      
      if (editingAnnTemplate) {
        await adminApi.updateAnnouncementTemplate(editingAnnTemplate.id, payload);
      } else {
        await adminApi.createAnnouncementTemplate(payload);
      }
      
      const templatesData = await adminApi.getAnnouncementTemplates();
      setAnnouncementTemplates(templatesData.filter((t: AnnouncementTemplate) => t.orgId === currentOrg.id));
      setShowAnnTemplateModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnnTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.deleteAnnouncementTemplate(id);
      const templatesData = await adminApi.getAnnouncementTemplates();
      setAnnouncementTemplates(templatesData.filter((t: AnnouncementTemplate) => t.orgId === currentOrg.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard appState={appState}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#f7f7f4] min-h-screen text-[#26251e] font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-6 border-b border-[#e6e5e0]">
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-[#f54e00] uppercase tracking-widest flex items-center gap-2">
              <span>{currentOrg.name}</span>
              <span className="text-[#cfcdc4]">/</span>
              <span className="text-[#26251e] font-medium">{currentLocation.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-normal font-display text-[#26251e] tracking-tight">
              Service &amp; Queue Settings
            </h1>
            <p className="text-xs text-[#73726c] max-w-xl">
              Manage services, queue mapping, customer preparation requirements, and announcement templates.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateServiceModal(true)}
            variant="default"
            size="sm"
            className="flex items-center gap-2 shrink-0"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            <span>Create Service</span>
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: SERVICES & PREPARATION */}
          <div className="xl:col-span-8 space-y-6">
            {services.map((srv) => {
              const queuesForSrv = appState.queues.filter(q => q.serviceId === srv.id);
              return (
                <Card key={srv.id} className="p-6 space-y-6 transition-all hover:border-[#cfcdc4]">
                  
                  {/* Service Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-base font-medium text-[#26251e]">{srv.name}</h2>
                        <Badge variant={srv.enabled ? 'mint' : 'outline'} className="text-[9px] font-mono">
                          {srv.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#73726c] mt-1.5">{srv.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditServiceClick(srv)}
                        title="Edit Service"
                      >
                        <Icon icon="lucide:edit-3" className="w-4 h-4 text-[#73726c]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isLoading}
                        onClick={() => handleToggleService(srv.id, srv.enabled)}
                        title="Toggle Service Enabled State"
                      >
                        {srv.enabled ? (
                          <Icon icon="lucide:toggle-right" className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Icon icon="lucide:toggle-left" className="w-6 h-6 text-[#cfcdc4]" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Queues Section */}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#73726c] mb-3 flex items-center justify-between font-medium">
                      <span>Queue Configuration</span>
                      <button
                        onClick={() => {
                          setCreateQueueServiceId(srv.id);
                          setCreateQueueName(srv.name + ' Queue');
                          setCreateQueuePrefix(srv.name.substring(0, 1).toUpperCase());
                          setShowCreateQueueModal(true);
                        }}
                        className="text-[#f54e00] hover:text-[#d04200] flex items-center gap-1 cursor-pointer transition-colors text-[10px] font-mono font-medium"
                      >
                        <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                        <span>Map Queue</span>
                      </button>
                    </div>

                    {queuesForSrv.length > 0 ? (
                      <div className="border border-[#e6e5e0] bg-[#fafaf7] rounded-md divide-y divide-[#e6e5e0] overflow-hidden">
                        {queuesForSrv.map((q) => {
                          const isQActive = q.status === 'Active' || q.status === 'ACTIVE';
                          return (
                            <div key={q.id} className="p-4 flex items-center justify-between gap-4 group hover:bg-white transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white border border-[#cfcdc4] rounded-md flex items-center justify-center font-mono font-bold text-[#26251e] text-sm">
                                  {q.tokenPrefix}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-[#26251e]">{q.name}</div>
                                  <div className="text-[10px] text-[#73726c] font-mono mt-0.5">
                                    Capacity: {q.currentCount}/{q.maxCapacity} &bull; Avg: {q.avgWaitMins}m
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Badge variant={isQActive ? 'mint' : 'peach'} className="text-[9px] font-mono">
                                  {q.status}
                                </Badge>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleQueue(q)}
                                    title={isQActive ? 'Pause Queue' : 'Resume Queue'}
                                  >
                                    {isQActive ? (
                                      <Icon icon="lucide:pause" className="w-4 h-4 text-amber-600" />
                                    ) : (
                                      <Icon icon="lucide:play" className="w-4 h-4 text-emerald-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditQueueId(q.id);
                                      setEditQueueName(q.name);
                                      setEditQueuePrefix(q.tokenPrefix || '');
                                      setEditQueueMaxCapacity(q.maxCapacity || 50);
                                      setEditQueueAutoPause(q.autoPauseAtCapacity || false);
                                      setShowEditQueueModal(true);
                                    }}
                                    title="Edit Queue"
                                  >
                                    <Icon icon="lucide:edit-3" className="w-4 h-4 text-[#73726c]" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed border-[#cfcdc4] rounded-md text-center text-xs font-mono text-[#8c8b85]">
                        No queues mapped to this service.
                      </div>
                    )}
                  </div>

                  {/* Preparation Requirements Section */}
                  <div className="pt-4 border-t border-[#e6e5e0]">
                    <button
                      onClick={() => togglePrepSection(srv.id)}
                      className="flex items-center justify-between w-full text-left cursor-pointer group py-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon icon="lucide:clipboard-list" className="w-4 h-4 text-[#73726c] group-hover:text-[#26251e] transition-colors" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#73726c] group-hover:text-[#26251e] transition-colors font-medium">
                          Preparation Requirements
                        </span>
                        {prepReqs[srv.id]?.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0">
                            {prepReqs[srv.id].length}
                          </Badge>
                        )}
                      </div>
                      <Icon 
                        icon={expandedPrepService === srv.id ? "lucide:chevron-up" : "lucide:chevron-down"} 
                        className="w-4 h-4 text-[#8c8b85]" 
                      />
                    </button>

                    {expandedPrepService === srv.id && (
                      <div className="mt-4 space-y-3">
                        {(prepReqs[srv.id] || []).length > 0 ? (
                          <div className="border border-[#e6e5e0] rounded-md divide-y divide-[#e6e5e0] overflow-hidden">
                            {(prepReqs[srv.id] || [])
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((req) => (
                              <div
                                key={req.id}
                                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                                  req.isActive ? 'bg-white hover:bg-[#fafaf7]' : 'bg-[#fafaf7] opacity-60'
                                }`}
                              >
                                <div className="flex items-start gap-3.5 flex-1">
                                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 border ${
                                    req.isRequired ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}>
                                    {req.isRequired ? '!' : '?'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-[#26251e]">{req.title}</div>
                                    {req.description && (
                                      <div className="text-xs text-[#73726c] mt-0.5">{req.description}</div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant={req.isRequired ? 'peach' : 'outline'} className="text-[9px] font-mono">
                                        {req.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                                      </Badge>
                                      {!req.isActive && (
                                        <Badge variant="outline" className="text-[9px] font-mono text-red-600 border-red-200 bg-red-50">
                                          INACTIVE
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditPrepModal(srv.id, req)}
                                    title="Edit Requirement"
                                  >
                                    <Icon icon="lucide:edit-3" className="w-4 h-4 text-[#73726c]" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePrepReq(srv.id, req.id)}
                                    title="Delete Requirement"
                                  >
                                    <Icon icon="lucide:trash-2" className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-[#cfcdc4] rounded-md text-center text-xs font-mono text-[#8c8b85]">
                            No preparation requirements configured.
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddPrepModal(srv.id)}
                          className="text-[#f54e00] hover:text-[#d04200] flex items-center gap-1.5 p-0"
                        >
                          <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs uppercase tracking-wider">Add Requirement</span>
                        </Button>
                      </div>
                    )}
                  </div>

                </Card>
              );
            })}
          </div>

          {/* RIGHT COLUMN: CONFIG & TEMPLATES */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Global Rules */}
            <Card className="p-6 space-y-6">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#73726c] flex items-center gap-2 font-medium">
                <Icon icon="lucide:shield-check" className="w-4 h-4 text-[#f54e00]" />
                <span>Operational Rules</span>
              </h2>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#26251e]">Auto-Pause at Capacity</span>
                    <button
                      onClick={() => setAutoPause(!autoPause)}
                      className="cursor-pointer"
                    >
                      {autoPause ? (
                        <Icon icon="lucide:toggle-right" className="w-7 h-7 text-[#f54e00]" />
                      ) : (
                        <Icon icon="lucide:toggle-left" className="w-7 h-7 text-[#cfcdc4]" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#73726c] leading-relaxed">
                    Automatically pause queue token issuance when capacity exceeds safety limit.
                  </p>
                  
                  {autoPause && (
                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] font-mono text-[#73726c] mb-1.5">
                        <span>Capacity Threshold</span>
                        <span className="font-bold text-[#26251e]">{threshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="w-full accent-[#f54e00] cursor-pointer h-1.5 bg-[#e6e5e0] rounded-sm appearance-none"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-[#e6e5e0]">
                  <label className="text-xs font-medium text-[#26251e] block">Wait Time Alert Threshold</label>
                  <p className="text-[11px] text-[#73726c] leading-relaxed">
                    Flag executive alert when predicted wait time exceeds this threshold.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      value={maxWait}
                      onChange={(e) => setMaxWait(parseInt(e.target.value) || 30)}
                      className="w-24 font-mono text-xs"
                    />
                    <span className="text-[11px] font-mono text-[#73726c] uppercase tracking-wider">minutes</span>
                  </div>
                </div>

                <Button
                  onClick={handleSaveRules}
                  disabled={isLoading}
                  variant={savedSuccess ? "outline" : "default"}
                  className="w-full text-xs font-mono uppercase tracking-wider"
                >
                  {savedSuccess ? (
                    <>
                      <Icon icon="lucide:check-circle-2" className="w-4 h-4 mr-2 text-emerald-600" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>{isLoading ? 'Saving...' : 'Save Rules'}</span>
                  )}
                </Button>
              </div>
            </Card>

            {/* Announcement Templates */}
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#73726c] flex items-center gap-2 font-medium">
                  <Icon icon="lucide:message-square" className="w-4 h-4 text-[#f54e00]" />
                  <span>Announcement Templates</span>
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openAddAnnTemplateModal}
                  title="Add Template"
                >
                  <Icon icon="lucide:plus" className="w-4 h-4 text-[#26251e]" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {announcementTemplates.length > 0 ? (
                  announcementTemplates.map(template => (
                    <div key={template.id} className="p-3.5 bg-[#fafaf7] border border-[#e6e5e0] rounded-md flex flex-col gap-2.5 group hover:border-[#cfcdc4] transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {template.eventType}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {template.languageCode}
                          </Badge>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-[9px] font-mono">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openEditAnnTemplateModal(template)}>
                            <Icon icon="lucide:edit-3" className="w-3.5 h-3.5 text-[#73726c]" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnTemplate(template.id)}>
                            <Icon icon="lucide:trash-2" className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-[#26251e] leading-relaxed">
                        {template.templateText}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-[#8c8b85] p-4 border border-dashed border-[#cfcdc4] rounded-md text-center">
                    No templates configured.
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats Summary */}
            <Card className="p-6 space-y-4">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#73726c] font-medium">
                Location Summary
              </h2>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-[#e6e5e0] text-[#73726c]">
                  <span>Services</span>
                  <span className="text-[#26251e] font-bold">{services.length}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#e6e5e0] text-[#73726c]">
                  <span>Queues</span>
                  <span className="text-[#26251e] font-bold">{appState.queues.length}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[#73726c]">
                  <span>Counters</span>
                  <span className="text-[#26251e] font-bold">{appState.counters.length}</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* SERVICE MODAL (Create/Edit) */}
      {(showCreateServiceModal || showEditServiceModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#e6e5e0] flex items-center justify-between">
              <h2 className="text-sm font-medium font-mono text-[#26251e] uppercase tracking-wider">
                {showEditServiceModal ? 'Edit Service' : 'Create Service'}
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => showEditServiceModal ? setShowEditServiceModal(false) : setShowCreateServiceModal(false)}
              >
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={showEditServiceModal ? handleUpdateService : handleCreateService} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Service Name *</label>
                <Input
                  type="text"
                  required
                  value={showEditServiceModal ? editServiceName : createServiceName}
                  onChange={e => showEditServiceModal ? setEditServiceName(e.target.value) : setCreateServiceName(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Description</label>
                <textarea
                  value={showEditServiceModal ? editServiceDesc : createServiceDesc}
                  onChange={e => showEditServiceModal ? setEditServiceDesc(e.target.value) : setCreateServiceDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-sm px-3 py-2 focus:outline-none focus:border-[#26251e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Preparation Guidance (Optional)</label>
                <textarea
                  value={showEditServiceModal ? editServicePrep : createServicePrep}
                  onChange={e => showEditServiceModal ? setEditServicePrep(e.target.value) : setCreateServicePrep(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-sm px-3 py-2 focus:outline-none focus:border-[#26251e] placeholder-[#8c8b85]"
                  placeholder="e.g. Please have your ID ready"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="fastTrackTog"
                  checked={showEditServiceModal ? editServiceFastTrack : createServiceFastTrack}
                  onChange={e => showEditServiceModal ? setEditServiceFastTrack(e.target.checked) : setCreateServiceFastTrack(e.target.checked)}
                  className="w-4 h-4 rounded border-[#cfcdc4] bg-white text-[#f54e00] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="fastTrackTog" className="text-xs font-medium text-[#26251e] cursor-pointer">Enable Fast Track</label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => showEditServiceModal ? setShowEditServiceModal(false) : setShowCreateServiceModal(false)} 
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
                  {isLoading ? 'Saving...' : (showEditServiceModal ? 'Save Changes' : 'Create')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* QUEUE MODAL (Create/Edit) */}
      {(showCreateQueueModal || showEditQueueModal) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#e6e5e0] flex items-center justify-between">
              <h2 className="text-sm font-medium font-mono text-[#26251e] uppercase tracking-wider">
                {showEditQueueModal ? 'Edit Queue' : 'Map Queue'}
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => showEditQueueModal ? setShowEditQueueModal(false) : setShowCreateQueueModal(false)}
              >
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={showEditQueueModal ? handleUpdateQueue : handleCreateQueue} className="p-6 space-y-4">
              {!showEditQueueModal && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Queue Name *</label>
                  <Input
                    type="text"
                    required
                    value={createQueueName}
                    onChange={e => setCreateQueueName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Token Prefix *</label>
                  <Input
                    type="text"
                    required
                    maxLength={4}
                    value={showEditQueueModal ? editQueuePrefix : createQueuePrefix}
                    onChange={e => showEditQueueModal ? setEditQueuePrefix(e.target.value) : setCreateQueuePrefix(e.target.value)}
                    className="uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Max Capacity *</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={showEditQueueModal ? editQueueMaxCapacity : createQueueMaxCapacity}
                    onChange={e => showEditQueueModal ? setEditQueueMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value)) : setCreateQueueMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoPauseQueueTog"
                  checked={showEditQueueModal ? editQueueAutoPause : createQueueAutoPause}
                  onChange={e => showEditQueueModal ? setEditQueueAutoPause(e.target.checked) : setCreateQueueAutoPause(e.target.checked)}
                  className="w-4 h-4 rounded border-[#cfcdc4] bg-white text-[#f54e00] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoPauseQueueTog" className="text-xs font-medium text-[#26251e] cursor-pointer">Auto Pause at Capacity</label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => showEditQueueModal ? setShowEditQueueModal(false) : setShowCreateQueueModal(false)} 
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
                  {isLoading ? 'Saving...' : (showEditQueueModal ? 'Save Changes' : 'Map Queue')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* PREPARATION REQUIREMENT MODAL */}
      {showPrepModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#e6e5e0] flex items-center justify-between">
              <h2 className="text-sm font-medium font-mono text-[#26251e] uppercase tracking-wider">
                {editingPrepReq ? 'Edit Requirement' : 'Add Requirement'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPrepModal(false)}>
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSavePrepReq} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Title *</label>
                <Input
                  type="text"
                  required
                  value={prepTitle}
                  onChange={e => setPrepTitle(e.target.value)}
                  placeholder="e.g. Valid Photo ID"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Description</label>
                <textarea
                  value={prepDescription}
                  onChange={e => setPrepDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-sm px-3 py-2 focus:outline-none focus:border-[#26251e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Display Order</label>
                  <Input
                    type="number"
                    min="0"
                    value={prepDisplayOrder}
                    onChange={e => setPrepDisplayOrder(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pReq" checked={prepIsRequired} onChange={e => setPrepIsRequired(e.target.checked)} className="rounded border-[#cfcdc4] text-[#f54e00]" />
                    <label htmlFor="pReq" className="text-xs font-medium text-[#26251e] cursor-pointer">Required</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pAct" checked={prepIsActive} onChange={e => setPrepIsActive(e.target.checked)} className="rounded border-[#cfcdc4] text-[#f54e00]" />
                    <label htmlFor="pAct" className="text-xs font-medium text-[#26251e] cursor-pointer">Active</label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowPrepModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" variant="default" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Saving...' : 'Save Requirement'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ANNOUNCEMENT TEMPLATE MODAL */}
      {showAnnTemplateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#e6e5e0] flex items-center justify-between">
              <h2 className="text-sm font-medium font-mono text-[#26251e] uppercase tracking-wider">
                {editingAnnTemplate ? 'Edit Template' : 'Add Template'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAnnTemplateModal(false)}>
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSaveAnnTemplate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Event Type</label>
                  <select
                    required
                    value={annEventType}
                    onChange={e => setAnnEventType(e.target.value)}
                    className="w-full bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-sm px-3 py-2 focus:outline-none focus:border-[#26251e]"
                  >
                    <option value="CALL_NEXT">Call Next</option>
                    <option value="WAIT_REMINDER">Wait Reminder</option>
                    <option value="QUEUE_CLOSED">Queue Closed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Language Code</label>
                  <Input
                    type="text"
                    required
                    value={annLangCode}
                    onChange={e => setAnnLangCode(e.target.value)}
                    placeholder="e.g. en, es"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-[#73726c] uppercase tracking-wider">Template Text</label>
                <textarea
                  required
                  value={annTemplateText}
                  onChange={e => setAnnTemplateText(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-[#cfcdc4] rounded-md text-[#26251e] text-sm px-3 py-2 focus:outline-none focus:border-[#26251e]"
                />
                <p className="text-[10px] font-mono text-[#8c8b85]">Variables: {'{tokenNumber}'}, {'{counterNumber}'}</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="annDef"
                  checked={annIsDefault}
                  onChange={e => setAnnIsDefault(e.target.checked)}
                  className="rounded border-[#cfcdc4] text-[#f54e00]"
                />
                <label htmlFor="annDef" className="text-xs font-medium text-[#26251e] cursor-pointer">Set as Default for Event</label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAnnTemplateModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" variant="default" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </AuthGuard>
  );
};
