import React from "react"
import ReactMarkdown from "react-markdown"

export default function MarkdownViewer({ content }) {
  if (!content) return null

  return (
    <div className="markdown-viewer">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 style={{ marginBottom: "1rem" }} {...props} />,
          h2: ({node, ...props}) => <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }} {...props} />,
          h3: ({node, ...props}) => <h3 style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }} {...props} />,
          p: ({node, ...props}) => <p style={{ marginBottom: "1rem", lineHeight: 1.6 }} {...props} />,
          ul: ({node, ...props}) => <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", listStyle: "disc" }} {...props} />,
          ol: ({node, ...props}) => <ol style={{ paddingLeft: "1.5rem", marginBottom: "1rem", listStyle: "decimal" }} {...props} />,
          li: ({node, ...props}) => <li style={{ marginBottom: "0.5rem" }} {...props} />,
          a: ({node, ...props}) => <a style={{ color: "var(--accent)", textDecoration: "none" }} {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote style={{
              borderLeft: "4px solid var(--accent)",
              paddingLeft: "1rem",
              marginLeft: 0,
              color: "var(--muted)",
              marginBottom: "1rem"
            }} {...props} />
          ),
          code: ({node, inline, ...props}) => (
            <code style={{
              background: "var(--surface-inset)",
              padding: inline ? "0.2rem 0.4rem" : "1rem",
              borderRadius: "var(--radius-xs)",
              display: inline ? "inline" : "block",
              fontFamily: "monospace",
              overflowX: inline ? "visible" : "auto",
              marginBottom: inline ? "0" : "1rem",
              whiteSpace: inline ? "normal" : "pre"
            }} {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
