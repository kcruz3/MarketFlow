import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";
import { USER_ROLES, fetchUserRoleAssignments } from "../lib/auth";
import type { UserRole } from "../lib/auth";

export interface ManagedUser {
  objectId: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}

export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Call cloud function to get all users (requires owner role server-side)
      const rawUsers = (await Parse.Cloud.run("getAllUsers")) as Array<{
        objectId: string;
        email: string;
        username: string;
        createdAt: string;
      }>;
      const roleAssignments = await fetchUserRoleAssignments();

      const withRoles = rawUsers.map((user) => ({
        objectId: user.objectId,
        email: user.email,
        username: user.username,
        role: roleAssignments.get(user.objectId) ?? "customer",
        createdAt: new Date(user.createdAt),
      }));

      setUsers(withRoles);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeRole = async (userId: string, newRole: UserRole) => {
    const userPtr = Parse.User.createWithoutData(userId);

    // Remove from all roles
    for (const roleName of USER_ROLES) {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo("name", roleName);
      const role = await roleQuery.first();
      if (!role) continue;
      const relation = role.getUsers();
      const existingQuery = relation.query();
      existingQuery.equalTo("objectId", userId);
      const isInRole = await existingQuery.first();
      if (isInRole) {
        relation.remove(userPtr);
        await role.save();
      }
    }

    // Add to new role
    const newRoleQuery = new Parse.Query(Parse.Role);
    newRoleQuery.equalTo("name", newRole);
    const newRoleObj = await newRoleQuery.first();
    if (newRoleObj) {
      newRoleObj.getUsers().add(userPtr);
      await newRoleObj.save();
    }

    setUsers((prev) =>
      prev.map((u) => (u.objectId === userId ? { ...u, role: newRole } : u))
    );
  };

  return { users, loading, error, changeRole, refetch: fetchUsers };
}
