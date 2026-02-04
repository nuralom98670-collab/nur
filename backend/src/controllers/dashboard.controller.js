import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Message } from "../models/message.model.js";
import { parseLimit } from "../utils/pagination.js";
import { UserEvent } from "../models/user_event.model.js";

function safeParse(jsonStr, fallback){
  try { return JSON.parse(jsonStr); } catch { return fallback; }
}

export const DashboardController = {
  summary(req,res){
    const productList = Product.list();
    const orderList = Order.list();
    const totalProducts = productList.length;
    const totalOrders = orderList.length;

    // revenue = sum of all order totals (you can change later to paid/shipped only)
    const revenue = orderList.reduce((sum, o) => sum + Number(o?.total || 0), 0);

    // customers = unique by email/phone/name from customerJson
    const customerKeys = new Set();
    for (const o of orderList) {
      const c = safeParse(o?.customerJson, {}) || {};
      const key =
        (c.email && String(c.email).toLowerCase().trim()) ||
        (c.phone && String(c.phone).trim()) ||
        (c.name && String(c.name).toLowerCase().trim()) ||
        null;
      if (key) customerKeys.add(key);
    }
    const totalUsers = customerKeys.size;

    const unread = Message.unreadCount();

    // return fields expected by admin-dashboard.js
    return res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      revenue,
      unread,

      // backward compatible fields (older UI)
      products: totalProducts,
      orders: totalOrders,
    });
  },

  lowStock(req,res){
    const limit = parseLimit(req, 5, 20);
    return res.json(Product.lowStock(limit));
  },

  loginEvents(req,res){
    const limit = parseLimit(req, 10, 50);
    return res.json(UserEvent.recent(limit));
  },

  newOrders(req,res){
    const limit = parseLimit(req, 5, 20);
    return res.json(Order.newOrders(limit));
  }
};
