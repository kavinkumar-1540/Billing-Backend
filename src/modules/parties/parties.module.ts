import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Party, PartySchema } from './schemas/party.schema';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Party.name, schema: PartySchema }]),
    AuthModule,
  ],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [MongooseModule, PartiesService],
})
export class PartiesModule {}
