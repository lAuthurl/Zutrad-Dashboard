import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:5000";

/* =========================================================================
   AUTH HELPER
   ========================================================================= */

// Builds the headers object for an authenticated request. Every fetch that
// hits an admin-protected route (/auth/pending, /auth/approve, /auth/reject,
// /auth/users, /auth/users/:id/permissions, /auth/users/:id/role) needs this
// — those routes require verifyToken + requireAdmin/requireSuperAdmin on the
// backend, so a request with no Authorization header will get a 401.
const authHeaders = (extra = {}) => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Pulls status + message out of a failed fetch response so callers can show
// something more useful than a generic "failed, try again" toast.
const describeError = async (res) => {
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.message) detail += ` — ${body.message}`;
  } catch {
    /* response wasn't JSON, ignore */
  }
  return detail;
};

/* =========================================================================
   CONSTANTS
   ========================================================================= */

// Pages an Engineer/Receptionist/Administrator can be granted access to.
// "administrator" is included here only for the super admin view, where it's
// used as a stand-in for "grant the administrator role" inside the same
// permission picker — see AVAILABLE_PAGES_SUPER below.
export const AVAILABLE_PAGES       = ["store", "supply", "maintenance", "reports"];
export const AVAILABLE_PAGES_SUPER = [...AVAILABLE_PAGES, "administrator"];

// Roles a super admin can demote an administrator into. Kept separate from
// ALLOWED_SIGNUP_ROLES on the backend conceptually, but currently the same
// set — update both places together if that ever changes.
export const DEMOTABLE_ROLES = ["engineer", "receptionist"];

// Roles a super admin can promote a user INTO from the "Administrator Role
// Control" section. "administrator" keeps the original behaviour;
// "superadmin" is new — promoting into it is a one-way action (see the
// backend route comment on /users/:id/role for why).
export const PROMOTABLE_ROLES = ["administrator", "superadmin"];

// Roles that start with full page access by default. Used to filter who
// can be PROMOTED into (promotableUsers excludes both — you can't promote
// someone who already has one of these roles) and, in useAdminPage, who a
// plain administrator can target for permission changes (neither — only a
// superadmin can touch an administrator's pages; see permissionTargetUsers
// in useSuperAdminPage, which excludes only "superadmin").
export const FULL_ACCESS_ROLES = ["administrator", "superadmin"];

export const CLIENT_DB_FIELDS = ["companyName", "address"];

/* =========================================================================
   CSV / JSON PARSING HELPERS
   ========================================================================= */

export const parseCSV = (text) => {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line) => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
  return { headers, rows };
};

export const parseJSON = (text) => {
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const headers = arr.length > 0 ? Object.keys(arr[0]) : [];
    return { headers, rows: arr };
  } catch {
    return { headers: [], rows: [] };
  }
};

export const fieldLabel = (f) =>
  f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

/* =========================================================================
   IMPORT DIALOG HOOK  (shared verbatim by both pages)
   ========================================================================= */

export const useImportDialog = ({ onImport, dbFields }) => {
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [fileData, setFileData] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [results, setResults] = useState({ imported: [], skipped: [] });
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep("upload");
    setFileData({ headers: [], rows: [] });
    setMapping({});
    setResults({ imported: [], skipped: [] });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = file.name.endsWith(".json") ? parseJSON(text) : parseCSV(text);
      if (parsed.rows.length === 0) return;
      const autoMap = {};
      dbFields.forEach((field) => {
        const match = parsed.headers.find(
          (h) => h.toLowerCase().replace(/[\s_-]/g, "") === field.toLowerCase()
        );
        if (match) autoMap[field] = match;
      });
      setFileData(parsed);
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file], value: "" }, preventDefault: () => {} };
    handleFile(fakeEvent);
  };

  const setFieldMapping = (field, value) =>
    setMapping((m) => ({ ...m, [field]: value }));

  const mappingComplete = dbFields.every((f) => mapping[f]);

  const goToUpload  = () => setStep("upload");
  const goToMap     = () => setStep("map");
  const goToPreview = () => setStep("preview");

  const handleImport = () => {
    setLoading(true);
    setTimeout(() => {
      const imported = [];
      const skipped  = [];
      fileData.rows.forEach((row, idx) => {
        const entry = {};
        let valid = true;
        dbFields.forEach((field) => {
          const val = row[mapping[field]]?.trim();
          if (!val) valid = false;
          entry[field] = val;
        });
        if (valid) imported.push(entry);
        else skipped.push({ row: idx + 1, data: row });
      });
      onImport(imported);
      setResults({ imported, skipped });
      setStep("done");
      setLoading(false);
    }, 600);
  };

  return {
    fileRef, step, fileData, mapping, results, loading, mappingComplete,
    reset, handleFile, handleDrop, setFieldMapping,
    goToUpload, goToMap, goToPreview, handleImport,
  };
};

