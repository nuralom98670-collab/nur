import { AdminNotification } from "../models/admin_notification.model.js";

export const AdminNotificationController = {
  count(req,res){
    return res.json({ count: AdminNotification.unreadCount() });
  },
  list(req,res){
    const limit = Number(req.query?.limit || 30);
    return res.json(AdminNotification.list(limit));
  },
  markRead(req,res){
    const id = req.body?.id || req.query?.id || null;
    AdminNotification.markRead(id);
    return res.json({ ok: true });
  }
};
