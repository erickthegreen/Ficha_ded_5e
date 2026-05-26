export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function joinList(values, fallback = 'Nenhum dado informado.') {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values.join(', ');
}
