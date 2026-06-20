import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TypingMessageProps {
  content: string
  speed?: number
  onComplete?: () => void
}

export function TypingMessage({ content, speed = 15, onComplete }: TypingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    let i = 0

    const timer = setInterval(() => {
      if (i < content.length) {
        setDisplayedContent(content.substring(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        if (onCompleteRef.current) onCompleteRef.current()
      }
    }, speed)

    return () => clearInterval(timer)
  }, [content, speed])

  return (
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
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
        }}
      >
        {displayedContent}
      </ReactMarkdown>
    </div>
  )
}
