import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationDocument } from '../schemas/notification.schema';
import { toObjectId } from '../common/utils';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(NotificationDocument.name)
        private notifModel: Model<NotificationDocument>,
    ) { }

    async create(data: {
        title: string;
        message: string;
        type: string;
        userId?: string;
        tenantId: string;
        link?: string;
    }) {
        const tid = toObjectId(data.tenantId);
        if (!tid) return null;
        return this.notifModel.create({
            title: data.title,
            message: data.message,
            type: data.type,
            userId: toObjectId(data.userId) || undefined,
            tenantId: tid,
            link: data.link,
        });
    }

    async broadcast(data: { title: string; message: string; type: string; tenantId: string; link?: string }) {
        const tid = toObjectId(data.tenantId);
        if (!tid) return null;
        return this.notifModel.create({
            title: data.title,
            message: data.message,
            type: data.type,
            tenantId: tid,
            link: data.link,
        });
    }

    /** Get notifications for a specific user within their tenant (their own + tenant broadcast) */
    async getForUser(userId: string, tenantId: string, limit = 50) {
        const userObjId = toObjectId(userId);
        const tid = toObjectId(tenantId);
        if (!tid || !userObjId) return [];
        return this.notifModel
            .find({ 
                tenantId: tid,
                $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }] 
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    async getUnreadCount(userId: string, tenantId: string): Promise<number> {
        const userObjId = toObjectId(userId);
        const tid = toObjectId(tenantId);
        if (!tid || !userObjId) return 0;
        return this.notifModel.countDocuments({
            tenantId: tid,
            isRead: false,
            $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }],
        });
    }

    async markRead(id: string, tenantId: string) {
        const nid = toObjectId(id);
        const tid = toObjectId(tenantId);
        if (!nid || !tid) return null;
        return this.notifModel.findOneAndUpdate(
            { _id: nid, tenantId: tid }, 
            { isRead: true }, 
            { new: true }
        );
    }

    async markAllRead(userId: string, tenantId: string) {
        const userObjId = toObjectId(userId);
        const tid = toObjectId(tenantId);
        if (!tid || !userObjId) return null;
        return this.notifModel.updateMany(
            {
                tenantId: tid,
                isRead: false,
                $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }],
            },
            { isRead: true },
        );
    }

    async deleteOne(id: string, tenantId: string) {
        const nid = toObjectId(id);
        const tid = toObjectId(tenantId);
        if (!nid || !tid) return null;
        return this.notifModel.deleteOne({ 
            _id: nid, 
            tenantId: tid 
        });
    }

    async clearAll(userId: string, tenantId: string) {
        const userObjId = toObjectId(userId);
        const tid = toObjectId(tenantId);
        if (!tid || !userObjId) return null;
        return this.notifModel.deleteMany({
            tenantId: tid,
            $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }],
        });
    }
}
