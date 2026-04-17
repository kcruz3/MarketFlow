import Parse from "../lib/parse";

export type UserRole = "owner" | "admin" | "vendor" | "customer";

export interface AuthUser {
  objectId: string;
  email: string;
  username: string;
  displayName?: string;
  phone?: string;
  bio?: string;
  role: UserRole;
  vendorSlug?: string;
}

export const USER_ROLES: UserRole[] = ["owner", "admin", "vendor", "customer"];

export async function fetchUserRole(user: Parse.User): Promise<UserRole> {
  for (const roleName of USER_ROLES) {
    const query = new Parse.Query(Parse.Role);
    query.equalTo("name", roleName);
    query.equalTo("users", user);
    const match = await query.first();
    if (match) {
      return roleName;
    }
  }

  return "customer";
}

export async function fetchVendorSlugByUserId(
  userId: string
): Promise<string | undefined> {
  try {
    const vendorQuery = new Parse.Query("Vendor");
    vendorQuery.equalTo("ownerId", userId);
    vendorQuery.ascending("createdAt");
    const ownedVendor = await vendorQuery.first();

    if (ownedVendor) {
      return ownedVendor.get("slug");
    }

    const applicationQuery = new Parse.Query("VendorApplication");
    applicationQuery.equalTo("userId", userId);
    applicationQuery.equalTo("status", "approved");
    applicationQuery.descending("updatedAt");
    const application = await applicationQuery.first();

    if (!application) {
      return undefined;
    }

    const approvedBusinessName = application.get("businessName");
    if (!approvedBusinessName) {
      return undefined;
    }

    const approvedVendorQuery = new Parse.Query("Vendor");
    approvedVendorQuery.equalTo("name", approvedBusinessName);
    const vendor = await approvedVendorQuery.first();

    return vendor?.get("slug");
  } catch {
    return undefined;
  }
}

export async function buildAuthUser(user: Parse.User): Promise<AuthUser> {
  const baseRole = await fetchUserRole(user);
  let vendorSlug = user.get("vendorSlug") as string | undefined;

  if (baseRole !== "owner" && baseRole !== "admin" && !vendorSlug) {
    vendorSlug = await fetchVendorSlugByUserId(user.id!);

    // Self-heal vendor accounts missing vendorSlug so vendor pages resolve
    // directly from auth state on later loads.
    if (vendorSlug) {
      try {
        user.set("vendorSlug", vendorSlug);
        await user.save();
      } catch {
        // Ignore user save failures here; the fallback slug still lets the app work.
      }
    }
  }

  const role =
    (baseRole === "customer" || baseRole === "vendor") && vendorSlug
      ? "vendor"
      : baseRole;

  return {
    objectId: user.id!,
    email: user.get("email"),
    username: user.get("username"),
    displayName: user.get("displayName") || user.get("username"),
    phone: user.get("phone") || "",
    bio: user.get("bio") || "",
    role,
    vendorSlug,
  };
}

export async function fetchUserRoleAssignments(): Promise<
  Map<string, UserRole>
> {
  const assignments = new Map<string, UserRole>();

  await Promise.all(
    USER_ROLES.map(async (roleName) => {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo("name", roleName);
      const role = await roleQuery.first();

      if (!role) {
        return;
      }

      const users = await role.getUsers().query().limit(1000).find();
      users.forEach((user) => {
        if (!assignments.has(user.id!)) {
          assignments.set(user.id!, roleName);
        }
      });
    })
  );

  return assignments;
}
