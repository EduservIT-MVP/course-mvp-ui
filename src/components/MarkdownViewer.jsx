import React from "react"
import ReactMarkdown from "react-markdown"

export default function MarkdownViewer({ content }) {
  if (!content) return null

  return (
    <div className="markdown-viewer">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="md-h1" {...props} />,
          h2: ({node, ...props}) => <h2 className="md-h2" {...props} />,
          h3: ({node, ...props}) => <h3 className="md-h3" {...props} />,
          h4: ({node, ...props}) => <h4 className="md-h4" {...props} />,
          p: ({node, ...props}) => <p className="md-p" {...props} />,
          ul: ({node, ...props}) => <ul className="md-ul" {...props} />,
          ol: ({node, ...props}) => <ol className="md-ol" {...props} />,
          li: ({node, ...props}) => <li className="md-li" {...props} />,
          hr: ({node, ...props}) => <hr className="md-hr" {...props} />,
          a: ({node, ...props}) => <a className="md-a" target="_blank" rel="noopener noreferrer" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="md-blockquote" {...props} />,
          code: ({node, inline, ...props}) => (
            <code className={inline ? "md-code-inline" : "md-code-block"} {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

