import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const RGB_OVERRIDES = `
:root {
  --background: #ffffff;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --popover: #ffffff;
  --popover-foreground: #111827;
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #f3f4f6;
  --secondary-foreground: #111827;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --accent: #fde68a;
  --accent-foreground: #111827;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #10b981;
  --success: #10b981;
  --warning: #f59e0b;
}
.dark {
  --background: #111827;
  --foreground: #f9fafb;
  --card: #111827;
  --card-foreground: #f9fafb;
  --popover: #111827;
  --popover-foreground: #f9fafb;
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #1f2937;
  --secondary-foreground: #f9fafb;
  --muted: #1f2937;
  --muted-foreground: #9ca3af;
  --accent: #fde68a;
  --accent-foreground: #111827;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #374151;
  --input: #374151;
  --ring: #10b981;
  --success: #10b981;
  --warning: #f59e0b;
}
`

// Pattern to match modern CSS color functions
const MODERN_COLOR_PATTERN = /oklch\(|oklab\(|lab\(|lch\(|color\(/i

function cleanStyles(node: Node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element

    // Remove style attribute if it contains modern color functions
    const style = element.getAttribute("style")
    if (style && MODERN_COLOR_PATTERN.test(style)) {
      element.removeAttribute("style")
    }

    // Recursively clean child nodes
    element.childNodes.forEach(cleanStyles)
  }
}

export async function generateReceiptPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  try {
    // Create a wrapper with Shadow DOM to isolate from global styles
    const wrapper = document.createElement("div")
    wrapper.style.position = "absolute"
    wrapper.style.left = "-9999px"
    wrapper.style.top = "-9999px"
    wrapper.style.zIndex = "-1"

    // Create shadow DOM
    const shadow = wrapper.attachShadow({ mode: "open" })

    // Add clean styles
    const style = document.createElement("style")
    style.textContent = RGB_OVERRIDES
    shadow.appendChild(style)

    // Clone the element
    const clone = element.cloneNode(true) as HTMLElement

    // Clean inline styles that might contain modern color functions
    cleanStyles(clone)

    shadow.appendChild(clone)
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      // Ignore elements that might cause issues
      ignoreElements: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element
          const style = el.getAttribute("style") || ""
          const className = el.className || ""
          return MODERN_COLOR_PATTERN.test(style) || MODERN_COLOR_PATTERN.test(className)
        }
        return false
      },
    })

    // Clean up
    document.body.removeChild(wrapper)

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(filename)
    return true
  } catch (error) {
    console.error("PDF generation failed:", error)
    return false
  }
}
