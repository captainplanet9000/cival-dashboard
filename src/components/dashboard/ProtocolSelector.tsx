import React from 'react';
import { ProtocolType } from '../../types/defi-protocol-types';

interface ProtocolSelectorProps {
  protocols: ProtocolType[];
  selectedProtocol: ProtocolType | 'all';
  onSelectProtocol: (protocol: ProtocolType | 'all') => void;
  className?: string;
}

/**
 * A component that provides UI for selecting specific protocols to view
 */
const ProtocolSelector: React.FC<ProtocolSelectorProps> = ({
  protocols,
  selectedProtocol,
  onSelectProtocol,
  className = ''
}) => {
  // Handle protocol selection
  const handleProtocolChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'all') {
      onSelectProtocol('all');
    } else {
      onSelectProtocol(value as ProtocolType);
    }
  };
  
  return (
    <div className={`protocol-selector ${className}`}>
      <label htmlFor="protocol-select" className="selector-label">
        Protocol:
      </label>
      
      <select
        id="protocol-select"
        className="protocol-select"
        value={selectedProtocol}
        onChange={handleProtocolChange}
      >
        <option value="all">All Protocols</option>
        
        {protocols.map(protocol => (
          <option key={protocol} value={protocol}>
            {protocol}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProtocolSelector; 