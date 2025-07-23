import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Edit3 } from 'lucide-react';

interface AltTextInputProps {
  initialValue: string;
  onSave: (altText: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

export const AltTextInput: React.FC<AltTextInputProps> = ({
  initialValue,
  onSave,
  onCancel,
  placeholder = "Enter alt text for accessibility...",
  className = "",
}) => {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(!initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = value.trim();
    onSave(trimmedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className={`mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Alt Text (for accessibility)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={250}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {value.length}/250 characters
              </span>
              <span className="text-xs text-gray-500">
                Press Enter to save, Esc to cancel
              </span>
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleSave}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              title="Save alt text"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              title="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 ${className}`}>
      {value ? (
        <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex-1">
            <span className="text-xs font-medium text-gray-700">Alt Text:</span>
            <p className="text-sm text-gray-600 mt-1">{value}</p>
          </div>
          <button
            onClick={handleEdit}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Edit alt text"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleEdit}
          className="w-full p-2 text-left text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <Edit3 className="h-4 w-4 inline mr-2" />
          Click to add alt text for accessibility...
        </button>
      )}
    </div>
  );
};
