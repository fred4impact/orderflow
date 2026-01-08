package com.example.order.repository;

import com.example.order.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    
    List<OrderEntity> findByAccountId(String accountId);
    
    List<OrderEntity> findByAccountIdAndStatus(String accountId, OrderEntity.OrderStatus status);
}