/* =========================================================================
   SHARED BASE HOOK
   ========================================================================= 
   Everything that is genuinely identical between the Admin page and the
   Super Admin page lives here: fetching users + pending signups, the client
   form, import handling, toast state, and the page-permission grant/revoke
   flow (the actual backend calls — each page's own handler decides *when*
   to call them and what local state to touch around the call).

   This is NOT exported directly — useAdminPage() and useSuperAdminPage()
   below both call it and layer their own bits on top.
*/

const useUserManagementBase = ({ availablePages }) => {
  // ── core state ───────────────────────────────────────────────────────────
  const [users, setUsers]                   = useState([]);
  const [loadingUsers, setLoadingUsers]      = useState(true);
  const [pendingSignups, setPendingSignups] = useState([]);
  const [loadingSignups, setLoadingSignups] = useState(true);
  const [toast, setToast]                   = useState({ open: false, message: "", severity: "success" });

  const showToast  = (message, severity = "success") => setToast({ open: true, message, severity });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  // ── fetch all approved users from the backend on mount ───────────────────
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/users`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const detail = await describeError(res);
          console.error("GET /auth/users failed:", detail);
          throw new Error(detail);
        }
        const data = await res.json();
        // Normalise MongoDB _id → id so existing UI code stays unchanged.
        // IDs are strings from here on — never wrap them in Number().
        setUsers(
          data.map((u) => ({
            id:           u._id,
            firstName:    u.firstName,
            surname:      u.surname,
            email:        u.email,
            role:         u.role,
            permissions:  u.permissions || [],
            isFirstLogin: !!u.isFirstLogin,
          }))
        );
      } catch (err) {
        console.error("Could not load users:", err);
        showToast("Could not load users.", "error");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // ── fetch pending signups from MongoDB on mount ──────────────────────────
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/pending`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const detail = await describeError(res);
          console.error("GET /auth/pending failed:", detail);
          throw new Error(detail);
        }
        const data = await res.json();
        setPendingSignups(
          data.map((u) => ({
            id:            u._id,
            firstName:     u.firstName,
            surname:       u.surname,
            email:         u.email,
            requestedRole: u.role,
            requestedAt:   u.createdAt,
          }))
        );
      } catch (err) {
        console.error("Could not load pending signups:", err);
        showToast("Could not load pending signups.", "error");
      } finally {
        setLoadingSignups(false);
      }
    };
    fetchPending();
  }, []);

  // ── client form ──────────────────────────────────────────────────────────
  // Raw setters (setClientForm/setClientError) are returned alongside the
  // handleClientFormChange helper because the two pages historically called
  // these two different ways — admin.jsx sets state inline, superAdmin.jsx
  // goes through the helper. Keeping both avoids touching either JSX file.
  const [clientForm, setClientForm]             = useState({ companyName: "", address: "" });
  const [clientError, setClientError]           = useState("");
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientImportOpen, setClientImportOpen] = useState(false);

  const handleClientFormChange = (field, value) => {
    setClientError("");
    setClientForm((p) => ({ ...p, [field]: value }));
  };

  // ── POST /clients — persists a new client to the backend. Previously this
  //    handler only validated + reset local state and never hit the network,
  //    so nothing was actually saved. Now it calls the real endpoint and only
  //    clears the form / shows a success toast once the API confirms it.
  //
  //    NOTE: this does NOT update the All Clients page list — that page
  //    (useAllClientsLogic) owns its own separate `clients` state and fetches
  //    independently. A newly added client will show up there next time that
  //    page mounts/refetches, not immediately. If you want it to appear
  //    instantly, lift `clients` into a shared store/context or call that
  //    page's refetch after a successful add. ─────────────────────────────
  const handleAddClient = async () => {
    const { companyName, address } = clientForm;
    if (!companyName.trim()) { setClientError("Company name is required."); return; }
    if (!address.trim())     { setClientError("Address is required.");      return; }

    setClientSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          companyName: companyName.trim(),
          address: address.trim(),
        }),
      });
      if (!res.ok) throw new Error(await describeError(res));

      setClientForm({ companyName: "", address: "" });
      setClientError("");
      showToast(`Client "${companyName}" added.`);
    } catch (err) {
      console.error("Add client failed:", err);
      setClientError(err.message || "Failed to add client. Try again.");
      showToast("Failed to add client.", "error");
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleClientImport = useCallback((imported) => {
    showToast(`${imported.length} client(s) imported.`);
  }, []);

  const openClientImport  = () => setClientImportOpen(true);
  const closeClientImport = () => setClientImportOpen(false);

  // ── page permissions ─────────────────────────────────────────────────────
  const [assignUserId, setAssignUserId] = useState("");
  const [assignPage, setAssignPage]     = useState("");
  const [removeUserId, setRemoveUserId] = useState("");
  const [removePage, setRemovePage]     = useState("");

  const handleAssignUserChange = (value) => { setAssignUserId(value); setAssignPage(""); };
  const handleRemoveUserChange = (value) => { setRemoveUserId(value); setRemovePage(""); };

  // ── PATCH /auth/users/:id/permissions  — persists the full permissions
  //    array for a user. Returns the updated user on success, or throws.
  //    Callers update local `users` state from the *response*, not from
  //    an optimistic guess, so the UI always reflects what's actually in
  //    the database. ────────────────────────────────────────────────────
  const updatePermissions = async (userId, permissions) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/permissions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ permissions }),
    });
    if (!res.ok) {
      throw new Error(await describeError(res));
    }
    const { user } = await res.json();
    return user;
  };

  // ── PATCH /auth/users/:id/role  — superadmin-only. Promotes/demotes a
  //    user and clears their permissions server-side. Same pattern: the
  //    caller updates state from the response. ────────────────────────────
  const updateRole = async (userId, role) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      throw new Error(await describeError(res));
    }
    const { user } = await res.json();
    return user;
  };

  // ── handlers: signup requests (hit real API, now with auth header) ───────
  const handleApproveSignup = async (req) => {
    try {
      const res = await fetch(`${API_BASE}/auth/approve/${req.id}`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await describeError(res));

      setUsers((prev) => [
        ...prev,
        {
          id:           req.id,
          firstName:    req.firstName,
          surname:      req.surname,
          email:        req.email,
          role:         req.requestedRole,
          permissions:  [],
          isFirstLogin: true,
        },
      ]);
      setPendingSignups((prev) => prev.filter((r) => r.id !== req.id));
      showToast(`${req.firstName} ${req.surname} approved as ${req.requestedRole}.`);
    } catch (err) {
      console.error("Approve signup failed:", err);
      showToast("Failed to approve user. Try again.", "error");
    }
  };

  const handleRejectSignup = async (req) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reject/${req.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await describeError(res));

      setPendingSignups((prev) => prev.filter((r) => r.id !== req.id));
      showToast(`${req.firstName} ${req.surname}'s request rejected.`, "warning");
    } catch (err) {
      console.error("Reject signup failed:", err);
      showToast("Failed to reject request. Try again.", "error");
    }
  };

  // ── derived stats (identical on both pages) ───────────────────────────────
  const adminCount    = users.filter((u) => u.role === "administrator").length;
  const engineerCount = users.filter((u) => u.role === "engineer").length;
  const otherCount    = users.filter((u) => u.role !== "administrator" && u.role !== "engineer").length;

  return {
    users, setUsers,
    loadingUsers,
    pendingSignups, setPendingSignups,
    loadingSignups,
    toast, setToast, showToast, closeToast,
    clientForm, setClientForm,
    clientError, setClientError,
    clientSubmitting,
    handleClientFormChange, handleAddClient,
    clientImportOpen, setClientImportOpen,
    openClientImport, closeClientImport, handleClientImport,
    assignUserId, setAssignUserId, handleAssignUserChange,
    assignPage, setAssignPage,
    removeUserId, setRemoveUserId, handleRemoveUserChange,
    removePage, setRemovePage,
    updatePermissions, updateRole,
    handleApproveSignup, handleRejectSignup,
    adminCount, engineerCount, otherCount,
    availablePages,
  };
};

