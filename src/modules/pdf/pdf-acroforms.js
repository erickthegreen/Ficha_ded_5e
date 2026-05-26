const A4 = { width: 595.28, height: 841.89 };

const COLORS = {
  fallbackBg: '0.09 0.075 0.055',
  overlay: '0.020 0.018 0.014',
  sheet: '0.075 0.060 0.045',
  panel: '0.105 0.085 0.060',
  field: '0.965 0.925 0.805',
  fieldText: '0.075 0.055 0.035',
  border: '0.690 0.525 0.220',
  borderSoft: '0.410 0.315 0.160',
  accent: '0.835 0.660 0.250',
  text: '0.930 0.875 0.720',
  muted: '0.665 0.585 0.430'
};

function winAnsiHex(text) {
  const bytes = [];
  for (const char of String(text || '')) {
    const code = char.charCodeAt(0);
    bytes.push(code <= 255 ? code : 63);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}>`;
}

function utf16Hex(text) {
  const bytes = [0xfe, 0xff];
  for (const char of String(text || '')) {
    const code = char.charCodeAt(0);
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}>`;
}

function pdfName(name) {
  return String(name || 'field').replace(/[^A-Za-z0-9_.-]/g, '_');
}

function bytesToBinary(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return binary;
}

function stream(data, extraDictionary = '') {
  const extra = extraDictionary ? `${extraDictionary} ` : '';
  return `<< ${extra}/Length ${data.length} >>\nstream\n${data}\nendstream`;
}

function imageStream(data, width, height) {
  return stream(data, `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`);
}

function formStream(data, width, height, fontId) {
  return stream(
    data,
    `/Type /XObject /Subtype /Form /BBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Resources << /Font << /Helv ${fontId} 0 R >> >>`
  );
}

function rectFromTop(field) {
  const x1 = field.x;
  const y1 = A4.height - field.y - field.h;
  return [x1, y1, x1 + field.w, y1 + field.h];
}

function drawText(text, x, yTop, size = 9, color = COLORS.text) {
  const y = A4.height - yTop;
  return `BT /F1 ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${winAnsiHex(text)} Tj ET\n`;
}

function drawRect(x, yTop, w, h, color, gState = '') {
  const y = A4.height - yTop - h;
  const gs = gState ? `/${gState} gs ` : '';
  return `q ${gs}${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`;
}

