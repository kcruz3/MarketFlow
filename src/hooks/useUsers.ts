import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";
import { UserRole } from "./useAuth";

export interface ManagedUser {
  objectId: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}

const ROLES: UserRole[] = ["owner", "admin", "vendor", "customer"];

async function getUserRole(userId: string): Promise<UserRole> {
  for (const roleName of ROLES) {
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { useMasterKey: false });
    const q = new Parse.Query(Parse.Role);
    q.equalTo("name", roleName);
    q.equalTo("users", user);
    const match = await q.first();
    if (match) return roleName;
  }
  return "customer";
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

      // Fetch role for each user client-side via Role queries
      const withRoles = await Promise.all(
        rawUsers.map(async (u) => {
          let role: UserRole = "customer";
          for (const roleName of ROLES) {
            const userPtr = Parse.User.createWithoutData(u.objectId);
            const q = new Parse.Query(Parse.Role);
            q.equalTo("name", roleName);
            q.equalTo("users", userPtr);
            const match = await q.first();
            if (match) {
              role = roleName;
              break;
            }
          }
          return {
            objectId: u.objectId,
            email: u.email,
            username: u.username,
            role,
            createdAt: new Date(u.createdAt),
          };
        })
      );

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
    for (const roleName of ROLES) {
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
