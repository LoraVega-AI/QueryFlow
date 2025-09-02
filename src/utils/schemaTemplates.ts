// Schema templates for QueryFlow
// This module provides pre-built database schema templates for common use cases

import { SchemaTemplate, DatabaseSchema, Table, Column } from '@/types/database';

export class SchemaTemplateManager {
  private static templates: SchemaTemplate[] = [
    {
      id: 'ecommerce-basic',
      name: 'E-commerce Basic',
      description: 'Basic e-commerce schema with products, customers, and orders',
      category: 'E-commerce',
      tags: ['ecommerce', 'products', 'orders', 'customers'],
      schema: {
        id: 'template-ecommerce-basic',
        name: 'E-commerce Basic',
        tables: [
          {
            id: 'customers',
            name: 'customers',
            position: { x: 100, y: 100 },
            columns: [
              {
                id: 'customer_id',
                name: 'customer_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'first_name',
                name: 'first_name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'last_name',
                name: 'last_name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'email',
                name: 'email',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'phone',
                name: 'phone',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'products',
            name: 'products',
            position: { x: 400, y: 100 },
            columns: [
              {
                id: 'product_id',
                name: 'product_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'name',
                name: 'name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'description',
                name: 'description',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'price',
                name: 'price',
                type: 'REAL',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'stock_quantity',
                name: 'stock_quantity',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                defaultValue: '0'
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'orders',
            name: 'orders',
            position: { x: 250, y: 300 },
            columns: [
              {
                id: 'order_id',
                name: 'order_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'customer_id',
                name: 'customer_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'customers',
                  columnId: 'customer_id'
                }
              },
              {
                id: 'order_date',
                name: 'order_date',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              },
              {
                id: 'total_amount',
                name: 'total_amount',
                type: 'REAL',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'status',
                name: 'status',
                type: 'TEXT',
                nullable: false,
                primaryKey: false,
                defaultValue: "'pending'"
              }
            ]
          },
          {
            id: 'order_items',
            name: 'order_items',
            position: { x: 400, y: 300 },
            columns: [
              {
                id: 'order_item_id',
                name: 'order_item_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'order_id',
                name: 'order_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'orders',
                  columnId: 'order_id'
                }
              },
              {
                id: 'product_id',
                name: 'product_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'products',
                  columnId: 'product_id'
                }
              },
              {
                id: 'quantity',
                name: 'quantity',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'unit_price',
                name: 'unit_price',
                type: 'REAL',
                nullable: false,
                primaryKey: false
              }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        description: 'Basic e-commerce schema with customers, products, orders, and order items',
        tags: ['ecommerce', 'basic']
      }
    },
    {
      id: 'blog-cms',
      name: 'Blog CMS',
      description: 'Content management system for blogs with posts, categories, and comments',
      category: 'Content Management',
      tags: ['blog', 'cms', 'posts', 'comments'],
      schema: {
        id: 'template-blog-cms',
        name: 'Blog CMS',
        tables: [
          {
            id: 'users',
            name: 'users',
            position: { x: 100, y: 100 },
            columns: [
              {
                id: 'user_id',
                name: 'user_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'username',
                name: 'username',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'email',
                name: 'email',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'password_hash',
                name: 'password_hash',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'role',
                name: 'role',
                type: 'TEXT',
                nullable: false,
                primaryKey: false,
                defaultValue: "'user'"
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'categories',
            name: 'categories',
            position: { x: 400, y: 100 },
            columns: [
              {
                id: 'category_id',
                name: 'category_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'name',
                name: 'name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'slug',
                name: 'slug',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'description',
                name: 'description',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              }
            ]
          },
          {
            id: 'posts',
            name: 'posts',
            position: { x: 250, y: 250 },
            columns: [
              {
                id: 'post_id',
                name: 'post_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'title',
                name: 'title',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'slug',
                name: 'slug',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'content',
                name: 'content',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'excerpt',
                name: 'excerpt',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'author_id',
                name: 'author_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'users',
                  columnId: 'user_id'
                }
              },
              {
                id: 'category_id',
                name: 'category_id',
                type: 'INTEGER',
                nullable: true,
                primaryKey: false,
                foreignKey: {
                  tableId: 'categories',
                  columnId: 'category_id'
                }
              },
              {
                id: 'status',
                name: 'status',
                type: 'TEXT',
                nullable: false,
                primaryKey: false,
                defaultValue: "'draft'"
              },
              {
                id: 'published_at',
                name: 'published_at',
                type: 'DATETIME',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'comments',
            name: 'comments',
            position: { x: 400, y: 400 },
            columns: [
              {
                id: 'comment_id',
                name: 'comment_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'post_id',
                name: 'post_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'posts',
                  columnId: 'post_id'
                }
              },
              {
                id: 'author_name',
                name: 'author_name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'author_email',
                name: 'author_email',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'content',
                name: 'content',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'status',
                name: 'status',
                type: 'TEXT',
                nullable: false,
                primaryKey: false,
                defaultValue: "'pending'"
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        description: 'Blog content management system with users, categories, posts, and comments',
        tags: ['blog', 'cms', 'content']
      }
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Complete user management system with roles, permissions, and profiles',
      category: 'User Management',
      tags: ['users', 'roles', 'permissions', 'authentication'],
      schema: {
        id: 'template-user-management',
        name: 'User Management',
        tables: [
          {
            id: 'users',
            name: 'users',
            position: { x: 100, y: 100 },
            columns: [
              {
                id: 'user_id',
                name: 'user_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'username',
                name: 'username',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'email',
                name: 'email',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'password_hash',
                name: 'password_hash',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'first_name',
                name: 'first_name',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'last_name',
                name: 'last_name',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'is_active',
                name: 'is_active',
                type: 'BOOLEAN',
                nullable: false,
                primaryKey: false,
                defaultValue: 'true'
              },
              {
                id: 'last_login',
                name: 'last_login',
                type: 'DATETIME',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'created_at',
                name: 'created_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'roles',
            name: 'roles',
            position: { x: 400, y: 100 },
            columns: [
              {
                id: 'role_id',
                name: 'role_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'name',
                name: 'name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'description',
                name: 'description',
                type: 'TEXT',
                nullable: true,
                primaryKey: false
              },
              {
                id: 'is_system',
                name: 'is_system',
                type: 'BOOLEAN',
                nullable: false,
                primaryKey: false,
                defaultValue: 'false'
              }
            ]
          },
          {
            id: 'permissions',
            name: 'permissions',
            position: { x: 700, y: 100 },
            columns: [
              {
                id: 'permission_id',
                name: 'permission_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'name',
                name: 'name',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'resource',
                name: 'resource',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              },
              {
                id: 'action',
                name: 'action',
                type: 'TEXT',
                nullable: false,
                primaryKey: false
              }
            ]
          },
          {
            id: 'user_roles',
            name: 'user_roles',
            position: { x: 250, y: 250 },
            columns: [
              {
                id: 'user_role_id',
                name: 'user_role_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'user_id',
                name: 'user_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'users',
                  columnId: 'user_id'
                }
              },
              {
                id: 'role_id',
                name: 'role_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'roles',
                  columnId: 'role_id'
                }
              },
              {
                id: 'assigned_at',
                name: 'assigned_at',
                type: 'DATETIME',
                nullable: false,
                primaryKey: false,
                defaultValue: 'CURRENT_TIMESTAMP'
              }
            ]
          },
          {
            id: 'role_permissions',
            name: 'role_permissions',
            position: { x: 550, y: 250 },
            columns: [
              {
                id: 'role_permission_id',
                name: 'role_permission_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: true,
                defaultValue: undefined
              },
              {
                id: 'role_id',
                name: 'role_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'roles',
                  columnId: 'role_id'
                }
              },
              {
                id: 'permission_id',
                name: 'permission_id',
                type: 'INTEGER',
                nullable: false,
                primaryKey: false,
                foreignKey: {
                  tableId: 'permissions',
                  columnId: 'permission_id'
                }
              }
            ]
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        description: 'Complete user management system with roles and permissions',
        tags: ['users', 'roles', 'permissions']
      }
    }
  ];

  /**
   * Get all available schema templates
   */
  static getAllTemplates(): SchemaTemplate[] {
    return this.templates;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): SchemaTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  /**
   * Get templates by tags
   */
  static getTemplatesByTags(tags: string[]): SchemaTemplate[] {
    return this.templates.filter(template => 
      tags.some(tag => template.tags.includes(tag))
    );
  }

  /**
   * Get a specific template by ID
   */
  static getTemplateById(id: string): SchemaTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  /**
   * Search templates by name or description
   */
  static searchTemplates(query: string): SchemaTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get all unique categories
   */
  static getCategories(): string[] {
    const categories = new Set(this.templates.map(template => template.category));
    return Array.from(categories).sort();
  }

  /**
   * Get all unique tags
   */
  static getTags(): string[] {
    const tags = new Set(this.templates.flatMap(template => template.tags));
    return Array.from(tags).sort();
  }

  /**
   * Create a new schema from a template
   */
  static createSchemaFromTemplate(templateId: string, customName?: string): DatabaseSchema | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    const schema: DatabaseSchema = {
      ...template.schema,
      id: `schema-${Date.now()}`,
      name: customName || `${template.name} - ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Generate new IDs for tables and columns to avoid conflicts
    const idMap = new Map<string, string>();
    
    schema.tables = schema.tables.map(table => ({
      ...table,
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns: table.columns.map(column => {
        const newColumnId = `column-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(column.id, newColumnId);
        return {
          ...column,
          id: newColumnId
        };
      })
    }));

    // Update foreign key references with new IDs
    schema.tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.foreignKey) {
          // Find the referenced table and column
          const referencedTable = schema.tables.find(t => 
            t.columns.some(c => c.id === column.foreignKey!.columnId)
          );
          if (referencedTable) {
            const referencedColumn = referencedTable.columns.find(c => 
              c.id === column.foreignKey!.columnId
            );
            if (referencedColumn) {
              column.foreignKey = {
                tableId: referencedTable.id,
                columnId: referencedColumn.id
              };
            }
          }
        }
      });
    });

    return schema;
  }
}
