// Lightweight pub/sub so unrelated components (e.g. Sidebar) can react to
// data changes made elsewhere (ReportsPage, MaintenancePage) without a full
// context/provider refactor. Mirrors the existing window "storage" event
// pattern used for currentUser sync.

export const EVENTS = {
  REPORTS_CHANGED: "zutrad:reports-changed",
  MAINTENANCE_CHANGED: "zutrad:maintenance-changed",
  SUPPLY_CHANGED: "zutrad:supply-changed",
  STORE_CHANGED: "zutrad:store-changed",
};

export const notifyReportsChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENTS.REPORTS_CHANGED));
};

export const notifyMaintenanceChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENTS.MAINTENANCE_CHANGED));
};

export const notifySupplyChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENTS.SUPPLY_CHANGED));
};

export const notifyStoreChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENTS.STORE_CHANGED));
};

// Returns an unsubscribe function, ready to hand straight to a useEffect cleanup.
export const subscribe = (eventName, callback) => {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
};