import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireManagerOrAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/orders
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  const search = (req.query.search as string) || "";
  const status = (req.query.status as string) || "";
  const startDateStr = (req.query.startDate as string) || "";
  const endDateStr = (req.query.endDate as string) || "";

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (startDateStr || endDateStr) {
      where.createdAt = {};
      if (startDateStr) {
        where.createdAt.gte = new Date(startDateStr);
      }
      if (endDateStr) {
        // Enforce end of day boundary
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        user: {
          select: { name: true, role: true },
        },
        items: {
          include: {
            product: {
              select: { name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(orders);
  } catch (error) {
    console.error("Orders GET error:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /api/orders
router.post("/", authenticateUser, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const {
      customerId,
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      amountPaid,
      change,
      note,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return res.status(400).json({
        error: "Invalid order details: items and paymentMethod are required",
      });
    }

    // Generate unique order number: POS-YYYYMMDD-XXXX (timestamp + random number)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `POS-${dateStr}-${rand}`;

    const parsedSubtotal = parseFloat(subtotal);
    const parsedDiscount = parseFloat(discount) || 0;
    const parsedTax = parseFloat(tax) || 0;
    const parsedTotal = parseFloat(total);
    const parsedAmountPaid = parseFloat(amountPaid);
    const parsedChange = parseFloat(change) || 0;

    // Run the entire checkout inside a transaction to ensure database integrity
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the main Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          customerId: customerId ? parseInt(customerId) : null,
          subtotal: parsedSubtotal,
          discount: parsedDiscount,
          tax: parsedTax,
          total: parsedTotal,
          paymentMethod,
          amountPaid: parsedAmountPaid,
          change: parsedChange,
          status: "COMPLETED",
          note,
        },
      });

      // 2. Process each Order Item
      for (const item of items) {
        const prodId = parseInt(item.productId);
        const qty = parseInt(item.quantity);
        const price = parseFloat(item.price);
        const itemSubtotal = price * qty;

        // Fetch current product with recipe ingredients
        const product = await tx.product.findUnique({
          where: { id: prodId },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        });

        if (!product) {
          throw new Error(`Product ID ${prodId} not found`);
        }

        if (product.hasRecipe && product.ingredients && product.ingredients.length > 0) {
          // Product tracks stock by raw ingredient recipe -> Deduct ingredient stock
          for (const pi of product.ingredients) {
            const requiredQty = Number(pi.quantity) * qty;
            const currentIngStock = Number(pi.ingredient.stock);

            if (currentIngStock < requiredQty) {
              throw new Error(
                `Insufficient stock for ingredient: ${pi.ingredient.name}. Available: ${currentIngStock} ${pi.ingredient.unit}, Required: ${requiredQty} ${pi.ingredient.unit}`
              );
            }

            const oldStock = currentIngStock;
            const newStock = Number((oldStock - requiredQty).toFixed(2));

            await tx.ingredient.update({
              where: { id: pi.ingredientId },
              data: { stock: newStock },
            });

            await tx.inventoryLog.create({
              data: {
                ingredientId: pi.ingredientId,
                type: "ORDER_OUT",
                quantity: requiredQty,
                beforeQty: oldStock,
                afterQty: newStock,
                note: `Deducted for Order #${orderNumber} (${product.name} x${qty})`,
                userId: user.id,
              },
            });
          }
        } else {
          // Product does not use recipe ingredients -> Check & deduct finished product stock
          if (product.stock < qty) {
            throw new Error(`Insufficient product stock for ${product.name}. Available: ${product.stock}, Required: ${qty}`);
          }

          const oldStock = product.stock;
          const newStock = oldStock - qty;

          await tx.product.update({
            where: { id: prodId },
            data: { stock: newStock },
          });

          await tx.inventoryLog.create({
            data: {
              productId: prodId,
              type: "OUT",
              quantity: qty,
              beforeQty: oldStock,
              afterQty: newStock,
              note: `Order sale #${orderNumber}`,
              userId: user.id,
            },
          });
        }

        // Save order item
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: prodId,
            quantity: qty,
            price,
            subtotal: itemSubtotal,
          },
        });
      }

      // 3. Award loyalty points to customer (1 point per dollar spent)
      if (customerId) {
        const custId = parseInt(customerId);
        const pointsToAdd = Math.floor(parsedTotal);
        await tx.customer.update({
          where: { id: custId },
          data: {
            points: {
              increment: pointsToAdd,
            },
          },
        });
      }

      return newOrder;
    });

    // Fetch full order details to return to client
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
      },
    });

    return res.status(201).json(fullOrder);
  } catch (error: any) {
    console.error("Order POST error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit order" });
  }
});

// GET /api/orders/:id
router.get("/:id", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { name: true, role: true } },
        items: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    console.error("Order GET detail error:", error);
    return res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// PUT /api/orders/:id
router.put("/:id", authenticateUser, requireManagerOrAdmin, async (req: AuthRequest, res) => {
  const user = req.user!;
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // "REFUNDED" or "CANCELLED"

    if (!status || (status !== "REFUNDED" && status !== "CANCELLED")) {
      return res.status(400).json({
        error: "Invalid target status: must be CANCELLED or REFUNDED",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "REFUNDED" || order.status === "CANCELLED") {
      return res.status(400).json({
        error: "Order has already been cancelled or refunded",
      });
    }

    // Run order status update and stock returns inside a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updated = await tx.order.update({
        where: { id },
        data: { status },
      });

      // 2. Revert stocks for each product inside the order
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        });

        if (product) {
          if (product.ingredients && product.ingredients.length > 0) {
            for (const pi of product.ingredients) {
              const returnedQty = Number(pi.quantity) * item.quantity;
              const currentIngStock = Number(pi.ingredient.stock);
              const newStock = Number((currentIngStock + returnedQty).toFixed(2));

              await tx.ingredient.update({
                where: { id: pi.ingredientId },
                data: { stock: newStock },
              });

              await tx.inventoryLog.create({
                data: {
                  ingredientId: pi.ingredientId,
                  type: "IN",
                  quantity: returnedQty,
                  beforeQty: currentIngStock,
                  afterQty: newStock,
                  note: `Order ${status} restock return - Order #${order.orderNumber} (${product.name} x${item.quantity})`,
                  userId: user.id,
                },
              });
            }
          } else {
            const oldStock = product.stock;
            const newStock = oldStock + item.quantity;

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });

            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                beforeQty: oldStock,
                afterQty: newStock,
                note: `Order ${status} restock return - Order #${order.orderNumber}`,
                userId: user.id,
              },
            });
          }
        }
      }

      // 3. Deduct points from the customer
      if (order.customerId) {
        const pointsToDeduct = Math.floor(Number(order.total));
        
        // Ensure customer points don't drop below 0
        const customer = await tx.customer.findUnique({
          where: { id: order.customerId },
        });

        if (customer) {
          const currentPoints = customer.points;
          const finalPoints = Math.max(0, currentPoints - pointsToDeduct);
          
          await tx.customer.update({
            where: { id: order.customerId },
            data: { points: finalPoints },
          });
        }
      }

      return updated;
    });

    return res.json(updatedOrder);
  } catch (error: any) {
    console.error("Order status update PUT error:", error);
    return res.status(500).json({ error: error.message || "Failed to update order status" });
  }
});

export default router;