/* =========================================================================
   ADMIN PAGE HOOK
   ========================================================================= 
   Same public API as the original admin.logic.js's useAdminPageLogic, plus
   a new `loadingUsers` flag the JSX can use for a loading state.
*/

export const useAdminPage = () => {
  const base = useUserManagementBase({ availablePages: AVAILABLE_PAGES });

  const {
    users,
    loadingUsers,
    pendingSignups,
    loadingSignups,
    toast, setToast, showToast,
    clientForm, setClientForm,
    clientError, setClientError,
    clientSubmitting,
    handleAddClient,
    clientImportOpen, setClientImportOpen,
    handleClientImport,
    assignUserId,
    assignPage, setAssignPage,
    removeUserId,
    removePage, setRemovePage,
    updatePermissions,
    handleApproveSignup, handleRejectSignup,
    adminCount, engineerCount, otherCount,
    availablePages,
  } = base;

  // ── derived: permission targets exclude administrators/superadmins ───────
  // Those roles have full access by default — they're never valid targets
  // for page-permission grant/revoke. The backend enforces this too; this
  // filter is what keeps them out of the dropdown in the first place.
  // IDs are Mongo _id strings now — plain === comparison, no Number().
  const nonAdminUsers = users.filter((u) => !FULL_ACCESS_ROLES.includes(u.role));
  const selectedAssignUser = nonAdminUsers.find((u) => u.id === assignUserId);

  const assignablePages = availablePages.filter((p) => {
    if (selectedAssignUser?.role === "receptionist" && p === "maintenance") return false;
    return !selectedAssignUser?.permissions.includes(p);
  }) || [];

  const selectedRemoveUser = nonAdminUsers.find((u) => u.id === removeUserId);
  const removablePages = (selectedRemoveUser?.permissions || []).filter((p) => {
    if (selectedRemoveUser?.role === "receptionist" && p === "maintenance") return false;
    return true;
  });

  const handleAssignRole = async () => {
    if (!assignUserId || !assignPage) { showToast("Select a user and a page.", "error"); return; }

    const target = nonAdminUsers.find((u) => u.id === assignUserId);
    if (!target) { showToast("User not found.", "error"); return; }
    if (target.permissions.includes(assignPage)) { showToast("User already has that page.", "warning"); return; }

    const nextPermissions = [...target.permissions, assignPage];

    try {
      const updatedUser = await updatePermissions(assignUserId, nextPermissions);
      base.setUsers((prev) =>
        prev.map((u) => (u.id === assignUserId ? { ...u, permissions: updatedUser.permissions } : u))
      );
      showToast(`Page "${assignPage}" granted.`);
      base.setAssignUserId(""); setAssignPage("");
    } catch (err) {
      console.error("Grant permission failed:", err);
      showToast("Failed to grant permission. Try again.", "error");
    }
  };

  const handleRemoveRole = async () => {
    if (!removeUserId || !removePage) { showToast("Select a user and a page to revoke.", "error"); return; }

    const target = nonAdminUsers.find((u) => u.id === removeUserId);
    if (!target) { showToast("User not found.", "error"); return; }

    const nextPermissions = target.permissions.filter((p) => p !== removePage);

    try {
      const updatedUser = await updatePermissions(removeUserId, nextPermissions);
      base.setUsers((prev) =>
        prev.map((u) => (u.id === removeUserId ? { ...u, permissions: updatedUser.permissions } : u))
      );
      showToast(`Page "${removePage}" revoked.`, "warning");
      base.setRemoveUserId(""); setRemovePage("");
    } catch (err) {
      console.error("Revoke permission failed:", err);
      showToast("Failed to revoke permission. Try again.", "error");
    }
  };

  return {
    // signups
    pendingSignups,
    loadingSignups,
    handleApproveSignup,
    handleRejectSignup,

    // users loading state
    loadingUsers,

    // permissions - assign
    nonAdminUsers,
    assignUserId,
    setAssignUserId: base.setAssignUserId,
    assignPage,
    setAssignPage,
    assignablePages,
    handleAssignRole,

    // permissions - revoke
    removeUserId,
    setRemoveUserId: base.setRemoveUserId,
    removePage,
    setRemovePage,
    removablePages,
    handleRemoveRole,

    // client form
    clientForm,
    setClientForm,
    clientError,
    setClientError,
    clientSubmitting,
    handleAddClient,
    clientImportOpen,
    setClientImportOpen,
    handleClientImport,

    // stats
    totalUsers: users.length,
    adminCount,
    engineerCount,
    otherCount,

    // toast
    toast,
    setToast,
    showToast,
  };
};

