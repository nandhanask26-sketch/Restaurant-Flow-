import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'RestaurantFlow API',
    version: '1.0.0',
    description:
      'Smart Restaurant Ordering & Management Platform API with PostgreSQL, Token Generation, QR Verification, and Real-time WebSocket support.',
    contact: {
      name: 'RestaurantFlow Team',
      email: 'support@restaurantflow.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or resource not found' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string', example: 'Rajesh Kumar' },
          email: { type: 'string', format: 'email', example: 'manager@example.com' },
          phone: { type: 'string', example: '+91 9876543210' },
          role: { type: 'string', enum: ['CUSTOMER', 'RESTAURANT_MANAGER', 'ADMIN'] },
        },
      },
      Food: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Chicken Biriyani' },
          description: { type: 'string', example: 'Fragrant seeraga samba rice cooked with tender chicken.' },
          price: { type: 'number', example: 180.0 },
          preparationTimeMinutes: { type: 'integer', example: 20 },
          isAvailable: { type: 'boolean', example: true },
          isVegetarian: { type: 'boolean', example: false },
          imageUrl: { type: 'string' },
          inventoryQuantity: { type: 'integer', example: 20 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          restaurantId: { type: 'string', format: 'uuid' },
          orderToken: { type: 'string', example: 'RF-20260821-001' },
          status: {
            type: 'string',
            enum: ['CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
          },
          preferredTimeType: { type: 'string', enum: ['ASAP', 'SCHEDULED'] },
          requestedFoodAt: { type: 'string', format: 'date-time' },
          subtotal: { type: 'number', example: 360.0 },
          tax: { type: 'number', example: 18.0 },
          totalAmount: { type: 'number', example: 378.0 },
        },
      },
    },
  },
  paths: {
    '/auth/register/customer': {
      post: {
        summary: 'Register new customer',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'phone', 'password', 'confirmPassword'],
                properties: {
                  fullName: { type: 'string', example: 'Priya Sharma' },
                  email: { type: 'string', example: 'customer@example.com' },
                  phone: { type: 'string', example: '+91 9876543211' },
                  password: { type: 'string', example: 'Password123!' },
                  confirmPassword: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Customer registered successfully' },
          409: { description: 'Duplicate email or phone' },
        },
      },
    },
    '/auth/register/manager': {
      post: {
        summary: 'Register new manager and restaurant',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['managerName', 'email', 'phone', 'password', 'confirmPassword', 'restaurantName', 'restaurantAddress', 'restaurantPhone'],
                properties: {
                  managerName: { type: 'string', example: 'Rajesh Kumar' },
                  email: { type: 'string', example: 'manager@example.com' },
                  phone: { type: 'string', example: '+91 9876543210' },
                  password: { type: 'string', example: 'Password123!' },
                  confirmPassword: { type: 'string', example: 'Password123!' },
                  restaurantName: { type: 'string', example: 'Spice Garden' },
                  restaurantAddress: { type: 'string', example: '124 Gourmet Boulevard' },
                  restaurantPhone: { type: 'string', example: '+91 80 4567 8900' },
                  restaurantDescription: { type: 'string', example: 'Authentic South Indian & Biriyani.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Manager and restaurant registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User login (Customer & Manager)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'manager@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns access and refresh tokens' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/restaurants': {
      get: {
        summary: 'Get all active restaurants',
        tags: ['Restaurants'],
        responses: {
          200: { description: 'List of restaurants' },
        },
      },
    },
    '/restaurants/{id}/status': {
      get: {
        summary: 'Get restaurant open/closed status',
        tags: ['Restaurants'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Current restaurant status' },
        },
      },
      patch: {
        summary: 'Update restaurant open/closed status (Manager only)',
        tags: ['Restaurants'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isOpen'],
                properties: { isOpen: { type: 'boolean', example: true } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Restaurant status updated' },
        },
      },
    },
    '/foods': {
      get: {
        summary: 'Get all food items with stock',
        tags: ['Foods'],
        parameters: [
          { name: 'restaurantId', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of food items' },
        },
      },
      post: {
        summary: 'Create new food item (Manager only)',
        tags: ['Foods'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'price', 'preparationTimeMinutes'],
                properties: {
                  name: { type: 'string', example: 'Paneer Butter Masala' },
                  description: { type: 'string' },
                  price: { type: 'number', example: 170.0 },
                  categoryId: { type: 'string' },
                  preparationTimeMinutes: { type: 'integer', example: 15 },
                  isVegetarian: { type: 'boolean', example: true },
                  initialStock: { type: 'integer', example: 25 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Food item created' },
        },
      },
    },
    '/orders': {
      get: {
        summary: 'Get orders with pagination and filtering',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'paymentMethod', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of orders' },
        },
      },
      post: {
        summary: 'Create new order (Transactional with stock lock)',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['restaurantId', 'items', 'paymentMethod', 'preferredTimeType', 'requestedFoodAt'],
                properties: {
                  restaurantId: { type: 'string', format: 'uuid' },
                  preferredTimeType: { type: 'string', enum: ['ASAP', 'SCHEDULED'] },
                  requestedFoodAt: { type: 'string', format: 'date-time' },
                  paymentMethod: { type: 'string', enum: ['UPI', 'CARD', 'CASH_ON_DELIVERY'] },
                  notes: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['foodId', 'quantity'],
                      properties: {
                        foodId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created, token generated' },
          400: { description: 'Food sold out or insufficient stock' },
        },
      },
    },
    '/orders/{id}/verify-qr': {
      post: {
        summary: 'Scan and verify order QR code (Manager only)',
        tags: ['QR Verification'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verificationCode'],
                properties: {
                  verificationCode: { type: 'string', example: 'QR_VERIFY_ACTIVE_002' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'QR valid and verified' },
          400: { description: 'Invalid or already scanned QR' },
        },
      },
    },
    '/orders/{id}/deliver': {
      post: {
        summary: 'Mark order as DELIVERED (Manager only)',
        tags: ['Orders'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order delivered successfully' },
        },
      },
    },
    '/analytics/daily': {
      get: {
        summary: 'Get daily analytics & revenue breakdown (Manager only)',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Daily metrics and charts data' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📖 Swagger API Documentation initialized at /api/docs');
}
