/**
 * validate(requiredFields[])
 * example:
 *   router.post("/products", validate(["name","price"]), controller)
 */

export function validate(requiredFields = []) {
  return function (req, res, next) {
    const body = req.body || {};

    const missing = requiredFields.filter(
      (field) =>
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
    );

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        missing
      });
    }

    next();
  };
}
