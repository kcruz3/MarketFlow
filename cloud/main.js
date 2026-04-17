async function requireAdminUser(user) {
  if (!user) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, "You must be logged in.");
  }

  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.containedIn("name", ["admin", "owner"]);
  roleQuery.equalTo("users", user);

  const role = await roleQuery.first({ useMasterKey: true });
  if (!role) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      "Admin access is required."
    );
  }
}

async function requireOwnerUser(user) {
  if (!user) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, "You must be logged in.");
  }

  const roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo("name", "owner");
  roleQuery.equalTo("users", user);

  const role = await roleQuery.first({ useMasterKey: true });
  if (!role) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      "Owner access is required."
    );
  }
}

function createOrderAcl(customerId) {
  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setWriteAccess(customerId, false);
  acl.setReadAccess(customerId, true);
  acl.setRoleReadAccess("admin", true);
  acl.setRoleWriteAccess("admin", true);
  acl.setRoleReadAccess("vendor", true);
  acl.setRoleWriteAccess("vendor", true);
  return acl;
}

function mapOrder(order) {
  return {
    objectId: order.id,
    customerId: order.get("customerId"),
    customerEmail: order.get("customerEmail"),
    vendorSlug: order.get("vendorSlug"),
    vendorName: order.get("vendorName"),
    orderNumber: order.get("orderNumber") || order.get("qrCode"),
    eventId: order.get("eventId"),
    items: order.get("items"),
    subtotal: order.get("subtotal"),
    total: order.get("total"),
    status: order.get("status"),
    pickupWindow: order.get("pickupWindow"),
    notes: order.get("notes"),
    qrCode: order.get("qrCode"),
    createdAt: order.createdAt.toISOString(),
  };
}

Parse.Cloud.define("deleteReviewAsAdmin", async (request) => {
  await requireAdminUser(request.user);

  const reviewId = request.params?.reviewId;
  if (!reviewId || typeof reviewId !== "string") {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "reviewId is required."
    );
  }

  const reviewQuery = new Parse.Query("Review");
  const review = await reviewQuery.get(reviewId, { useMasterKey: true });
  await review.destroy({ useMasterKey: true });

  return { success: true, reviewId };
});

Parse.Cloud.define("getAllUsers", async (request) => {
  await requireOwnerUser(request.user);

  const userQuery = new Parse.Query(Parse.User);
  userQuery.ascending("createdAt");
  userQuery.limit(1000);
  const users = await userQuery.find({ useMasterKey: true });

  return users.map((user) => ({
    objectId: user.id,
    email: user.get("email") || "",
    username: user.get("username") || "",
    createdAt: user.createdAt.toISOString(),
  }));
});

Parse.Cloud.define("deleteUserAsOwner", async (request) => {
  await requireOwnerUser(request.user);

  const userId = request.params?.userId;
  if (!userId || typeof userId !== "string") {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "userId is required."
    );
  }

  if (request.user.id === userId) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      "You cannot delete your own owner account."
    );
  }

  const userQuery = new Parse.Query(Parse.User);
  const user = await userQuery.get(userId, { useMasterKey: true });

  const vendorQuery = new Parse.Query("Vendor");
  vendorQuery.equalTo("ownerId", userId);
  vendorQuery.limit(1000);
  const linkedVendors = await vendorQuery.find({ useMasterKey: true });
  if (linkedVendors.length > 0) {
    await Parse.Object.destroyAll(linkedVendors, { useMasterKey: true });
  }

  const rolesQuery = new Parse.Query(Parse.Role);
  rolesQuery.containedIn("name", ["owner", "admin", "vendor", "customer"]);
  rolesQuery.limit(100);
  const roles = await rolesQuery.find({ useMasterKey: true });
  roles.forEach((role) => role.getUsers().remove(user));
  if (roles.length > 0) {
    await Parse.Object.saveAll(roles, { useMasterKey: true });
  }

  await user.destroy({ useMasterKey: true });

  return { success: true, userId };
});

Parse.Cloud.define("createOrderWithInventory", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, "You must be logged in.");
  }

  const {
    customerId,
    customerEmail,
    vendorSlug,
    vendorName,
    items,
    pickupWindow,
    notes,
    eventId,
  } = request.params || {};

  if (user.id !== customerId) {
    throw new Parse.Error(
      Parse.Error.OPERATION_FORBIDDEN,
      "Orders must be placed by the signed-in customer."
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Order items are required.");
  }

  const itemIds = [...new Set(items.map((item) => item.menuItemId).filter(Boolean))];
  const menuItemQuery = new Parse.Query("MenuItem");
  menuItemQuery.containedIn("objectId", itemIds);
  menuItemQuery.equalTo("vendorSlug", vendorSlug);
  menuItemQuery.equalTo("isActive", true);
  const menuItems = await menuItemQuery.find({ useMasterKey: true });

  if (menuItems.length !== itemIds.length) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      "One or more menu items are no longer available."
    );
  }

  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
  let subtotal = 0;
  const normalizedItems = items.map((rawItem) => {
    const quantity = Math.max(0, Math.floor(Number(rawItem.quantity || 0)));
    const menuItem = menuItemsById.get(rawItem.menuItemId);

    if (!menuItem || quantity <= 0) {
      throw new Parse.Error(
        Parse.Error.INVALID_QUERY,
        "Each order item must have a valid quantity."
      );
    }

    const inventoryCount = menuItem.get("inventoryCount");
    const trackedInventory =
      typeof inventoryCount === "number" && Number.isFinite(inventoryCount)
        ? inventoryCount
        : null;

    if (!menuItem.get("available")) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        `${menuItem.get("name")} is out of stock.`
      );
    }

    if (trackedInventory !== null) {
      if (trackedInventory < quantity) {
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN,
          `Only ${trackedInventory} ${menuItem.get("name")} left in stock.`
        );
      }

      const nextInventory = trackedInventory - quantity;
      menuItem.set("inventoryCount", nextInventory);
      menuItem.set("available", nextInventory > 0);
    }

    const price = Number(menuItem.get("price") || 0);
    subtotal += price * quantity;

    return {
      menuItemId: rawItem.menuItemId,
      name: menuItem.get("name"),
      price,
      quantity,
    };
  });

  await Parse.Object.saveAll(menuItems, { useMasterKey: true });

  const qrCode = `MF-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  const order = new Parse.Object("Order");
  order.set("customerId", customerId);
  order.set("customerEmail", customerEmail);
  order.set("vendorSlug", vendorSlug);
  order.set("vendorName", vendorName);
  order.set("orderNumber", orderNumber);
  order.set("items", normalizedItems);
  order.set("subtotal", subtotal);
  order.set("total", subtotal);
  order.set("status", "pending");
  order.set("pickupWindow", pickupWindow);
  order.set("notes", notes || "");
  order.set("qrCode", qrCode);
  order.setACL(createOrderAcl(customerId));
  if (eventId) {
    order.set("eventId", eventId);
  }

  await order.save(null, { useMasterKey: true });
  return mapOrder(order);
});
