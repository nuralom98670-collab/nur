import { Message } from "../models/message.model.js";
import { AdminNotification } from "../models/admin_notification.model.js";
import { MessageReply } from "../models/message_reply.model.js";
import { sendEmail } from "../utils/notify.js";

export const MessageController = {
  publicCreate(req,res){
    const m = Message.create(req.body || {});
    try {
      AdminNotification.add({
        type: 'message',
        title: `New contact message`,
        body: `${m.name || 'Someone'}: ${(m.subject || '').trim()}${(m.message||'') ? ' — ' + String(m.message).trim().slice(0,80) : ''}`.trim(),
        refType: 'message',
        refId: m.id
      });
    } catch {}
    return res.json({ ok:true, id: m.id });
  },
  adminList(req,res){ return res.json(Message.list()); },
  serviceRequests(req,res){
    const all = Message.list();
    const filtered = all.filter(m => String(m.subject||"").startsWith("Service Request:"));
    return res.json(filtered);
  },
  adminGet(req,res){
    const m = Message.get(req.params.id);
    if(!m) return res.status(404).json({error:"Not found"});
    return res.json(m);
  },
  markRead(req,res){
    const m = Message.markRead(req.params.id);
    if(!m) return res.status(404).json({error:"Not found"});
    return res.json(m);
  },
  unreadCount(req,res){ return res.json({ count: Message.unreadCount() }); }

  ,
  adminReplies(req,res){
    const id = String(req.params.id||'').trim();
    if(!id) return res.status(400).json({error:'Missing id'});
    return res.json({ items: MessageReply.listByMessage(id) });
  },
  adminReplyCreate: async function(req,res){
    const id = String(req.params.id||'').trim();
    if(!id) return res.status(400).json({error:'Missing id'});
    const m = Message.get(id);
    if(!m) return res.status(404).json({error:'Not found'});
    const body = String((req.body||{}).body || '').trim();
    if(!body) return res.status(400).json({error:'Empty reply'});
    const adminId = req.admin?.id || req.user?.id || null;
    const r = MessageReply.create({ messageId: id, adminId, body });

    // Email the customer if email present
    try{
      const to = String(m.email||'').trim();
      if(to){
        const subject = `Re: ${m.subject || 'Your message'} (RoboticsLeb)`;
        const text = `Hello${m.name? ' ' + m.name:''},\n\n${body}\n\n— RoboticsLeb Support`;
        await sendEmail({ to, subject, text });
      }
    }catch{}

    return res.json({ ok:true, reply: r });
  }

};
