import { useEffect, useState, useCallback } from 'react';
import Parse from '../lib/parse';

export interface MenuItem {
  objectId: string;
  vendorSlug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
  isActive: boolean;
}

export function useMenuItems(vendorSlug: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!vendorSlug) return;
    setLoading(true);
    try {
      const query = new Parse.Query('MenuItem');
      query.equalTo('vendorSlug', vendorSlug);
      query.equalTo('isActive', true);
      query.ascending('category');
      const results = await query.find();
      setItems(results.map(r => ({ objectId: r.id, ...r.attributes } as MenuItem)));
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (data: Omit<MenuItem, 'objectId' | 'vendorSlug' | 'isActive'>) => {
    const Obj = Parse.Object.extend('MenuItem');
    const obj = new Obj();
    obj.set('vendorSlug', vendorSlug);
    obj.set('name', data.name);
    obj.set('description', data.description);
    obj.set('price', data.price);
    obj.set('category', data.category);
    obj.set('available', data.available);
    obj.set('isActive', true);
    if (data.imageUrl) obj.set('imageUrl', data.imageUrl);

    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setRoleWriteAccess('vendor', true);
    acl.setRoleWriteAccess('admin', true);
    obj.setACL(acl);

    await obj.save();
    await fetchItems();
  };

  const toggleAvailability = async (itemId: string, available: boolean) => {
    const query = new Parse.Query('MenuItem');
    const obj = await query.get(itemId);
    obj.set('available', available);
    await obj.save();
    setItems(prev => prev.map(i => i.objectId === itemId ? { ...i, available } : i));
  };

  const deleteItem = async (itemId: string) => {
    const query = new Parse.Query('MenuItem');
    const obj = await query.get(itemId);
    obj.set('isActive', false);
    await obj.save();
    setItems(prev => prev.filter(i => i.objectId !== itemId));
  };

  return { items, loading, addItem, toggleAvailability, deleteItem, refetch: fetchItems };
}
