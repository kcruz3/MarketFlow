import { useEffect, useState, useCallback } from 'react';
import Parse from '../lib/parse';

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'fulfilled' | 'cancelled';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  objectId: string;
  customerId: string;
  customerEmail: string;
  vendorSlug: string;
  vendorName: string;
  orderNumber: string;
  eventId?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  pickupWindow: string;
  notes: string;
  qrCode: string;
  createdAt: Date;
}

function mapOrder(order: Parse.Object): Order {
  return {
    objectId: order.id!,
    ...order.attributes,
    createdAt: order.createdAt!,
  } as Order;
}

function mapCloudOrder(order: any): Order {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
  } as Order;
}

async function fetchOrdersByField(
  fieldName: 'vendorSlug' | 'customerId',
  fieldValue: string,
  limit: number
): Promise<Order[]> {
  if (!fieldValue) {
    return [];
  }

  const query = new Parse.Query('Order');
  query.equalTo(fieldName, fieldValue);
  query.descending('createdAt');
  query.limit(limit);

  const results = await query.find();
  return results.map(mapOrder);
}

function useOrdersList(
  fieldName: 'vendorSlug' | 'customerId',
  fieldValue: string,
  limit: number
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!fieldValue) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setOrders(await fetchOrdersByField(fieldName, fieldValue, limit));
    } finally {
      setLoading(false);
    }
  }, [fieldName, fieldValue, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders, setOrders };
}

// Customer: place a new order
export async function createOrder(data: {
  customerId: string;
  customerEmail: string;
  vendorSlug: string;
  vendorName: string;
  items: OrderItem[];
  pickupWindow: string;
  notes: string;
  eventId?: string;
}): Promise<Order> {
  const order = await Parse.Cloud.run('createOrderWithInventory', data);
  return mapCloudOrder(order);
}

// Vendor: fetch their own orders
export function useVendorOrders(vendorSlug: string) {
  const { orders, loading, refetch, setOrders } = useOrdersList(
    'vendorSlug',
    vendorSlug,
    200
  );

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const query = new Parse.Query('Order');
    const obj = await query.get(orderId);
    obj.set('status', status);
    await obj.save();
    setOrders(prev => prev.map(o => o.objectId === orderId ? { ...o, status } : o));
  };

  return { orders, loading, updateStatus, refetch };
}

// Customer: fetch their own orders
export function useCustomerOrders(customerId: string) {
  const { orders, loading, refetch } = useOrdersList(
    'customerId',
    customerId,
    100
  );

  return { orders, loading, refetch };
}
