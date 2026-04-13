import { useEffect, useState, useCallback } from "react";
import Parse from "../lib/parse";
import { buildAuthUser } from "../lib/auth";
export type { AuthUser, UserRole } from "../lib/auth";
import type { AuthUser, UserRole } from "../lib/auth";

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
      setUser(await buildAuthUser(current));
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
    const authUser = await buildAuthUser(loggedIn);
    setUser(authUser);
    return authUser.role;
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
