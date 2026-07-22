import { Router } from "express";
import { prisma } from "../lib/prisma";
import { signJWT } from "../lib/auth";
import { authenticateUser, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/roles
router.get("/", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const rolesPermissions = await prisma.rolePermission.findMany({
      orderBy: { role: "asc" }
    });
    return res.json(rolesPermissions);
  } catch (error) {
    console.error("Roles GET error:", error);
    return res.status(500).json({ error: "Failed to fetch roles permissions" });
  }
});

// POST /api/roles
router.post("/", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  const currentUser = req.user!;
  try {
    const { role, pages } = req.body;

    if (!role || !Array.isArray(pages)) {
      return res.status(400).json({ error: "Invalid request payload" });
    }

    // Upsert the permission list for this role
    const updatedPermission = await prisma.rolePermission.upsert({
      where: { role },
      update: { pages },
      create: { role, pages },
    });

    // If the updated role matches the current user's role, resign their JWT and set cookie!
    if (currentUser.role === role) {
      const token = await signJWT({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        permissions: pages,
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });
    }

    return res.json({ success: true, updatedPermission });
  } catch (error) {
    console.error("Roles POST error:", error);
    return res.status(500).json({ error: "Failed to update permissions" });
  }
});

export default router;
