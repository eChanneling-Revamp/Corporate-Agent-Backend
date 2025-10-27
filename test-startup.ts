import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  console.log('🚀 Starting Corporate Agent API Gateway...');
  
  try {
    // Simple test - just start NestJS without all dependencies
    const app = await NestFactory.create({});
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    const port = 3001;
    await app.listen(port);
    console.log(`✅ API Gateway running on http://localhost:${port}`);
    
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error.message);
    process.exit(1);
  }
}

bootstrap();