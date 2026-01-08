package com.example.order.service;

import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.OrderDTO;
import com.example.order.entity.OrderEntity;
import com.example.order.entity.OrderItem;
import com.example.order.exception.NotFoundException;
import com.example.order.mapper.OrderMapper;
import com.example.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderDTO createOrder(CreateOrderRequest request) {
        log.info("Creating order for account: {}", request.getAccountId());

        // Calculate total amount
        BigDecimal totalAmount = request.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Build order entity
        OrderEntity order = OrderEntity.builder()
                .accountId(request.getAccountId())
                .totalAmount(totalAmount)
                .shippingAddress(request.getShippingAddress())
                .paymentId(request.getPaymentMethod())
                .status(OrderEntity.OrderStatus.PLACED)
                .build();

        // Map and add order items
        List<OrderItem> items = request.getItems().stream()
                .map(dto -> {
                    OrderItem item = orderMapper.toEntity(dto);
                    item.setOrder(order);
                    item.setSubtotal(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                    return item;
                })
                .collect(Collectors.toList());

        order.setItems(items);

        // Save order
        OrderEntity savedOrder = orderRepository.save(order);
        log.info("Order created successfully with ID: {}", savedOrder.getId());

        return orderMapper.toDTO(savedOrder);
    }

    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long id) {
        log.info("Fetching order with ID: {}", id);
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found with ID: " + id));
        return orderMapper.toDTO(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByAccountId(String accountId) {
        log.info("Fetching orders for account: {}", accountId);
        return orderRepository.findByAccountId(accountId).stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO cancelOrder(Long id) {
        log.info("Cancelling order with ID: {}", id);
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found with ID: " + id));

        if (order.getStatus() == OrderEntity.OrderStatus.SHIPPED ||
            order.getStatus() == OrderEntity.OrderStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel order with status: " + order.getStatus());
        }

        order.setStatus(OrderEntity.OrderStatus.CANCELLED);
        OrderEntity savedOrder = orderRepository.save(order);
        log.info("Order {} cancelled successfully", id);

        return orderMapper.toDTO(savedOrder);
    }

    @Transactional
    public OrderDTO updateOrderStatus(Long id, OrderEntity.OrderStatus status) {
        log.info("Updating order {} status to {}", id, status);
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Order not found with ID: " + id));

        order.setStatus(status);
        OrderEntity savedOrder = orderRepository.save(order);
        log.info("Order {} status updated to {}", id, status);

        return orderMapper.toDTO(savedOrder);
    }
}

