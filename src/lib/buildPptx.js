import PptxGenJS from "pptxgenjs"

const Pptx = PptxGenJS.default || PptxGenJS

export async function buildPptxBlob(course) {
  const pptx = new Pptx()
  pptx.layout = "LAYOUT_WIDE"
  pptx.title = course.title || "Course deck"
  const slides = course.plan?.slides || []

  if (!slides.length) {
    const slide = pptx.addSlide()
    slide.background = { color: "101828" }
    slide.addText("No slides yet", { x: 0.6, y: 2.2, w: 12, fontSize: 28, color: "FFFFFF", bold: true })
  }

  for (const item of slides) {
    const slide = pptx.addSlide()
    slide.background = { color: "101828" }
    slide.addText(item.kicker || "", {
      x: 0.6,
      y: 0.4,
      w: 12,
      fontSize: 12,
      color: "A99FFF",
      bold: true,
    })
    slide.addText(item.heading || item.title || "", {
      x: 0.6,
      y: 1.1,
      w: 12,
      h: 2.2,
      fontSize: 28,
      color: "FFFFFF",
      bold: true,
    })
    slide.addText(item.body || "", {
      x: 0.6,
      y: 3.5,
      w: 12,
      h: 2.4,
      fontSize: 16,
      color: "D0D5DD",
    })
    if (item.notes) slide.addNotes(item.notes)
  }

  return pptx.write({ outputType: "blob" })
}
