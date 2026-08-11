import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentSequence,
  DocumentSequenceSchema,
} from './schemas/document-sequence.schema';
import { DocumentSequenceService } from './document-sequence.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentSequence.name, schema: DocumentSequenceSchema },
    ]),
  ],
  providers: [DocumentSequenceService],
  exports: [MongooseModule, DocumentSequenceService],
})
export class DocumentSequencesModule {}
