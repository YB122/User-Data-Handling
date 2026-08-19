import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenApiSpec } from './openapi.js';

const router = Router();

router.use('/', swaggerUi.serve, swaggerUi.setup(OpenApiSpec));

export default router;