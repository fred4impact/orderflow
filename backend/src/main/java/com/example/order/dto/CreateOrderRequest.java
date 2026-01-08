package com.example.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Schema(description = "Request to create a new order")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    @Schema(description = "Account ID of the customer", example = "acc-123", required = true)
    @NotBlank(message = "Account ID is required")
    private String accountId;

    @Schema(description = "List of order items", required = true)
    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<OrderItemDTO> items;

    @Schema(description = "Shipping address", example = "123 Main St, City, State 12345", required = true)
    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    @Schema(description = "Payment method identifier", example = "pmt-456")
    private String paymentMethod;
}

