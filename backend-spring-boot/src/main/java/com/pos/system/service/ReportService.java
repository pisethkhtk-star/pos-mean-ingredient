package com.pos.system.service;

import com.pos.system.entity.Order;
import com.pos.system.entity.OrderItem;
import com.pos.system.entity.OrderStatus;
import com.pos.system.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ReportService {

    private final OrderRepository orderRepository;

    public ReportService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Map<String, Object> getReports(String startDateStr, String endDateStr) {
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

        final LocalDateTime finalStartDate = startDate;
        final LocalDateTime finalEndDate = endDate;

        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), OrderStatus.COMPLETED));

            if (finalStartDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), finalStartDate));
            }
            if (finalEndDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), finalEndDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Order> orders = orderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        double totalRevenue = 0;
        double totalCostOfGoods = 0;
        double totalDiscount = 0;
        double totalTax = 0;
        int orderCount = orders.size();

        Map<String, double[]> salesByDateMap = new TreeMap<>(); // date -> [revenue, cost, count]
        Map<String, double[]> salesByCategoryMap = new HashMap<>(); // category -> [revenue, quantity]
        Map<String, double[]> salesByCashierMap = new HashMap<>(); // cashier -> [revenue, count]

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (Order order : orders) {
            double rev = order.getTotal().doubleValue();
            double disc = order.getDiscount() != null ? order.getDiscount().doubleValue() : 0;
            double tx = order.getTax() != null ? order.getTax().doubleValue() : 0;

            totalRevenue += rev;
            totalDiscount += disc;
            totalTax += tx;

            double orderCost = 0;
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    int qty = item.getQuantity();
                    double unitCost = item.getProduct() != null && item.getProduct().getCost() != null ?
                            item.getProduct().getCost().doubleValue() : 0;
                    double itemCost = unitCost * qty;
                    orderCost += itemCost;

                    String catName = (item.getProduct() != null && item.getProduct().getCategory() != null) ?
                            item.getProduct().getCategory().getName() : "Uncategorized";

                    salesByCategoryMap.putIfAbsent(catName, new double[]{0, 0});
                    double[] catVals = salesByCategoryMap.get(catName);
                    catVals[0] += item.getSubtotal().doubleValue();
                    catVals[1] += qty;
                }
            }
            totalCostOfGoods += orderCost;

            String dateKey = order.getCreatedAt().format(dateFmt);
            salesByDateMap.putIfAbsent(dateKey, new double[]{0, 0, 0});
            double[] dateVals = salesByDateMap.get(dateKey);
            dateVals[0] += rev;
            dateVals[1] += orderCost;
            dateVals[2] += 1;

            String cashierName = order.getUser() != null && order.getUser().getName() != null ?
                    order.getUser().getName() : "System";
            salesByCashierMap.putIfAbsent(cashierName, new double[]{0, 0});
            double[] cashierVals = salesByCashierMap.get(cashierName);
            cashierVals[0] += rev;
            cashierVals[1] += 1;
        }

        double netProfit = totalRevenue - totalCostOfGoods;
        double avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        List<Map<String, Object>> salesByDate = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : salesByDateMap.entrySet()) {
            double r = entry.getValue()[0];
            double c = entry.getValue()[1];
            double cnt = entry.getValue()[2];
            salesByDate.add(Map.of(
                "date", entry.getKey(),
                "revenue", Math.round(r * 100.0) / 100.0,
                "cost", Math.round(c * 100.0) / 100.0,
                "profit", Math.round((r - c) * 100.0) / 100.0,
                "orders", (int) cnt
            ));
        }

        List<Map<String, Object>> salesByCategory = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : salesByCategoryMap.entrySet()) {
            salesByCategory.add(Map.of(
                "category", entry.getKey(),
                "revenue", Math.round(entry.getValue()[0] * 100.0) / 100.0,
                "quantity", (int) entry.getValue()[1]
            ));
        }

        List<Map<String, Object>> salesByCashier = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : salesByCashierMap.entrySet()) {
            salesByCashier.add(Map.of(
                "cashier", entry.getKey(),
                "revenue", Math.round(entry.getValue()[0] * 100.0) / 100.0,
                "orders", (int) entry.getValue()[1]
            ));
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        summary.put("totalCostOfGoods", Math.round(totalCostOfGoods * 100.0) / 100.0);
        summary.put("totalDiscount", Math.round(totalDiscount * 100.0) / 100.0);
        summary.put("totalTax", Math.round(totalTax * 100.0) / 100.0);
        summary.put("netProfit", Math.round(netProfit * 100.0) / 100.0);
        summary.put("orderCount", orderCount);
        summary.put("avgOrderValue", Math.round(avgOrderValue * 100.0) / 100.0);

        Map<String, Object> response = new HashMap<>();
        response.put("summary", summary);
        response.put("salesByDate", salesByDate);
        response.put("salesByCategory", salesByCategory);
        response.put("salesByCashier", salesByCashier);

        return response;
    }
}