/* =========================================================================
   SUPER ADMIN PAGE HOOK
   ========================================================================= 
   Same public API as the original superAdmin.logic.js's useSuperAdminPage,
   plus `loadingUsers`, a `demoteRole` selector required to actually commit
   a demote (the backend needs a concrete target role — there's no safe
   universal fallback, so the confirm dialog asks for one), and a
   `promoteRole` selector so promotion can target either "administrator" or
   "superadmin" through the same Administrator Role Control section.
*/

export const useSuperAdminPage = () => {
  const base = useUserManagementBase({ availablePages: AVAILABLE_PAGES_SUPER });

  const {
    users,
    loadingUsers,
    pendingSignups,
    loadingSignups,
    toast, closeToast,
    clientForm, clientError, clientSubmitting, handleClientFormChange, handleAddClient,
    clientImportOpen, openClientImport, closeClientImport, handleClientImport,
    assignUserId, handleAssignUserChange,
    assignPage, setAssignPage,
    removeUserId, handleRemoveUserChange,
    removePage, setRemovePage,
    updatePermissions, updateRole,
    handleApproveSignup, handleRejectSignup,
    adminCount, engineerCount, otherCount,
    availablePages,
    showToast,
  } = base;

  // ── admin role grant/revoke (super admin exclusive) ───────────────────────
  const [promoteUserId, setPromoteUserId] = useState("");
  // The role to promote INTO. Defaults to "administrator" to preserve prior
  // behaviour for anyone not touching the new selector. "superadmin" is the
  // new option — see PROMOTABLE_ROLES above and the backend route comment
  // on /users/:id/role for why this is currently one-way.
  const [promoteRole, setPromoteRole]     = useState("administrator");
  const [demoteUserId, setDemoteUserId]   = useState("");
  // The role to demote INTO. Must be chosen before confirming — there is no
  // safe default to fall back to, since "engineer" vs "receptionist" changes
  // what the person can actually do day to day.
  const [demoteRole, setDemoteRole]       = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // ── derived lists (IDs are Mongo _id strings — plain === comparison) ─────
  // permissionTargetUsers excludes ONLY superadmins. Administrators ARE
  // valid targets here now — they hold a real permissions list (full access
  // granted at promotion time, see /users/:id/role on the backend), and a
  // superadmin can revoke individual pages from them without a full demote.
  // Superadmins have no permissions list at all and stay excluded — there's
  // no role above them to manage that exception.
  const permissionTargetUsers = users.filter((u) => u.role !== "superadmin");
  const adminUsers            = users.filter((u) => u.role === "administrator");

  // promotableUsers depends on the chosen target role:
  //  - promoting to "administrator": exclude anyone already administrator
  //    or superadmin (nothing left to promote them into).
  //  - promoting to "superadmin": exclude only existing superadmins —
  //    administrators ARE eligible, since superadmin is a step above them.
  // Either way, existing superadmins are never in the list.
  const promotableUsers = users.filter((u) => {
    if (u.role === "superadmin") return false;
    if (promoteRole === "administrator" && u.role === "administrator") return false;
    return true;
  });

  const selectedAssignUser = permissionTargetUsers.find((u) => u.id === assignUserId);

  // "administrator" still appears as a grantable PAGE for non-admin users —
  // selecting it promotes them (see handleAssignRole below). For an existing
  // administrator it's filtered out here since they already hold the role;
  // there's nothing left to "grant" by selecting it again.
  const assignablePages = availablePages.filter((p) => {
    if (selectedAssignUser?.role === "administrator" && p === "administrator") return false;
    if (selectedAssignUser?.role === "receptionist"  && p === "maintenance")   return false;
    return !selectedAssignUser?.permissions.includes(p);
  }) || [];

  const selectedRemoveUser = permissionTargetUsers.find((u) => u.id === removeUserId);
  const removablePages = (selectedRemoveUser?.permissions || []).filter((p) => {
    if (selectedRemoveUser?.role === "receptionist" && p === "maintenance") return false;
    return true;
  });

  const demotableUsers      = adminUsers;
  const selectedPromoteUser = promotableUsers.find((u) => u.id === promoteUserId);
  const selectedDemoteUser  = demotableUsers.find((u) => u.id === demoteUserId);

  const adminSignupRequests    = pendingSignups.filter((r) => r.requestedRole === "administrator");
  const standardSignupRequests = pendingSignups.filter((r) => r.requestedRole !== "administrator");

  // ── handlers: page permissions (super admin version — can promote a
  //    non-admin user to administrator through the same picker by
  //    selecting "administrator" as the page; promoting to superadmin, and
  //    demoting an administrator, happen only through the dedicated
  //    Administrator Role Control section below, since both require
  //    choosing an explicit target role) ─────────────────────────────────
  const handleAssignRole = async () => {
    if (!assignUserId || !assignPage) { showToast("Select a user and a permission.", "error"); return; }
    const targetUser = permissionTargetUsers.find((u) => u.id === assignUserId);
    if (!targetUser) { showToast("User not found.", "error"); return; }

    if (assignPage === "administrator") {
      try {
        const updatedUser = await updateRole(assignUserId, "administrator");
        base.setUsers((prev) =>
          prev.map((u) => (u.id === assignUserId ? { ...u, role: updatedUser.role, permissions: updatedUser.permissions } : u))
        );
        showToast(`${targetUser.firstName} ${targetUser.surname} is now an administrator.`);
        base.setAssignUserId(""); setAssignPage("");
      } catch (err) {
        console.error("Promote via permission picker failed:", err);
        showToast("Failed to update role. Try again.", "error");
      }
      return;
    }

    if (targetUser.permissions.includes(assignPage)) {
      showToast("User already has that page.", "warning");
      return;
    }

    const nextPermissions = [...targetUser.permissions, assignPage];

    try {
      const updatedUser = await updatePermissions(assignUserId, nextPermissions);
      base.setUsers((prev) =>
        prev.map((u) => (u.id === assignUserId ? { ...u, permissions: updatedUser.permissions } : u))
      );
      showToast(`Permission "${assignPage}" granted.`);
      base.setAssignUserId(""); setAssignPage("");
    } catch (err) {
      console.error("Grant permission failed:", err);
      showToast("Failed to grant permission. Try again.", "error");
    }
  };

  const handleRemoveRole = async () => {
    if (!removeUserId || !removePage) { showToast("Select a user and a permission to revoke.", "error"); return; }
    const targetUser = permissionTargetUsers.find((u) => u.id === removeUserId);
    if (!targetUser) { showToast("User not found.", "error"); return; }

    const nextPermissions = targetUser.permissions.filter((p) => p !== removePage);

    try {
      const updatedUser = await updatePermissions(removeUserId, nextPermissions);
      base.setUsers((prev) =>
        prev.map((u) => (u.id === removeUserId ? { ...u, permissions: updatedUser.permissions } : u))
      );
      showToast(`Permission "${removePage}" revoked.`, "warning");
      base.setRemoveUserId(""); setRemovePage("");
    } catch (err) {
      console.error("Revoke permission failed:", err);
      showToast("Failed to revoke permission. Try again.", "error");
    }
  };

  // ── handlers: admin/superadmin promote, admin demote ─────────────────────
  const requestPromote = () => {
    if (!selectedPromoteUser) { showToast("Select a user to promote.", "error"); return; }
    setConfirmAction({ type: "promote", user: selectedPromoteUser, targetRole: promoteRole });
  };

  const requestDemote = () => {
    if (!selectedDemoteUser) { showToast("Select an administrator to demote.", "error"); return; }
    if (!demoteRole) { showToast("Select a role to demote them into.", "error"); return; }
    setConfirmAction({ type: "demote", user: selectedDemoteUser, targetRole: demoteRole });
  };

  const closeConfirm = () => setConfirmAction(null);

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, user, targetRole } = confirmAction;

    if (type === "promote") {
      const roleToApply = targetRole || "administrator";
      try {
        const updatedUser = await updateRole(user.id, roleToApply);
        base.setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: updatedUser.role, permissions: updatedUser.permissions } : u))
        );
        showToast(`${user.firstName} ${user.surname} is now a${roleToApply === "administrator" ? "n" : ""} ${roleToApply}.`);
        setPromoteUserId("");
        setPromoteRole("administrator");
      } catch (err) {
        console.error("Promote failed:", err);
        showToast("Failed to promote user. Try again.", "error");
      }
      setConfirmAction(null);
      return;
    }

    // demote
    const roleToApply = targetRole || demoteRole;
    if (!roleToApply) {
      showToast("Select a role to demote them into.", "error");
      return; // leave the dialog open so a role can be chosen
    }

    try {
      const updatedUser = await updateRole(user.id, roleToApply);
      base.setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: updatedUser.role, permissions: updatedUser.permissions } : u))
      );
      showToast(`${user.firstName} ${user.surname} is now a${roleToApply === "administrator" ? "n" : ""} ${roleToApply}.`, "warning");
      setDemoteUserId("");
      setDemoteRole("");
    } catch (err) {
      console.error("Demote failed:", err);
      showToast("Failed to update role. Try again.", "error");
    }
    setConfirmAction(null);
  };

  return {
    toast, closeToast,
    users, loadingUsers, adminCount, engineerCount, otherCount,
    loadingSignups,
    adminSignupRequests, standardSignupRequests,
    handleApproveSignup, handleRejectSignup,
    promotableUsers, demotableUsers,
    promoteUserId, setPromoteUserId,
    promoteRole,   setPromoteRole,
    demoteUserId,  setDemoteUserId,
    demoteRole,    setDemoteRole,
    selectedPromoteUser, selectedDemoteUser,
    requestPromote, requestDemote,
    confirmAction, closeConfirm, handleConfirmedAction,
    permissionTargetUsers,
    assignUserId, handleAssignUserChange,
    assignPage,   setAssignPage, assignablePages, handleAssignRole,
    removeUserId, handleRemoveUserChange,
    removePage,   setRemovePage, removablePages,  handleRemoveRole,
    clientForm, clientError, clientSubmitting,
    handleClientFormChange, handleAddClient,
    clientImportOpen, openClientImport, closeClientImport, handleClientImport,
  };
};