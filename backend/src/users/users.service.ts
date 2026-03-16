import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { RoleDocument } from '../schemas/role.schema';

function toUser(doc: UserDocument & { role?: RoleDocument } | null) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const id = (o._id || (doc as any)._id)?.toString();
  const roleId = (o.roleId || (doc as any).roleId)?.toString();
  const role = (o as any).role ? { id: (o as any).role._id?.toString(), name: (o as any).role.name } : null;
  return {
    id,
    email: o.email,
    passwordHash: o.passwordHash,
    fullName: o.fullName,
    department: o.department,
    passwordResetToken: o.passwordResetToken,
    passwordResetExpires: o.passwordResetExpires,
    isActive: o.isActive,
    roleId,
    role,
    tenantId: o.tenantId?.toString(),
    createdAt: o.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
    @InjectModel(RoleDocument.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  async findByEmail(email: string) {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .populate('roleId')
      .lean();
    if (!doc) return null;
    const role = (doc as any).roleId;
    return toUser({
      ...doc,
      _id: doc._id,
      role: role ? { _id: role._id, name: role.name } : undefined,
    } as any);
  }

  async findById(id: string) {
    const doc = await this.userModel
      .findById(id)
      .populate('roleId')
      .lean();
    if (!doc) return null;
    const role = (doc as any).roleId;
    return toUser({
      ...doc,
      _id: doc._id,
      role: role ? { _id: role._id, name: role.name } : undefined,
    } as any);
  }

  async setPasswordReset(userId: string, token: string, expires: Date): Promise<void> {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { passwordResetToken: token, passwordResetExpires: expires } },
    );
  }

  async clearPasswordReset(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } },
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { passwordHash } },
    );
  }

  async findByResetToken(token: string) {
    const doc = await this.userModel.findOne({ passwordResetToken: token }).lean();
    return doc ? toUser(doc as any) : null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    department?: string;
    roleName: string;
    tenantId?: string;
  }) {
    const role = await this.roleModel.findOne({ name: data.roleName }).lean();
    if (!role) throw new NotFoundException('Role not found');
    const created = await this.userModel.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      department: data.department,
      roleId: role._id,
      tenantId: data.tenantId ? new Types.ObjectId(data.tenantId) : undefined,
    });
    return this.findById(created._id.toString());
  }

  async findAll(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const docs = await this.userModel
      .find({ tenantId: tid })
      .populate('roleId')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d: any) => {
      const role = d.roleId;
      return toUser({
        ...d,
        role: role ? { _id: role._id, name: role.name } : undefined,
      } as any);
    });
  }
}
