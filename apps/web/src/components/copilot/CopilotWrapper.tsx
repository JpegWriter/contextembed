'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ActiveField {
  stepId: string;
  fieldId: string;
}

export interface BusinessContext {
  brandName: string;
  tagline?: string;
  industry?: string;
  niche?: string;
  services?: string[];
  targetAudience?: string;
  brandVoice?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  // Authority fields
  yearsExperience?: number;
  credentials?: string[];
  specializations?: string[];
  awardsRecognition?: string[];
  clientTypes?: string;
  keyDifferentiator?: string;
  pricePoint?: 'budget' | 'mid-range' | 'premium' | 'luxury';
  defaultEventType?: string;
}

interface CopilotContextType {
  activeField: ActiveField | null;
  setActiveField: (field: ActiveField | null) => void;
  formContext: Record<string, any>;
  updateFormContext: (updates: Record<string, any>) => void;
  businessContext: BusinessContext | null;
  setBusinessContext: (ctx: BusinessContext) => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const CopilotContext = createContext<CopilotContextType | null>(null);

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error('useCopilot must be used within CopilotWrapper');
  return ctx;
}

interface CopilotWrapperProps {
  children: ReactNode;
  initialContext?: Partial<BusinessContext>;
}

export function CopilotWrapper({ children, initialContext }: CopilotWrapperProps) {
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [formContext, setFormContext] = useState<Record<string, any>>({});
  const [isEnabled, setIsEnabled] = useState(true);
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(
    initialContext ? { brandName: '', ...initialContext } : null
  );

  const updateFormContext = useCallback((updates: Record<string, any>) => {
    setFormContext(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <CopilotContext.Provider
      value={{
        activeField,
        setActiveField,
        formContext,
        updateFormContext,
        businessContext,
        setBusinessContext,
        isEnabled,
        setIsEnabled,
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
}
