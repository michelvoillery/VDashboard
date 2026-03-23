import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Pencil } from 'lucide-react';

const ServiceCard = ({ 
  service, 
  index, 
  sectionId, 
  isEditMode, 
  statuses, 
  config, 
  cardStyle, 
  onEdit, 
  onDelete 
}) => {
  const iconCDN = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/';
  const status = statuses[service.localIp];
  
  const getTagPlacementStyle = () => {
    switch(config.tagPlacement) {
      case 'top-left': return 'absolute top-2 left-2 flex-row';
      case 'top-right': return 'absolute top-2 right-2 flex-row-reverse';
      case 'bottom-left': return 'absolute bottom-2 left-2 flex-row';
      case 'bottom-right': return 'absolute bottom-2 right-2 flex-row-reverse';
      case 'top': return 'relative mb-2 flex-row justify-center';
      case 'bottom': 
      default: return 'relative mt-2 flex-row justify-center';
    }
  };

  const tagContainer = service.tags ? (
    <div className={`flex flex-wrap gap-1 z-10 ${getTagPlacementStyle()}`}>
      {service.tags.split(',').map(tag => tag.trim()).filter(t => t !== '').map((tag, idx) => (
        <span 
          key={idx} 
          className='px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold'
          style={{ 
            borderRadius: `${config.cardRounding / 2}px`,
            backgroundColor: config.tagUseBg 
              ? (service.tagColor || config.tagColor || '#3b82f6') 
              : `${service.tagColor || config.tagColor || '#3b82f6'}20`,
            border: config.tagUseBg 
              ? 'none' 
              : `1px solid ${service.tagColor || config.tagColor || '#3b82f6'}40`,
            color: config.tagUseBg 
              ? '#ffffff' 
              : (service.tagColor || config.tagColor || '#3b82f6')
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  ) : null;

  return (
    <Draggable 
      key={`${sectionId}-${index}`} 
      draggableId={`${sectionId}-${index}`} 
      index={index} 
      isDragDisabled={!isEditMode}
    >
      {(provided) => (
        <div 
          ref={provided.innerRef} 
          {...provided.draggableProps} 
          {...provided.dragHandleProps} 
          style={{ 
            ...provided.draggableProps.style,
            width: `${config.cardSize || 200}px` 
          }}
          className='flex-shrink-0'
        >
          <div 
            className='border border-slate-700/50 transition-all group relative h-full flex flex-col items-center justify-center text-center hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98]' 
            style={{ 
              ...cardStyle, 
              height: `${config.cardHeight || 160}px` 
            }}
          >
            {config.tagPlacement.startsWith('top') && tagContainer}
            
            <div className='absolute top-3 right-3'>
              {!service.localIp ? (
                <div className='w-3 h-3 rounded-full border border-slate-500 border-dashed' title='No IP'></div>
              ) : (
                <div 
                  className={`w-3 h-3 rounded-full shadow-sm transition-colors duration-500 ${
                    status === 'online' ? 'bg-green-500 shadow-green-500/50' : 
                    status === 'offline' ? 'bg-amber-500 shadow-amber-500/50' : 
                    'bg-slate-600'
                  }`} 
                  title={status || 'Checking...'}
                ></div>
              )}
            </div>

            {isEditMode && (
              <div className='absolute -top-2 -right-2 flex gap-1 z-20'>
                <button 
                  onClick={() => onEdit(service, index)} 
                  className='bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-400 transition-colors'
                >
                  <Pencil size={12} />
                </button>
                <button 
                  onClick={() => onDelete(sectionId, index)} 
                  className='bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg hover:bg-red-400 transition-colors'
                >
                  ×
                </button>
              </div>
            )}

            <img 
              src={service.customIcon ? `/api/icons/images/${service.customIcon}` : `${iconCDN}${service.icon}.png`} 
              alt='' 
              style={{ width: `${config.iconSize || 64}px`, height: `${config.iconSize || 64}px` }}
              className='mb-4 object-contain drop-shadow-md' 
              onError={(e) => { if (!service.customIcon) e.target.src = 'https://via.placeholder.com/64?text=?' }} 
            />

            <h3 
              className='font-semibold w-full px-2 line-clamp-1' 
              style={{ fontSize: `${config.titleFontSize}px` }}
            >
              {service.name}
            </h3>
            
            <p 
              className='truncate mt-1 opacity-80 w-full px-2' 
              style={{ fontSize: `${config.urlFontSize}px` }}
            >
              {service.url}
            </p>
            {service.localIp && (
              <p 
                className='truncate opacity-60 w-full px-2' 
                style={{ fontSize: `${config.ipFontSize}px` }}
              >
                {service.localIp}
              </p>
            )}

            {!config.tagPlacement.startsWith('top') && tagContainer}

            {!isEditMode && (
              <a 
                href={service.url} 
                target='_blank' 
                rel='noopener noreferrer' 
                className='absolute inset-0 rounded-[inherit]'
              ></a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default ServiceCard;
