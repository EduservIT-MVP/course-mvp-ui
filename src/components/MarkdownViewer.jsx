import React from "react"

export default function MarkdownViewer({ content }) {
  if (!content) return null
  return (
    <pre className="markdown-pre" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
      {content}
    </pre>
  )
}
