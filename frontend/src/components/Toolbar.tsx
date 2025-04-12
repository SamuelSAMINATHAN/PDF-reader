import React from 'react';

export interface ToolbarAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

interface ToolbarProps {
  title?: string;
  actions: ToolbarAction[];
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  title,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 ${className}`}>
      {title && (
        <h2 className="text-lg font-medium text-gray-800">{title}</h2>
      )}
      
      <div className="flex items-center space-x-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`
              flex items-center px-3 py-2 rounded-md text-sm transition-colors
              ${action.primary 
                ? action.disabled 
                  ? 'bg-blue-200 text-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                : action.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
            title={action.label}
          >
            {action.icon && (
              <span className="mr-2">{action.icon}</span>
            )}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Toolbar;
