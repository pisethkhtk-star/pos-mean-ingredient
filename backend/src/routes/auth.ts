import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { signJWT } from "../lib/auth";
import { authenticateUser, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Fetch permissions for this role
    const rolePerm = await prisma.rolePermission.findUnique({
      where: { role: user.role },
    });

    // Default fallback permissions if not found in db
    let permissions = rolePerm?.pages;
    if (!permissions) {
      if (user.role === "ADMIN") {
        permissions = ["/", "/pos", "/products", "/categories", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders", "/reports", "/users", "/settings", "/roles"];
      } else if (user.role === "MANAGER") {
        permissions = ["/", "/pos", "/products", "/categories", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders"];
      } else {
        permissions = ["/pos"];
      }
    }

    const token = await signJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return res.json({ success: true });
});

// GET /api/auth/me
router.get("/me", authenticateUser, async (req: AuthRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Fetch the latest permissions dynamically from the database
    const rolePerm = await prisma.rolePermission.findUnique({
      where: { role: user.role },
    });

    let permissions = rolePerm?.pages;
    if (!permissions) {
      if (user.role === "ADMIN") {
        permissions = ["/", "/pos", "/products", "/categories", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders", "/reports", "/users", "/settings", "/roles"];
      } else if (user.role === "MANAGER") {
        permissions = ["/", "/pos", "/products", "/categories", "/discounts", "/inventory", "/purchases", "/suppliers", "/customers", "/orders"];
      } else {
        permissions = ["/pos"];
      }
    }

    // Update user object with the latest permissions
    user.permissions = permissions;

    // Refresh JWT with the latest permissions
    const token = await signJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    });

    return res.json({ user });
  } catch (error) {
    console.error("Session GET error:", error);
    return res.json({ user });
  }
});

export default router;
