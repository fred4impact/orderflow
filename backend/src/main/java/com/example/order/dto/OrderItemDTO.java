package com.example.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Schema(description = "Order item information")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDTO {

    @Schema(description = "Product ID", example = "prod-123")
    @NotBlank(message = "Product ID is required")
    private String productId;

    @Schema(description = "Quantity", example = "2")
    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @Schema(description = "Unit price", example = "29.99")
    @NotNull(message = "Price is required")
    private BigDecimal price;

    @Schema(description = "Subtotal (quantity * price)", example = "59.98")
    private BigDecimal subtotal;
}

