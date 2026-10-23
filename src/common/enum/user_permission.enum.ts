// Convention: '<resource>:<action>', all lowercase, singular resource.
// Standard actions: read | create | update | delete. Special actions are named explicitly.
export enum UserPermission {
  // Products
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_AUDIT_LOG_READ = 'product_audit_log:read',

  // Product sources
  PRODUCT_SOURCE_READ = 'product_source:read',
  PRODUCT_SOURCE_CREATE = 'product_source:create',
  PRODUCT_SOURCE_UPDATE = 'product_source:update',
  PRODUCT_SOURCE_DELETE = 'product_source:delete',

  // Categories
  CATEGORY_READ = 'category:read',
  CATEGORY_CREATE = 'category:create',
  CATEGORY_UPDATE = 'category:update',
  CATEGORY_DELETE = 'category:delete',

  // Stock
  STOCK_READ = 'stock:read',
  STOCK_ADJUST = 'stock:adjust',
  STOCK_TRANSFER = 'stock:transfer',
  STOCK_MOVEMENT_READ = 'stock_movement:read',

  // Stores
  STORE_READ = 'store:read',
  STORE_CREATE = 'store:create',
  STORE_UPDATE = 'store:update',
  STORE_DELETE = 'store:delete',

  // Sales
  SALE_READ = 'sale:read',
  SALE_CREATE = 'sale:create',
  SALE_VOID = 'sale:void',
  SALE_REFUND = 'sale:refund',
  SALE_DISCOUNT = 'sale:discount',

  // Purchases (purchase orders)
  PURCHASE_READ = 'purchase:read',
  PURCHASE_CREATE = 'purchase:create',
  PURCHASE_UPDATE = 'purchase:update',
  PURCHASE_DELETE = 'purchase:delete',
  PURCHASE_APPROVE = 'purchase:approve',
  PURCHASE_MANAGE = 'purchase:manage',

  // Suppliers
  SUPPLIER_READ = 'supplier:read',
  SUPPLIER_CREATE = 'supplier:create',
  SUPPLIER_UPDATE = 'supplier:update',
  SUPPLIER_DELETE = 'supplier:delete',
  SUPPLIER_METRICS_READ = 'supplier_metrics:read',

  // Customers
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',

  // Users & roles
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  ROLE_READ = 'role:read',
  ROLE_CREATE = 'role:create',
  ROLE_UPDATE = 'role:update',
  ROLE_DELETE = 'role:delete',

  // Business
  BUSINESS_CREATE = 'business:create',
  BUSINESS_SETTINGS_READ = 'business_settings:read',
  BUSINESS_SETTINGS_UPDATE = 'business_settings:update',
  BUSINESS_SETTINGS_DELETE = 'business_settings:delete',

  // Audit
  AUDIT_LOG_READ = 'audit_log:read',

  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_SALES_VIEW = 'dashboard_sales:view',
  DASHBOARD_INVENTORY_VIEW = 'dashboard_inventory:view',
  DASHBOARD_PROCUREMENT_VIEW = 'dashboard_procurement:view',
  DASHBOARD_WAREHOUSE_VIEW = 'dashboard_warehouse:view',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_SALES_VIEW = 'report_sales:view',
  REPORT_INVENTORY_VIEW = 'report_inventory:view',
  REPORT_FINANCIAL_VIEW = 'report_financial:view',
  REPORT_EXPORT = 'report:export',

  // Notifications
  NOTIFICATION_UNREAD_COUNT = 'notification:unread_count',
  NOTIFICATION_READ_ONE = 'notification:read_one',
  NOTIFICATION_READ_ALL = 'notification:read_all',
  NOTIFICATION_UPDATE_READ_ALL = 'notification:update_read_all',
}
