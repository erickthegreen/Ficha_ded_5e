import { TABS } from '../core/constants.js';

export function isValidTab(tabId) {
  return TABS.some((tab) => tab.id === tabId);
}

export function setActiveTab(state, tabId) {
  if (!isValidTab(tabId)) return state;
  state.activeTab = tabId;
  return state;
}