function drawBorder(x, yTop, w, h, color = COLORS.border, width = 0.75) {
  const y = A4.height - yTop - h;
  return `${color} RG ${width.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
}

function drawLine(x1, yTop, x2, color = COLORS.border, width = 0.75) {
  const y = A4.height - yTop;
  return `${color} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S\n`;
}

function drawSection(section) {
  let content = '';
  content += drawRect(section.x, section.y, section.w, section.h, COLORS.panel, 'GSPanel');
  content += drawBorder(section.x, section.y, section.w, section.h, COLORS.borderSoft, 0.65);
  content += drawText(section.title, section.x + 12, section.y + 18, 10, COLORS.accent);
  content += drawLine(section.x + 12, section.y + 28, section.x + section.w - 12, COLORS.borderSoft, 0.45);
  return content;
}

function wrapText(text, maxChars) {
  const paragraphs = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      if (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars));
        }
        continue;
      }

      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

function createAppearanceContent(field) {
  const fontSize = field.fontSize || (field.multiline ? 7.4 : 9);
  const lineHeight = fontSize + 2.2;
  const padding = 4;
  const maxChars = Math.max(8, Math.floor((field.w - padding * 2) / (fontSize * 0.52)));
  const maxLines = field.multiline ? Math.max(1, Math.floor((field.h - padding * 2) / lineHeight)) : 1;
  const lines = wrapText(field.value || '', maxChars).slice(0, maxLines);
  let content = '';

  content += `${COLORS.field} rg 0 0 ${field.w.toFixed(2)} ${field.h.toFixed(2)} re f\n`;
  content += `${COLORS.border} RG 0.55 w 0.28 0.28 ${(field.w - 0.56).toFixed(2)} ${(field.h - 0.56).toFixed(2)} re S\n`;

  lines.forEach((line, index) => {
    const approxWidth = line.length * fontSize * 0.47;
    const x = field.align === 'center' ? Math.max(padding, (field.w - approxWidth) / 2) : padding;
    const y = field.h - padding - fontSize - (index * lineHeight);
    if (y > padding - fontSize) {
      content += `BT /Helv ${fontSize.toFixed(2)} Tf ${COLORS.fieldText} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${winAnsiHex(line)} Tj ET\n`;
    }
  });

  return content;
}

function createPageContent(page, pageIndex, hasImage) {
  let content = '';

  if (hasImage) {
    content += `q ${A4.width.toFixed(2)} 0 0 ${A4.height.toFixed(2)} 0 0 cm /Im${pageIndex + 1} Do Q\n`;
    content += drawRect(0, 0, A4.width, A4.height, COLORS.overlay, 'GSOverlay');
  } else {
    content += drawRect(0, 0, A4.width, A4.height, COLORS.fallbackBg);
  }

  content += drawRect(22, 24, A4.width - 44, A4.height - 48, COLORS.sheet, 'GSSheet');
  content += drawBorder(22, 24, A4.width - 44, A4.height - 48, COLORS.border, 1);
  content += drawText(page.title, 36, 48, 18, COLORS.accent);
  content += drawText('PDF editável - use Adobe Reader se o navegador limitar a edição.', 36, 66, 8, COLORS.muted);

  for (const section of page.sections || []) {
    content += drawSection(section);
  }

  for (const field of page.fields) {
    content += drawText(field.label, field.x, field.y - 7, 7, COLORS.muted);
    content += drawRect(field.x, field.y, field.w, field.h, COLORS.field, 'GSField');
    content += drawBorder(field.x, field.y, field.w, field.h, COLORS.border, 0.55);
  }

  const footer = `Página ${pageIndex + 1}`;
  content += drawText(footer, A4.width - 74, A4.height - 30, 8, COLORS.muted);

  return content;
}

export function createEditablePdf({ pages, backgroundImages = [] }) {
  const objects = new Map();
  let nextId = 1;
  const newId = () => nextId++;
  const setObject = (id, body) => objects.set(id, body);

  const fontId = newId();
  const overlayStateId = newId();
  const sheetStateId = newId();
  const panelStateId = newId();
  const fieldStateId = newId();
  const acroFormId = newId();
  const pagesId = newId();
  const catalogId = newId();
  const pageRefs = [];
  const allFieldRefs = [];

  setObject(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  setObject(overlayStateId, '<< /Type /ExtGState /ca 0.42 /CA 0.42 >>');
  setObject(sheetStateId, '<< /Type /ExtGState /ca 0.68 /CA 0.68 >>');
  setObject(panelStateId, '<< /Type /ExtGState /ca 0.76 /CA 0.76 >>');
  setObject(fieldStateId, '<< /Type /ExtGState /ca 0.96 /CA 0.96 >>');

  pages.forEach((page, pageIndex) => {
    const contentId = newId();
    const pageId = newId();
    const fieldIds = page.fields.map(() => newId());
    const appearanceIds = page.fields.map(() => newId());
    const image = backgroundImages[pageIndex] || backgroundImages[0] || null;
    const imageId = image ? newId() : null;
    const content = createPageContent(page, pageIndex, Boolean(image));
    const annots = [];

    if (image && imageId) {
      setObject(imageId, imageStream(bytesToBinary(image.bytes), image.width, image.height));
    }

    setObject(contentId, stream(content));

    page.fields.forEach((field, fieldIndex) => {
      const fieldId = fieldIds[fieldIndex];
      const appearanceId = appearanceIds[fieldIndex];
      const rect = rectFromTop(field).map((value) => value.toFixed(2)).join(' ');
      const flags = field.multiline ? 4096 : 0;
      const value = utf16Hex(field.value || '');
      const fontSize = field.fontSize || (field.multiline ? 7.4 : 9);
      const appearance = createAppearanceContent(field);

      setObject(appearanceId, formStream(appearance, field.w, field.h, fontId));
      setObject(fieldId, [
        '<<',
        '/Type /Annot',
        '/Subtype /Widget',
        '/FT /Tx',
        `/T (${pdfName(field.name)})`,
        `/TU ${utf16Hex(field.label)}`,
        `/V ${value}`,
        `/DV ${value}`,
        `/Rect [${rect}]`,
        `/P ${pageId} 0 R`,
        `/AP << /N ${appearanceId} 0 R >>`,
        '/F 4',
        flags ? `/Ff ${flags}` : '',
        `/DA (/Helv ${fontSize.toFixed(2)} Tf ${COLORS.fieldText} rg)`,
        '/MK << /BG [0.965 0.925 0.805] /BC [0.690 0.525 0.220] >>',
        '/BS << /W 0.55 /S /S >>',
        '>>'
      ].filter(Boolean).join('\n'));
      annots.push(`${fieldId} 0 R`);
      allFieldRefs.push(`${fieldId} 0 R`);
    });

    const xObject = image && imageId ? `/XObject << /Im${pageIndex + 1} ${imageId} 0 R >>` : '';
    setObject(pageId, [
      '<<',
      '/Type /Page',
      `/Parent ${pagesId} 0 R`,
      `/MediaBox [0 0 ${A4.width} ${A4.height}]`,
      `/Resources << /Font << /F1 ${fontId} 0 R /Helv ${fontId} 0 R >> /ExtGState << /GSOverlay ${overlayStateId} 0 R /GSSheet ${sheetStateId} 0 R /GSPanel ${panelStateId} 0 R /GSField ${fieldStateId} 0 R >> ${xObject} >>`,
      `/Contents ${contentId} 0 R`,
      `/Annots [${annots.join(' ')}]`,
      '>>'
    ].join('\n'));
    pageRefs.push(`${pageId} 0 R`);
  });

  setObject(pagesId, `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`);
  setObject(acroFormId, [
    '<<',
    `/Fields [${allFieldRefs.join(' ')}]`,
    '/NeedAppearances true',
    `/DR << /Font << /Helv ${fontId} 0 R >> >>`,
    `/DA (/Helv 9 Tf ${COLORS.fieldText} rg)`,
    '>>'
  ].join('\n'));
  setObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R /AcroForm ${acroFormId} 0 R >>`);

  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (let id = 1; id < nextId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${nextId}\n0000000000 65535 f \n`;
  for (let id = 1; id < nextId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
