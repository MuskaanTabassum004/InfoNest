import React from "react";
import { Search } from "lucide-react";

interface SearchTriggerProps {
  onClick: () => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "minimal" | "hero";
}

export const SearchTrigger: React.FC<SearchTriggerProps> = ({
  onClick,
  placeholder = "Search articles...",
  className = "",
  variant = "default"
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "minimal":
        return "bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-md px-4 py-2 rounded-xl";
      case "hero":
        return "bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl px-6 py-5 rounded-2xl text-lg";
      default:
        return "bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-md px-4 py-3 rounded-xl";
    }
  };

  return (
    <button
      data-search-trigger
      onClick={onClick}
      className={`
        w-full flex items-center space-x-3 text-left transition-all duration-200 cursor-pointer
        ${getVariantStyles()}
        ${className}
      `}
    >
      <Search className={`text-gray-400 ${variant === "hero" ? "h-6 w-6" : "h-5 w-5"}`} />
      <span className="text-gray-500 flex-1">{placeholder}</span>
      <div className="hidden md:flex items-center space-x-1 text-xs text-gray-400">
        <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">⌘</kbd>
        <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">K</kbd>
      </div>
    </button>
  );
};