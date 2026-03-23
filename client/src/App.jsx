import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { Plus, Pencil, Trash2, Layout, Settings, Image, Type, Palette, Box, Maximize, Search, Cpu, HardDrive, Activity, StickyNote } from 'lucide-react'
import ServiceCard from './components/ServiceCard'

function App() {
  const [config, setConfig] = useState({ 
    sections: [], 
    backgroundImage: '', 
    backgroundScale: 'cover',
    cardColor: '#1e293b', 
    cardOpacity: 80,
    useBlur: true,
    textColor: '#ffffff',
    titleFontSize: 18,
    urlFontSize: 12,
    ipFontSize: 10,
    fontFamily: 'sans-serif',
    dashboardTitle: 'Homelab Dashboard',
    titleColor: '#ffffff',
    headerUseCardStyle: false,
    headerFontSize: 36,
    headerFontFamily: 'sans-serif',
    sectionUseCardStyle: false,
    sectionRounding: 12,
    sectionFontSize: 24,
    sectionFontFamily: 'sans-serif',
    sectionTitleColor: '#ffffff',
    cardSize: 200,
    cardHeight: 160,
    cardRounding: 16,
    cardPadding: 24,
    iconSize: 64,
    tagPlacement: 'bottom',
    tagColor: '#3b82f6',
    tagUseBg: false,
    showNote: false,
    noteContent: 'Don\'t forget to check the backups!',
    noteColor: '#fde047',
    noteOpacity: 20
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [backgrounds, setBackgrounds] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [sysStats, setSysStats] = useState({ cpu: 0, mem: 0, disk: 0 });
  const [editingService, setEditingService] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [newService, setNewService] = useState({ name: '', url: '', icon: '', localIp: '', tags: '', tagColor: config.tagColor || '#3b82f6' });
  const [newSection, setNewSection] = useState({ name: '' });

  const fetchConfig = () => {
    console.log("Fetching latest config...");
    fetch('/api/config')
      .then(async res => {
        if (!res.ok) throw new Error("Server error fetching config");
        return res.json();
      })
      .then(data => {
        console.log("Config loaded:", data);
        if (data && typeof data === 'object') {
          setConfig(prev => ({ ...prev, ...data }));
        }
        setHasLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load config:", err);
        setHasLoaded(true);
      });
  };

  const fetchBackgrounds = () => {
    fetch('/api/backgrounds')
      .then(res => res.json())
      .then(data => setBackgrounds(data))
      .catch(err => console.error("Failed to load backgrounds:", err));
  };

  const fetchStatuses = useCallback(() => {
    if (!config.sections || config.sections.length === 0) return;
    
    const allIps = config.sections.flatMap(section => 
      (section.services || []).map(s => s.localIp).filter(ip => !!ip)
    );
    
    if (allIps.length === 0) return;

    fetch(`/api/status?ips=${encodeURIComponent(allIps.join(','))}`)
      .then(res => res.json())
      .then(data => setStatuses(data))
      .catch(err => console.error("Failed to fetch statuses:", err));
  }, [config.sections]);

  useEffect(() => {
    fetchConfig();
    fetchBackgrounds();
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      fetchStatuses();
      const interval = setInterval(fetchStatuses, 30000);
      return () => clearInterval(interval);
    }
  }, [hasLoaded, fetchStatuses]);

  useEffect(() => {
    const fetchSysInfo = () => {
      fetch('/api/sysinfo')
        .then(res => res.json())
        .then(data => setSysStats(data))
        .catch(err => console.error("SysInfo error:", err));
    };
    fetchSysInfo();
    const interval = setInterval(fetchSysInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const saveConfig = (updatedConfig) => {
    if (!hasLoaded) {
      alert("Config hasn't loaded properly. Refresh the page.");
      return;
    }
    setConfig(updatedConfig);
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    })
    .catch(err => alert(`Error saving: ${err.message}`));
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const newConfig = { ...config };
    const sourceSectionIndex = newConfig.sections.findIndex(s => s.id === source.droppableId);
    const destSectionIndex = newConfig.sections.findIndex(s => s.id === destination.droppableId);

    const [removed] = newConfig.sections[sourceSectionIndex].services.splice(source.index, 1);
    newConfig.sections[destSectionIndex].services.splice(destination.index, 0, removed);

    saveConfig(newConfig);
  };

  const handleSaveService = () => {
    const newConfig = { ...config };
    const sectionIndex = newConfig.sections.findIndex(s => s.id === editingService.sectionId);
    
    if (editingService.index !== null) {
      newConfig.sections[sectionIndex].services[editingService.index] = newService;
    } else {
      if (!newConfig.sections[sectionIndex].services) newConfig.sections[sectionIndex].services = [];
      newConfig.sections[sectionIndex].services.push(newService);
    }
    
    saveConfig(newConfig);
    setIsModalOpen(false);
    setEditingService(null);
    setNewService({ name: '', url: '', icon: '', localIp: '', tags: '', tagColor: config.tagColor || '#3b82f6' });
  };

  const handleSaveSection = () => {
    const newConfig = { ...config };
    if (!newConfig.sections) newConfig.sections = [];
    
    if (editingSection !== null) {
      newConfig.sections[editingSection].name = newSection.name;
    } else {
      newConfig.sections.push({
        id: `section-${Date.now()}`,
        name: newSection.name,
        services: []
      });
    }
    saveConfig(newConfig);
    setIsSectionModalOpen(false);
    setEditingSection(null);
    setNewSection({ name: '' });
  };

  const deleteService = (sectionId, serviceIndex) => {
    if (!window.confirm("Delete this service?")) return;
    const newConfig = { ...config };
    const sectionIndex = newConfig.sections.findIndex(s => s.id === sectionId);
    newConfig.sections[sectionIndex].services.splice(serviceIndex, 1);
    saveConfig(newConfig);
  };

  const deleteSection = (index) => {
    if (!window.confirm("Delete this entire section and all its services?")) return;
    const newConfig = { ...config };
    newConfig.sections.splice(index, 1);
    saveConfig(newConfig);
  };

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16) || 30;
    const g = parseInt(hex.slice(3, 5), 16) || 41;
    const b = parseInt(hex.slice(5, 7), 16) || 59;
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  if (!hasLoaded) return <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">Loading configuration...</div>;

  const backgroundStyle = config.backgroundImage ? {
    backgroundImage: `url(/api/backgrounds/images/${config.backgroundImage})`,
    backgroundSize: config.backgroundScale === 'stretch' ? '100% 100%' : config.backgroundScale,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed'
  } : {};

  const cardStyle = {
    backgroundColor: hexToRgba(config.cardColor || '#1e293b', config.cardOpacity ?? 80),
    backdropFilter: config.useBlur !== false ? 'blur(8px)' : 'none',
    fontFamily: config.fontFamily || 'sans-serif',
    color: config.textColor || '#ffffff',
    borderRadius: `${config.cardRounding ?? 16}px`,
    padding: `${config.cardPadding ?? 24}px`
  };

  const iconCDN = "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/";

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans transition-all duration-500" style={backgroundStyle}>
      <div className={`fixed inset-0 bg-slate-900/40 -z-10 ${config.backgroundImage ? 'block' : 'hidden'}`}></div>
      
      <header className="flex justify-between items-center mb-12 relative z-10">
        <h1 
          className="font-bold tracking-tight drop-shadow-lg transition-all"
          style={{
            color: config.titleColor || '#ffffff',
            fontSize: `${config.headerFontSize || 36}px`,
            fontFamily: config.headerFontFamily || 'sans-serif',
            ...(config.headerUseCardStyle ? {
              ...cardStyle,
              padding: '1rem 2rem',
              borderRadius: '1rem',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              display: 'inline-block'
            } : {})
          }}
        >
          {config.dashboardTitle || 'Homelab Dashboard'}
        </h1>
        <div className="flex gap-4 items-center">
          <div className="flex gap-6 mr-6 bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2" title="CPU Load">
              <Cpu size={14} className="text-blue-400" />
              <span>{sysStats.cpu}%</span>
            </div>
            <div className="flex items-center gap-2" title="Memory Usage">
              <Activity size={14} className="text-emerald-400" />
              <span>{sysStats.mem}%</span>
            </div>
            <div className="flex items-center gap-2" title="Disk Usage">
              <HardDrive size={14} className="text-amber-400" />
              <span>{sysStats.disk}%</span>
            </div>
          </div>
          <div className="relative group mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 hover:bg-white/10 focus:bg-white/10 backdrop-blur-md border border-white/10 focus:border-blue-500/50 rounded-full py-2 pl-10 pr-4 outline-none w-48 focus:w-72 transition-all duration-300 text-sm placeholder:text-slate-500"
            />
          </div>
          {isEditMode && (
            <>
              <button onClick={() => { setEditingSection(null); setNewSection({ name: '' }); setIsSectionModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg font-medium transition-colors border border-slate-700">
                <Layout size={18} /> Add Section
              </button>
              <button onClick={() => setIsBackgroundModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg font-medium transition-colors border border-slate-700">
                <Settings size={18} /> Appearance
              </button>
            </>
          )}
          <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${isEditMode ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isEditMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
          </button>
        </div>
      </header>

      {config.showNote && (
        <div className="flex justify-center mb-16 relative z-10 pointer-events-none">
          <div 
            className="w-full max-w-sm p-8 border border-white/10 shadow-2xl backdrop-blur-md relative transform -rotate-1 pointer-events-auto"
            style={{ 
              backgroundColor: `${config.noteColor || '#fde047'}${Math.round(((config.noteOpacity || 20) / 100) * 255).toString(16).padStart(2, '0')}`,
              borderRadius: `${config.cardRounding}px`,
              borderLeft: `4px solid ${config.noteColor || '#fde047'}`
            }}
          >
            <p className="text-xl font-medium leading-relaxed italic" style={{ color: config.textColor }}>
              "{config.noteContent}"
            </p>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-16 relative z-10">
          {(config.sections || [])
            .map(section => ({
              ...section,
              services: (section.services || []).filter(service => 
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                service.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.localIp || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.tags || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
            }))
            .filter(section => section.services.length > 0 || (isEditMode && section.name.toLowerCase().includes(searchQuery.toLowerCase())))
            .map((section, sIdx) => (
            <div key={section.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <div className="flex items-center gap-4">
                  <h2 
                    className="font-bold opacity-90 transition-all" 
                    style={{ 
                      color: config.sectionTitleColor || config.titleColor, 
                      fontFamily: config.sectionFontFamily || config.fontFamily,
                      fontSize: `${config.sectionFontSize || 24}px`,
                      ...(config.sectionUseCardStyle ? {
                        ...cardStyle,
                        padding: '0.5rem 1.5rem',
                        borderRadius: `${config.sectionRounding ?? 12}px`,
                        border: '1px solid rgba(51, 65, 85, 0.3)',
                      } : {})
                    }}
                  >
                    {section.name}
                  </h2>
                  {isEditMode && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingSection(sIdx); setNewSection({ name: section.name }); setIsSectionModalOpen(true); }} className="text-slate-400 hover:text-blue-400 transition-colors"><Pencil size={18} /></button>
                      <button onClick={() => deleteSection(sIdx)} className="text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  )}
                </div>
              </div>

              <Droppable droppableId={section.id} direction="horizontal">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-wrap gap-6 min-h-[100px]">
                    {(section.services || []).map((service, index) => (
                      <ServiceCard 
                        key={`${section.id}-${index}`}
                        service={service}
                        index={index}
                        sectionId={section.id}
                        isEditMode={isEditMode}
                        statuses={statuses}
                        config={config}
                        cardStyle={cardStyle}
                        onEdit={(s, i) => { setEditingService({ sectionId: section.id, index: i }); setNewService(s); setIsModalOpen(true); }}
                        onDelete={deleteService}
                      />
                    ))}
                    {provided.placeholder}
                    {isEditMode && (
                      <button 
                        onClick={() => { setEditingService({ sectionId: section.id, index: null }); setNewService({ name: '', url: '', icon: '', localIp: '', tags: '', tagColor: config.tagColor || '#3b82f6' }); setIsModalOpen(true); }} 
                        className="border-2 border-dashed border-slate-700/50 p-6 hover:border-blue-500 transition-all flex flex-col items-center justify-center" 
                        style={{ 
                          ...cardStyle, 
                          width: `${config.cardSize || 200}px`, 
                          height: `${config.cardHeight || 160}px` 
                        }}
                      >
                        <Plus size={32} strokeWidth={1} className="mb-2" />
                        <span className="font-medium">Add Service</span>
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
          {isEditMode && config.sections.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-3xl">
              <Layout size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-6">Your dashboard is empty. Create your first section to get started!</p>
              <button onClick={() => setIsSectionModalOpen(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">Add New Section</button>
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl" style={{ fontFamily: config.fontFamily }}>
            <h2 className="text-2xl font-bold mb-6 text-blue-400">{editingService?.index !== null ? 'Edit Service' : 'Add Service'}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Name</label><input type="text" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">URL</label><input type="text" value={newService.url} onChange={(e) => setNewService({...newService, url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Local IP</label><input type="text" value={newService.localIp} onChange={(e) => setNewService({...newService, localIp: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-slate-400 mb-1">Tags (comma separated)</label><input type="text" value={newService.tags} placeholder="Media, Database, Docker..." onChange={(e) => setNewService({...newService, tags: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm text-slate-400 mb-1">Tag Color</label><input type="color" value={newService.tagColor || '#3b82f6'} onChange={(e) => setNewService({...newService, tagColor: e.target.value})} className="w-full h-[42px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 outline-none cursor-pointer" /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">CDN Icon Slug</label>
                  <input type="text" value={newService.icon} onChange={(e) => setNewService({...newService, icon: e.target.value, customIcon: ''})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Custom Icon</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('icon', file);
                        fetch('/api/icons/upload', { method: 'POST', body: formData })
                          .then(res => res.json())
                          .then(data => { setNewService({...newService, customIcon: data.filename, icon: ''}); });
                      }}
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-xs flex items-center justify-center min-h-[40px]">
                      {newService.customIcon ? 'Icon Uploaded!' : 'Upload Image'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-700 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSaveService} className="flex-1 px-4 py-2 bg-blue-600 rounded-lg font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl" style={{ fontFamily: config.fontFamily }}>
            <h2 className="text-2xl font-bold mb-6 text-blue-400">{editingSection !== null ? 'Edit Section' : 'Add Section'}</h2>
            <div><label className="block text-sm text-slate-400 mb-1">Section Name</label><input type="text" value={newSection.name} onChange={(e) => setNewSection({ name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsSectionModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-700 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSaveSection} className="flex-1 px-4 py-2 bg-blue-600 rounded-lg font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Modal */}
      {isBackgroundModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: config.fontFamily }}>
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Palette size={32} className="text-blue-500" />
              Appearance Settings
            </h2>
            
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm text-slate-200 mb-3">
                <Image size={16} className="text-blue-400" />
                Background Library
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div onClick={() => saveConfig({ ...config, backgroundImage: '' })} className={`aspect-video rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${!config.backgroundImage ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}><span className="text-xs font-medium">No Background</span></div>
                {(backgrounds || []).map((bg) => (
                  <div key={bg} className="relative group aspect-video">
                    <div onClick={() => saveConfig({ ...config, backgroundImage: bg })} className={`w-full h-full rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${config.backgroundImage === bg ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'}`}><img src={`/api/backgrounds/images/${bg}`} alt="" className="w-full h-full object-cover" /></div>
                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete?")) fetch(`/api/backgrounds/${bg}`, { method: 'DELETE' }).then(() => { fetchBackgrounds(); if (config.backgroundImage === bg) saveConfig({ ...config, backgroundImage: '' }); }); }} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold shadow-lg">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm text-slate-200 mb-3">
                <Plus size={16} className="text-blue-400" />
                Upload New Background
              </label>
              <input type="file" onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('background', file);
                fetch('/api/backgrounds/upload', { method: 'POST', body: formData })
                  .then(res => res.json())
                  .then(data => { fetchBackgrounds(); saveConfig({ ...config, backgroundImage: data.filename }); });
              }} accept="image/*" className="w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white cursor-pointer" />
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm text-slate-200 mb-3">
                <Maximize size={16} className="text-blue-400" />
                Background Scaling
              </label>
              <div className="flex gap-2">
                {['cover', 'contain', 'stretch', 'auto'].map((s) => (
                  <button key={s} onClick={() => saveConfig({ ...config, backgroundScale: s })} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${config.backgroundScale === s ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <Type size={24} />
                Dashboard Header
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Type size={14} /> Title
                    </label>
                    <input type="text" value={config.dashboardTitle || ''} onChange={(e) => saveConfig({ ...config, dashboardTitle: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Palette size={14} /> Title Color
                    </label>
                    <input type="color" value={config.titleColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, titleColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Type size={14} /> Font
                    </label>
                    <select value={config.headerFontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, headerFontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Maximize size={14} /> Size ({config.headerFontSize}px)
                    </label>
                    <input type="range" min="20" max="72" value={config.headerFontSize || 36} onChange={(e) => saveConfig({ ...config, headerFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
                <div className="flex items-center gap-2"><input type="checkbox" id="hUseCard" checked={config.headerUseCardStyle} onChange={(e) => saveConfig({ ...config, headerUseCardStyle: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" /><label htmlFor="hUseCard" className="text-sm text-slate-200">Use Card Background</label></div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <Layout size={24} />
                Section Headers
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Palette size={14} /> Title Color
                    </label>
                    <input type="color" value={config.sectionTitleColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, sectionTitleColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Type size={14} /> Font
                    </label>
                    <select value={config.sectionFontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, sectionFontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Maximize size={14} /> Size ({config.sectionFontSize}px)
                    </label>
                    <input type="range" min="16" max="48" value={config.sectionFontSize || 24} onChange={(e) => saveConfig({ ...config, sectionFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Box size={14} /> Corner Style
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => saveConfig({ ...config, sectionRounding: 0 })} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${config.sectionRounding === 0 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>Squared</button>
                      <button onClick={() => saveConfig({ ...config, sectionRounding: 12 })} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${config.sectionRounding > 0 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>Rounded</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="sUseCard" checked={config.sectionUseCardStyle} onChange={(e) => saveConfig({ ...config, sectionUseCardStyle: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" />
                    <label htmlFor="sUseCard" className="text-sm text-slate-200">Use Card Background</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <Box size={24} />
                Card & Layout
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Maximize size={14} /> Card Width ({config.cardSize}px)
                    </label>
                    <input type="range" min="120" max="400" value={config.cardSize || 200} onChange={(e) => saveConfig({ ...config, cardSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Maximize size={14} /> Card Height ({config.cardHeight}px)
                    </label>
                    <input type="range" min="100" max="400" value={config.cardHeight || 160} onChange={(e) => saveConfig({ ...config, cardHeight: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Box size={14} /> Corner Rounding ({config.cardRounding}px)
                    </label>
                    <input type="range" min="0" max="100" value={config.cardRounding ?? 16} onChange={(e) => saveConfig({ ...config, cardRounding: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Box size={14} /> Card Padding ({config.cardPadding}px)
                    </label>
                    <input type="range" min="0" max="64" value={config.cardPadding ?? 24} onChange={(e) => saveConfig({ ...config, cardPadding: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Image size={14} /> Icon Size ({config.iconSize}px)
                    </label>
                    <input type="range" min="32" max="128" value={config.iconSize || 64} onChange={(e) => saveConfig({ ...config, iconSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Type size={14} /> Font
                    </label>
                    <select value={config.fontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, fontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Palette size={14} /> Card Color
                    </label>
                    <input type="color" value={config.cardColor || '#1e293b'} onChange={(e) => saveConfig({ ...config, cardColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Palette size={14} /> Text Color
                    </label>
                    <input type="color" value={config.textColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, textColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                      <Box size={14} /> Opacity ({config.cardOpacity}%)
                    </label>
                    <input type="range" min="0" max="100" value={config.cardOpacity || 80} onChange={(e) => saveConfig({ ...config, cardOpacity: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div className="flex items-end pb-2"><div className="flex items-center gap-2"><input type="checkbox" id="useBlurStyle" checked={config.useBlur !== false} onChange={(e) => saveConfig({ ...config, useBlur: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" /><label htmlFor="useBlurStyle" className="text-sm text-slate-200">Enable Blur</label></div></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-xs text-slate-300 mb-1">
                      <Type size={12} /> Title
                    </label>
                    <input type="range" min="12" max="32" value={config.titleFontSize} onChange={(e) => saveConfig({ ...config, titleFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs text-slate-300 mb-1">
                      <Type size={12} /> URL
                    </label>
                    <input type="range" min="8" max="24" value={config.urlFontSize} onChange={(e) => saveConfig({ ...config, urlFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs text-slate-300 mb-1">
                      <Type size={12} /> IP
                    </label>
                    <input type="range" min="8" max="20" value={config.ipFontSize} onChange={(e) => saveConfig({ ...config, ipFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <Layout size={24} />
                Tag Style
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-200 mb-3">
                    <Maximize size={16} className="text-blue-400" />
                    Tag Placement
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'].map((p) => (
                      <button key={p} onClick={() => saveConfig({ ...config, tagPlacement: p })} className={`px-2 py-2 rounded-lg text-xs font-medium capitalize transition-all ${config.tagPlacement === p ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 hover:bg-slate-700'}`}>{p.replace('-', ' ')}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                    <Palette size={14} /> Default Tag Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="color" value={config.tagColor || '#3b82f6'} onChange={(e) => saveConfig({ ...config, tagColor: e.target.value })} className="flex-1 h-10 rounded bg-slate-900 border-none cursor-pointer" />
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="tagUseBg" checked={config.tagUseBg} onChange={(e) => saveConfig({ ...config, tagUseBg: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" />
                      <label htmlFor="tagUseBg" className="text-sm text-slate-200 whitespace-nowrap">Solid Background</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <StickyNote size={24} />
                Dashboard Note
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showNote" checked={config.showNote} onChange={(e) => saveConfig({ ...config, showNote: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" />
                  <label htmlFor="showNote" className="text-sm text-slate-200">Show Sticky Note on Dashboard</label>
                </div>
                {config.showNote && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-200 mb-2 font-medium">Note Content</label>
                      <textarea 
                        value={config.noteContent} 
                        onChange={(e) => saveConfig({ ...config, noteContent: e.target.value })} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your reminder here..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                          <Palette size={14} /> Note Accent Color
                        </label>
                        <input type="color" value={config.noteColor || '#fde047'} onChange={(e) => saveConfig({ ...config, noteColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                          <Box size={14} /> Opacity ({config.noteOpacity || 20}%)
                        </label>
                        <input type="range" min="5" max="100" value={config.noteOpacity || 20} onChange={(e) => saveConfig({ ...config, noteOpacity: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8"><button onClick={() => setIsBackgroundModalOpen(false)} className="w-full px-4 py-2 bg-slate-700 rounded-lg font-medium">Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App