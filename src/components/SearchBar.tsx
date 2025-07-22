import React, { useState } from "react";
import { SearchTrigger } from "./SearchTrigger";
import { SearchModal } from "./SearchModal";

interface SearchBarProps {
  onResultClick?: () => void;
  placeholder?: string;
  variant?: "default" | "minimal" | "hero";
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onResultClick,
  placeholder = "Search articles, guides, documentation...",
  variant = "default",
  className = ""
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <SearchTrigger
        onClick={() => setIsModalOpen(true)}
        placeholder={placeholder}
        variant={variant}
        className={className}
      />
      
      <SearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onResultClick={() => {
          setIsModalOpen(false);
          onResultClick?.();
        }}
      />
    </>
  );
};
