// TypeORM OrderItem Entity for QueryFlow Testing
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
@Index(['order_id', 'product_id'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false })
  order_id: number;

  @Column({ type: 'int', nullable: false })
  product_id: number;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total_price: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Order, order => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Virtual properties
  get unitProfit(): number {
    return this.unit_price - (this.product?.cost || 0);
  }

  get totalProfit(): number {
    return this.unitProfit * this.quantity;
  }

  get profitMargin(): number {
    return this.unit_price > 0 ? (this.unitProfit / this.unit_price) * 100 : 0;
  }

  get isHighValue(): boolean {
    return this.total_price > 100;
  }

  get isBulkOrder(): boolean {
    return this.quantity >= 10;
  }

  // Methods
  calculateTotal(): void {
    this.total_price = this.unit_price * this.quantity;
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    this.quantity = newQuantity;
    this.calculateTotal();
  }

  updateUnitPrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }
    this.unit_price = newPrice;
    this.calculateTotal();
  }

  // Static methods
  static async findByOrder(orderId: number): Promise<OrderItem[]> {
    return this.find({ 
      where: { order_id: orderId },
      relations: ['product', 'order']
    });
  }

  static async findByProduct(productId: number): Promise<OrderItem[]> {
    return this.find({ 
      where: { product_id: productId },
      relations: ['order', 'product']
    });
  }

  static async getHighValueItems(minValue: number = 100): Promise<OrderItem[]> {
    return this.createQueryBuilder('orderItem')
      .where('orderItem.total_price >= :minValue', { minValue })
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('orderItem.order', 'order')
      .getMany();
  }

  static async getBulkOrders(minQuantity: number = 10): Promise<OrderItem[]> {
    return this.createQueryBuilder('orderItem')
      .where('orderItem.quantity >= :minQuantity', { minQuantity })
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('orderItem.order', 'order')
      .getMany();
  }

  static async getTopSellingProducts(limit: number = 10): Promise<any[]> {
    return this.createQueryBuilder('orderItem')
      .select('orderItem.product_id', 'productId')
      .addSelect('SUM(orderItem.quantity)', 'totalQuantity')
      .addSelect('SUM(orderItem.total_price)', 'totalRevenue')
      .addSelect('COUNT(orderItem.id)', 'orderCount')
      .leftJoin('orderItem.product', 'product')
      .groupBy('orderItem.product_id')
      .orderBy('totalQuantity', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  static async getRevenueByProduct(productId: number): Promise<number> {
    const result = await this.createQueryBuilder('orderItem')
      .select('SUM(orderItem.total_price)', 'totalRevenue')
      .where('orderItem.product_id = :productId', { productId })
      .getRawOne();
    
    return parseFloat(result.totalRevenue) || 0;
  }

  static async getQuantitySold(productId: number): Promise<number> {
    const result = await this.createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'totalQuantity')
      .where('orderItem.product_id = :productId', { productId })
      .getRawOne();
    
    return parseInt(result.totalQuantity) || 0;
  }
}
