export function createNotification(message, type = 'info') {
  return {
    id: `notification-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    message,
    type,
    createdAt: Date.now()
  };
}

export function getNotificationText(action) {
  const messages = {
    saved: 'Personagem salvo.',
    loaded: 'Personagem carregado.',
    duplicated: 'Personagem duplicado.',
    deleted: 'Personagem excluído.',
    imported: 'Personagem importado.',
    exported: 'Personagem exportado.',
    addItem: 'Item adicionado ao inventário.',
    removeItem: 'Item removido.',
    error: 'Não foi possível concluir a ação.'
  };

  return messages[action] || action || messages.error;
}
