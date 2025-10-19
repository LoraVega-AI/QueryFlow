// TypeORM Product Entity for QueryFlow Testing
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './Category';
import { OrderItem } from './OrderItem';
import { Review } from './Review';

@Entity('products')
@Index(['category_id', 'is_active'])
@Index(['is_featured'])
@Index(['price'])
@Index(['sku'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  sku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  cost: number;

  @Column({ type: 'int', nullable: true })
  category_id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  dimensions: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  size: string;

  @Column({ type: 'int', default: 0 })
  stock_quantity: number;

  @Column({ type: 'int', default: 5 })
  min_stock_level: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Category, category => category.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => Review, review => review.product)
  reviews: Review[];

  // Virtual properties
  get isLowStock(): boolean {
    return this.stock_quantity <= this.min_stock_level;
  }

  get profitMargin(): number {
    return this.price - this.cost;
  }

  get profitMarginPercentage(): number {
    return this.price > 0 ? ((this.price - this.cost) / this.price) * 100 : 0;
  }

  get averageRating(): number {
    if (!this.reviews || this.reviews.length === 0) return 0;
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / this.reviews.length;
  }

  get reviewCount(): number {
    return this.reviews ? this.reviews.length : 0;
  }

  // Methods
  isInStock(): boolean {
    return this.stock_quantity > 0;
  }

  canOrder(quantity: number): boolean {
    return this.is_active && this.stock_quantity >= quantity;
  }

  updateStock(quantity: number): void {
    this.stock_quantity = Math.max(0, this.stock_quantity + quantity);
  }

  // Static methods
  static async findByCategory(categoryId: number): Promise<Product[]> {
    return this.find({ where: { category_id: categoryId, is_active: true } });
  }

  static async findFeatured(): Promise<Product[]> {
    return this.find({ where: { is_featured: true, is_active: true } });
  }

  static async findLowStock(): Promise<Product[]> {
    return this.createQueryBuilder('product')
      .where('product.stock_quantity <= product.min_stock_level')
      .andWhere('product.is_active = :isActive', { isActive: true })
      .getMany();
  }

  static async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    return this.find({
      where: {
        price: Between(minPrice, maxPrice),
        is_active: true
      }
    });
  }

  static async searchByName(searchTerm: string): Promise<Product[]> {
    return this.createQueryBuilder('product')
      .where('product.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('product.description ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .andWhere('product.is_active = :isActive', { isActive: true })
      .getMany();
  }
}
