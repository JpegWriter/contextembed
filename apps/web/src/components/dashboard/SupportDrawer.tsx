'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSupabase } from '@/lib/supabase-provider';
import type { Session } from '@supabase/supabase-js';
import {
  MessageCircleQuestion,
  X,
  Send,
  Loader2,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  FileText,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Quick action suggestions
const QUICK_ACTIONS = [
  { label: 'Why is Export disabled?', message: 'Why is the export button greyed out?' },
  { label: 'How do I run embed?', message: 'How do I embed metadata into my assets?' },
  { label: 'Metadata disappeared after ChatGPT', message: 'My metadata disappeared after ChatGPT processed the image. What happened?' },
  { label: 'Run Survival Study checklist', message: 'How do I run a Phase 1 Survival Study?' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  playbookId?: string;
  confidence?: 'high' | 'medium' | 'low';
  suggestTicket?: boolean;
}

interface ContextBundle {
  user: {
    id: string;
    email: string;
    tier: string;
  };
  app: {
    version: string;
    environment: string;
  };
  route: string;
  latest?: {
    last_action?: { type: string; createdAt: string } | null;
    last_error?: { type: string; payload: unknown; createdAt: string } | null;
  };
  limits?: {
    monthly_assets: number;
    assets_used: number;
  };
  events?: unknown[];
  project_summary?: string;
}

interface SupportDrawerProps {
  currentRoute?: string;
}

export default function SupportDrawer({ currentRoute = '' }: SupportDrawerProps) {
  const { supabase } = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ContextBundle | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketPayload, setTicketPayload] = useState<Record<string, unknown> | null>(null);
  const [ticketCopied, setTicketCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get session from supabase client
  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch context when drawer opens
  const fetchContext = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const res = await fetch(`${API_URL}/operator/context?route=${encodeURIComponent(currentRoute)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setContext(data);
      }
    } catch (err) {
      console.error('Failed to fetch context:', err);
    }
  }, [session?.access_token, currentRoute]);

  useEffect(() => {
    if (isOpen) {
      fetchContext();
    }
  }, [isOpen, fetchContext]);

  // Send message to operator
  const sendMessage = async (messageText: string) => {
    if (!session?.access_token || !messageText.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/operator/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: messageText.trim(),
          route: currentRoute,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          playbookId: data.playbookId,
          confidence: data.confidence,
          suggestTicket: data.suggestTicket,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an error: ${error.error || 'Unknown error'}. Please try again.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Connection error. Please check your network and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create support ticket
  const createTicket = async () => {
    if (!session?.access_token) return;

    setIsCreatingTicket(true);

    try {
      // Get the last user message and assistant response
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

      const res = await fetch(`${API_URL}/operator/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userMessage: lastUserMsg?.content || 'Support request',
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          route: currentRoute,
          category: lastAssistantMsg?.playbookId || 'general',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTicketPayload(data.ticket);
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Failed to create ticket: ${error.error || 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Failed to create ticket. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Copy ticket to clipboard
  const copyTicket = async () => {
    if (!ticketPayload) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(ticketPayload, null, 2));
      setTicketCopied(true);
      setTimeout(() => setTicketCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Render confidence badge
  const renderConfidenceBadge = (confidence?: 'high' | 'medium' | 'low') => {
    if (!confidence) return null;

    const colors = {
      high: 'bg-green-900/50 text-green-400 border-green-700',
      medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      low: 'bg-red-900/50 text-red-400 border-red-700',
    };

    return (
      <span className={`text-[10px] px-1.5 py-0.5 border ${colors[confidence]}`}>
        {confidence} confidence
      </span>
    );
  };

  return (
    <>
      {/* Floating Support Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 btn-gradient-border"
        aria-label="Open Support"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-steel-900 border-l border-steel-700 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-steel-700 bg-steel-900/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              CE Support Operator
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-steel-400 hover:text-white hover:bg-steel-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Context Badge */}
        {context ? (
          <div className="px-4 py-2 bg-steel-800/50 border-b border-steel-700 flex items-center gap-2 text-xs">
            <span className="text-steel-500">Context:</span>
            <span className="text-steel-300">{context.user.email}</span>
            <span className="text-steel-600">|</span>
            <span className="text-steel-400">{context.user.tier}</span>
            {context.latest?.last_error ? (
              <>
                <span className="text-steel-600">|</span>
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Error detected
                </span>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-steel-600 mx-auto mb-3" />
              <p className="text-steel-400 text-sm mb-6">
                How can I help you today? I can answer questions about ContextEmbed workflows,
                diagnose issues, and help you create support tickets.
              </p>

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-xs text-steel-500 uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-steel-300 bg-steel-800/50 hover:bg-steel-800 border border-steel-700 transition-colors disabled:opacity-50"
                  >
                    {action.label}
                    <ChevronRight className="h-3 w-3 text-steel-500" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-brand-600/20 border border-brand-700 text-brand-100'
                        : 'bg-steel-800 border border-steel-700 text-steel-200'
                    } px-3 py-2`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-steel-500">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.role === 'assistant' && renderConfidenceBadge(message.confidence)}
                      {message.playbookId && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-steel-700 text-steel-400 border border-steel-600">
                          {message.playbookId}
                        </span>
                      )}
                    </div>
                    {message.suggestTicket && (
                      <button
                        onClick={createTicket}
                        disabled={isCreatingTicket}
                        className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Create a support ticket for this issue
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-steel-800 border border-steel-700 px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-brand-400 animate-spin" />
                <span className="text-sm text-steel-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Ticket Payload Modal */}
        {ticketPayload ? (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-steel-900 border border-steel-700 max-w-md w-full max-h-[80vh] flex flex-col">
              <div className="px-4 py-3 border-b border-steel-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <h3 className="text-sm font-semibold text-white">Ticket Created</h3>
                </div>
                <button
                  onClick={() => setTicketPayload(null)}
                  className="p-1 text-steel-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs text-steel-300 bg-steel-800 p-3 border border-steel-700 overflow-auto max-h-64">
                  {JSON.stringify(ticketPayload, null, 2)}
                </pre>
                <p className="text-xs text-steel-400 mt-3">
                  Copy this ticket payload and send it to support, or use the link below.
                </p>
              </div>
              <div className="px-4 py-3 border-t border-steel-700 flex gap-2">
                <button
                  onClick={copyTicket}
                  className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider bg-steel-800 hover:bg-steel-700 text-steel-300 border border-steel-600 flex items-center justify-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {ticketCopied ? 'Copied!' : 'Copy JSON'}
                </button>
                <a
                  href={`mailto:support@contextembed.com?subject=Support Ticket&body=${encodeURIComponent(
                    JSON.stringify(ticketPayload, null, 2)
                  )}`}
                  className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider text-white flex items-center justify-center gap-2 btn-gradient-border"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Email Support
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {/* Input Area */}
        <div className="border-t border-steel-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your issue or ask a question..."
              rows={2}
              className="flex-1 bg-steel-800 border border-steel-700 text-steel-200 text-sm px-3 py-2 placeholder:text-steel-500 resize-none focus:outline-none focus:border-brand-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 disabled:bg-steel-700 disabled:text-steel-500 text-white transition-colors btn-gradient-border"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Create Ticket Button */}
          {messages.length > 0 && (
            <button
              onClick={createTicket}
              disabled={isCreatingTicket}
              className="w-full mt-3 py-2 text-xs font-semibold uppercase tracking-wider bg-steel-800 hover:bg-steel-700 text-steel-300 border border-steel-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreatingTicket ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Create Support Ticket
            </button>
          )}
        </div>
      </div>
    </>
  );
}
