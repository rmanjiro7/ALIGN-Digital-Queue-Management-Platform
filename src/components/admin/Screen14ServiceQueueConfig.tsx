import React, { useState } from 'react';
import { 
  Settings, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Layers, 
  Pause, 
  Play, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Info,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { queueStore, AppState } from '../../services/store';
import { PreparationRequirement, AnnouncementTemplate } from '../../types';

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
    fetchData();
  }, [currentLocation.id]);

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
      
      console.log(`[Screen14] Saving rules for org: ${currentOrg.id}`, { threshold, maxWait });
      const updatedOrg = await adminApi.updateOrganizationRules(currentOrg.id, {
        capacityThresholdPercent: threshold,
        maxWaitThresholdMins: maxWait
      });
      console.log(`[Screen14] Save success:`, updatedOrg);
      
      // Update global rules state optimism
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

  // ── Preparation Requirements Handlers ──
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
    setPrepDescription(req.description);
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

  // ── Announcement Templates Handlers ──
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Create Service Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ACC1]">
            {currentOrg.name} &gt; {currentLocation.name}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Active Services &amp; Queue Mapping
          </h1>
          <p className="text-xs text-slate-500">
            Manage public-facing services, underlying token algorithms, and capacity threshold guardrails.
          </p>
        </div>

        <button
          onClick={() => setShowCreateServiceModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00ACC1]/25 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Service</span>
        </button>
      </div>

      {/* Main Layout: Services Cards Left (2 cols), Global Rules Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Services and Associated Queues */}
        <div className="lg:col-span-2 space-y-6">
          {error && <div className="text-red-500 font-bold p-3 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
          {services.map((srv) => {
            const queuesForSrv = appState.queues.filter(q => q.serviceId === srv.id);
            return (
              <div
                key={srv.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                {/* Service Header with Enabled Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{srv.name}</h2>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        srv.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {srv.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{srv.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditServiceClick(srv)}
                      className="text-slate-700 hover:text-[#00ACC1] transition-colors p-1 cursor-pointer disabled:opacity-50"
                      title="Edit Service"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => handleToggleService(srv.id, srv.enabled)}
                      className="text-slate-700 hover:text-slate-900 transition-colors p-1 cursor-pointer disabled:opacity-50"
                      title="Toggle Service Enabled State"
                    >
                      {srv.enabled ? (
                        <ToggleRight className="w-8 h-8 text-[#00ACC1]" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Associated Operational Queues Table */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Associated Operational Queues
                  </div>

                  {queuesForSrv.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {queuesForSrv.map((q) => {
                        const isQActive = q.status === 'Active';
                        return (
                          <div
                            key={q.id}
                            className="p-3.5 flex items-center justify-between gap-3 bg-[#F1F5F9]/50 hover:bg-[#F1F5F9] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-[#00ACC1] flex items-center justify-center font-mono font-black text-xs shadow-xs">
                                {q.tokenPrefix}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{q.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Range {q.startRange}-{q.endRange} â€¢ Avg Wait {q.avgWaitMins}m
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs font-bold font-mono text-slate-800">
                                  {q.currentCount} / {q.maxCapacity} Max
                                </div>
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                  isQActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {q.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleQueue(q)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title={isQActive ? 'Pause Queue' : 'Resume Queue'}
                                >
                                  {isQActive ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                                </button>
                                <button
                                  onClick={() => {
  setEditQueueId(q.id);
  setEditQueueName(q.name);
  setEditQueuePrefix(q.tokenPrefix || '');
  setEditQueueMaxCapacity(q.maxCapacity || 50);
  setEditQueueAutoPause(q.autoPauseAtCapacity || false);
  setShowEditQueueModal(true);
}}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Edit Queue Parameters"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                      No queues currently configured for this service.
                    </div>
                  )}

                  <button
                    onClick={() => {
  setCreateQueueServiceId(srv.id);
  setCreateQueueName(srv.name + ' Queue');
  setCreateQueuePrefix(srv.name.substring(0, 1).toUpperCase());
  setShowCreateQueueModal(true);
}}
                    className="mt-2 text-xs font-bold text-[#00ACC1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Map additional queue</span>
                  </button>
                </div>

                {/* Preparation Requirements Section */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => togglePrepSection(srv.id)}
                    className="flex items-center justify-between w-full text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-[#00ACC1]" />
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                        Preparation Requirements
                      </span>
                      {prepReqs[srv.id]?.length > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-[#00ACC1]/10 text-[#00ACC1] px-2 py-0.5 rounded-full">
                          {prepReqs[srv.id].length}
                        </span>
                      )}
                    </div>
                    {expandedPrepService === srv.id
                      ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    }
                  </button>

                  {expandedPrepService === srv.id && (
                    <div className="mt-3 space-y-2">
                      {(prepReqs[srv.id] || []).length > 0 ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                          {(prepReqs[srv.id] || [])
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((req) => (
                            <div
                              key={req.id}
                              className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                                req.isActive ? 'bg-[#F1F5F9]/50 hover:bg-[#F1F5F9]' : 'bg-slate-50 opacity-60'
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                  req.isRequired ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {req.isRequired ? '!' : '?'}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">{req.title}</div>
                                  {req.description && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{req.description}</div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      req.isRequired ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {req.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                                    </span>
                                    {!req.isActive && (
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                                        INACTIVE
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditPrepModal(srv.id, req)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Edit Requirement"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePrepReq(srv.id, req.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Requirement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                          No preparation requirements configured for this service.
                        </div>
                      )}

                      <button
                        onClick={() => openAddPrepModal(srv.id)}
                        className="text-xs font-bold text-[#00ACC1] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add preparation requirement</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 1 Col: Global Rules & Threshold Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00ACC1]" />
              <span>Global Operational Rules</span>
            </h2>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3.5 bg-[#F1F5F9] rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Auto-Pause at Capacity</span>
                  <button
                    onClick={() => setAutoPause(!autoPause)}
                    className="text-[#00ACC1] cursor-pointer"
                  >
                    {autoPause ? <ToggleRight className="w-7 h-7 text-[#00ACC1]" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automatically pause queue token issuance when capacity exceeds safety limit.
                </p>
                {autoPause && (
                  <div className="pt-2">
                    <label className="text-[10px] text-slate-500 font-mono font-bold">Threshold Percentage</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={threshold}
                        onChange={(e) => setThreshold(parseInt(e.target.value))}
                        className="flex-1 accent-[#00ACC1] cursor-pointer"
                      />
                      <span className="font-mono font-bold text-[#0F172A] text-xs w-8">{threshold}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-[#F1F5F9] rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Max Wait Time Threshold</span>
                <p className="text-[11px] text-slate-500">
                  Flag executive alert when predicted wait time exceeds this threshold.
                </p>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={maxWait}
                    onChange={(e) => setMaxWait(parseInt(e.target.value) || 30)}
                    className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-[#00ACC1]"
                  />
                  <span className="text-slate-500 font-semibold">minutes</span>
                </div>
              </div>

              <button
                id="save-rules-btn"
                onClick={handleSaveRules}
                disabled={isLoading}
                className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 ${
                  savedSuccess
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#00ACC1] text-white hover:bg-[#0097A7] shadow-md shadow-[#00ACC1]/25 cursor-pointer'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>{isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
              Location Summary
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Services</span>
                <span className="font-bold text-[#0F172A]">{services.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Active Operational Queues</span>
                <span className="font-bold text-[#0F172A]">{appState.queues.length}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Active Counters</span>
                <span className="font-bold text-[#0F172A]">{appState.counters.length}</span>
              </div>
            </div>
          </div>

          {/* Announcement Templates Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#0F172A] font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00ACC1]" />
                Announcement Templates
              </h2>
              <button
                onClick={openAddAnnTemplateModal}
                className="text-[#00ACC1] hover:bg-[#00ACC1]/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Add Template"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {announcementTemplates.length > 0 ? (
                announcementTemplates.map(template => (
                  <div key={template.id} className="p-3 bg-[#F1F5F9] rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-800 uppercase">{template.eventType}</span>
                        {template.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00ACC1]/10 text-[#00ACC1] font-bold uppercase">Default</span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold uppercase">{template.languageCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-1">{template.templateText}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditAnnTemplateModal(template)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg cursor-pointer">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteAnnTemplate(template.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-500 italic p-2 text-center border border-dashed border-slate-200 rounded-xl">
                  No templates configured. Standard messages will be used.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Service Modal */}
      {showEditServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <h2 className="text-lg font-black text-[#0F172A] mb-1">Edit Service</h2>
            <p className="text-xs text-slate-500 mb-4">Update service configuration.</p>

            <form onSubmit={handleUpdateService} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Service Name</label>
                <input 
                  type="text" 
                  required
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Description</label>
                <input 
                  type="text" 
                  value={editServiceDesc}
                  onChange={(e) => setEditServiceDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox"
                  id="fastTrack"
                  checked={editServiceFastTrack}
                  onChange={(e) => setEditServiceFastTrack(e.target.checked)}
                  className="w-4 h-4 text-[#00ACC1] rounded cursor-pointer"
                />
                <label htmlFor="fastTrack" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Is Fast Track?
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Preparation Guidance</label>
                <textarea 
                  value={editServicePrep}
                  onChange={(e) => setEditServicePrep(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00ACC1]"
                  placeholder="e.g. Please have your ID ready"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditServiceModal(false)}
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

      {/* CREATE SERVICE MODAL */}
      {showCreateServiceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Create New Service</h2>
              <button onClick={() => setShowCreateServiceModal(false)} className="text-slate-400 hover:text-slate-600">Ã—</button>
            </div>
            <form onSubmit={handleCreateService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={createServiceName}
                  onChange={e => setCreateServiceName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={createServiceDesc}
                  onChange={e => setCreateServiceDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fastTrackCreate"
                  checked={createServiceFastTrack}
                  onChange={e => setCreateServiceFastTrack(e.target.checked)}
                  className="rounded text-[#00ACC1]"
                />
                <label htmlFor="fastTrackCreate" className="text-sm text-slate-700">Enable Fast Track</label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateServiceModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUEUE MODAL */}
      {showCreateQueueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Map Queue to Service</h2>
              <button onClick={() => setShowCreateQueueModal(false)} className="text-slate-400 hover:text-slate-600">Ã—</button>
            </div>
            <form onSubmit={handleCreateQueue} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Queue Name</label>
                <input
                  type="text"
                  required
                  value={createQueueName}
                  onChange={e => setCreateQueueName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Token Prefix</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={createQueuePrefix}
                  onChange={e => setCreateQueuePrefix(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1] uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={createQueueMaxCapacity}
                  onChange={e => setCreateQueueMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoPauseCreate"
                  checked={createQueueAutoPause}
                  onChange={e => setCreateQueueAutoPause(e.target.checked)}
                  className="rounded text-[#00ACC1]"
                />
                <label htmlFor="autoPauseCreate" className="text-sm text-slate-700">Auto Pause at Capacity</label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateQueueModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">
                  Create Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT QUEUE MODAL */}
      {showEditQueueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Edit Queue: {editQueueName}</h2>
              <button onClick={() => setShowEditQueueModal(false)} className="text-slate-400 hover:text-slate-600">Ã—</button>
            </div>
            <form onSubmit={handleUpdateQueue} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Token Prefix</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={editQueuePrefix}
                  onChange={e => setEditQueuePrefix(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1] uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Capacity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editQueueMaxCapacity}
                  onChange={e => setEditQueueMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoPauseEdit"
                  checked={editQueueAutoPause}
                  onChange={e => setEditQueueAutoPause(e.target.checked)}
                  className="rounded text-[#00ACC1]"
                />
                <label htmlFor="autoPauseEdit" className="text-sm text-slate-700">Auto Pause at Capacity</label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditQueueModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREPARATION REQUIREMENT ADD/EDIT MODAL */}
      {showPrepModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPrepReq ? 'Edit Requirement' : 'Add Preparation Requirement'}
              </h2>
              <button onClick={() => setShowPrepModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSavePrepReq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={prepTitle}
                  onChange={e => setPrepTitle(e.target.value)}
                  placeholder="e.g. Valid Photo ID"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={prepDescription}
                  onChange={e => setPrepDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. Please bring a government-issued photo ID (passport, driver's license)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prepRequired"
                    checked={prepIsRequired}
                    onChange={e => setPrepIsRequired(e.target.checked)}
                    className="rounded text-[#00ACC1]"
                  />
                  <label htmlFor="prepRequired" className="text-sm text-slate-700 cursor-pointer">Required</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prepActive"
                    checked={prepIsActive}
                    onChange={e => setPrepIsActive(e.target.checked)}
                    className="rounded text-[#00ACC1]"
                  />
                  <label htmlFor="prepActive" className="text-sm text-slate-700 cursor-pointer">Active</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  min="0"
                  value={prepDisplayOrder}
                  onChange={e => setPrepDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPrepModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-[#00ACC1] hover:bg-[#0097A7] text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer">
                  {editingPrepReq ? 'Save Changes' : 'Add Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Template Modal */}
      {showAnnTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAnnTemplate ? 'Edit Template' : 'Add Announcement Template'}
              </h2>
              <button onClick={() => setShowAnnTemplateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSaveAnnTemplate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
                  <select
                    required
                    value={annEventType}
                    onChange={e => setAnnEventType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1] cursor-pointer"
                  >
                    <option value="CALL_NEXT">Call Next</option>
                    <option value="WAIT_REMINDER">Wait Reminder</option>
                    <option value="QUEUE_CLOSED">Queue Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Language Code</label>
                  <input
                    type="text"
                    required
                    value={annLangCode}
                    onChange={e => setAnnLangCode(e.target.value)}
                    placeholder="e.g. en, es, fr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Text</label>
                <textarea
                  required
                  value={annTemplateText}
                  onChange={e => setAnnTemplateText(e.target.value)}
                  rows={4}
                  placeholder="e.g. Token {tokenNumber}, please proceed to Counter {counterNumber}."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ACC1]"
                />
                <p className="text-[10px] text-slate-500 mt-1">Variables available: {'{tokenNumber}'}, {'{counterNumber}'}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefaultTemplate"
                  checked={annIsDefault}
                  onChange={e => setAnnIsDefault(e.target.checked)}
                  className="rounded text-[#00ACC1] cursor-pointer"
                />
                <label htmlFor="isDefaultTemplate" className="text-sm text-slate-700 cursor-pointer">
                  Set as Default for Event
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAnnTemplateModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer">
                  {editingAnnTemplate ? 'Save Changes' : 'Add Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

