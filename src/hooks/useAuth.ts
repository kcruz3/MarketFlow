import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";

export type UserRole = "owner" | "admin" | "vendor" | "customer";

export interface AuthUser {
  objectId: string;
  email: string;
  username: string;
  role: UserRole;
  vendorSlug?: string;
}

const ROLES: UserRole[] = ["owner", "admin", "vendor", "customer"];

async function fetchRole(user: Parse.User): Promise<UserRole> {
  for (const roleName of ROLES) {
    const q = new Parse.Query(Parse.Role);
    q.equalTo("name", roleName);
    q.equalTo("users", user);
    const match = await q.first();
    if (match) return roleName;
  }
  return "customer";
}

async function fetchVendorSlug(userId: string): Promise<string | undefined> {
  try {
    const q = new Parse.Query("VendorApplication");
    q.equalTo("userId", userId);
    q.equalTo("status", "approved");
    const app = await q.first();
    if (!app) return undefined;
    const vendorQ = new Parse.Query("Vendor");
    vendorQ.equalTo("name", app.get("businessName"));
    const vendor = await vendorQ.first();
    return vendor?.get("slug");
  } catch {
    return undefined;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const current = Parse.User.current();
    if (!current) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const role = await fetchRole(current);
      const vendorSlug =
        role === "vendor" ? await fetchVendorSlug(current.id!) : undefined;
      setUser({
        objectId: current.id!,
        email: current.get("email"),
        username: current.get("username"),
        role,
        vendorSlug,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const loggedIn = await Parse.User.logIn(email, password);
    const role = await fetchRole(loggedIn);
    const vendorSlug =
      role === "vendor" ? await fetchVendorSlug(loggedIn.id!) : undefined;
    setUser({
      objectId: loggedIn.id!,
      email: loggedIn.get("email"),
      username: loggedIn.get("username"),
      role,
      vendorSlug,
    });
    return role;
  };

  const signup = async (email: string, password: string) => {
    const newUser = new Parse.User();
    newUser.set("username", email);
    newUser.set("email", email);
    newUser.set("password", password);
    await newUser.signUp();

    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("name", "customer");
    const customerRole = await roleQuery.first();
    if (customerRole) {
      customerRole.getUsers().add(newUser);
      await customerRole.save();
    }

    setUser({
      objectId: newUser.id!,
      email: newUser.get("email"),
      username: newUser.get("username"),
      role: "customer",
    });
  };

  const logout = async () => {
    await Parse.User.logOut();
    setUser(null);
  };

  return { user, loading, login, signup, logout };
}
