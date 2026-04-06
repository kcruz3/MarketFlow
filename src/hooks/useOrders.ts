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
  obj.set('total', subtotal); // no markup for cash pickup
  obj.set('status', 'pending');
  obj.set('pickupWindow', data.pickupWindow);
  obj.set('notes', data.notes);
  obj.set('qrCode', qrCode);
  if (data.eventId) obj.set('eventId', data.eventId);

  // ACL: customer can read, vendor can read+write status, admins full access
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
  return { objectId: obj.id, ...obj.attributes } as Order;
}

// Vendor: fetch their own orders
export function useVendorOrders(vendorSlug: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!vendorSlug) return;
    setLoading(true);
    try {
      const query = new Parse.Query('Order');
      query.equalTo('vendorSlug', vendorSlug);
      query.descending('createdAt');
      query.limit(200);
      const results = await query.find();
      setOrders(results.map(r => ({
        objectId: r.id,
        ...r.attributes,
        createdAt: r.createdAt,
      } as Order)));
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const query = new Parse.Query('Order');
    const obj = await query.get(orderId);
    obj.set('status', status);
    await obj.save();
    setOrders(prev => prev.map(o => o.objectId === orderId ? { ...o, status } : o));
  };

  return { orders, loading, updateStatus, refetch: fetchOrders };
}

// Customer: fetch their own orders
export function useCustomerOrders(customerId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const query = new Parse.Query('Order');
      query.equalTo('customerId', customerId);
      query.descending('createdAt');
      query.limit(100);
      const results = await query.find();
      setOrders(results.map(r => ({
        objectId: r.id,
        ...r.attributes,
        createdAt: r.createdAt,
      } as Order)));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}
