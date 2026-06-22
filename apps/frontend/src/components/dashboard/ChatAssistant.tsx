import { Bot, Loader2, Send, Sparkles, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { TypingMessage } from './TypingMessage'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatAssistantProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function ChatAssistant({ isOpen, setIsOpen }: ChatAssistantProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Command Center Assistant. Ask me to run scenarios or query current traffic conditions.',
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatBoxRef.current && !chatBoxRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  // Auto-scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [history, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const newHistory = [...history, { role: 'user' as const, content: input }]
    setHistory(newHistory)
    setInput('')
    setIsLoading(true)

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      })

      const data = await res.json()

      if (res.ok) {
        setHistory((prev) => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setHistory((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        ])
      }
    } catch (error) {
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection failed. Please check your network and try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="absolute bottom-6 left-6 z-[1000] flex flex-col pointer-events-auto">
      {isOpen && (
        <div
          ref={chatBoxRef}
          className="w-[400px] sm:w-[450px] h-[500px] max-h-[70vh] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-medium tracking-wide text-zinc-100">AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white bg-zinc-800/0 hover:bg-zinc-800/80 p-1.5 rounded-md transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Area */}
          <div
            className="flex-1 p-4 overflow-y-auto min-h-0"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4 pb-2">
              {history.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-zinc-800 border border-zinc-700'}`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-zinc-300" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-sm' : 'bg-zinc-800/40 text-zinc-300 border border-zinc-700/50 rounded-tl-sm shadow-sm'}`}
                  >
                    {msg.role === 'assistant' && i === history.length - 1 ? (
                      <TypingMessage content={msg.content} onComplete={scrollToBottom} />
                    ) : (
                      <div className="text-[14px] leading-relaxed markdown-body overflow-x-auto">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-2">
                                <table
                                  className="min-w-full divide-y divide-zinc-700 border border-zinc-700"
                                  {...props}
                                />
                              </div>
                            ),
                            th: ({ node, ...props }) => (
                              <th
                                className="px-3 py-2 bg-zinc-800 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider"
                                {...props}
                              />
                            ),
                            td: ({ node, ...props }) => (
                              <td
                                className="px-3 py-2 whitespace-nowrap text-sm text-zinc-300 border-t border-zinc-700"
                                {...props}
                              />
                            ),
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => (
                              <ul className="list-disc pl-5 mb-2" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol className="list-decimal pl-5 mb-2" {...props} />
                            ),
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-zinc-800 border border-zinc-700">
                    <Bot className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-[13px] text-zinc-400 tracking-wide">
                      Analyzing system context...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about traffic scenarios..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-5 pr-12 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600 shadow-inner"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 rounded-full bg-blue-600 text-white disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors hover:bg-blue-500 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
