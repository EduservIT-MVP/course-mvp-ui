import re

with open('src/screens/CourseOverview.jsx', 'r') as f:
    content = f.read()

# 1. Remove search state
content = re.sub(r'  const \[searchQuery, setSearchQuery\] = useState\(""\)\n', '', content)
content = re.sub(r'  // Filter items based on search query\n  const query = searchQuery\.toLowerCase\(\)\.trim\(\)\n  const filteredItems = allItems\.filter\(item => item\.title\.toLowerCase\(\)\.includes\(query\)\)\n', '  const filteredItems = allItems\n', content)

# 2. Change "Other" to "Additional files"
content = content.replace('{ id: "other", label: "Other", items: [] }', '{ id: "other", label: "Additional files", items: [] }')

# 3. Replace Search Input UI
content = re.sub(r'            \{\/\* Search Input \*\/\}.*?</div>\n', '', content, flags=re.DOTALL)

# 4. Hide "Download Section" for 'other'
content = content.replace('{canDownload && onDownloadSection && section.items.some(i => i.artifact) ? (', '{canDownload && onDownloadSection && section.id !== "other" && section.items.some(i => i.artifact) ? (')

# 5. Course Details Block with Topic
old_details = '''            {/* Course Details Block */}
            <div className="brief-card" style={{ padding: "12px", border: "1px solid var(--line)" }}>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--foreground-muted)" }}>TARGET AUDIENCE</span>
                <div style={{ fontSize: "14px" }}>{course?.audience || "Not specified"}</div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--foreground-muted)" }}>LEVEL</span>
                  <div style={{ fontSize: "14px" }}>{course?.level || "Not specified"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--foreground-muted)" }}>DURATION</span>
                  <div style={{ fontSize: "14px" }}>{course?.duration || "Not specified"}</div>
                </div>
              </div>
            </div>'''

new_details = '''            {/* Course Details Block */}
            <div className="brief-card" style={{ padding: "16px", border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-xs)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Topic / Title</span>
                  <div style={{ fontSize: "14px", color: "var(--ink)", marginTop: 4 }}>{course?.title || "Not specified"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Target Audience</span>
                  <div style={{ fontSize: "14px", color: "var(--ink)", marginTop: 4 }}>{course?.audience || "Not specified"}</div>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Level</span>
                    <div style={{ fontSize: "14px", color: "var(--ink)", marginTop: 4 }}>{course?.level || "Not specified"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Duration</span>
                    <div style={{ fontSize: "14px", color: "var(--ink)", marginTop: 4 }}>{course?.duration || "Not specified"}</div>
                  </div>
                </div>
              </div>
            </div>'''
content = content.replace(old_details, new_details)

# 6. Update Preview Panel Download Button
old_preview_btn = '''              {canDownload && currentItem?.artifact ? (
                <Button variant="secondary" size="sm" onClick={() => onDownload(currentItem.artifact)}>
                  Download
                </Button>
              ) : null}'''

new_preview_btn = '''              {canDownload && currentItem?.artifact ? (
                <Button variant="primary" size="sm" onClick={() => onDownload(currentItem.artifact)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </Button>
              ) : null}'''
content = content.replace(old_preview_btn, new_preview_btn)

# 7. Update Fallback Download Button
old_fallback_btn = '''                  {canDownload ? (
                    <Button variant="secondary" style={{ marginTop: "16px" }} onClick={() => onDownload(currentItem.artifact)}>
                      Download File
                    </Button>
                  ) : null}'''

new_fallback_btn = '''                  {canDownload ? (
                    <Button variant="primary" style={{ marginTop: "16px" }} onClick={() => onDownload(currentItem.artifact)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download File
                    </Button>
                  ) : null}'''
content = content.replace(old_fallback_btn, new_fallback_btn)

# 8. Fix CSS variables
content = content.replace('var(--foreground-muted)', 'var(--muted)')
content = content.replace('var(--foreground)', 'var(--ink)')

# 9. Remove `!hasResults ? ... : ` check since search is gone
content = re.sub(r'              \{!hasResults \? \(\n                <p className="hint">No artifacts match your search\.</p>\n              \) : \(\n(.*?)              \)\}\n', r'\1', content, flags=re.DOTALL)


with open('src/screens/CourseOverview.jsx', 'w') as f:
    f.write(content)
