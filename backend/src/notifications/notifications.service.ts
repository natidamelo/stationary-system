import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationDocument } from '../schemas/notification.schema';

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
        return this.notifModel.create({
            title: data.title,
            message: data.message,
            type: data.type,
            userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
            tenantId: new Types.ObjectId(data.tenantId),
            link: data.link,
        });
    }

    async broadcast(data: { title: string; message: string; type: string; tenantId: string; link?: string }) {
        return this.notifModel.create({
            title: data.title,
            message: data.message,
            type: data.type,
            tenantId: new Types.ObjectId(data.tenantId),
            link: data.link,
        });
    }

    /** Get notifications for a specific user within their tenant (their own + tenant broadcast) */
    async getForUser(userId: string, tenantId: string, limit = 50) {
        const userObjId = new Types.ObjectId(userId);
        const tid = new Types.ObjectId(tenantId);
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
        const userObjId = new Types.ObjectId(userId);
        const tid = new Types.ObjectId(tenantId);
        return this.notifModel.countDocuments({
            tenantId: tid,
            isRead: false,
            $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }],
        });
    }

    async markRead(id: string, tenantId: string) {
        return this.notifModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
            { isRead: true }, 
            { new: true }
        );
    }

    async markAllRead(userId: string, tenantId: string) {
        const userObjId = new Types.ObjectId(userId);
        const tid = new Types.ObjectId(tenantId);
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
        return this.notifModel.deleteOne({ 
            _id: new Types.ObjectId(id), 
            tenantId: new Types.ObjectId(tenantId) 
        });
    }

    async clearAll(userId: string, tenantId: string) {
        const userObjId = new Types.ObjectId(userId);
        const tid = new Types.ObjectId(tenantId);
        return this.notifModel.deleteMany({
            tenantId: tid,
            $or: [{ userId: userObjId }, { userId: null }, { userId: { $exists: false } }],
        });
    }
}
