package com.example.order.mapper;

import com.example.order.dto.OrderDTO;
import com.example.order.dto.OrderItemDTO;
import com.example.order.entity.OrderEntity;
import com.example.order.entity.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    OrderMapper INSTANCE = Mappers.getMapper(OrderMapper.class);

    @Mapping(target = "items", expression = "java(mapItemsToDTOs(entity.getItems()))")
    OrderDTO toDTO(OrderEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "order", ignore = true)
    @Mapping(target = "subtotal", expression = "java(calculateSubtotal(dto.getQuantity(), dto.getPrice()))")
    OrderItem toEntity(OrderItemDTO dto);

    OrderItemDTO toItemDTO(OrderItem item);

    default List<OrderItemDTO> mapItemsToDTOs(List<OrderItem> items) {
        if (items == null) {
            return null;
        }
        return items.stream()
                .map(this::toItemDTO)
                .collect(Collectors.toList());
    }

    default BigDecimal calculateSubtotal(Integer quantity, BigDecimal price) {
        if (quantity == null || price == null) {
            return BigDecimal.ZERO;
        }
        return price.multiply(BigDecimal.valueOf(quantity));
    }
}

