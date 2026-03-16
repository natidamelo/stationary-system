import { Types } from 'mongoose';

export function toObjectId(id: string | undefined | null): Types.ObjectId | null {
    if (!id) return null;
    try {
        if (Types.ObjectId.isValid(id)) {
            return new Types.ObjectId(id);
        }
        return null;
    } catch {
        return null;
    }
}
