import { createEditablePdf } from './pdf-acroforms.js';
import { buildPdfFieldValues, buildPdfPages } from './pdf-field-map.js';
import { buildThemeCandidates } from '../theme/class-themes.js';

function filenameFromCharacter(character, extension) {
  const base = (character.nome || 'personagem')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'personagem';
  return `${base}-ficha-dnd5e.${extension}`;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = encodeURI(src);
  });
}

async function loadBackgroundAsJpeg(classe) {
  const candidates = buildThemeCandidates(classe);
  try {
    let image = null;
    for (const src of candidates) {
      try {
        image = await loadImage(src);
        break;
      } catch {
        image = null;
      }
    }

    if (!image) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1273;
    const context = canvas.getContext('2d');
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    context.drawImage(image, x, y, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
    return {
      width: canvas.width,
      height: canvas.height,
      bytes: dataUrlToBytes(dataUrl)
    };
  } catch (error) {
    console.warn('Não foi possível carregar fundo da classe para PDF.', error);
    return null;
  }
}

function getPrimaryClass(character, classes = []) {
  const classId = (character.classes || []).find((entry) => entry.principal)?.id || character.classes?.[0]?.id || '';
  return classes.find((classe) => classe.id === classId) || { id: classId, nome: classId };
}

export async function buildEditablePdfBytes(context) {
  const fieldValues = buildPdfFieldValues(context);
  const pages = buildPdfPages(fieldValues);
  const background = await loadBackgroundAsJpeg(getPrimaryClass(context.character, context.classes));
  return createEditablePdf({
    pages,
    backgroundImages: background ? [background, background] : []
  });
}

export async function downloadEditablePdf(context) {
  const bytes = await buildEditablePdfBytes(context);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFromCharacter(context.character, 'pdf');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return bytes;
}
