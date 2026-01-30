
import React from 'react';
import { Persona } from '../types';
import PersonaCard from './PersonaCard';

interface PersonaGalleryProps {
  personas: Persona[];
  onStartCall: (persona: Persona) => void;
  onStartChat: (persona: Persona, avatarUrl?: string) => void;
  onViewProfile: (persona: Persona, avatarUrl?: string) => void;
}

const PersonaGallery: React.FC<PersonaGalleryProps> = ({ personas, onStartCall, onStartChat, onViewProfile }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-3 pb-20">
      {/* 
         Mobile-First Grid: 
         - Single column on mobile (w-full cards)
         - 2 columns on tablet
         - 4 columns on desktop 
         - Gap adjusted for card spacing
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
        {personas.map((persona) => (
          <PersonaCard 
            key={persona.id} 
            persona={persona} 
            onStartCall={onStartCall} 
            onStartChat={onStartChat}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonaGallery;