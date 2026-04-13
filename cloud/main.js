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
