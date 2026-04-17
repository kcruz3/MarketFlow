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
  inventoryCount: number | null;
  available: boolean;
  isActive: boolean;
}

function mapMenuItem(record: Parse.Object): MenuItem {
  const rawInventory = record.get('inventoryCount');
  const inventoryCount =
    typeof rawInventory === 'number' && Number.isFinite(rawInventory)
      ? rawInventory
      : null;
  const available =
    inventoryCount !== null
      ? inventoryCount > 0
      : Boolean(record.get('available'));

  return {
    objectId: record.id!,
    ...record.attributes,
    inventoryCount,
    available,
  } as MenuItem;
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
      setItems(results.map(mapMenuItem));
    } finally {
      setLoading(false);
    }
  }, [vendorSlug]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (data: Omit<MenuItem, 'objectId' | 'vendorSlug' | 'isActive' | 'available'>) => {
    const Obj = Parse.Object.extend('MenuItem');
    const obj = new Obj();
    const rawInventoryCount = Number(data.inventoryCount ?? 0);
    const inventoryCount = Number.isFinite(rawInventoryCount)
      ? Math.max(0, Math.floor(rawInventoryCount))
      : 0;
    obj.set('vendorSlug', vendorSlug);
    obj.set('name', data.name);
    obj.set('description', data.description);
    obj.set('price', data.price);
    obj.set('category', data.category);
    obj.set('inventoryCount', inventoryCount);
    obj.set('available', inventoryCount > 0);
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

  const updateInventory = async (itemId: string, inventoryCount: number) => {
    const sanitizedInventory = Number.isFinite(inventoryCount)
      ? Math.max(0, Math.floor(inventoryCount))
      : 0;
    const query = new Parse.Query('MenuItem');
    const obj = await query.get(itemId);
    obj.set('inventoryCount', sanitizedInventory);
    obj.set('available', sanitizedInventory > 0);
    await obj.save();
    setItems((prev) =>
      prev.map((item) =>
        item.objectId === itemId
          ? {
              ...item,
              inventoryCount: sanitizedInventory,
              available: sanitizedInventory > 0,
            }
          : item
      )
    );
  };

  const deleteItem = async (itemId: string) => {
    const query = new Parse.Query('MenuItem');
    const obj = await query.get(itemId);
    obj.set('isActive', false);
    await obj.save();
    setItems(prev => prev.filter(i => i.objectId !== itemId));
  };

  return { items, loading, addItem, updateInventory, deleteItem, refetch: fetchItems };
}
