import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttachmentDocument } from '../schemas/attachment.schema';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(AttachmentDocument.name)
    private model: Model<AttachmentDocument>,
  ) {}

  async create(tenantId: string, file: Express.Multer.File, entityType?: string, entityId?: string) {
    const tid = new Types.ObjectId(tenantId);
    const created = await this.model.create({
      tenantId: tid,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      path: file.path,
      entityType,
      entityId,
    });
    const doc = await this.model.findById(created._id).lean();
    return { id: (doc as any)._id.toString(), ...(doc as any) };
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    const tid = new Types.ObjectId(tenantId);
    const docs = await this.model.find({ tenantId: tid, entityType, entityId }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({ id: d._id.toString(), ...d }));
  }
}
