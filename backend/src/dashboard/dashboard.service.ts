import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseRequestDocument } from '../schemas/purchase-request.schema';
import { PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { SaleDocument } from '../schemas/sale.schema';
import { RequestStatus } from '../common/enums';
import { POStatus } from '../common/enums';
import { InventoryService } from '../inventory/inventory.service';
import { toObjectId } from '../common/utils';

export type SalesChartPeriod = 'day' | 'week' | 'month' | 'year';
export type SalesChartPoint = { label: string; revenue: number; date: string };

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(PurchaseRequestDocument.name)
    private prModel: Model<PurchaseRequestDocument>,
    @InjectModel(PurchaseOrderDocument.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(SaleDocument.name)
    private saleModel: Model<SaleDocument>,
    private inventory: InventoryService,
  ) { }

  async getSalesChart(tenantId: string, period: SalesChartPeriod): Promise<SalesChartPoint[]> {
    try {
      if (!toObjectId(tenantId)) return [];
      if (period === 'year') return await this.getSalesChartByYear(tenantId);
      if (period === 'month') return await this.getSalesChartByMonth(tenantId);
      if (period === 'week') return await this.getSalesChartByWeek(tenantId);
      return await this.getSalesChartByDay(tenantId);
    } catch (err) {
      return [];
    }
  }

  private getISOWeek(d: Date): { year: number; week: number } {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const year = date.getFullYear();
    const start = new Date(year, 0, 1);
    const week = Math.ceil((((date.getTime() - start.getTime()) / 86400000) + 1) / 7);
    return { year, week };
  }

  /** Build YYYY-MM-DD from local date (no UTC conversion) so "today" matches the chart label. */
  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async getSalesChartByDay(tenantId: string): Promise<SalesChartPoint[]> {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    // Fetch sales and group in app by local date so "today" matches without MongoDB timezone support
    const sales = await this.saleModel
      .find({ tenantId: tid, soldAt: { $gte: start } })
      .select('soldAt totalAmount')
      .lean();
    const byDate: Record<string, number> = {};
    for (const s of sales as any[]) {
      const d = new Date(s.soldAt);
      const dateStr = this.toLocalDateString(d);
      byDate[dateStr] = (byDate[dateStr] ?? 0) + Number(s.totalAmount ?? 0);
    }
    const result: SalesChartPoint[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = this.toLocalDateString(d);
      result.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: byDate[dateStr] ?? 0,
        date: dateStr,
      });
    }
    return result;
  }

  private async getSalesChartByWeek(tenantId: string): Promise<SalesChartPoint[]> {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const weeks = 12;
    const start = new Date();
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $isoWeekYear: '$soldAt' }, week: { $isoWeek: '$soldAt' } },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1 as 1, '_id.week': 1 as 1 } },
    ];
    const aggregated = await this.saleModel.aggregate(pipeline).exec();
    const byWeek: Record<string, number> = {};
    aggregated.forEach((a: { _id: { year: number; week: number }; revenue: number }) => {
      byWeek[`${a._id.year}-${a._id.week}`] = Number(a.revenue);
    });
    const result: SalesChartPoint[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const { year, week } = this.getISOWeek(d);
      const key = `${year}-${week}`;
      result.push({
        label: `W${week} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
        revenue: byWeek[key] ?? 0,
        date: key,
      });
    }
    return result;
  }

  private async getSalesChartByMonth(tenantId: string): Promise<SalesChartPoint[]> {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const months = 12;
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$soldAt' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 as 1 } },
    ];
    const aggregated = await this.saleModel.aggregate(pipeline).exec();
    const byMonth: Record<string, number> = {};
    aggregated.forEach((a: { _id: string; revenue: number }) => { byMonth[a._id] = Number(a.revenue); });
    const result: SalesChartPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: byMonth[dateStr] ?? 0,
        date: dateStr,
      });
    }
    return result;
  }

  private async getSalesChartByYear(tenantId: string): Promise<SalesChartPoint[]> {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const years = 5;
    const start = new Date();
    start.setFullYear(start.getFullYear() - years);
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      { $group: { _id: { $year: '$soldAt' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 as 1 } },
    ];
    const aggregated = await this.saleModel.aggregate(pipeline).exec();
    const byYear: Record<number, number> = {};
    aggregated.forEach((a: { _id: number; revenue: number }) => { byYear[a._id] = Number(a.revenue); });
    const result: SalesChartPoint[] = [];
    const currentYear = new Date().getFullYear();
    for (let i = years - 1; i >= 0; i--) {
      const y = currentYear - i;
      result.push({
        label: String(y),
        revenue: byYear[y] ?? 0,
        date: String(y),
      });
    }
    return result;
  }

  async getSummary(tenantId: string) {
    try {
      const tid = toObjectId(tenantId);
      if (!tid) throw new Error('Invalid tenantId');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [pendingApprovals, draftPo, lowStockItems, todaySales] = await Promise.all([
        this.prModel.countDocuments({ tenantId: tid, status: RequestStatus.PENDING }),
        this.poModel.countDocuments({ tenantId: tid, status: POStatus.DRAFT }),
        this.inventory.getLowStockItems(tenantId),
        this.saleModel.find({ tenantId: tid, soldAt: { $gte: todayStart } }).select('totalAmount amountPaid').lean(),
      ]);
      const todaySalesArr = todaySales as any[];
      const todayRevenue = todaySalesArr.reduce((s, d) => s + Number(d.totalAmount ?? 0), 0);
      const todayCompletedSales = todaySalesArr.filter(d => Number(d.amountPaid ?? 0) >= Number(d.totalAmount ?? 0)).length;
      return {
        pendingApprovals: Number(pendingApprovals) || 0,
        draftPurchaseOrders: Number(draftPo) || 0,
        lowStockCount: Array.isArray(lowStockItems) ? lowStockItems.length : 0,
        lowStockItems: Array.isArray(lowStockItems) ? lowStockItems.slice(0, 10) : [],
        todayRevenue,
        todayCompletedSales,
        todaySalesCount: todaySalesArr.length,
      };
    } catch {
      return {
        pendingApprovals: 0,
        draftPurchaseOrders: 0,
        lowStockCount: 0,
        lowStockItems: [],
        todayRevenue: 0,
        todayCompletedSales: 0,
        todaySalesCount: 0,
      };
    }
  }

  async getStockSummary(tenantId: string) {
    const lowStockItems = await this.inventory.getLowStockItems(tenantId);
    return { lowStockItems, totalLowStockCount: lowStockItems.length };
  }
}
