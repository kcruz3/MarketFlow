import Parse from "../lib/parse";

export type UserRole = "owner" | "admin" | "vendor" | "customer";

export interface AuthUser {
  objectId: string;
  email: string;
  username: string;
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
    const applicationQuery = new Parse.Query("VendorApplication");
    applicationQuery.equalTo("userId", userId);
    applicationQuery.equalTo("status", "approved");
    const application = await applicationQuery.first();

    if (!application) {
      return undefined;
    }

    const vendorQuery = new Parse.Query("Vendor");
    vendorQuery.equalTo("name", application.get("businessName"));
    const vendor = await vendorQuery.first();

    return vendor?.get("slug");
  } catch {
    return undefined;
  }
}

export async function buildAuthUser(user: Parse.User): Promise<AuthUser> {
  const role = await fetchUserRole(user);
  const vendorSlug =
    role === "vendor" ? await fetchVendorSlugByUserId(user.id!) : undefined;

  return {
    objectId: user.id!,
    email: user.get("email"),
    username: user.get("username"),
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
