import { object, ref, string } from "yup";

export const registerSchema = object({
  email: string().email("Invalid email format").required("Email is required"),
  password: string().min(6, "Password must be at least 6 characters").required("Password is required"),
  confirmPassword: string().oneOf(
    [ref("password"), null],
    "Passwords do not match"
  ),
});

export const loginSchema = object({
  email: string().email("Invalid email format").required("Email is required"),
  password: string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const mergeErr = new Error(error.errors.join(","));
    mergeErr.statusCode = 400;
    next(mergeErr);
  }
};
