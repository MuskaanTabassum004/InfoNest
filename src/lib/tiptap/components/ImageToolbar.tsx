import React from 'react';
import {
  AlignCenter,
  Expand,
  FullscreenIcon as Fullscreen
} from 'lucide-react';

interface ImageToolbarProps {
  layout: 'full-column' | 'outset' | 'full-screen';
  onLayoutChange: (layout: 'full-column' | 'outset' | 'full-screen') => void;
}

export const ImageToolbar: React.FC<ImageToolbarProps> = ({
  layout,
  onLayoutChange,
}) => {
  const layoutOptions = [
    {
      id: 'full-column',
      label: 'Full Column',
      icon: AlignCenter,
      description: 'Standard width within content column',
    },
    {
      id: 'outset',
      label: 'Outset',
      icon: Expand,
      description: 'Extends beyond column boundaries',
    },
    {
      id: 'full-screen',
      label: 'Full Width',
      icon: Fullscreen,
      description: 'Spans entire article view width',
    },
  ] as const;

  return (
    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-1">
        {/* Layout Options */}
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200">
          {layoutOptions.map((option) => {
            const Icon = option.icon;
            const isActive = layout === option.id;
            
            return (
              <button
                key={option.id}
                onClick={() => onLayoutChange(option.id)}
                className={`
                  p-2 rounded-md transition-colors text-xs font-medium flex flex-col items-center min-w-[60px]
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }
                `}
                title={option.description}
              >
                <Icon className="h-4 w-4 mb-1" />
                <span className="text-[10px] leading-none">{option.label}</span>
              </button>
            );
          })}
        </div>


      </div>

      {/* Toolbar Arrow */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200"></div>
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white absolute -top-1 left-0"></div>
      </div>
    </div>
  );
};
