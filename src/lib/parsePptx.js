import JSZip from "jszip"

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function slideNumber(path) {
  const match = path.match(/slide(\d+)\.xml$/i)
  return match ? Number(match[1]) : 0
}

function extractText(xml) {
  return [...String(xml).matchAll(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g)]
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean)
}

function parseRels(xml) {
  return [...String(xml).matchAll(/Target="([^"]+)"/g)].map((match) => match[1])
}

export async function parsePptx(blob) {
  if (!blob || blob.size < 4) return []
  const zip = await JSZip.loadAsync(blob)
  const names = Object.keys(zip.files)
  const slidePaths = names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => slideNumber(a) - slideNumber(b))

  const slides = []
  for (const path of slidePaths) {
    const index = slideNumber(path)
    const xml = await zip.file(path).async("string")
    const texts = extractText(xml)
    const relPath = `ppt/slides/_rels/slide${index}.xml.rels`
    const relXml = zip.file(relPath) ? await zip.file(relPath).async("string") : ""
    const images = []

    for (const target of parseRels(relXml)) {
      if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(target)) continue
      const mediaPath = target.replace(/^\.\.\//, "ppt/")
      const file = zip.file(mediaPath)
      if (!file) continue
      const bytes = await file.async("blob")
      images.push(URL.createObjectURL(bytes))
    }

    const notesPath = `ppt/notesSlides/notesSlide${index}.xml`
    const notesXml = zip.file(notesPath) ? await zip.file(notesPath).async("string") : ""
    const noteTexts = extractText(notesXml).filter((text) => text !== "Click to edit Master text styles" && !/^Slide \d+$/i.test(text))

    slides.push({
      id: index,
      title: texts[0] || `Slide ${index}`,
      kicker: texts.length > 2 ? texts[0] : `${String(index).padStart(2, "0")} · SLIDE`,
      heading: texts[0] || `Slide ${index}`,
      body: texts.slice(1).join("\n\n"),
      notes: noteTexts.join("\n") || texts.slice(1).join("\n"),
      images,
    })
  }

  return slides
}

export function revokeSlideImages(slides) {
  for (const slide of slides || []) {
    for (const url of slide.images || []) URL.revokeObjectURL(url)
  }
}
