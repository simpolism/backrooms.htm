import React, { useState, useEffect } from 'react';
import { CollapsibleSectionProps } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  defaultCollapsed = false,
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(`collapse-${id}`, defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`collapsible-section ${isCollapsed ? 'collapsed' : ''}`} id={id}>
      <div className="collapsible-header" onClick={toggleCollapse}>
        <h2>{title}</h2>
        <span className="collapse-indicator">▼</span>
      </div>
      <div className="collapsible-content">
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;