package com.pos.system.service;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.OrderCreateRequest;
import com.pos.system.dto.OrderItemRequest;
import com.pos.system.entity.*;
import com.pos.system.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final IngredientRepository ingredientRepository;
    private final CustomerRepository customerRepository;
    private final InventoryLogRepository inventoryLogRepository;

    public OrderService(
        OrderRepository orderRepository,
        OrderItemRepository orderItemRepository,
        ProductRepository productRepository,
        IngredientRepository ingredientRepository,
        CustomerRepository customerRepository,
        InventoryLogRepository inventoryLogRepository
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.ingredientRepository = ingredientRepository;
        this.customerRepository = customerRepository;
        this.inventoryLogRepository = inventoryLogRepository;
    }

    public List<Order> searchOrders(String search, String statusStr, String startDateStr, String endDateStr) {
        OrderStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusStr.trim())) {
            try {
                status = OrderStatus.valueOf(statusStr.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        LocalDateTime startDate = null;
        if (startDateStr != null && !startDateStr.trim().isEmpty()) {
            try {
                startDate = LocalDate.parse(startDateStr.trim()).atStartOfDay();
            } catch (Exception ignored) {}
        }

        LocalDateTime endDate = null;
        if (endDateStr != null && !endDateStr.trim().isEmpty()) {
            try {
                endDate = LocalDate.parse(endDateStr.trim()).atTime(23, 59, 59, 999000000);
            } catch (Exception ignored) {}
        }

        final OrderStatus finalStatus = status;
        final LocalDateTime finalStartDate = startDate;
        final LocalDateTime finalEndDate = endDate;
        final String finalSearch = (search != null && !search.trim().isEmpty()) ? search.trim().toLowerCase() : null;

        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (finalSearch != null) {
                Join<Order, Customer> customerJoin = root.join("customer", JoinType.LEFT);
                Join<Order, User> userJoin = root.join("user", JoinType.LEFT);
                String pattern = "%" + finalSearch + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("orderNumber")), pattern),
                    cb.like(cb.lower(customerJoin.get("name")), pattern),
                    cb.like(cb.lower(userJoin.get("name")), pattern)
                ));
            }

            if (finalStatus != null) {
                predicates.add(cb.equal(root.get("status"), finalStatus));
            }

            if (finalStartDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), finalStartDate));
            }

            if (finalEndDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), finalEndDate));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        return orderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public Order getOrderById(Integer id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private String generateOrderNumber() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int rand = 1000 + new Random().nextInt(9000);
        return "POS-" + dateStr + "-" + rand;
    }

    @Transactional
    public Order createOrder(OrderCreateRequest request, UserPrincipal currentUser) {
        if (request.getItems() == null || request.getItems().isEmpty() || request.getPaymentMethod() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order details: items and paymentMethod are required");
        }

        String orderNumber = generateOrderNumber();

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUserId(currentUser.getId());
        order.setCustomerId(request.getCustomerId());
        order.setSubtotal(request.getSubtotal());
        order.setDiscount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO);
        order.setTax(request.getTax() != null ? request.getTax() : BigDecimal.ZERO);
        order.setTotal(request.getTotal());
        order.setPaymentMethod(request.getPaymentMethod());
        order.setAmountPaid(request.getAmountPaid());
        order.setChange(request.getChange() != null ? request.getChange() : BigDecimal.ZERO);
        order.setStatus(OrderStatus.COMPLETED);
        order.setNote(request.getNote());

        Order savedOrder = orderRepository.save(order);

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID " + itemReq.getProductId() + " not found"));

            int qty = itemReq.getQuantity();
            BigDecimal price = itemReq.getPrice();
            BigDecimal subtotal = price.multiply(new BigDecimal(qty));

            // Stock deduction
            if (product.getHasRecipe() && product.getIngredients() != null && !product.getIngredients().isEmpty()) {
                for (ProductIngredient pi : product.getIngredients()) {
                    Ingredient ing = pi.getIngredient();
                    BigDecimal requiredQty = pi.getQuantity().multiply(new BigDecimal(qty));
                    BigDecimal currentStock = ing.getStock();

                    if (currentStock.compareTo(requiredQty) < 0) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Insufficient stock for ingredient: " + ing.getName() +
                                ". Available: " + currentStock + " " + ing.getUnit() +
                                ", Required: " + requiredQty + " " + ing.getUnit());
                    }

                    BigDecimal newStock = currentStock.subtract(requiredQty).setScale(2, RoundingMode.HALF_UP);
                    ing.setStock(newStock);
                    ingredientRepository.save(ing);

                    InventoryLog log = new InventoryLog();
                    log.setIngredientId(ing.getId());
                    log.setType("ORDER_OUT");
                    log.setQuantity(requiredQty);
                    log.setBeforeQty(currentStock);
                    log.setAfterQty(newStock);
                    log.setNote("Deducted for Order #" + orderNumber + " (" + product.getName() + " x" + qty + ")");
                    log.setUserId(currentUser.getId());
                    inventoryLogRepository.save(log);
                }
            } else {
                if (product.getStock() < qty) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Insufficient product stock for " + product.getName() +
                            ". Available: " + product.getStock() + ", Required: " + qty);
                }

                int oldStock = product.getStock();
                int newStock = oldStock - qty;
                product.setStock(newStock);
                productRepository.save(product);

                InventoryLog log = new InventoryLog();
                log.setProductId(product.getId());
                log.setType("OUT");
                log.setQuantity(new BigDecimal(qty));
                log.setBeforeQty(new BigDecimal(oldStock));
                log.setAfterQty(new BigDecimal(newStock));
                log.setNote("Order sale #" + orderNumber);
                log.setUserId(currentUser.getId());
                inventoryLogRepository.save(log);
            }

            OrderItem orderItem = new OrderItem(savedOrder, product, qty, price, subtotal);
            orderItemRepository.save(orderItem);
            savedOrder.getItems().add(orderItem);
        }

        // Award loyalty points to customer (1 point per dollar spent)
        if (request.getCustomerId() != null) {
            customerRepository.findById(request.getCustomerId()).ifPresent(c -> {
                int pointsToAdd = request.getTotal().intValue();
                c.setPoints(c.getPoints() + pointsToAdd);
                customerRepository.save(c);
            });
        }

        return orderRepository.findById(savedOrder.getId()).orElse(savedOrder);
    }

    @Transactional
    public Order updateOrderStatus(Integer id, String targetStatusStr, UserPrincipal currentUser) {
        if (targetStatusStr == null || (!"REFUNDED".equalsIgnoreCase(targetStatusStr) && !"CANCELLED".equalsIgnoreCase(targetStatusStr))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid target status: must be CANCELLED or REFUNDED");
        }

        OrderStatus targetStatus = OrderStatus.valueOf(targetStatusStr.toUpperCase());

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (order.getStatus() == OrderStatus.REFUNDED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order has already been cancelled or refunded");
        }

        order.setStatus(targetStatus);
        Order updatedOrder = orderRepository.save(order);

        // Revert stocks
        for (OrderItem item : order.getItems()) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null) {
                if (product.getHasRecipe() && product.getIngredients() != null && !product.getIngredients().isEmpty()) {
                    for (ProductIngredient pi : product.getIngredients()) {
                        Ingredient ing = pi.getIngredient();
                        BigDecimal returnedQty = pi.getQuantity().multiply(new BigDecimal(item.getQuantity()));
                        BigDecimal currentStock = ing.getStock();
                        BigDecimal newStock = currentStock.add(returnedQty).setScale(2, RoundingMode.HALF_UP);

                        ing.setStock(newStock);
                        ingredientRepository.save(ing);

                        InventoryLog log = new InventoryLog();
                        log.setIngredientId(ing.getId());
                        log.setType("IN");
                        log.setQuantity(returnedQty);
                        log.setBeforeQty(currentStock);
                        log.setAfterQty(newStock);
                        log.setNote("Order " + targetStatus + " restock return - Order #" + order.getOrderNumber() + " (" + product.getName() + " x" + item.getQuantity() + ")");
                        log.setUserId(currentUser.getId());
                        inventoryLogRepository.save(log);
                    }
                } else {
                    int oldStock = product.getStock();
                    int newStock = oldStock + item.getQuantity();
                    product.setStock(newStock);
                    productRepository.save(product);

                    InventoryLog log = new InventoryLog();
                    log.setProductId(product.getId());
                    log.setType("IN");
                    log.setQuantity(new BigDecimal(item.getQuantity()));
                    log.setBeforeQty(new BigDecimal(oldStock));
                    log.setAfterQty(new BigDecimal(newStock));
                    log.setNote("Order " + targetStatus + " restock return - Order #" + order.getOrderNumber());
                    log.setUserId(currentUser.getId());
                    inventoryLogRepository.save(log);
                }
            }
        }

        // Deduct points from customer
        if (order.getCustomerId() != null) {
            customerRepository.findById(order.getCustomerId()).ifPresent(c -> {
                int pointsToDeduct = order.getTotal().intValue();
                c.setPoints(Math.max(0, c.getPoints() - pointsToDeduct));
                customerRepository.save(c);
            });
        }

        return updatedOrder;
    }
}
