import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ItemDocument } from '../schemas/item.schema';
import { StockMovementDocument } from '../schemas/stock-movement.schema';
import { SaleDocument } from '../schemas/sale.schema';
import { PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { DistributionDocument } from '../schemas/distribution.schema';
import { CategoryDocument } from '../schemas/category.schema';
import { SupplierDocument } from '../schemas/supplier.schema';
import { UserDocument } from '../schemas/user.schema';
import { OperatingExpenseDocument } from '../schemas/operating-expense.schema';
import { ServiceDocument } from '../schemas/service.schema';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    private inventory: InventoryService,
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
    @InjectModel(StockMovementDocument.name)
    private movementModel: Model<StockMovementDocument>,
    @InjectModel(SaleDocument.name)
    private saleModel: Model<SaleDocument>,
    @InjectModel(PurchaseOrderDocument.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(DistributionDocument.name)
    private distributionModel: Model<DistributionDocument>,
    @InjectModel(CategoryDocument.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(SupplierDocument.name)
    private supplierModel: Model<SupplierDocument>,
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
    @InjectModel(OperatingExpenseDocument.name)
    private operatingExpenseModel: Model<OperatingExpenseDocument>,
    @InjectModel(ServiceDocument.name)
    private serviceModel: Model<ServiceDocument>,
  ) {}

  async stockReport(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const items = await this.itemModel.find({ tenantId: tid, isActive: true }).populate('categoryId').sort({ name: 1 }).lean();
    const balances = await this.inventory.getBalancesForItems(items.map((i: any) => i._id.toString()), tenantId);
    return items.map((i: any) => ({
      id: i._id.toString(),
      sku: i.sku,
      name: i.name,
      category: i.categoryId?.name,
      unit: i.unit,
      reorderLevel: Number(i.reorderLevel),
      currentStock: balances[i._id.toString()] ?? 0,
      price: Number(i.price),
    }));
  }

  private getPeriodDates(period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly') {
    const end = new Date();
    const start = new Date();
    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'biweekly') {
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'quarterly') {
      const q = Math.floor(start.getMonth() / 3) + 1;
      start.setMonth((q - 1) * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  async stockReportByPeriod(tenantId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
    const { start, end } = this.getPeriodDates(period);
    const tid = new Types.ObjectId(tenantId);
    const movements = await this.movementModel
      .find({ tenantId: tid, createdAt: { $gte: start, $lte: end } })
      .populate('itemId')
      .lean();
    const byItem: Record<string, { itemId: string; sku: string; name: string; in: number; out: number }> = {};
    for (const m of movements as any[]) {
      const id = (m.itemId?._id || m.itemId)?.toString?.() || m.itemId?.toString?.();
      if (!id) continue;
      if (!byItem[id]) {
        byItem[id] = {
          itemId: id,
          sku: m.itemId?.sku || '',
          name: m.itemId?.name || '',
          in: 0,
          out: 0,
        };
      }
      const isIn =
        m.type === StockMovementType.PURCHASE ||
        m.type === StockMovementType.RETURN ||
        m.type === 'adjustment';
      if (isIn) byItem[id].in += m.quantity;
      else byItem[id].out += m.quantity;
    }
    const items = await this.itemModel.find({ tenantId: tid, isActive: true }).lean();
    const balances = await this.inventory.getBalancesForItems(items.map((i: any) => i._id.toString()), tenantId);
    return {
      period,
      start,
      end,
      summary: {
        totalMovements: movements.length,
        itemsAffected: Object.keys(byItem).length,
      },
      byItem: Object.values(byItem),
      currentBalances: balances,
    };
  }

  async financialSummary(tenantId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
    const { start, end } = this.getPeriodDates(period);
    const tid = new Types.ObjectId(tenantId);
    const [sales, posReceived] = await Promise.all([
      this.saleModel.find({ tenantId: tid, soldAt: { $gte: start, $lte: end } }).lean(),
      this.poModel.find({ tenantId: tid, status: 'received', orderDate: { $gte: start, $lte: end } }).populate('lines').lean(),
    ]);
    const revenue = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    let purchaseCost = 0;
    for (const po of posReceived as any[]) {
      for (const line of po.lines || []) {
        purchaseCost += (line.quantity || 0) * (line.unitPrice || 0);
      }
    }
    return {
      period,
      start,
      end,
      revenue,
      purchaseCost,
      transactionCount: sales.length,
      purchaseOrderCount: posReceived.length,
    };
  }

  async salesReport(tenantId: string, period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly') {
    const { start, end } = this.getPeriodDates(period);
    const tid = new Types.ObjectId(tenantId);
    const sales = await this.saleModel
      .find({ tenantId: tid, soldAt: { $gte: start, $lte: end } })
      .populate('soldById')
      .populate('lines.itemId')
      .populate('lines.serviceId')
      .sort({ soldAt: -1 })
      .lean();
    const total = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    return {
      period,
      start,
      end,
      totalRevenue: total,
      transactionCount: sales.length,
      sales: sales.map((s: any) => {
        const totalAmount = Number(s.totalAmount ?? 0);
        const amountPaid = Number(s.amountPaid ?? totalAmount);
        const balanceDue = Math.max(0, totalAmount - amountPaid);
        const linesOut = (s.lines || []).map((ln: any) => {
          const item = ln.itemId;
          const service = ln.serviceId;
          const name = item ? `${item.sku || ''} – ${item.name || ''}`.trim() : (service?.name || 'Service');
          const type = item ? 'Item' : 'Service';
          return {
            type,
            name,
            quantity: Number(ln.quantity ?? 0),
            unitPrice: Number(ln.unitPrice ?? 0),
            total: Number(ln.total ?? 0),
          };
        });
        return {
          id: s._id.toString(),
          saleNumber: s.saleNumber,
          soldAt: s.soldAt,
          soldBy: (s.soldById as any)?.fullName ?? '—',
          customerName: s.customerName ?? '—',
          paymentMethod: s.paymentMethod ?? 'cash',
          totalAmount,
          amountPaid,
          balanceDue,
          notes: s.notes ?? '',
          lines: linesOut,
        };
      }),
    };
  }

  async businessOverview(tenantId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const tid = new Types.ObjectId(tenantId);
    const [itemCount, categoryCount, supplierCount, userCount, recentSalesCount, recentDistCount, lowStockItems, revenueTrend] =
      await Promise.all([
        this.itemModel.countDocuments({ tenantId: tid, isActive: true }),
        this.categoryModel.countDocuments({ tenantId: tid }),
        this.supplierModel.countDocuments({ tenantId: tid, isActive: true }),
        this.userModel.countDocuments({ tenantId: tid, isActive: true }),
        this.saleModel.countDocuments({ tenantId: tid, soldAt: { $gte: thirtyDaysAgo } }),
        this.distributionModel.countDocuments({ tenantId: tid, createdAt: { $gte: thirtyDaysAgo } }),
        this.inventory.getLowStockItems(tenantId),
        this.getRevenueTrend(tenantId, period),
      ]);
    return {
      totalItems: itemCount,
      totalCategories: categoryCount,
      totalSuppliers: supplierCount,
      totalUsers: userCount,
      salesLast30Days: recentSalesCount,
      distributionsLast30Days: recentDistCount,
      lowStockCount: lowStockItems.length,
      revenueTrend,
    };
  }

  private async getRevenueTrend(tenantId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<Array<{ label: string; revenue: number; date: string }>> {
    const tid = new Types.ObjectId(tenantId);
    if (period === 'quarterly') {
      return this.getRevenueTrendByWeek(tenantId, 13);
    }
    if (period === 'yearly') {
      return this.getRevenueTrendByMonth(tenantId, 12);
    }
    const days = period === 'monthly' ? 30 : 7;
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 as 1 } },
    ];
    const aggregated = await this.saleModel.aggregate(pipeline).exec();
    const byDate: Record<string, number> = {};
    aggregated.forEach((a: { _id: string; revenue: number }) => { byDate[a._id] = Number(a.revenue); });
    const result: Array<{ label: string; revenue: number; date: string }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: byDate[dateStr] ?? 0,
        date: dateStr,
      });
    }
    return result;
  }

  private async getRevenueTrendByWeek(tenantId: string, weeks: number): Promise<Array<{ label: string; revenue: number; date: string }>> {
    const tid = new Types.ObjectId(tenantId);
    const start = new Date();
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$soldAt' },
            week: { $isoWeek: '$soldAt' },
          },
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
    const result: Array<{ label: string; revenue: number; date: string }> = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const { year, week } = this.getISOWeek(d);
      const key = `${year}-${week}`;
      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: byWeek[key] ?? 0,
        date: key,
      });
    }
    return result;
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

  private async getRevenueTrendByMonth(tenantId: string, months: number): Promise<Array<{ label: string; revenue: number; date: string }>> {
    const tid = new Types.ObjectId(tenantId);
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const pipeline = [
      { $match: { tenantId: tid, soldAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$soldAt' } },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 as 1 } },
    ];
    const aggregated = await this.saleModel.aggregate(pipeline).exec();
    const byMonth: Record<string, number> = {};
    aggregated.forEach((a: { _id: string; revenue: number }) => { byMonth[a._id] = Number(a.revenue); });
    const result: Array<{ label: string; revenue: number; date: string }> = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const dateStr = d.toISOString().slice(0, 7);
      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: byMonth[dateStr] ?? 0,
        date: dateStr,
      });
    }
    return result;
  }

  async costProfitAnalysis(tenantId: string, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
    const tid = new Types.ObjectId(tenantId);
    const financial = await this.financialSummary(tenantId, period);
    const { start, end } = this.getPeriodDates(period);
    const [expenses, sales] = await Promise.all([
      this.operatingExpenseModel
        .find({ tenantId: tid, date: { $gte: start, $lte: end } })
        .sort({ date: -1 })
        .lean(),
      this.saleModel
        .find({ tenantId: tid, soldAt: { $gte: start, $lte: end } })
        .populate('lines.itemId')
        .populate('lines.serviceId')
        .lean(),
    ]);
    
    // COGS from actual sales: each sold item/service contributes quantity * unit cost
    let itemCogs = 0;
    let serviceCosts = 0;
    let itemRevenue = 0;
    let serviceRevenue = 0;
    for (const sale of sales as any[]) {
      for (const line of sale.lines || []) {
        const qty = line.quantity || 0;
        if (line.serviceId) {
          const service = line.serviceId;
          const unitCost = line.unitCost != null ? Number(line.unitCost) : Math.max(0, Number(service?.costPrice ?? 0));
          serviceCosts += qty * unitCost;
          serviceRevenue += line.total || 0;
        } else if (line.itemId) {
          const item = line.itemId;
          const unitCost = line.unitCost != null ? Number(line.unitCost) : Math.max(0, Number(item?.costPrice ?? 0));
          itemCogs += qty * unitCost;
          itemRevenue += line.total || 0;
        }
      }
    }
    
    const revenue = financial.revenue || 0;
    itemCogs = Math.max(0, itemCogs);
    serviceCosts = Math.max(0, serviceCosts);
    const cogs = itemCogs + serviceCosts;
    const operatingExpensesTotal = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - operatingExpensesTotal;
    const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const totalCosts = cogs + operatingExpensesTotal;
    return {
      ...financial,
      revenue,
      itemRevenue,
      serviceRevenue,
      costOfGoodsSold: cogs,
      itemCosts: itemCogs,
      serviceCosts,
      grossProfit,
      grossMarginPct,
      operatingExpensesTotal,
      operatingExpenses: expenses.map((e: any) => ({
        id: e._id.toString(),
        date: e.date,
        description: e.description,
        amount: e.amount,
        category: e.category,
      })),
      netProfit,
      netMarginPct,
      totalCosts,
      profit: netProfit,
      marginPercent: netMarginPct,
    };
  }

  async createOperatingExpense(tenantId: string, body: { date: string; description: string; amount: number; category?: string }) {
    const tid = new Types.ObjectId(tenantId);
    const doc = await this.operatingExpenseModel.create({
      date: new Date(body.date),
      description: body.description,
      amount: Number(body.amount),
      category: body.category,
      tenantId: tid,
    });
    return {
      id: doc._id.toString(),
      date: doc.date,
      description: doc.description,
      amount: doc.amount,
      category: doc.category,
    };
  }

  async deleteOperatingExpense(id: string, tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    await this.operatingExpenseModel.deleteOne({ _id: new Types.ObjectId(id), tenantId: tid });
  }

  async serviceAnalytics(tenantId: string, period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly') {
    const { start, end } = this.getPeriodDates(period);
    const tid = new Types.ObjectId(tenantId);
    const distributions = await this.distributionModel
      .find({ tenantId: tid, createdAt: { $gte: start, $lte: end } })
      .populate('issuedToUserId')
      .populate('lines.itemId')
      .sort({ createdAt: -1 })
      .lean();

    const byDepartment: Record<string, { count: number; itemsIssued: number }> = {};
    const byItem: Record<string, { itemId: string; itemName: string; sku: string; quantity: number }> = {};
    const recipientSet = new Set<string>();
    let totalItemsIssued = 0;

    for (const d of distributions as any[]) {
      const dept = d.department || 'Unspecified';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, itemsIssued: 0 };
      byDepartment[dept].count += 1;
      if (d.issuedToUserId) recipientSet.add((d.issuedToUserId._id || d.issuedToUserId).toString());
      for (const line of d.lines || []) {
        const qty = line.quantity || 0;
        byDepartment[dept].itemsIssued += qty;
        totalItemsIssued += qty;
        const id = (line.itemId?._id || line.itemId)?.toString?.() || line.itemId?.toString?.();
        if (id) {
          if (!byItem[id]) {
            byItem[id] = {
              itemId: id,
              itemName: (line.itemId?.name as string) || '',
              sku: (line.itemId?.sku as string) || '',
              quantity: 0,
            };
          }
          byItem[id].quantity += qty;
        }
      }
    }

    // Build distribution trend based on period granularity
    const trend = await this.getDistributionTrend(tenantId, period, start);

    // Recent distributions (last 10)
    const recentDistributions = (distributions as any[]).slice(0, 10).map((d) => ({
      id: d._id.toString(),
      distributionNumber: d.distributionNumber,
      department: d.department || 'Unspecified',
      issuedTo: (d.issuedToUserId as any)?.fullName ?? null,
      itemCount: (d.lines || []).reduce((s: number, l: any) => s + (l.quantity || 0), 0),
      lineCount: (d.lines || []).length,
      createdAt: d.createdAt,
    }));

    const totalDist = distributions.length;
    return {
      period,
      start,
      end,
      totalDistributions: totalDist,
      totalItemsIssued,
      uniqueRecipients: recipientSet.size,
      avgItemsPerDistribution: totalDist > 0 ? Math.round((totalItemsIssued / totalDist) * 10) / 10 : 0,
      byDepartment: Object.entries(byDepartment)
        .map(([department, data]) => ({
          department,
          distributionCount: data.count,
          itemsIssued: data.itemsIssued,
        }))
        .sort((a, b) => b.itemsIssued - a.itemsIssued),
      topItems: Object.values(byItem)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20),
      trend,
      recentDistributions,
    };
  }

  private async getDistributionTrend(
    tenantId: string,
    period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
    start: Date,
  ): Promise<Array<{ label: string; count: number; date: string }>> {
    const tid = new Types.ObjectId(tenantId);
    if (period === 'yearly') {
      // Group by month for the last 12 months
      const pipeline = [
        { $match: { tenantId: tid, createdAt: { $gte: start } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 as 1 } },
      ];
      const agg = await this.distributionModel.aggregate(pipeline).exec();
      const byMonth: Record<string, number> = {};
      agg.forEach((a: any) => { byMonth[a._id] = a.count; });
      const result: Array<{ label: string; count: number; date: string }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        const key = d.toISOString().slice(0, 7);
        result.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), count: byMonth[key] ?? 0, date: key });
      }
      return result;
    }
    if (period === 'quarterly') {
      // Group by week for last 13 weeks
      const pipeline = [
        { $match: { tenantId: tid, createdAt: { $gte: start } } },
        {
          $group: {
            _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1 as 1, '_id.week': 1 as 1 } },
      ];
      const agg = await this.distributionModel.aggregate(pipeline).exec();
      const byWeek: Record<string, number> = {};
      agg.forEach((a: any) => { byWeek[`${a._id.year}-${a._id.week}`] = a.count; });
      const result: Array<{ label: string; count: number; date: string }> = [];
      for (let i = 12; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        const { year, week } = this.getISOWeek(d);
        const key = `${year}-${week}`;
        result.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: byWeek[key] ?? 0, date: key });
      }
      return result;
    }
    // Daily grouping for daily/weekly/biweekly/monthly
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'biweekly' ? 14 : 30;
    const pipeline = [
      { $match: { tenantId: tid, createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 as 1 } },
    ];
    const agg = await this.distributionModel.aggregate(pipeline).exec();
    const byDate: Record<string, number> = {};
    agg.forEach((a: any) => { byDate[a._id] = a.count; });
    const result: Array<{ label: string; count: number; date: string }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: byDate[dateStr] ?? 0, date: dateStr });
    }
    return result;
  }

  async inventoryReport(tenantId: string) {
    const rows = await this.stockReport(tenantId);
    const totalValue = rows.reduce((sum, r) => sum + r.currentStock * r.price, 0);
    const lowStock = rows.filter((r) => r.currentStock <= r.reorderLevel);
    const totalItems = rows.length;
    const totalUnits = rows.reduce((sum, r) => sum + r.currentStock, 0);
    return {
      summary: {
        totalItems,
        totalUnits,
        totalInventoryValue: totalValue,
        lowStockCount: lowStock.length,
      },
      items: rows,
      lowStockItems: lowStock,
    };
  }
}
