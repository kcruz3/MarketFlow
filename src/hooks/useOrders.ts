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
  orderNumber?: string;
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

async function createOrderClientSide(data: {
  customerId: string;
  customerEmail: string;
  vendorSlug: string;
  vendorName: string;
  items: OrderItem[];
  pickupWindow: string;
  notes: string;
  eventId?: string;
}): Promise<Order> {
  const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const qrCode = `MF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const Obj = Parse.Object.extend('Order');
  const obj = new Obj();
  obj.set('customerId', data.customerId);
  obj.set('customerEmail', data.customerEmail);
  obj.set('vendorSlug', data.vendorSlug);
  obj.set('vendorName', data.vendorName);
  obj.set('items', data.items);
  obj.set('subtotal', subtotal);
  obj.set('total', subtotal);
  obj.set('status', 'pending');
  obj.set('pickupWindow', data.pickupWindow);
  obj.set('notes', data.notes);
  obj.set('qrCode', qrCode);
  if (data.eventId) obj.set('eventId', data.eventId);

  const acl = new Parse.ACL();
  acl.setPublicReadAccess(false);
  acl.setWriteAccess(data.customerId, false);
  acl.setReadAccess(data.customerId, true);
  acl.setRoleReadAccess('admin', true);
  acl.setRoleWriteAccess('admin', true);
  acl.setRoleReadAccess('vendor', true);
  acl.setRoleWriteAccess('vendor', true);
  obj.setACL(acl);

  await obj.save();
  return mapOrder(obj);
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
  try {
    const order = await Parse.Cloud.run('createOrderWithInventory', data);
    return mapCloudOrder(order);
  } catch (error: any) {
    const message = String(error?.message || '');
    if (/Invalid function/i.test(message)) {
      return createOrderClientSide(data);
    }
    throw error;
  }
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
