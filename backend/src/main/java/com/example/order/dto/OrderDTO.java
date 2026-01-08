package com.example.order.dto;

import com.example.order.entity.OrderEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Order information")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {

    @Schema(description = "Order ID", example = "1")
    private Long id;

    @Schema(description = "Account ID", example = "acc-123")
    private String accountId;

    @Schema(description = "List of order items")
    private List<OrderItemDTO> items;

    @Schema(description = "Total amount", example = "99.98")
    private BigDecimal totalAmount;

    @Schema(description = "Shipping address", example = "123 Main St, City, State 12345")
    private String shippingAddress;

    @Schema(description = "Payment ID", example = "pmt-456")
    private String paymentId;

    @Schema(description = "Order status", example = "PLACED")
    private OrderEntity.OrderStatus status;

    @Schema(description = "Order creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Order last update timestamp")
    private LocalDateTime updatedAt;
}

