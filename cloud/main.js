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
      Parse.Error.OPERATON_FORBIDDEN,
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

function createVendorSlug(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueVendorSlug(baseName) {
  const seed = createVendorSlug(baseName) || "vendor";
  let candidate = seed;
  let attempt = 1;

  while (attempt < 200) {
    const slugQuery = new Parse.Query("Vendor");
    slugQuery.equalTo("slug", candidate);
    const existing = await slugQuery.first({ useMasterKey: true });
    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${seed}-${attempt}`;
  }

  throw new Parse.Error(
    Parse.Error.INTERNAL_SERVER_ERROR,
    "Unable to generate a unique vendor slug."
  );
}

async function getRoleAssignments() {
  const roleAssignments = new Map();
  for (const roleName of ["owner", "admin", "vendor", "customer"]) {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("name", roleName);
    const role = await roleQuery.first({ useMasterKey: true });
    if (!role) continue;

    const roleUsers = await role.getUsers().query().limit(1000).find({
      useMasterKey: true,
    });
    roleUsers.forEach((roleUser) => {
      if (!roleAssignments.has(roleUser.id)) {
        roleAssignments.set(roleUser.id, roleName);
      }
    });
  }
  return roleAssignments;
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
  const roleAssignments = await getRoleAssignments();

  return users.map((user) => ({
    objectId: user.id,
    email: user.get("email") || "",
    username: user.get("username") || "",
    role: roleAssignments.get(user.id) || "customer",
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

Parse.Cloud.define("getUsersForVendorLinking", async (request) => {
  await requireAdminUser(request.user);

  const userQuery = new Parse.Query(Parse.User);
  userQuery.ascending("email");
  userQuery.limit(1000);
  const users = await userQuery.find({ useMasterKey: true });
  const roleAssignments = await getRoleAssignments();

  return users.map((user) => ({
    objectId: user.id,
    email: user.get("email") || "",
    username: user.get("username") || "",
    role: roleAssignments.get(user.id) || "customer",
    vendorSlug: user.get("vendorSlug") || "",
  }));
});

Parse.Cloud.define("createVendorAsAdmin", async (request) => {
  await requireAdminUser(request.user);

  const {
    name,
    category,
    subcategory,
    description,
    location,
    website,
    isOrganic,
    acceptsPreOrder,
    isActive,
    userId,
  } = request.params || {};

  const vendorName = String(name || "").trim();
  if (!vendorName) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Vendor name is required.");
  }

  const slug = await ensureUniqueVendorSlug(vendorName);
  const vendor = new Parse.Object("Vendor");
  vendor.set("name", vendorName);
  vendor.set("slug", slug);
  vendor.set("category", String(category || "Prepared Food").trim());
  vendor.set("subcategory", String(subcategory || "").trim());
  vendor.set("description", String(description || "").trim());
  vendor.set("location", String(location || "").trim());
  vendor.set("website", String(website || "").trim());
  vendor.set("isOrganic", Boolean(isOrganic));
  vendor.set("acceptsPreOrder", acceptsPreOrder !== false);
  vendor.set("isActive", isActive !== false);
  vendor.set("tags", []);

  let linkedUser = null;
  if (typeof userId === "string" && userId.trim()) {
    const userQuery = new Parse.Query(Parse.User);
    linkedUser = await userQuery.get(userId, { useMasterKey: true });
    vendor.set("ownerId", linkedUser.id);
  }

  await vendor.save(null, { useMasterKey: true });

  if (linkedUser) {
    linkedUser.set("vendorSlug", slug);
    await linkedUser.save(null, { useMasterKey: true });

    const vendorRoleQuery = new Parse.Query(Parse.Role);
    vendorRoleQuery.equalTo("name", "vendor");
    const vendorRole = await vendorRoleQuery.first({ useMasterKey: true });
    if (vendorRole) {
      vendorRole.getUsers().add(linkedUser);
      await vendorRole.save(null, { useMasterKey: true });
    }

    const customerRoleQuery = new Parse.Query(Parse.Role);
    customerRoleQuery.equalTo("name", "customer");
    const customerRole = await customerRoleQuery.first({ useMasterKey: true });
    if (customerRole) {
      customerRole.getUsers().remove(linkedUser);
      await customerRole.save(null, { useMasterKey: true });
    }
  }

  return {
    objectId: vendor.id,
    name: vendor.get("name"),
    slug: vendor.get("slug"),
    ownerId: vendor.get("ownerId") || null,
  };
});

Parse.Cloud.define("linkVendorToUser", async (request) => {
  await requireAdminUser(request.user);

  const vendorId = String(request.params?.vendorId || "").trim();
  const userId = String(request.params?.userId || "").trim();

  if (!vendorId || !userId) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "vendorId and userId are required."
    );
  }

  const vendorQuery = new Parse.Query("Vendor");
  const vendor = await vendorQuery.get(vendorId, { useMasterKey: true });
  const vendorSlug = vendor.get("slug");
  if (!vendorSlug) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "Vendor must have a slug before linking."
    );
  }

  const userQuery = new Parse.Query(Parse.User);
  const user = await userQuery.get(userId, { useMasterKey: true });

  vendor.set("ownerId", user.id);
  await vendor.save(null, { useMasterKey: true });

  user.set("vendorSlug", vendorSlug);
  await user.save(null, { useMasterKey: true });

  const vendorRoleQuery = new Parse.Query(Parse.Role);
  vendorRoleQuery.equalTo("name", "vendor");
  const vendorRole = await vendorRoleQuery.first({ useMasterKey: true });
  if (vendorRole) {
    vendorRole.getUsers().add(user);
    await vendorRole.save(null, { useMasterKey: true });
  }

  const customerRoleQuery = new Parse.Query(Parse.Role);
  customerRoleQuery.equalTo("name", "customer");
  const customerRole = await customerRoleQuery.first({ useMasterKey: true });
  if (customerRole) {
    customerRole.getUsers().remove(user);
    await customerRole.save(null, { useMasterKey: true });
  }

  return {
    success: true,
    vendorId: vendor.id,
    vendorSlug,
    userId: user.id,
    userEmail: user.get("email") || user.get("username") || "",
  };
});

Parse.Cloud.define("updateMyProfile", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(Parse.Error.SESSION_MISSING, "You must be logged in.");
  }

  const displayName = String(request.params?.displayName || "").trim();
  const phone = String(request.params?.phone || "").trim();
  const bio = String(request.params?.bio || "").trim();

  if (!displayName) {
    throw new Parse.Error(Parse.Error.VALIDATION_ERROR, "Display name is required.");
  }

  user.set("displayName", displayName);
  user.set("phone", phone);
  user.set("bio", bio);
  await user.save(null, { useMasterKey: true });

  return {
    objectId: user.id,
    displayName: user.get("displayName") || user.get("username") || "",
    phone: user.get("phone") || "",
    bio: user.get("bio") || "",
    email: user.get("email") || "",
    username: user.get("username") || "",
  };
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

function parseBoothMapForCloud(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw);
  return [];
}

function boothOverlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function validateEventWorkflowState({
  name,
  date,
  hours,
  address,
  selectedVendorSlugs,
  boothMap,
}) {
  const selectedSet = new Set((selectedVendorSlugs || []).filter(Boolean));
  const assignedBooths = (boothMap || []).filter((booth) =>
    String(booth.vendorSlug || "").trim()
  );
  const assignedSlugs = assignedBooths.map((booth) => String(booth.vendorSlug || "").trim());
  const assignedSet = new Set(assignedSlugs);

  const overlaps = new Set();
  for (let i = 0; i < boothMap.length; i += 1) {
    for (let j = i + 1; j < boothMap.length; j += 1) {
      if (boothOverlaps(boothMap[i], boothMap[j])) {
        overlaps.add(boothMap[i].boothId);
        overlaps.add(boothMap[j].boothId);
      }
    }
  }

  const unknownAssigned = assignedSlugs.filter((slug) => !selectedSet.has(slug));
  const missingAssigned = Array.from(selectedSet).filter((slug) => !assignedSet.has(slug));

  const detailsComplete =
    !!String(name || "").trim() &&
    !!date &&
    !Number.isNaN(new Date(date).getTime()) &&
    !!String(hours || "").trim() &&
    !!String(address || "").trim();
  const hasVendors = selectedSet.size > 0;
  const hasBooths = boothMap.length > 0;

  const reviewIssues = [];
  if (!detailsComplete) {
    reviewIssues.push("Complete event details (name, date, hours, address).");
  }
  if (!hasVendors) {
    reviewIssues.push("Select at least one vendor.");
  }

  const publishIssues = [...reviewIssues];
  if (!hasBooths) {
    publishIssues.push("Create at least one booth.");
  }
  if (overlaps.size > 0) {
    publishIssues.push(`Resolve booth overlaps (${overlaps.size} overlapping).`);
  }
  if (unknownAssigned.length > 0) {
    publishIssues.push(
      `Remove vendors assigned in map but not selected (${unknownAssigned.length} found).`
    );
  }

  return {
    reviewIssues,
    publishIssues,
    canSubmitForReview: reviewIssues.length === 0,
    canPublish: publishIssues.length === 0,
    checklist: {
      detailsComplete,
      hasVendors,
      hasBooths,
      allSelectedVendorsAssigned: missingAssigned.length === 0,
      noOverlappingBooths: overlaps.size === 0,
      noUnknownAssignedVendors: unknownAssigned.length === 0,
    },
  };
}

Parse.Cloud.define("updateEventWorkflowStatus", async (request) => {
  await requireAdminUser(request.user);

  const eventId = String(request.params?.eventId || "").trim();
  const status = String(request.params?.status || "").trim();
  if (!eventId || !["draft", "review", "published"].includes(status)) {
    throw new Parse.Error(
      Parse.Error.INVALID_QUERY,
      "eventId and valid status are required."
    );
  }

  const eventQuery = new Parse.Query("MarketEvent");
  const event = await eventQuery.get(eventId, { useMasterKey: true });
  const relation = event.relation("vendors");
  const vendorObjects = await relation.query().limit(1000).find({ useMasterKey: true });
  const selectedVendorSlugs = vendorObjects
    .map((vendor) => String(vendor.get("slug") || "").trim())
    .filter(Boolean);
  const boothMap = parseBoothMapForCloud(event.get("boothMap")).map((booth) => ({
    boothId: booth.boothId,
    vendorSlug: String(booth.vendorSlug || "").trim(),
    x: Number(booth.x || 0),
    y: Number(booth.y || 0),
    w: Number(booth.w || 0),
    h: Number(booth.h || 0),
  }));

  const validation = validateEventWorkflowState({
    name: event.get("name"),
    date: event.get("date"),
    hours: event.get("hours"),
    address: event.get("address"),
    selectedVendorSlugs,
    boothMap,
  });

  if (status === "review" && !validation.canSubmitForReview) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      validation.reviewIssues.join(" ")
    );
  }
  if (status === "published" && !validation.canPublish) {
    throw new Parse.Error(
      Parse.Error.VALIDATION_ERROR,
      validation.publishIssues.join(" ")
    );
  }

  event.set("workflowStatus", status);
  event.set("isPublished", status === "published");
  event.set("reviewChecklist", validation.checklist);
  event.set(
    "reviewIssues",
    status === "published" ? validation.publishIssues : validation.reviewIssues
  );
  event.set("lastValidatedAt", new Date());
  await event.save(null, { useMasterKey: true });

  return {
    success: true,
    eventId: event.id,
    status,
    checklist: validation.checklist,
    issues: status === "published" ? validation.publishIssues : validation.reviewIssues,
  };
});

Parse.Cloud.define("notifyVendorAssignmentChanges", async (request) => {
  await requireAdminUser(request.user);

  const eventId = String(request.params?.eventId || "").trim();
  const eventName = String(request.params?.eventName || "").trim();
  const eventDateRaw = request.params?.eventDate;
  const eventAddress = String(request.params?.eventAddress || "").trim();
  const marketHours = String(request.params?.marketHours || "").trim();
  const previousBoothMap = parseBoothMapForCloud(request.params?.previousBoothMap);
  const nextBoothMap = parseBoothMapForCloud(request.params?.nextBoothMap);

  const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;

  const previousByVendor = new Map();
  previousBoothMap.forEach((booth) => {
    const slug = String(booth.vendorSlug || "").trim();
    if (!slug || previousByVendor.has(slug)) return;
    previousByVendor.set(slug, String(booth.boothId || "").trim());
  });

  const nextByVendor = new Map();
  nextBoothMap.forEach((booth) => {
    const slug = String(booth.vendorSlug || "").trim();
    if (!slug || nextByVendor.has(slug)) return;
    nextByVendor.set(slug, String(booth.boothId || "").trim());
  });

  const allVendorSlugs = new Set([...previousByVendor.keys(), ...nextByVendor.keys()]);
  if (allVendorSlugs.size === 0) {
    return { success: true, created: 0 };
  }

  const vendorQuery = new Parse.Query("Vendor");
  vendorQuery.containedIn("slug", Array.from(allVendorSlugs));
  vendorQuery.limit(1000);
  const vendors = await vendorQuery.find({ useMasterKey: true });
  const vendorBySlug = new Map(vendors.map((vendor) => [vendor.get("slug"), vendor]));

  const notifications = [];
  allVendorSlugs.forEach((slug) => {
    const previousBoothId = previousByVendor.get(slug) || "";
    const boothId = nextByVendor.get(slug) || "";
    if (previousBoothId === boothId) return;

    const vendor = vendorBySlug.get(slug);
    if (!vendor) return;

    const ownerId = String(vendor.get("ownerId") || "").trim();
    if (!ownerId) return;

    let type = "assigned";
    let message = `You've been assigned to booth ${boothId}.`;
    if (previousBoothId && boothId) {
      type = "reassigned";
      message = `Your booth changed from ${previousBoothId} to ${boothId}.`;
    } else if (previousBoothId && !boothId) {
      type = "unassigned";
      message = `Your booth assignment (${previousBoothId}) was removed.`;
    }

    const notification = new Parse.Object("VendorNotification");
    notification.set("vendorSlug", slug);
    notification.set("eventId", eventId || null);
    notification.set("eventName", eventName || "Market event");
    if (eventDate && !Number.isNaN(eventDate.getTime())) {
      notification.set("eventDate", eventDate);
    }
    notification.set("eventAddress", eventAddress);
    notification.set("marketHours", marketHours);
    notification.set("previousBoothId", previousBoothId);
    notification.set("boothId", boothId);
    notification.set("type", type);
    notification.set("message", message);
    notification.set("isRead", false);

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setReadAccess(ownerId, true);
    acl.setWriteAccess(ownerId, true);
    acl.setRoleReadAccess("admin", true);
    acl.setRoleWriteAccess("admin", true);
    acl.setRoleReadAccess("owner", true);
    acl.setRoleWriteAccess("owner", true);
    notification.setACL(acl);

    notifications.push(notification);
  });

  if (notifications.length > 0) {
    await Parse.Object.saveAll(notifications, { useMasterKey: true });
  }

  return { success: true, created: notifications.length };
});
