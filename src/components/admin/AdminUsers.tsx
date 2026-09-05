"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERMISSION_MODULES, ALL_PERMISSIONS } from "@/lib/permissions";
import {
  createAdmin,
  deleteRole,
  resetAdminPassword,
  saveRole,
  setAdminActive,
  setAdminRole,
} from "@/server/actions/admins";
import type { ActionState } from "@/lib/validation/shared";

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
};

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  active: boolean;
  lastLoginAt: string | null;
  isSelf: boolean;
};

type State = ActionState & { password?: string };

/** Admin accounts and the role editor.
 *
 *  Permissions are checkboxes per module, read/write. `write` implies `read` in
 *  the permission check, so ticking write alone is enough and the UI says so
 *  rather than forcing both.
 */
export function AdminUsers({
  admins,
  roles,
  canWrite,
}: {
  admins: AdminRow[];
  roles: RoleRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({});
  const [pending, start] = useTransition();

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoleId, setNewRoleId] = useState(roles[0]?.id ?? "");
  const [adding, setAdding] = useState(false);

  const run = (action: () => Promise<State>, after?: () => void) =>
    start(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        after?.();
        router.refresh();
      }
    });

  const toggle = (permission: string) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );

  return (
    <>
      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="admin-note" role="status" style={{ marginBottom: "1.25rem" }}>
          {state.notice}
          {state.password ? (
            <>
              {" "}
              <code className="admin-password">{state.password}</code>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="admin-card">
        <div className="admin-review__head">
          <h2 className="admin-fieldset__legend">Admin accounts</h2>
          {canWrite ? (
            <button className="btn btn--brand btn--sm" type="button" onClick={() => setAdding(!adding)}>
              {adding ? "Cancel" : "Add an admin"}
            </button>
          ) : null}
        </div>

        {adding ? (
          <div className="stack" style={{ ["--stack" as string]: ".9rem", marginTop: "1.25rem" }}>
            <div className="admin-row">
              <label className="field">
                <span className="field__label">Email</span>
                <input className="field__input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Name</span>
                <input className="field__input" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Role</span>
                <select className="field__input" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <button
                className="btn btn--brand btn--sm"
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () => createAdmin({ email: newEmail, name: newName, roleId: newRoleId }),
                    () => {
                      setAdding(false);
                      setNewEmail("");
                      setNewName("");
                    },
                  )
                }
              >
                {pending ? "Creating…" : "Create account"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-table-wrap" style={{ border: "none", marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Role</th>
                <th>Last signed in</th>
                <th>State</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {admins.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="admin-table__title">{row.name}</span>
                    <span className="admin-table__meta">
                      {row.email}
                      {row.isSelf ? " · you" : ""}
                    </span>
                  </td>
                  <td>
                    {canWrite ? (
                      <select
                        className="field__input field__input--sm"
                        value={row.roleId}
                        disabled={pending}
                        onChange={(event) => run(() => setAdminRole(row.id, event.target.value))}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.roleName
                    )}
                  </td>
                  <td className="admin-table__meta">
                    {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString("en-AE") : "never"}
                  </td>
                  <td>
                    <span className={`admin-chip ${row.active ? "admin-chip--published" : ""}`}>
                      {row.active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="admin-table__actions">
                    {canWrite ? (
                      <div className="admin-table__tools">
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => resetAdminPassword(row.id))}
                        >
                          Reset password
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending || row.isSelf}
                          title={row.isSelf ? "You cannot switch off your own account" : undefined}
                          onClick={() => run(() => setAdminActive(row.id, !row.active))}
                        >
                          {row.active ? "Switch off" : "Switch on"}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <div className="admin-review__head">
          <div>
            <h2 className="admin-fieldset__legend">Roles</h2>
            <p className="admin-fieldset__hint">
              Ticking <strong>edit</strong> also grants viewing — nobody can change a screen they
              cannot open.
            </p>
          </div>
          {canWrite ? (
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                setEditingRole("new");
                setRoleName("");
                setRoleDescription("");
                setPermissions([]);
              }}
            >
              New role
            </button>
          ) : null}
        </div>

        {editingRole ? (
          <div className="stack" style={{ ["--stack" as string]: "1rem", marginTop: "1.25rem" }}>
            <div className="admin-row">
              <label className="field">
                <span className="field__label">Name</span>
                <input className="field__input" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Description</span>
                <input
                  className="field__input"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </label>
            </div>

            <div className="perm-grid">
              {PERMISSION_MODULES.map((module) => (
                <div className="perm-row" key={module.key}>
                  <div>
                    <strong>{module.label}</strong>
                    <span className="admin-table__meta">{module.note}</span>
                  </div>
                  <label className="perm-check">
                    <input
                      type="checkbox"
                      checked={permissions.includes(`${module.key}:read`)}
                      onChange={() => toggle(`${module.key}:read`)}
                    />
                    <span>View</span>
                  </label>
                  <label className="perm-check">
                    <input
                      type="checkbox"
                      checked={permissions.includes(`${module.key}:write`)}
                      onChange={() => toggle(`${module.key}:write`)}
                    />
                    <span>Edit</span>
                  </label>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button
                className="btn btn--brand btn--sm"
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      saveRole(editingRole === "new" ? null : editingRole, {
                        name: roleName,
                        description: roleDescription,
                        permissions,
                      }),
                    () => setEditingRole(null),
                  )
                }
              >
                {pending ? "Saving…" : "Save role"}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditingRole(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-table-wrap" style={{ border: "none", marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Can do</th>
                <th>Admins</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <span className="admin-table__title">{role.name}</span>
                    <span className="admin-table__meta">{role.description}</span>
                  </td>
                  <td className="admin-table__meta">
                    {role.permissions.includes(ALL_PERMISSIONS)
                      ? "Everything"
                      : `${role.permissions.length} permissions`}
                  </td>
                  <td>{role.memberCount}</td>
                  <td className="admin-table__actions">
                    {canWrite && !role.isSystem ? (
                      <div className="admin-table__tools">
                        <button
                          className="link-plain"
                          type="button"
                          onClick={() => {
                            setEditingRole(role.id);
                            setRoleName(role.name);
                            setRoleDescription(role.description);
                            setPermissions(role.permissions);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="link-plain"
                          type="button"
                          disabled={pending || role.memberCount > 0}
                          title={role.memberCount > 0 ? "Move its admins to another role first" : undefined}
                          onClick={() => run(() => deleteRole(role.id))}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="admin-table__meta">
                        {role.isSystem ? "Built in" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
