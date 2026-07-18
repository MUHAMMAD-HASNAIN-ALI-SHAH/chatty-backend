const { z } = require("zod");

const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters"),

    email: z
        .email("Invalid email address"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
    email: z
        .email("Invalid email address"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters"),
});

const registerValidator = (req, res, next) => {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message,
                })),
            });
        }

        req.body = result.data;
        next();
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const loginValidator = (req, res, next) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                errors: result.error.issues.map((issue) => ({
                    field: issue.path[0],
                    message: issue.message,
                })),
            });
        }

        req.body = result.data;
        next();
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

module.exports = { registerValidator, loginValidator };