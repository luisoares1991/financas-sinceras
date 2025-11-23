import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Zap, ExternalLink } from 'lucide-react';
import { ChatMessage, Persona, MarketItem, Transaction } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface ChatWidgetProps {
  stats: { income: number; expense: number; topCategory: string };
  marketItems: MarketItem[];
  transactions: Transaction[]; // <--- NOVO PROP
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ stats, marketItems, transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>(Persona.SINCERO);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Oi! Sou seu consultor. Escolha meu humor e vamos falar de dinheiro.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Transform messages for history (excluding last one which is the current prompt)
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      // AGORA PASSAMOS AS TRANSAÇÕES AQUI
      const { text, sources } = await getFinancialAdvice(userMsg.text, history, persona, stats, marketItems, transactions);
      
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: text,
        sources: sources
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Erro ao conectar com o cérebro digital. Tente depois.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-600/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-40"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-gray-200 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300
                        bottom-0 left-0 right-0 w-full h-[85vh] rounded-t-2xl border-t
                        sm:bottom-6 sm:right-6 sm:left-auto sm:w-96 sm:h-[500px] sm:rounded-2xl sm:border">
          
          {/* Chat Header */}
          <div className="bg-purple-600 p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-sm">Consultor {persona === Persona.FORMAL ? 'Formal' : 'Sincero'}</h3>
                <span className="text-xs text-purple-200 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-purple-200 hover:text-white p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Persona Switcher */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex gap-2 shrink-0">
            <button 
              onClick={() => setPersona(Persona.FORMAL)}
              className={`flex-1 text-xs py-2 rounded-md transition-colors font-medium ${persona === Persona.FORMAL ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-750'}`}
            >
              👔 Formal
            </button>
            <button 
              onClick={() => setPersona(Persona.SINCERO)}
              className={`flex-1 text-xs py-2 rounded-md transition-colors font-medium ${persona === Persona.SINCERO ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-750'}`}
            >
              🔥 Sincero
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none shadow-sm'
                }`}>
                  <div>{msg.text}</div>
                  
                  {/* Sources Section */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Fontes:
                      </p>
                      <div className="flex flex-col gap-1">
                        {msg.sources.map((source, idx) => (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-600 underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 pb-safe">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte algo..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default ChatWidget;