import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireAdmin, AuthRequest } from "../middleware/auth";
import bcrypt from "bcrypt";

const router = Router();

// GET /api/users
router.get("/", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return res.status(500).json({ error: "Failed to fetch users list" });
  }
});

// POST /api/users
router.post("/", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "Missing required fields: name, email, password, role are required",
      });
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (error) {
    console.error("User POST error:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/users/:id
router.put("/:id", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Email conflict check
    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email },
      });
      if (emailConflict) {
        return res.status(400).json({
          error: "Email address is already in use by another user",
        });
      }
    }

    const updateData: any = {
      name: name || existingUser.name,
      email: email || existingUser.email,
      role: role || existingUser.role,
    };

    // Re-hash password if provided
    if (password && password.trim() !== "") {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("User PUT error:", error);
    return res.status(500).json({ error: "Failed to update user details" });
  }
});

// DELETE /api/users/:id
router.delete("/:id", authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  const currentUser = req.user!;
  try {
    const id = parseInt(req.params.id);

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return res.status(400).json({
        error: "You cannot delete your own account while logged in.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has processed orders
    const processedOrders = await prisma.order.count({
      where: { userId: id },
    });

    if (processedOrders > 0) {
      return res.status(400).json({
        error: "Cannot delete user who has processed orders in POS history. Try updating their role or disabling access instead.",
      });
    }

    // Clean up associated inventory logs if any
    await prisma.inventoryLog.updateMany({
      where: { userId: id },
      data: { userId: null }, // Nullify user association instead of deleting logs
    });

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("User DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
