import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PaymentAllocation,
  PaymentAllocationSchema,
} from './schemas/payment-allocation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentAllocation.name, schema: PaymentAllocationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class PaymentAllocationsModule {}
