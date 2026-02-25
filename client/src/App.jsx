import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { Plus, Pencil, Trash2, Layout, Settings } from 'lucide-react'
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
    sectionFontSize: 24,
    sectionFontFamily: 'sans-serif',
    sectionTitleColor: '#ffffff',
    cardSize: 200,
    cardHeight: 160,
    cardRounding: 16,
    iconSize: 64
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [backgrounds, setBackgrounds] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [editingService, setEditingService] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [newService, setNewService] = useState({ name: '', url: '', icon: '', localIp: '' });
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
    setNewService({ name: '', url: '', icon: '', localIp: '' });
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
    borderRadius: `${config.cardRounding ?? 16}px`
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
        <div className="flex gap-4">
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-16 relative z-10">
          {(config.sections || []).map((section, sIdx) => (
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
                        borderRadius: '0.75rem',
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
                        onClick={() => { setEditingService({ sectionId: section.id, index: null }); setNewService({ name: '', url: '', icon: '', localIp: '' }); setIsModalOpen(true); }} 
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
            <h2 className="text-2xl font-bold mb-6">Appearance Settings</h2>
            
            <div className="mb-8">
              <label className="block text-sm text-slate-400 mb-3">Upload New Background</label>
              <input type="file" onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('background', file);
                fetch('/api/backgrounds/upload', { method: 'POST', body: formData })
                  .then(res => res.json())
                  .then(data => { fetchBackgrounds(); saveConfig({ ...config, backgroundImage: data.filename }); });
              }} accept="image/*" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white cursor-pointer" />
            </div>

            <div className="mb-8">
              <label className="block text-sm text-slate-400 mb-3">Background Scaling</label>
              <div className="flex gap-2">
                {['cover', 'contain', 'stretch', 'auto'].map((s) => (
                  <button key={s} onClick={() => saveConfig({ ...config, backgroundScale: s })} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${config.backgroundScale === s ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm text-slate-400 mb-3">Background Library</label>
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

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Dashboard Header</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Title</label><input type="text" value={config.dashboardTitle || ''} onChange={(e) => saveConfig({ ...config, dashboardTitle: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                  <div><label className="block text-sm text-slate-400 mb-2">Title Color</label><input type="color" value={config.titleColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, titleColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Font</label><select value={config.headerFontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, headerFontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></div>
                  <div><label className="block text-sm text-slate-400 mb-2">Size ({config.headerFontSize}px)</label><input type="range" min="20" max="72" value={config.headerFontSize || 36} onChange={(e) => saveConfig({ ...config, headerFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                </div>
                <div className="flex items-center gap-2"><input type="checkbox" id="hUseCard" checked={config.headerUseCardStyle} onChange={(e) => saveConfig({ ...config, headerUseCardStyle: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" /><label htmlFor="hUseCard" className="text-sm text-slate-300">Use Card Background</label></div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Section Headers</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Title Color</label><input type="color" value={config.sectionTitleColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, sectionTitleColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" /></div>
                  <div><label className="block text-sm text-slate-400 mb-2">Font</label><select value={config.sectionFontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, sectionFontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Size ({config.sectionFontSize}px)</label><input type="range" min="16" max="48" value={config.sectionFontSize || 24} onChange={(e) => saveConfig({ ...config, sectionFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                  <div className="flex items-end pb-2"><div className="flex items-center gap-2"><input type="checkbox" id="sUseCard" checked={config.sectionUseCardStyle} onChange={(e) => saveConfig({ ...config, sectionUseCardStyle: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" /><label htmlFor="sUseCard" className="text-sm text-slate-300">Use Card Background</label></div></div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-t border-slate-700 pt-8">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Card & Layout</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Card Width ({config.cardSize}px)</label>
                    <input type="range" min="120" max="400" value={config.cardSize || 200} onChange={(e) => saveConfig({ ...config, cardSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Card Height ({config.cardHeight}px)</label>
                    <input type="range" min="100" max="400" value={config.cardHeight || 160} onChange={(e) => saveConfig({ ...config, cardHeight: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Corner Rounding ({config.cardRounding}px)</label>
                    <input type="range" min="0" max="100" value={config.cardRounding ?? 16} onChange={(e) => saveConfig({ ...config, cardRounding: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Icon Size ({config.iconSize}px)</label>
                    <input type="range" min="32" max="128" value={config.iconSize || 64} onChange={(e) => saveConfig({ ...config, iconSize: parseInt(e.target.value) })} className="w-full accent-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Font</label><select value={config.fontFamily || 'sans-serif'} onChange={(e) => saveConfig({ ...config, fontFamily: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"><option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Card Color</label><input type="color" value={config.cardColor || '#1e293b'} onChange={(e) => saveConfig({ ...config, cardColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" /></div>
                  <div><label className="block text-sm text-slate-400 mb-2">Text Color</label><input type="color" value={config.textColor || '#ffffff'} onChange={(e) => saveConfig({ ...config, textColor: e.target.value })} className="w-full h-10 rounded bg-slate-900 border-none cursor-pointer" /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm text-slate-400 mb-2">Opacity ({config.cardOpacity}%)</label><input type="range" min="0" max="100" value={config.cardOpacity || 80} onChange={(e) => saveConfig({ ...config, cardOpacity: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                  <div className="flex items-end pb-2"><div className="flex items-center gap-2"><input type="checkbox" id="useBlurStyle" checked={config.useBlur !== false} onChange={(e) => saveConfig({ ...config, useBlur: e.target.checked })} className="rounded border-slate-700 bg-slate-900 text-blue-600" /><label htmlFor="useBlurStyle" className="text-sm text-slate-300">Enable Blur</label></div></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs text-slate-500 mb-1">Title</label><input type="range" min="12" max="32" value={config.titleFontSize} onChange={(e) => saveConfig({ ...config, titleFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">URL</label><input type="range" min="8" max="24" value={config.urlFontSize} onChange={(e) => saveConfig({ ...config, urlFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">IP</label><input type="range" min="8" max="20" value={config.ipFontSize} onChange={(e) => saveConfig({ ...config, ipFontSize: parseInt(e.target.value) })} className="w-full accent-blue-600" /></div>
                </div>
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