def reserve_items(stock, order):
    reserved = {}

    for product_id, requested_quantity in order.items():
        available_quantity = stock.get(product_id, 0)

        if available_quantity < requested_quantity:
            return None

        stock[product_id] = available_quantity - requested_quantity
        reserved[product_id] = requested_quantity

    return reserved